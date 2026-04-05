import { log } from '../types';
import { upsertRefinery } from '../db';

interface EIAUtilizationResponse {
  response: {
    data: Array<{
      period: string;
      value: number;
    }>;
  };
}

export async function fetchRefineryUtilization(): Promise<void> {
  const key = process.env.EIA_API_KEY;
  if (!key) {
    log('WARN', 'EIA_API_KEY not set — skipping refinery utilization fetch');
    return;
  }

  try {
    const url = `https://api.eia.gov/v2/petroleum/pnp/wiup/data/?api_key=${key}&frequency=weekly&data[0]=value&facets[duoarea][]=NUS&facets[product][]=EPC0&sort[0][column]=period&sort[0][direction]=desc&length=1`;
    const res = await fetch(url);

    if (!res.ok) {
      log('ERROR', `EIA refinery API returned ${res.status}: ${res.statusText}`);
      return;
    }

    const data = (await res.json()) as EIAUtilizationResponse;
    const rows = data?.response?.data;

    if (!rows || rows.length === 0) {
      log('WARN', 'EIA: no refinery utilization data returned');
      return;
    }

    const latest = rows[0]!;
    const utilization = latest.value;
    const snapshotDate = latest.period;

    // Update all US-region refineries with this utilization
    const usRefineries = ['Port Arthur (TX)', 'Baytown (TX)', 'Garyville (LA)'];

    for (const name of usRefineries) {
      upsertRefinery({
        name,
        utilization_pct: utilization,
        snapshot_date: snapshotDate,
        source: 'EIA',
      });
    }

    log('INFO', `EIA: US refinery utilization ${utilization}% for ${snapshotDate} — updated ${usRefineries.length} refineries`);
  } catch (err) {
    log('ERROR', `EIA refinery utilization fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
