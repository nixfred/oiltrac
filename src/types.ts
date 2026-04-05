// Shared TypeScript types for OILTRAC

export type VesselClass = 'VLCC' | 'Suezmax' | 'Aframax' | 'LNG' | 'Product';
export type VesselStatus = 'underway' | 'anchor' | 'stranded' | 'ballast' | 'dark';
export type ChokeStatusLevel = 'open' | 'degraded' | 'closed';
export type RunwayLevel = 'safe' | 'warn' | 'critical';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface Vessel {
  id: number;
  mmsi: string;
  name: string;
  vessel_class: VesselClass;
  flag: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  draught: number;
  max_draught: number;
  destination: string;
  eta: string;
  status: VesselStatus;
  cargo_est_bbl: number;
  ais_dark: number;
  snapshot_date: string;
  fetched_at: string;
}

export interface Port {
  id: number;
  code: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  region: string;
  capacity_bpd: number;
  storage_capacity_bbl: number;
}

export interface PortSnapshot {
  id: number;
  port_code: string;
  snapshot_date: string;
  ships_inbound: number;
  barrels_inbound: number;
  next_arrival_eta: string;
  storage_pct: number;
  fetched_at: string;
}

export interface Chokepoint {
  id: number;
  name: string;
  lat: number;
  lng: number;
  baseline_daily_vessels: number;
  current_daily_vessels: number;
  pct_of_normal: number;
  status: ChokeStatusLevel;
  snapshot_date: string;
  updated_at: string;
}

export interface PriceRecord {
  id: number;
  snapshot_date: string;
  brent_usd: number;
  wti_usd: number;
  nat_gas_usd: number;
  us_avg_gas_usd: number;
  us_ca_gas_usd: number;
  eu_avg_gas_eur: number;
  singapore_gas_usd: number;
  updated_at: string;
}

export interface StorageLevel {
  id: number;
  region: string;
  snapshot_date: string;
  crude_storage_bbl: number;
  days_of_supply: number;
  pct_capacity: number;
  source: string;
  updated_at: string;
}

export interface RunwayEstimate {
  region: string;
  daysVisible: number;
  bblInbound: number;
  shipsInbound: number;
  status: RunwayLevel;
}

export interface ChokeStatus {
  name: string;
  lat: number;
  lng: number;
  pctOfNormal: number;
  status: ChokeStatusLevel;
}

export interface FleetSummary {
  total: number;
  underway: number;
  stranded: number;
  anchor: number;
  ballast: number;
  dark: number;
  totalBblInTransit: number;
}

export interface Alert {
  id: number;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  created_at: string;
  active: number;
}

export interface SystemStatus {
  lastFetch: string;
  vesselCount: number;
  dbSizeKb: number;
  uptime: number;
}

export interface PortWithSnapshot extends Port {
  ships_inbound: number;
  barrels_inbound: number;
  next_arrival_eta: string;
  storage_pct: number;
}

export interface Sanction {
  id: number;
  entity_name: string;
  entity_type: string;
  mmsi: string;
  imo: string;
  source: string;
  program: string;
  updated_at: string;
}

export interface SanctionedVessel extends Vessel {
  sanction_source: string;
  sanction_program: string;
}

export interface PortHistory {
  port_code: string;
  port_name: string;
  snapshots: {
    date: string;
    ships_inbound: number;
    barrels_inbound: number;
    storage_pct: number;
  }[];
}

export interface PriceForecast {
  us_avg_gas_forecast: number;
  us_ca_gas_forecast: number;
  eu_gas_forecast: number;
  forecast_date: string;
  confidence: 'high' | 'medium' | 'low';
  crude_trend: 'rising' | 'falling' | 'stable';
  explanation: string;
}

export interface CargoFlow {
  id: string;
  name: string;
  fromRegion: string;
  toRegion: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  vesselCount: number;
  totalBbl: number;
}

export interface RefineryStatus {
  id: number;
  name: string;
  region: string;
  lat: number;
  lng: number;
  capacity_bpd: number;
  utilization_pct: number;
  snapshot_date: string;
  source: string;
  updated_at: string;
}

export function log(level: LogLevel, message: string): void {
  const ts = new Date().toISOString();
  if (level === 'ERROR') {
    console.error(`[${ts}] [${level}] ${message}`);
  } else if (level === 'WARN') {
    console.warn(`[${ts}] [${level}] ${message}`);
  } else {
    console.info(`[${ts}] [${level}] ${message}`);
  }
}
