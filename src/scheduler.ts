import cron from 'node-cron';
import { fetchAISPositions } from './pipeline/ais';
import { fetchEIAInventory } from './pipeline/eia';
import { fetchCrudePrices } from './pipeline/prices';
import { fetchGasPrices } from './pipeline/gas';
import { fetchAGSIStorage } from './pipeline/agsi';
import { log } from './types';

export function startScheduler(): void {
  // AIS positions every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      await fetchAISPositions();
    } catch (err) {
      log('ERROR', `Scheduled AIS fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Crude prices every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await fetchCrudePrices();
    } catch (err) {
      log('ERROR', `Scheduled crude price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Gas prices every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await fetchGasPrices();
    } catch (err) {
      log('ERROR', `Scheduled gas price fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // EIA inventory every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await fetchEIAInventory();
    } catch (err) {
      log('ERROR', `Scheduled EIA inventory fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // AGSI storage every 12 hours
  cron.schedule('0 */12 * * *', async () => {
    try {
      await fetchAGSIStorage();
    } catch (err) {
      log('ERROR', `Scheduled AGSI storage fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  log('INFO', 'Scheduler started — 5 pipeline jobs registered');
}
