import { log } from '../types';
import { upsertPrices } from '../db';

interface FREDResponse {
  observations: Array<{
    date: string;
    value: string;
  }>;
}

async function fetchFREDSeries(seriesId: string, apiKey: string): Promise<{ date: string; value: number } | null> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
  const res = await fetch(url);

  if (!res.ok) {
    log('ERROR', `FRED API returned ${res.status} for ${seriesId}`);
    return null;
  }

  const data: FREDResponse = await res.json();
  const obs = data?.observations;

  if (!obs || obs.length === 0 || obs[0].value === '.') {
    log('WARN', `FRED: no valid observation for ${seriesId}`);
    return null;
  }

  return {
    date: obs[0].date,
    value: parseFloat(obs[0].value),
  };
}

export async function fetchCrudePrices(): Promise<void> {
  const key = process.env.FRED_API_KEY;
  if (!key) {
    log('WARN', 'FRED_API_KEY not set — skipping crude price fetch');
    return;
  }

  try {
    const [brent, wti, natGas] = await Promise.all([
      fetchFREDSeries('DCOILBRENTEU', key),
      fetchFREDSeries('DCOILWTICO', key),
      fetchFREDSeries('DHHNGSP', key),
    ]);

    if (!brent && !wti && !natGas) {
      log('WARN', 'Prices: no data returned from any FRED series');
      return;
    }

    const snapshotDate = brent?.date ?? wti?.date ?? natGas?.date ?? new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    await upsertPrices({
      snapshot_date: snapshotDate,
      brent_usd: brent?.value ?? 0,
      wti_usd: wti?.value ?? 0,
      nat_gas_usd: natGas?.value ?? 0,
      updated_at: now,
    });

    log('INFO', `Prices: Brent=$${brent?.value ?? '?'} WTI=$${wti?.value ?? '?'} NatGas=$${natGas?.value ?? '?'}`);
  } catch (err) {
    log('ERROR', `Crude price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
