import { log } from '../types';
import { upsertStorageLevel } from '../db';

interface EIAResponse {
  response: {
    data: Array<{
      period: string;
      value: number;
    }>;
  };
}

export async function fetchEIAInventory(): Promise<void> {
  const key = process.env.EIA_API_KEY;
  if (!key) {
    log('WARN', 'EIA_API_KEY not set — skipping EIA inventory fetch');
    return;
  }

  try {
    const url = `https://api.eia.gov/v2/petroleum/stoc/wstk/data/?api_key=${key}&frequency=weekly&data[0]=value&facets[product][]=EPC0&sort[0][column]=period&sort[0][direction]=desc&length=1`;
    const res = await fetch(url);

    if (!res.ok) {
      log('ERROR', `EIA API returned ${res.status}: ${res.statusText}`);
      return;
    }

    const data: EIAResponse = await res.json();
    const rows = data?.response?.data;

    if (!rows || rows.length === 0) {
      log('WARN', 'EIA: no inventory data returned');
      return;
    }

    const latest = rows[0];
    // EIA reports in thousand barrels — convert to barrels
    const crudeStorageBbl = latest.value * 1000;

    // US consumption ~20M bbl/day
    const usConsumptionBpd = 20_000_000;
    const daysOfSupply = Math.round((crudeStorageBbl / usConsumptionBpd) * 10) / 10;

    // US max crude storage capacity ~600M bbl
    const usMaxCapacity = 600_000_000;
    const pctCapacity = Math.round((crudeStorageBbl / usMaxCapacity) * 1000) / 10;

    const now = new Date().toISOString();

    await upsertStorageLevel({
      region: 'USA',
      snapshot_date: latest.period,
      crude_storage_bbl: crudeStorageBbl,
      days_of_supply: daysOfSupply,
      pct_capacity: pctCapacity,
      source: 'EIA',
      updated_at: now,
    });

    log('INFO', `EIA: US crude stocks ${(crudeStorageBbl / 1_000_000).toFixed(1)}M bbl, ${daysOfSupply} days supply, ${pctCapacity}% capacity`);
  } catch (err) {
    log('ERROR', `EIA fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
