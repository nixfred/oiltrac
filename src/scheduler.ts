import cron from 'node-cron';
import { fetchAISPositions } from './pipeline/ais';
import { fetchEIAInventory } from './pipeline/eia';
import { fetchCrudePrices } from './pipeline/prices';
import { fetchGasPrices } from './pipeline/gas';
import { fetchAGSIStorage } from './pipeline/agsi';
import { log } from './types';

export function startScheduler(): void {
  // AIS positions twice daily (6 AM and 6 PM UTC)
  cron.schedule('0 6,18 * * *', async () => {
    try {
      await fetchAISPositions();
    } catch (err) {
      log('ERROR', `Scheduled AIS fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Crude prices twice daily (7 AM and 7 PM UTC)
  cron.schedule('0 7,19 * * *', async () => {
    try {
      await fetchCrudePrices();
    } catch (err) {
      log('ERROR', `Scheduled crude price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Gas prices once daily (8 AM UTC)
  cron.schedule('0 8 * * *', async () => {
    try {
      await fetchGasPrices();
    } catch (err) {
      log('ERROR', `Scheduled gas price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // EIA inventory once daily (9 AM UTC)
  cron.schedule('0 9 * * *', async () => {
    try {
      await fetchEIAInventory();
    } catch (err) {
      log('ERROR', `Scheduled EIA inventory fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // AGSI storage once daily (10 AM UTC)
  cron.schedule('0 10 * * *', async () => {
    try {
      await fetchAGSIStorage();
    } catch (err) {
      log('ERROR', `Scheduled AGSI storage fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  log('INFO', 'Scheduler started — 5 pipeline jobs (1-2x daily each)');
}
