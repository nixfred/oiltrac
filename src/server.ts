import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';
import { log } from './types';
import {
  getVessels,
  getVesselByMmsi,
  getPorts,
  getPortSnapshots,
  getChokepoints,
  getLatestPrices,
  getPriceHistory,
  getStorageLevels,
  getFleetSummary,
  getSnapshotDates,
  getAlerts,
  getRunwayEstimates,
} from './db';
import { startScheduler } from './scheduler';

const app = new Hono();

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------

app.get('/api/vessels', (c) => {
  const date = c.req.query('date');
  return c.json(getVessels(date));
});

app.get('/api/vessels/:mmsi', (c) => {
  const vessel = getVesselByMmsi(c.req.param('mmsi'));
  if (!vessel) return c.json({ error: 'Vessel not found' }, 404);
  return c.json(vessel);
});

app.get('/api/ports', (c) => {
  const ports = getPorts();
  const date = c.req.query('date');
  const snapshots = getPortSnapshots(date);
  const snapshotMap = new Map(snapshots.map((s) => [s.port_code, s]));
  const merged = ports.map((p) => {
    const snap = snapshotMap.get(p.code);
    return {
      ...p,
      ships_inbound: snap?.ships_inbound ?? 0,
      barrels_inbound: snap?.barrels_inbound ?? 0,
      next_arrival_eta: snap?.next_arrival_eta ?? '',
      storage_pct: snap?.storage_pct ?? 0,
    };
  });
  return c.json(merged);
});

app.get('/api/chokepoints', (c) => {
  const date = c.req.query('date');
  return c.json(getChokepoints(date));
});

app.get('/api/prices/latest', (c) => {
  const prices = getLatestPrices();
  if (!prices) return c.json({ error: 'No price data' }, 404);
  return c.json(prices);
});

app.get('/api/prices/history', (c) => {
  const limit = parseInt(c.req.query('limit') || '30', 10);
  return c.json(getPriceHistory(limit));
});

app.get('/api/storage', (c) => {
  const date = c.req.query('date');
  return c.json(getStorageLevels(date));
});

app.get('/api/fleet/summary', (c) => {
  const date = c.req.query('date');
  return c.json(getFleetSummary(date));
});

app.get('/api/alerts', (c) => {
  return c.json(getAlerts());
});

app.get('/api/snapshot/dates', (c) => {
  return c.json(getSnapshotDates());
});

app.get('/api/runway', (c) => {
  return c.json(getRunwayEstimates());
});

// ---------------------------------------------------------------------------
// CSV exports
// ---------------------------------------------------------------------------

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const val = row[h];
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val ?? '');
        })
        .join(','),
    );
  }
  return lines.join('\n');
}

app.get('/api/export/vessels.csv', (c) => {
  const date = c.req.query('date');
  const vessels = getVessels(date);
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="oiltrac-vessels-${date || 'latest'}.csv"`);
  return c.body(toCsv(vessels as unknown as Record<string, unknown>[]));
});

app.get('/api/export/prices.csv', (c) => {
  const prices = getPriceHistory(365);
  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', 'attachment; filename="oiltrac-prices.csv"');
  return c.body(toCsv(prices as unknown as Record<string, unknown>[]));
});

// ---------------------------------------------------------------------------
// Static files — serve public/ directory
// ---------------------------------------------------------------------------

app.use('/*', serveStatic({ root: './public' }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '3000', 10);

startScheduler();

log('INFO', `OILTRAC server starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
