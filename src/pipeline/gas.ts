import { log } from '../types';
import { upsertPrices } from '../db';

interface EIAGasResponse {
  response: {
    data: Array<{
      period: string;
      value: number;
    }>;
  };
}

async function fetchGasSeries(apiKey: string, seriesFacet: string): Promise<{ period: string; value: number } | null> {
  const url = `https://api.eia.gov/v2/petroleum/pri/gasprice/data/?api_key=${apiKey}&frequency=weekly&data[0]=value&facets[series][]=${seriesFacet}&sort[0][column]=period&sort[0][direction]=desc&length=1`;
  const res = await fetch(url);

  if (!res.ok) {
    log('ERROR', `EIA Gas API returned ${res.status} for ${seriesFacet}`);
    return null;
  }

  const data: EIAGasResponse = await res.json();
  const rows = data?.response?.data;

  if (!rows || rows.length === 0) {
    log('WARN', `EIA Gas: no data for ${seriesFacet}`);
    return null;
  }

  return { period: rows[0].period, value: rows[0].value };
}

export async function fetchGasPrices(): Promise<void> {
  const key = process.env.EIA_API_KEY;
  if (!key) {
    log('WARN', 'EIA_API_KEY not set — skipping gas price fetch');
    return;
  }

  try {
    const [usAvg, cali] = await Promise.all([
      fetchGasSeries(key, 'EMM_EPMR_PTE_NUS_DPG'),
      fetchGasSeries(key, 'EMM_EPMR_PTE_SCA_DPG'),
    ]);

    if (!usAvg && !cali) {
      log('WARN', 'Gas prices: no data returned from EIA');
      return;
    }

    const snapshotDate = usAvg?.period ?? cali?.period ?? new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    await upsertPrices({
      snapshot_date: snapshotDate,
      us_avg_gas_usd: usAvg?.value ?? 0,
      us_ca_gas_usd: cali?.value ?? 0,
      updated_at: now,
    });

    log('INFO', `Gas prices: US avg=$${usAvg?.value ?? '?'} CA=$${cali?.value ?? '?'}`);
  } catch (err) {
    log('ERROR', `Gas price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
