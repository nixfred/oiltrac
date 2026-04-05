import { Database } from 'bun:sqlite';
import type {
  Vessel,
  Port,
  PortSnapshot,
  Chokepoint,
  PriceRecord,
  StorageLevel,
  FleetSummary,
  Alert,
  RunwayEstimate,
  Sanction,
  SanctionedVessel,
  PortHistory,
  PriceForecast,
  CargoFlow,
  RefineryStatus,
} from './types';
import { log } from './types';

// ---------------------------------------------------------------------------
// Database initialisation
// ---------------------------------------------------------------------------

const DB_PATH = process.env.DB_PATH || './data/oiltrac.db';
const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode=WAL');

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Schema creation
// ---------------------------------------------------------------------------

db.exec(`
  CREATE TABLE IF NOT EXISTS vessels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mmsi TEXT,
    name TEXT,
    vessel_class TEXT,
    flag TEXT,
    lat REAL,
    lng REAL,
    speed REAL,
    heading REAL,
    draught REAL,
    max_draught REAL,
    destination TEXT,
    eta TEXT,
    status TEXT,
    cargo_est_bbl INTEGER,
    ais_dark INTEGER DEFAULT 0,
    snapshot_date TEXT,
    fetched_at TEXT
  );

  CREATE TABLE IF NOT EXISTS ports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    name TEXT,
    country TEXT,
    lat REAL,
    lng REAL,
    region TEXT,
    capacity_bpd INTEGER,
    storage_capacity_bbl INTEGER
  );

  CREATE TABLE IF NOT EXISTS port_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    port_code TEXT,
    snapshot_date TEXT,
    ships_inbound INTEGER,
    barrels_inbound INTEGER,
    next_arrival_eta TEXT,
    storage_pct REAL,
    fetched_at TEXT
  );

  CREATE TABLE IF NOT EXISTS chokepoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    lat REAL,
    lng REAL,
    baseline_daily_vessels INTEGER,
    current_daily_vessels INTEGER,
    pct_of_normal REAL,
    status TEXT,
    snapshot_date TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_date TEXT UNIQUE,
    brent_usd REAL,
    wti_usd REAL,
    nat_gas_usd REAL,
    us_avg_gas_usd REAL,
    us_ca_gas_usd REAL,
    eu_avg_gas_eur REAL,
    singapore_gas_usd REAL,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS storage_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    region TEXT,
    snapshot_date TEXT,
    crude_storage_bbl INTEGER,
    days_of_supply REAL,
    pct_capacity REAL,
    source TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sanctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name TEXT,
    entity_type TEXT,
    mmsi TEXT,
    imo TEXT,
    source TEXT,
    program TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS refinery_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    region TEXT,
    lat REAL,
    lng REAL,
    capacity_bpd INTEGER,
    utilization_pct REAL,
    snapshot_date TEXT,
    source TEXT,
    updated_at TEXT
  );
`);

log('INFO', 'Database schema initialised');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapshotDates(): string[] {
  const t = today();
  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(t);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function seedPorts(): void {
  const count = db.query('SELECT COUNT(*) as c FROM ports').get() as { c: number };
  if (count.c > 0) return;

  const ports = [
    ['RAS_TANURA', 'Ras Tanura', 'Saudi Arabia', 26.68, 50.17, 'MIDDLE_EAST', 6500000, 50000000],
    ['FUJAIRAH', 'Fujairah', 'UAE', 25.12, 56.33, 'MIDDLE_EAST', 2000000, 42000000],
    ['JEBEL_ALI', 'Jebel Ali', 'UAE', 25.01, 55.06, 'MIDDLE_EAST', 1500000, 20000000],
    ['SINGAPORE', 'Singapore', 'Singapore', 1.26, 103.84, 'ASIA', 3000000, 65000000],
    ['ROTTERDAM', 'Rotterdam', 'Netherlands', 51.95, 4.05, 'EU', 2500000, 45000000],
    ['HOUSTON', 'Houston', 'USA', 29.73, -95.02, 'USA', 4500000, 80000000],
    ['LONG_BEACH', 'Long Beach', 'USA', 33.75, -118.19, 'USA', 1800000, 35000000],
    ['NINGBO', 'Ningbo', 'China', 29.87, 121.88, 'ASIA', 2800000, 55000000],
    ['YOKOHAMA', 'Yokohama', 'Japan', 35.44, 139.64, 'ASIA', 1200000, 30000000],
    ['SALDANHA', 'Saldanha Bay', 'South Africa', -33.01, 17.93, 'EU', 500000, 15000000],
    ['DURBAN', 'Durban', 'South Africa', -29.87, 31.03, 'EU', 400000, 12000000],
    ['CEYHAN', 'Ceyhan', 'Turkey', 36.88, 35.95, 'EU', 1600000, 25000000],
  ];

  const stmt = db.query(
    'INSERT INTO ports (code, name, country, lat, lng, region, capacity_bpd, storage_capacity_bbl) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  for (const p of ports) {
    stmt.run(...p);
  }
  log('INFO', `Seeded ${ports.length} ports`);
}

function seedVessels(): void {
  const count = db.query('SELECT COUNT(*) as c FROM vessels').get() as { c: number };
  if (count.c > 0) return;

  const dates = snapshotDates();

  // Class capacities in barrels (approximate DWT conversion)
  const classBbl: Record<string, number> = {
    VLCC: 2000000,
    Suezmax: 1000000,
    Aframax: 600000,
    LNG: 400000,
    Product: 300000,
  };

  // Max draughts by class (metres)
  const classMaxDraught: Record<string, number> = {
    VLCC: 22.0,
    Suezmax: 17.0,
    Aframax: 15.0,
    LNG: 12.5,
    Product: 11.0,
  };

  interface VesselDef {
    name: string;
    mmsi: string;
    cls: string;
    flag: string;
    lat: number;
    lng: number;
    speed: number;
    heading: number;
    status: string;
    draughtPct: number;
    dest: string;
    eta: string;
    aisDark: number;
  }

  const vessels: VesselDef[] = [
    // 15 underway
    { name: 'FRONT ALTA', mmsi: '311000101', cls: 'VLCC', flag: 'MH', lat: 25.80, lng: 54.50, speed: 12.3, heading: 135, status: 'underway', draughtPct: 0.92, dest: 'SINGAPORE', eta: '2026-04-12', aisDark: 0 },
    { name: 'EAGLE VANCOUVER', mmsi: '311000102', cls: 'Suezmax', flag: 'MH', lat: 3.20, lng: 100.50, speed: 11.8, heading: 90, status: 'underway', draughtPct: 0.88, dest: 'NINGBO', eta: '2026-04-10', aisDark: 0 },
    { name: 'OLYMPIC LION', mmsi: '241000201', cls: 'VLCC', flag: 'GR', lat: 12.50, lng: 44.00, speed: 13.1, heading: 200, status: 'underway', draughtPct: 0.91, dest: 'ROTTERDAM', eta: '2026-04-18', aisDark: 0 },
    { name: 'PACIFIC VOYAGER', mmsi: '538000301', cls: 'Aframax', flag: 'MH', lat: 28.50, lng: -88.50, speed: 10.5, heading: 320, status: 'underway', draughtPct: 0.87, dest: 'HOUSTON', eta: '2026-04-07', aisDark: 0 },
    { name: 'MINERVA HELEN', mmsi: '241000202', cls: 'Suezmax', flag: 'GR', lat: 34.80, lng: 25.50, speed: 14.2, heading: 270, status: 'underway', draughtPct: 0.90, dest: 'CEYHAN', eta: '2026-04-08', aisDark: 0 },
    { name: 'DUBAI HARMONY', mmsi: '470000101', cls: 'VLCC', flag: 'AE', lat: 5.00, lng: 75.00, speed: 12.7, heading: 110, status: 'underway', draughtPct: 0.93, dest: 'YOKOHAMA', eta: '2026-04-15', aisDark: 0 },
    { name: 'MARAN POSEIDON', mmsi: '241000203', cls: 'VLCC', flag: 'GR', lat: 31.50, lng: 32.40, speed: 11.5, heading: 340, status: 'underway', draughtPct: 0.89, dest: 'ROTTERDAM', eta: '2026-04-14', aisDark: 0 },
    { name: 'SCF PRIMORYE', mmsi: '273000101', cls: 'Suezmax', flag: 'RU', lat: 2.20, lng: 104.80, speed: 10.2, heading: 45, status: 'underway', draughtPct: 0.86, dest: 'NINGBO', eta: '2026-04-09', aisDark: 0 },
    { name: 'NAVE ANDROMEDA', mmsi: '538000302', cls: 'Aframax', flag: 'MH', lat: 50.00, lng: 1.00, speed: 12.0, heading: 180, status: 'underway', draughtPct: 0.85, dest: 'ROTTERDAM', eta: '2026-04-06', aisDark: 0 },
    { name: 'ATLANTIC PROGRESS', mmsi: '311000103', cls: 'LNG', flag: 'MH', lat: 27.00, lng: -90.00, speed: 14.5, heading: 0, status: 'underway', draughtPct: 0.88, dest: 'LONG_BEACH', eta: '2026-04-11', aisDark: 0 },
    { name: 'CRIMSON MAJESTY', mmsi: '636000101', cls: 'VLCC', flag: 'LR', lat: -5.00, lng: 40.00, speed: 13.0, heading: 210, status: 'underway', draughtPct: 0.94, dest: 'SALDANHA', eta: '2026-04-13', aisDark: 0 },
    { name: 'NORDIC CROSS', mmsi: '220000101', cls: 'Suezmax', flag: 'DK', lat: 55.00, lng: 5.00, speed: 11.0, heading: 190, status: 'underway', draughtPct: 0.87, dest: 'ROTTERDAM', eta: '2026-04-06', aisDark: 0 },
    { name: 'ELANDRA EVEREST', mmsi: '538000303', cls: 'Aframax', flag: 'MH', lat: 22.00, lng: 115.00, speed: 10.8, heading: 60, status: 'underway', draughtPct: 0.89, dest: 'NINGBO', eta: '2026-04-08', aisDark: 0 },
    { name: 'STEALTH FALCON', mmsi: '636000102', cls: 'Product', flag: 'LR', lat: 32.00, lng: -65.00, speed: 13.5, heading: 250, status: 'underway', draughtPct: 0.90, dest: 'HOUSTON', eta: '2026-04-09', aisDark: 0 },
    { name: 'AL DAFNA', mmsi: '466000101', cls: 'LNG', flag: 'QA', lat: 26.00, lng: 52.00, speed: 14.0, heading: 100, status: 'underway', draughtPct: 0.86, dest: 'YOKOHAMA', eta: '2026-04-16', aisDark: 0 },

    // 5 anchor
    { name: 'HARCOURT', mmsi: '311000104', cls: 'VLCC', flag: 'MH', lat: 1.20, lng: 103.90, speed: 0.0, heading: 0, status: 'anchor', draughtPct: 0.91, dest: 'SINGAPORE', eta: '2026-04-06', aisDark: 0 },
    { name: 'BW LIONESS', mmsi: '311000105', cls: 'Product', flag: 'MH', lat: 25.15, lng: 56.40, speed: 0.0, heading: 0, status: 'anchor', draughtPct: 0.88, dest: 'FUJAIRAH', eta: '2026-04-06', aisDark: 0 },
    { name: 'CELSIUS RIGA', mmsi: '538000304', cls: 'Aframax', flag: 'MH', lat: 29.70, lng: -94.90, speed: 0.0, heading: 0, status: 'anchor', draughtPct: 0.87, dest: 'HOUSTON', eta: '2026-04-06', aisDark: 0 },
    { name: 'TORM HELLERUP', mmsi: '220000102', cls: 'Suezmax', flag: 'DK', lat: 52.00, lng: 4.10, speed: 0.0, heading: 0, status: 'anchor', draughtPct: 0.90, dest: 'ROTTERDAM', eta: '2026-04-06', aisDark: 0 },
    { name: 'FPMC C RANGER', mmsi: '416000101', cls: 'VLCC', flag: 'TW', lat: 29.90, lng: 121.90, speed: 0.0, heading: 0, status: 'anchor', draughtPct: 0.93, dest: 'NINGBO', eta: '2026-04-06', aisDark: 0 },

    // 3 stranded (near chokepoints, speed 0-1)
    { name: 'ADVANTAGE SPRING', mmsi: '636000103', cls: 'VLCC', flag: 'LR', lat: 26.60, lng: 56.30, speed: 0.5, heading: 90, status: 'stranded', draughtPct: 0.92, dest: 'SINGAPORE', eta: '2026-04-20', aisDark: 0 },
    { name: 'RIDGEBURY JANE', mmsi: '538000305', cls: 'Suezmax', flag: 'MH', lat: 12.55, lng: 43.35, speed: 0.8, heading: 180, status: 'stranded', draughtPct: 0.89, dest: 'ROTTERDAM', eta: '2026-04-22', aisDark: 0 },
    { name: 'NEW WISDOM', mmsi: '477000101', cls: 'Aframax', flag: 'HK', lat: 30.48, lng: 32.35, speed: 0.3, heading: 350, status: 'stranded', draughtPct: 0.86, dest: 'CEYHAN', eta: '2026-04-18', aisDark: 0 },

    // 3 ballast (speed 11-14, low draught)
    { name: 'YANGTZE HARMONY', mmsi: '413000101', cls: 'VLCC', flag: 'CN', lat: 15.00, lng: 60.00, speed: 13.5, heading: 310, status: 'ballast', draughtPct: 0.35, dest: 'RAS_TANURA', eta: '2026-04-10', aisDark: 0 },
    { name: 'OCEAN GRACE', mmsi: '538000306', cls: 'Suezmax', flag: 'MH', lat: -25.00, lng: 25.00, speed: 12.0, heading: 30, status: 'ballast', draughtPct: 0.32, dest: 'DURBAN', eta: '2026-04-08', aisDark: 0 },
    { name: 'STENA SUPREME', mmsi: '266000101', cls: 'Aframax', flag: 'SE', lat: 48.00, lng: -8.00, speed: 11.5, heading: 170, status: 'ballast', draughtPct: 0.38, dest: 'SALDANHA', eta: '2026-04-14', aisDark: 0 },

    // 2 dark (ais_dark = 1)
    { name: 'NISSOS SCHINOUSSA', mmsi: '241000204', cls: 'VLCC', flag: 'GR', lat: 26.00, lng: 55.00, speed: 8.0, heading: 150, status: 'dark', draughtPct: 0.91, dest: 'SINGAPORE', eta: '2026-04-14', aisDark: 1 },
    { name: 'GRAN COUVA', mmsi: '375000101', cls: 'LNG', flag: 'TT', lat: 10.00, lng: -62.00, speed: 6.5, heading: 0, status: 'dark', draughtPct: 0.85, dest: 'HOUSTON', eta: '2026-04-10', aisDark: 1 },

    // 2 remaining
    { name: 'KRITI BASTION', mmsi: '241000205', cls: 'LNG', flag: 'GR', lat: 35.50, lng: 23.50, speed: 12.8, heading: 90, status: 'underway', draughtPct: 0.87, dest: 'CEYHAN', eta: '2026-04-07', aisDark: 0 },
    { name: 'SIENNA', mmsi: '636000104', cls: 'Product', flag: 'LR', lat: 33.80, lng: -118.10, speed: 0.0, heading: 0, status: 'anchor', draughtPct: 0.86, dest: 'LONG_BEACH', eta: '2026-04-06', aisDark: 0 },
  ];

  const stmt = db.query(
    `INSERT INTO vessels (mmsi, name, vessel_class, flag, lat, lng, speed, heading, draught, max_draught, destination, eta, status, cargo_est_bbl, ais_dark, snapshot_date, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const v of vessels) {
    const maxD = classMaxDraught[v.cls];
    const draught = Math.round(maxD * v.draughtPct * 100) / 100;
    const cargo = Math.round(v.draughtPct * classBbl[v.cls]);

    for (let di = 0; di < dates.length; di++) {
      const date = dates[di];
      // Shift position for historical dates to simulate movement
      const latShift = di * (Math.random() * 0.5 - 0.25);
      const lngShift = di * (Math.random() * 0.5 - 0.25);
      const lat = Math.round((v.lat + latShift) * 10000) / 10000;
      const lng = Math.round((v.lng + lngShift) * 10000) / 10000;

      stmt.run(
        v.mmsi,
        v.name,
        v.cls,
        v.flag,
        lat,
        lng,
        v.speed,
        v.heading,
        draught,
        maxD,
        v.dest,
        v.eta,
        v.status,
        cargo,
        v.aisDark,
        date,
        now()
      );
    }
  }
  log('INFO', `Seeded ${vessels.length} vessels x ${dates.length} dates`);
}

function seedPortSnapshots(): void {
  const count = db.query('SELECT COUNT(*) as c FROM port_snapshots').get() as { c: number };
  if (count.c > 0) return;

  const dates = snapshotDates();
  const ports = db.query('SELECT code FROM ports').all() as { code: string }[];

  const stmt = db.query(
    `INSERT INTO port_snapshots (port_code, snapshot_date, ships_inbound, barrels_inbound, next_arrival_eta, storage_pct, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // Deterministic seed based on port code hash
  function simpleHash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  for (const port of ports) {
    const base = simpleHash(port.code);
    for (let di = 0; di < dates.length; di++) {
      const ships = 2 + ((base + di * 3) % 7); // 2-8
      const barrels = ships * (120000 + ((base + di) % 5) * 40000);
      const storagePct = 55 + ((base + di * 7) % 31); // 55-85
      const etaDay = new Date(dates[di]);
      etaDay.setDate(etaDay.getDate() + 1 + (di % 3));
      stmt.run(
        port.code,
        dates[di],
        ships,
        barrels,
        etaDay.toISOString().slice(0, 10),
        storagePct,
        now()
      );
    }
  }
  log('INFO', `Seeded port snapshots for ${ports.length} ports x ${dates.length} dates`);
}

function seedChokepoints(): void {
  const count = db.query('SELECT COUNT(*) as c FROM chokepoints').get() as { c: number };
  if (count.c > 0) return;

  const dates = snapshotDates();

  const chokes = [
    { name: 'Strait of Hormuz', lat: 26.56, lng: 56.25, baseline: 40, current: 24, pct: 60.0, status: 'degraded' },
    { name: 'Strait of Malacca', lat: 2.50, lng: 101.80, baseline: 25, current: 24, pct: 95.0, status: 'open' },
    { name: 'Suez Canal', lat: 30.50, lng: 32.30, baseline: 20, current: 18, pct: 88.0, status: 'open' },
    { name: 'Bab el-Mandeb', lat: 12.60, lng: 43.30, baseline: 18, current: 8, pct: 45.0, status: 'degraded' },
    { name: 'Panama Canal', lat: 9.00, lng: -79.50, baseline: 14, current: 8, pct: 55.0, status: 'degraded' },
  ];

  const stmt = db.query(
    `INSERT INTO chokepoints (name, lat, lng, baseline_daily_vessels, current_daily_vessels, pct_of_normal, status, snapshot_date, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const c of chokes) {
    for (let di = 0; di < dates.length; di++) {
      // Slight variance for historical dates
      const currentAdj = c.current + (di === 0 ? 0 : Math.floor(Math.random() * 3) - 1);
      const pctAdj = Math.round((currentAdj / c.baseline) * 100 * 10) / 10;
      stmt.run(
        c.name,
        c.lat,
        c.lng,
        c.baseline,
        currentAdj,
        pctAdj,
        c.status,
        dates[di],
        now()
      );
    }
  }
  log('INFO', `Seeded ${chokes.length} chokepoints x ${dates.length} dates`);
}

function seedPrices(): void {
  const count = db.query('SELECT COUNT(*) as c FROM prices').get() as { c: number };
  if (count.c > 0) return;

  const dates = snapshotDates();
  const brent = [115.40, 114.80, 116.20, 113.50, 112.90];
  const wti = [111.20, 110.60, 112.80, 109.40, 108.70];
  const natGas = [4.12, 4.05, 3.98, 3.85, 3.82];
  const usGas = [4.29, 4.25, 4.22, 4.18, 4.15];
  const usCaGas = [5.95, 5.88, 5.82, 5.99, 6.05];
  const euGas = [2.95, 2.88, 2.92, 2.85, 2.80];
  const sgGas = [2.52, 2.48, 2.55, 2.45, 2.42];

  const stmt = db.query(
    `INSERT INTO prices (snapshot_date, brent_usd, wti_usd, nat_gas_usd, us_avg_gas_usd, us_ca_gas_usd, eu_avg_gas_eur, singapore_gas_usd, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (let i = 0; i < dates.length; i++) {
    stmt.run(dates[i], brent[i], wti[i], natGas[i], usGas[i], usCaGas[i], euGas[i], sgGas[i], now());
  }
  log('INFO', `Seeded prices for ${dates.length} dates`);
}

function seedStorageLevels(): void {
  const count = db.query('SELECT COUNT(*) as c FROM storage_levels').get() as { c: number };
  if (count.c > 0) return;

  const dates = snapshotDates();

  const regions = [
    { region: 'USA', bbl: 430000000, days: 25.0, pct: 58.0, source: 'EIA' },
    { region: 'EU', bbl: 350000000, days: 22.0, pct: 52.0, source: 'IEA' },
    { region: 'ASIA', bbl: 280000000, days: 18.0, pct: 48.0, source: 'JODI' },
    { region: 'MIDDLE_EAST', bbl: 180000000, days: 35.0, pct: 72.0, source: 'OPEC' },
  ];

  const stmt = db.query(
    `INSERT INTO storage_levels (region, snapshot_date, crude_storage_bbl, days_of_supply, pct_capacity, source, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const r of regions) {
    for (let di = 0; di < dates.length; di++) {
      // Slight variation per day
      const bblAdj = r.bbl + (di - 2) * 2000000;
      const daysAdj = Math.round((r.days + (di - 2) * 0.3) * 10) / 10;
      const pctAdj = Math.round((r.pct + (di - 2) * 0.4) * 10) / 10;
      stmt.run(r.region, dates[di], bblAdj, daysAdj, pctAdj, r.source, now());
    }
  }
  log('INFO', `Seeded storage levels for ${regions.length} regions x ${dates.length} dates`);
}

function seedSanctions(): void {
  const count = db.query('SELECT COUNT(*) as c FROM sanctions').get() as { c: number };
  if (count.c > 0) return;

  const sanctions = [
    ['OLYMPIC LION', 'vessel', '241000201', '', 'OFAC', 'IRAN', now()],
    ['SCF PRIMORYE', 'vessel', '273000101', '', 'OFAC', 'RUSSIA-EO14024', now()],
    ['STEALTH FALCON', 'vessel', '636000102', '', 'EU', 'IRAN', now()],
    ['NISSOS SCHINOUSSA', 'vessel', '241000204', '', 'OFAC', 'IRAN', now()],
    ['GRAN COUVA', 'vessel', '375000101', '', 'OFAC', 'VENEZUELA', now()],
  ];

  const stmt = db.query(
    'INSERT INTO sanctions (entity_name, entity_type, mmsi, imo, source, program, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const s of sanctions) {
    stmt.run(...s);
  }
  log('INFO', `Seeded ${sanctions.length} sanctions entries`);
}

function seedRefineries(): void {
  const count = db.query('SELECT COUNT(*) as c FROM refinery_status').get() as { c: number };
  if (count.c > 0) return;

  const dates = snapshotDates();

  const refineries = [
    { name: 'Port Arthur (TX)', region: 'USA', lat: 29.87, lng: -93.93, capacity: 630000, util: 92, source: 'EIA' },
    { name: 'Baytown (TX)', region: 'USA', lat: 29.73, lng: -95.02, capacity: 584000, util: 88, source: 'EIA' },
    { name: 'Garyville (LA)', region: 'USA', lat: 30.06, lng: -90.59, capacity: 564000, util: 91, source: 'EIA' },
    { name: 'Jamnagar (India)', region: 'ASIA', lat: 22.47, lng: 69.07, capacity: 1240000, util: 95, source: 'OPEC' },
    { name: 'Ruwais (UAE)', region: 'MIDDLE_EAST', lat: 24.11, lng: 52.73, capacity: 922000, util: 90, source: 'OPEC' },
    { name: 'Rotterdam Europoort (NL)', region: 'EU', lat: 51.95, lng: 4.05, capacity: 404000, util: 85, source: 'IEA' },
    { name: 'Singapore Jurong (SG)', region: 'ASIA', lat: 1.27, lng: 103.70, capacity: 592000, util: 93, source: 'JODI' },
    { name: 'Ulsan (South Korea)', region: 'ASIA', lat: 35.54, lng: 129.36, capacity: 669000, util: 89, source: 'JODI' },
  ];

  const stmt = db.query(
    `INSERT INTO refinery_status (name, region, lat, lng, capacity_bpd, utilization_pct, snapshot_date, source, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const r of refineries) {
    for (let di = 0; di < dates.length; di++) {
      // Slight utilization variation per date (+-2-3%)
      const variation = (di - 2) * (1 + (di % 2));
      const util = Math.round((r.util + variation) * 10) / 10;
      stmt.run(r.name, r.region, r.lat, r.lng, r.capacity, util, dates[di], r.source, now());
    }
  }
  log('INFO', `Seeded ${refineries.length} refineries x ${dates.length} dates`);
}

function seedAll(): void {
  seedPorts();
  seedVessels();
  seedPortSnapshots();
  seedChokepoints();
  seedPrices();
  seedStorageLevels();
  seedSanctions();
  seedRefineries();
}

seedAll();

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

export function getVessels(date?: string): Vessel[] {
  const d = date || today();
  return db.query('SELECT * FROM vessels WHERE snapshot_date = ?').all(d) as Vessel[];
}

export function getVesselByMmsi(mmsi: string): Vessel | null {
  return (db.query('SELECT * FROM vessels WHERE mmsi = ? ORDER BY snapshot_date DESC LIMIT 1').get(mmsi) as Vessel) || null;
}

export function upsertVessel(v: Partial<Vessel>): void {
  const existing = db.query(
    'SELECT id FROM vessels WHERE mmsi = ? AND snapshot_date = ?'
  ).get(v.mmsi, v.snapshot_date) as { id: number } | null;

  if (existing) {
    db.run(
      `UPDATE vessels SET name=?, vessel_class=?, flag=?, lat=?, lng=?, speed=?, heading=?, draught=?, max_draught=?, destination=?, eta=?, status=?, cargo_est_bbl=?, ais_dark=?, fetched_at=? WHERE id=?`,
      v.name ?? null, v.vessel_class ?? null, v.flag ?? null, v.lat ?? null, v.lng ?? null,
      v.speed ?? null, v.heading ?? null, v.draught ?? null, v.max_draught ?? null,
      v.destination ?? null, v.eta ?? null, v.status ?? null, v.cargo_est_bbl ?? null,
      v.ais_dark ?? 0, now(), existing.id
    );
  } else {
    db.run(
      `INSERT INTO vessels (mmsi, name, vessel_class, flag, lat, lng, speed, heading, draught, max_draught, destination, eta, status, cargo_est_bbl, ais_dark, snapshot_date, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      v.mmsi ?? null, v.name ?? null, v.vessel_class ?? null, v.flag ?? null,
      v.lat ?? null, v.lng ?? null, v.speed ?? null, v.heading ?? null,
      v.draught ?? null, v.max_draught ?? null, v.destination ?? null, v.eta ?? null,
      v.status ?? null, v.cargo_est_bbl ?? null, v.ais_dark ?? 0,
      v.snapshot_date ?? today(), now()
    );
  }
}

export function getPorts(): Port[] {
  return db.query('SELECT * FROM ports ORDER BY code').all() as Port[];
}

export function getPortSnapshots(date?: string): PortSnapshot[] {
  const d = date || today();
  return db.query('SELECT * FROM port_snapshots WHERE snapshot_date = ?').all(d) as PortSnapshot[];
}

export function upsertPortSnapshot(ps: Partial<PortSnapshot>): void {
  const existing = db.query(
    'SELECT id FROM port_snapshots WHERE port_code = ? AND snapshot_date = ?'
  ).get(ps.port_code, ps.snapshot_date) as { id: number } | null;

  if (existing) {
    db.run(
      `UPDATE port_snapshots SET ships_inbound=?, barrels_inbound=?, next_arrival_eta=?, storage_pct=?, fetched_at=? WHERE id=?`,
      ps.ships_inbound ?? null, ps.barrels_inbound ?? null, ps.next_arrival_eta ?? null,
      ps.storage_pct ?? null, now(), existing.id
    );
  } else {
    db.run(
      `INSERT INTO port_snapshots (port_code, snapshot_date, ships_inbound, barrels_inbound, next_arrival_eta, storage_pct, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ps.port_code ?? null, ps.snapshot_date ?? today(), ps.ships_inbound ?? null,
      ps.barrels_inbound ?? null, ps.next_arrival_eta ?? null, ps.storage_pct ?? null, now()
    );
  }
}

export function getChokepoints(date?: string): Chokepoint[] {
  const d = date || today();
  return db.query('SELECT * FROM chokepoints WHERE snapshot_date = ?').all(d) as Chokepoint[];
}

export function upsertChokepoint(c: Partial<Chokepoint>): void {
  const existing = db.query(
    'SELECT id FROM chokepoints WHERE name = ? AND snapshot_date = ?'
  ).get(c.name, c.snapshot_date) as { id: number } | null;

  if (existing) {
    db.run(
      `UPDATE chokepoints SET lat=?, lng=?, baseline_daily_vessels=?, current_daily_vessels=?, pct_of_normal=?, status=?, updated_at=? WHERE id=?`,
      c.lat ?? null, c.lng ?? null, c.baseline_daily_vessels ?? null,
      c.current_daily_vessels ?? null, c.pct_of_normal ?? null, c.status ?? null, now(), existing.id
    );
  } else {
    db.run(
      `INSERT INTO chokepoints (name, lat, lng, baseline_daily_vessels, current_daily_vessels, pct_of_normal, status, snapshot_date, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c.name ?? null, c.lat ?? null, c.lng ?? null, c.baseline_daily_vessels ?? null,
      c.current_daily_vessels ?? null, c.pct_of_normal ?? null, c.status ?? null,
      c.snapshot_date ?? today(), now()
    );
  }
}

export function getLatestPrices(): PriceRecord | null {
  return (db.query('SELECT * FROM prices ORDER BY snapshot_date DESC LIMIT 1').get() as PriceRecord) || null;
}

export function getPriceHistory(limit?: number): PriceRecord[] {
  const l = limit || 30;
  return db.query('SELECT * FROM prices ORDER BY snapshot_date DESC LIMIT ?').all(l) as PriceRecord[];
}

export function upsertPrices(p: Partial<PriceRecord>): void {
  const existing = db.query(
    'SELECT id FROM prices WHERE snapshot_date = ?'
  ).get(p.snapshot_date) as { id: number } | null;

  if (existing) {
    db.run(
      `UPDATE prices SET brent_usd=?, wti_usd=?, nat_gas_usd=?, us_avg_gas_usd=?, us_ca_gas_usd=?, eu_avg_gas_eur=?, singapore_gas_usd=?, updated_at=? WHERE id=?`,
      p.brent_usd ?? null, p.wti_usd ?? null, p.nat_gas_usd ?? null,
      p.us_avg_gas_usd ?? null, p.us_ca_gas_usd ?? null, p.eu_avg_gas_eur ?? null,
      p.singapore_gas_usd ?? null, now(), existing.id
    );
  } else {
    db.run(
      `INSERT INTO prices (snapshot_date, brent_usd, wti_usd, nat_gas_usd, us_avg_gas_usd, us_ca_gas_usd, eu_avg_gas_eur, singapore_gas_usd, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      p.snapshot_date ?? today(), p.brent_usd ?? null, p.wti_usd ?? null,
      p.nat_gas_usd ?? null, p.us_avg_gas_usd ?? null, p.us_ca_gas_usd ?? null,
      p.eu_avg_gas_eur ?? null, p.singapore_gas_usd ?? null, now()
    );
  }
}

export function getStorageLevels(date?: string): StorageLevel[] {
  const d = date || today();
  return db.query('SELECT * FROM storage_levels WHERE snapshot_date = ?').all(d) as StorageLevel[];
}

export function upsertStorageLevel(s: Partial<StorageLevel>): void {
  const existing = db.query(
    'SELECT id FROM storage_levels WHERE region = ? AND snapshot_date = ?'
  ).get(s.region, s.snapshot_date) as { id: number } | null;

  if (existing) {
    db.run(
      `UPDATE storage_levels SET crude_storage_bbl=?, days_of_supply=?, pct_capacity=?, source=?, updated_at=? WHERE id=?`,
      s.crude_storage_bbl ?? null, s.days_of_supply ?? null, s.pct_capacity ?? null,
      s.source ?? null, now(), existing.id
    );
  } else {
    db.run(
      `INSERT INTO storage_levels (region, snapshot_date, crude_storage_bbl, days_of_supply, pct_capacity, source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      s.region ?? null, s.snapshot_date ?? today(), s.crude_storage_bbl ?? null,
      s.days_of_supply ?? null, s.pct_capacity ?? null, s.source ?? null, now()
    );
  }
}

export function getFleetSummary(date?: string): FleetSummary {
  const d = date || today();
  const vessels = db.query('SELECT status, cargo_est_bbl FROM vessels WHERE snapshot_date = ?').all(d) as {
    status: string;
    cargo_est_bbl: number;
  }[];

  const summary: FleetSummary = {
    total: vessels.length,
    underway: 0,
    stranded: 0,
    anchor: 0,
    ballast: 0,
    dark: 0,
    totalBblInTransit: 0,
  };

  for (const v of vessels) {
    switch (v.status) {
      case 'underway':
        summary.underway++;
        summary.totalBblInTransit += v.cargo_est_bbl;
        break;
      case 'stranded':
        summary.stranded++;
        summary.totalBblInTransit += v.cargo_est_bbl;
        break;
      case 'anchor':
        summary.anchor++;
        break;
      case 'ballast':
        summary.ballast++;
        break;
      case 'dark':
        summary.dark++;
        summary.totalBblInTransit += v.cargo_est_bbl;
        break;
    }
  }

  return summary;
}

export function getSnapshotDates(): string[] {
  const rows = db.query(
    'SELECT DISTINCT snapshot_date FROM vessels ORDER BY snapshot_date DESC'
  ).all() as { snapshot_date: string }[];
  return rows.map((r) => r.snapshot_date);
}

export function getAlerts(): Alert[] {
  const alerts: Alert[] = [];
  let id = 1;
  const ts = now();

  // Chokepoint alerts — degraded or closed
  const chokes = getChokepoints();
  for (const c of chokes) {
    if (c.status === 'degraded') {
      alerts.push({
        id: id++,
        type: 'chokepoint',
        severity: 'warning',
        message: `${c.name} operating at ${c.pct_of_normal}% of normal capacity`,
        created_at: ts,
        active: 1,
      });
    } else if (c.status === 'closed') {
      alerts.push({
        id: id++,
        type: 'chokepoint',
        severity: 'critical',
        message: `${c.name} is CLOSED — 0% throughput`,
        created_at: ts,
        active: 1,
      });
    }
  }

  // Dark vessel alerts
  const darkVessels = db.query(
    "SELECT name, mmsi FROM vessels WHERE ais_dark = 1 AND snapshot_date = ? GROUP BY mmsi"
  ).all(today()) as { name: string; mmsi: string }[];
  for (const v of darkVessels) {
    alerts.push({
      id: id++,
      type: 'dark_vessel',
      severity: 'warning',
      message: `${v.name} (MMSI ${v.mmsi}) — AIS transponder dark`,
      created_at: ts,
      active: 1,
    });
  }

  // Price alerts — Brent > $110
  const prices = getLatestPrices();
  if (prices && prices.brent_usd > 110) {
    alerts.push({
      id: id++,
      type: 'price',
      severity: 'critical',
      message: `Brent crude at $${prices.brent_usd}/bbl — elevated above $110 threshold`,
      created_at: ts,
      active: 1,
    });
  }

  return alerts;
}

export function getRunwayEstimates(): RunwayEstimate[] {
  const d = today();

  // Get storage levels for today
  const storage = getStorageLevels(d);

  // Get port snapshots for today, grouped by region
  const portRows = db.query(`
    SELECT p.region, SUM(ps.ships_inbound) as ships, SUM(ps.barrels_inbound) as barrels
    FROM port_snapshots ps
    JOIN ports p ON p.code = ps.port_code
    WHERE ps.snapshot_date = ?
    GROUP BY p.region
  `).all(d) as { region: string; ships: number; barrels: number }[];

  const inboundByRegion: Record<string, { ships: number; barrels: number }> = {};
  for (const r of portRows) {
    inboundByRegion[r.region] = { ships: r.ships, barrels: r.barrels };
  }

  const estimates: RunwayEstimate[] = [];

  for (const s of storage) {
    const inbound = inboundByRegion[s.region] || { ships: 0, barrels: 0 };
    const daysVisible = s.days_of_supply;

    let status: 'safe' | 'warn' | 'critical';
    if (daysVisible >= 25) {
      status = 'safe';
    } else if (daysVisible >= 15) {
      status = 'warn';
    } else {
      status = 'critical';
    }

    estimates.push({
      region: s.region,
      daysVisible,
      bblInbound: inbound.barrels,
      shipsInbound: inbound.ships,
      status,
    });
  }

  return estimates;
}

// ---------------------------------------------------------------------------
// Vessel trails (historical positions across snapshot dates)
// ---------------------------------------------------------------------------

export function getVesselTrails(): { mmsi: string; trail: { lat: number; lng: number; date: string }[] }[] {
  const rows = db.query(`
    SELECT mmsi, lat, lng, snapshot_date
    FROM vessels
    ORDER BY mmsi, snapshot_date ASC
  `).all() as { mmsi: string; lat: number; lng: number; snapshot_date: string }[];

  const trailMap = new Map<string, { lat: number; lng: number; date: string }[]>();
  for (const r of rows) {
    if (!trailMap.has(r.mmsi)) trailMap.set(r.mmsi, []);
    trailMap.get(r.mmsi)!.push({ lat: r.lat, lng: r.lng, date: r.snapshot_date });
  }

  return Array.from(trailMap.entries()).map(([mmsi, trail]) => ({ mmsi, trail }));
}

// ---------------------------------------------------------------------------
// Sanctions queries
// ---------------------------------------------------------------------------

export function getSanctions(): Sanction[] {
  return db.query('SELECT * FROM sanctions ORDER BY entity_name').all() as Sanction[];
}

export function upsertSanction(s: Partial<Sanction>): void {
  const existing = db.query(
    'SELECT id FROM sanctions WHERE entity_name = ? AND source = ?'
  ).get(s.entity_name, s.source) as { id: number } | null;

  if (existing) {
    db.run(
      `UPDATE sanctions SET entity_type=?, mmsi=?, imo=?, program=?, updated_at=? WHERE id=?`,
      s.entity_type ?? null, s.mmsi ?? null, s.imo ?? null,
      s.program ?? null, now(), existing.id
    );
  } else {
    db.run(
      `INSERT INTO sanctions (entity_name, entity_type, mmsi, imo, source, program, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      s.entity_name ?? null, s.entity_type ?? null, s.mmsi ?? null,
      s.imo ?? null, s.source ?? null, s.program ?? null, now()
    );
  }
}

export function getSanctionedVessels(date?: string): SanctionedVessel[] {
  const d = date || today();
  return db.query(`
    SELECT v.*, s.source AS sanction_source, s.program AS sanction_program
    FROM vessels v
    INNER JOIN sanctions s
      ON (s.entity_name = v.name OR (s.mmsi != '' AND s.mmsi = v.mmsi))
    WHERE v.snapshot_date = ?
    GROUP BY v.id
  `).all(d) as SanctionedVessel[];
}

// ---------------------------------------------------------------------------
// Cargo flow aggregation (computed from vessel data)
// ---------------------------------------------------------------------------

const REGION_BOUNDS: Record<string, { latMin: number; latMax: number; lngMin: number; lngMax: number }> = {
  GULF:      { latMin: 23, latMax: 30, lngMin: 48, lngMax: 57 },
  WAF:       { latMin: -5, latMax: 10, lngMin: -15, lngMax: 15 },
  USGC:      { latMin: 25, latMax: 31, lngMin: -98, lngMax: -80 },
  NORTH_SEA: { latMin: 50, latMax: 62, lngMin: -5, lngMax: 10 },
  MED:       { latMin: 30, latMax: 42, lngMin: -5, lngMax: 36 },
  ASIA:      { latMin: -5, latMax: 22, lngMin: 100, lngMax: 125 },
  INDIA:     { latMin: -35, latMax: 10, lngMin: 40, lngMax: 100 },
};

const REGION_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  GULF:      { lat: 26.5, lng: 52.0 },
  WAF:       { lat: 4.0, lng: 2.0 },
  USGC:      { lat: 28.0, lng: -90.0 },
  NORTH_SEA: { lat: 56.0, lng: 3.0 },
  MED:       { lat: 36.0, lng: 18.0 },
  ASIA:      { lat: 15.0, lng: 112.0 },
  INDIA:     { lat: -10.0, lng: 70.0 },
};

function classifySourceRegion(lat: number, lng: number): string | null {
  for (const [region, b] of Object.entries(REGION_BOUNDS)) {
    if (lat >= b.latMin && lat <= b.latMax && lng >= b.lngMin && lng <= b.lngMax) {
      return region;
    }
  }
  return null;
}

export function getCargoFlows(date?: string): CargoFlow[] {
  const d = date || today();

  // Get all vessels with their destination port's region
  const rows = db.query(`
    SELECT v.lat, v.lng, v.cargo_est_bbl, v.destination, p.region as dest_region
    FROM vessels v
    LEFT JOIN ports p ON p.code = v.destination
    WHERE v.snapshot_date = ?
  `).all(d) as { lat: number; lng: number; cargo_est_bbl: number; destination: string; dest_region: string | null }[];

  // Group by (sourceRegion -> destRegion)
  const flowMap = new Map<string, { vesselCount: number; totalBbl: number }>();

  for (const row of rows) {
    const sourceRegion = classifySourceRegion(row.lat, row.lng);
    const destRegion = row.dest_region;
    if (!sourceRegion || !destRegion) continue;

    // Map port region names to flow region keys
    const destKey = destRegion === 'MIDDLE_EAST' ? 'GULF'
      : destRegion === 'EU' ? 'NORTH_SEA'
      : destRegion === 'USA' ? 'USGC'
      : destRegion === 'ASIA' ? 'ASIA'
      : null;
    if (!destKey) continue;
    if (sourceRegion === destKey) continue; // skip intra-region

    const key = `${sourceRegion}->${destKey}`;
    const existing = flowMap.get(key) || { vesselCount: 0, totalBbl: 0 };
    existing.vesselCount++;
    existing.totalBbl += row.cargo_est_bbl;
    flowMap.set(key, existing);
  }

  const flows: CargoFlow[] = [];
  for (const [key, data] of flowMap.entries()) {
    const [from, to] = key.split('->');
    const fromC = REGION_CENTROIDS[from];
    const toC = REGION_CENTROIDS[to];
    if (!fromC || !toC) continue;

    flows.push({
      id: key,
      name: `${from} to ${to}`,
      fromRegion: from,
      toRegion: to,
      fromLat: fromC.lat,
      fromLng: fromC.lng,
      toLat: toC.lat,
      toLng: toC.lng,
      vesselCount: data.vesselCount,
      totalBbl: data.totalBbl,
    });
  }

  return flows;
}

// ---------------------------------------------------------------------------
// Refinery status
// ---------------------------------------------------------------------------

export function getRefineries(date?: string): RefineryStatus[] {
  const d = date || today();
  return db.query('SELECT * FROM refinery_status WHERE snapshot_date = ?').all(d) as RefineryStatus[];
}

export function upsertRefinery(r: Partial<RefineryStatus>): void {
  const existing = db.query(
    'SELECT id FROM refinery_status WHERE name = ? AND snapshot_date = ?'
  ).get(r.name, r.snapshot_date) as { id: number } | null;

  if (existing) {
    db.run(
      `UPDATE refinery_status SET region=?, lat=?, lng=?, capacity_bpd=?, utilization_pct=?, source=?, updated_at=? WHERE id=?`,
      r.region ?? null, r.lat ?? null, r.lng ?? null, r.capacity_bpd ?? null,
      r.utilization_pct ?? null, r.source ?? null, now(), existing.id
    );
  } else {
    db.run(
      `INSERT INTO refinery_status (name, region, lat, lng, capacity_bpd, utilization_pct, snapshot_date, source, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      r.name ?? null, r.region ?? null, r.lat ?? null, r.lng ?? null,
      r.capacity_bpd ?? null, r.utilization_pct ?? null,
      r.snapshot_date ?? today(), r.source ?? null, now()
    );
  }
}

// ---------------------------------------------------------------------------
// Port congestion history
// ---------------------------------------------------------------------------

export function getPortHistory(portCode: string, limit?: number): PortHistory | null {
  const l = limit || 90;

  const port = db.query('SELECT code, name FROM ports WHERE code = ?').get(portCode) as { code: string; name: string } | null;
  if (!port) return null;

  const rows = db.query(`
    SELECT snapshot_date, ships_inbound, barrels_inbound, storage_pct
    FROM port_snapshots
    WHERE port_code = ?
    ORDER BY snapshot_date DESC
    LIMIT ?
  `).all(portCode, l) as { snapshot_date: string; ships_inbound: number; barrels_inbound: number; storage_pct: number }[];

  // Reverse to ASC order for charting
  rows.reverse();

  return {
    port_code: port.code,
    port_name: port.name,
    snapshots: rows.map((r) => ({
      date: r.snapshot_date,
      ships_inbound: r.ships_inbound,
      barrels_inbound: r.barrels_inbound,
      storage_pct: r.storage_pct,
    })),
  };
}

export function getPortCongestion(): { code: string; name: string; ships: number; trend: 'up' | 'down' | 'stable' }[] {
  const d = today();
  const threeDaysAgo = new Date(d);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().slice(0, 10);

  const ports = db.query('SELECT code, name FROM ports ORDER BY code').all() as { code: string; name: string }[];

  const results: { code: string; name: string; ships: number; trend: 'up' | 'down' | 'stable' }[] = [];

  for (const port of ports) {
    const current = db.query(`
      SELECT ships_inbound FROM port_snapshots
      WHERE port_code = ? ORDER BY snapshot_date DESC LIMIT 1
    `).get(port.code) as { ships_inbound: number } | null;

    const previous = db.query(`
      SELECT ships_inbound FROM port_snapshots
      WHERE port_code = ? AND snapshot_date <= ?
      ORDER BY snapshot_date DESC LIMIT 1
    `).get(port.code, threeDaysAgoStr) as { ships_inbound: number } | null;

    const ships = current?.ships_inbound ?? 0;
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (current && previous && previous.ships_inbound > 0) {
      const changePct = (current.ships_inbound - previous.ships_inbound) / previous.ships_inbound;
      if (changePct > 0.20) trend = 'up';
      else if (changePct < -0.20) trend = 'down';
    }

    results.push({ code: port.code, name: port.name, ships, trend });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Pump price forecast
// ---------------------------------------------------------------------------

export function getPriceForecast(): PriceForecast {
  const rows = db.query('SELECT * FROM prices ORDER BY snapshot_date ASC LIMIT 30').all() as PriceRecord[];

  const dataPoints = rows.length;

  let confidence: 'high' | 'medium' | 'low';
  if (dataPoints >= 14) confidence = 'high';
  else if (dataPoints >= 7) confidence = 'medium';
  else confidence = 'low';

  if (dataPoints === 0) {
    return {
      us_avg_gas_forecast: 0,
      us_ca_gas_forecast: 0,
      eu_gas_forecast: 0,
      forecast_date: today(),
      confidence: 'low',
      crude_trend: 'stable',
      explanation: 'Insufficient price data to generate forecast.',
    };
  }

  const oldest = rows[0];
  const latest = rows[rows.length - 1];

  const crudeChangePct = oldest.brent_usd > 0
    ? (latest.brent_usd - oldest.brent_usd) / oldest.brent_usd
    : 0;

  const retailImpact = crudeChangePct * 0.6;

  const usAvgForecast = Math.round((latest.us_avg_gas_usd * (1 + retailImpact)) * 100) / 100;
  const usCaForecast = Math.round((latest.us_ca_gas_usd * (1 + retailImpact)) * 100) / 100;
  const euForecast = Math.round((latest.eu_avg_gas_eur * (1 + retailImpact)) * 100) / 100;

  const totalDays = dataPoints > 1
    ? (new Date(latest.snapshot_date).getTime() - new Date(oldest.snapshot_date).getTime()) / (1000 * 60 * 60 * 24)
    : 7;
  const totalWeeks = Math.max(totalDays / 7, 1);
  const slopePerWeek = (crudeChangePct * 100) / totalWeeks;

  let crudeTrend: 'rising' | 'falling' | 'stable';
  if (slopePerWeek > 1) crudeTrend = 'rising';
  else if (slopePerWeek < -1) crudeTrend = 'falling';
  else crudeTrend = 'stable';

  const forecastDate = new Date(latest.snapshot_date);
  forecastDate.setDate(forecastDate.getDate() + 21);

  const trendWord = crudeTrend === 'rising' ? 'rise' : crudeTrend === 'falling' ? 'fall' : 'hold steady';
  const absChange = Math.abs(Math.round((latest.us_avg_gas_usd * retailImpact) * 100) / 100);
  const explanation = `Brent trending ${crudeTrend} at ${Math.round(slopePerWeek * 100) / 100}%/week. Retail gas expected to ${trendWord} by $${absChange.toFixed(2)} over next 2-4 weeks.`;

  return {
    us_avg_gas_forecast: usAvgForecast,
    us_ca_gas_forecast: usCaForecast,
    eu_gas_forecast: euForecast,
    forecast_date: forecastDate.toISOString().slice(0, 10),
    confidence,
    crude_trend: crudeTrend,
    explanation,
  };
}

// ---------------------------------------------------------------------------
// Default export
// ---------------------------------------------------------------------------

export default db;
