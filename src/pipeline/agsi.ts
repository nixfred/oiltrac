import { log } from '../types';
import { upsertStorageLevel } from '../db';

interface AGSIResponse {
  gasDayStart: string;
  gasInStorage: number;
  full: number;
}

export async function fetchAGSIStorage(): Promise<void> {
  const key = process.env.AGSI_API_KEY;
  if (!key) {
    log('WARN', 'AGSI_API_KEY not set — skipping EU gas storage fetch');
    return;
  }

  try {
    const url = 'https://agsi.gie.eu/api/data/eu';
    const res = await fetch(url, { headers: { 'x-key': key } });

    if (!res.ok) {
      log('ERROR', `AGSI API returned ${res.status}: ${res.statusText}`);
      return;
    }

    const data: AGSIResponse = await res.json();

    if (!data || data.gasInStorage === undefined) {
      log('WARN', 'AGSI: no storage data in response');
      return;
    }

    // Convert gasInStorage from TWh to approximate barrel equivalent
    // 1 TWh ~ 5.8M bbl equivalent
    const twhToBblFactor = 5_800_000;
    const crudeStorageBbl = Math.round(data.gasInStorage * twhToBblFactor);

    // EU gas consumption ~13 TWh/day => ~75.4M bbl-equivalent/day
    const euDailyConsumptionBblEq = 75_400_000;
    const daysOfSupply = Math.round((crudeStorageBbl / euDailyConsumptionBblEq) * 10) / 10;

    const pctCapacity = data.full ?? 0;
    const now = new Date().toISOString();

    await upsertStorageLevel({
      region: 'EU',
      snapshot_date: data.gasDayStart,
      crude_storage_bbl: crudeStorageBbl,
      days_of_supply: daysOfSupply,
      pct_capacity: pctCapacity,
      source: 'AGSI',
      updated_at: now,
    });

    log('INFO', `AGSI: EU gas storage ${data.gasInStorage} TWh (${(crudeStorageBbl / 1_000_000).toFixed(1)}M bbl-eq), ${pctCapacity}% full`);
  } catch (err) {
    log('ERROR', `AGSI fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
