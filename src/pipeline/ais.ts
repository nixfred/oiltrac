import { log } from '../types';
import type { VesselClass, VesselStatus } from '../types';
import { upsertVessel } from '../db';

interface AISHubRecord {
  MMSI: number;
  NAME: string;
  LATITUDE: number;
  LONGITUDE: number;
  SOG: number;
  COG: number;
  DRAUGHT: number;
  DESTINATION: string;
  ETA: string;
  TYPE: number;
}

function classifyVessel(name: string): VesselClass {
  const upper = name.toUpperCase();
  if (upper.includes('VLCC') || upper.includes('ULCC')) return 'VLCC';
  if (upper.includes('SUEZMAX')) return 'Suezmax';
  if (upper.includes('AFRAMAX')) return 'Aframax';
  if (upper.includes('LNG') || upper.includes('LPG')) return 'LNG';
  return 'Product';
}

function determineStatus(speed: number, _lat: number, _lng: number): VesselStatus {
  if (speed > 1) return 'underway';
  // Simplified: speed near zero defaults to anchor
  // A full implementation would check proximity to known chokepoints for 'stranded'
  return 'anchor';
}

function estimateCargoBbl(draught: number, maxDraught: number): number {
  if (maxDraught <= 0 || draught <= 0) return 0;
  const loadRatio = Math.min(draught / maxDraught, 1.0);
  // Rough estimate: fully loaded VLCC ~ 2M bbl, scale by ratio
  // For generic tankers use ~500k bbl as baseline
  const baselineBbl = 500_000;
  return Math.round(baselineBbl * loadRatio);
}

export async function fetchAISPositions(): Promise<void> {
  const key = process.env.AIS_HUB_KEY;
  if (!key) {
    log('WARN', 'AIS_HUB_KEY not set — skipping AIS fetch');
    return;
  }

  try {
    const url = `https://data.aishub.net/ws.php?username=${key}&format=1&output=json&compress=0&latmin=-90&latmax=90&lonmin=-180&lonmax=180`;
    const res = await fetch(url);

    if (!res.ok) {
      log('ERROR', `AISHub API returned ${res.status}: ${res.statusText}`);
      return;
    }

    const data = await res.json();

    // AISHub returns an array where [0] is metadata, [1] is the vessel array
    const records: AISHubRecord[] = Array.isArray(data)
      ? (data.length > 1 ? data[1] : data)
      : data?.data ?? [];

    // Filter to tanker vessel types (codes 80-89)
    const tankers = records.filter(
      (r) => r.TYPE >= 80 && r.TYPE <= 89
    );

    log('INFO', `AIS: received ${records.length} vessels, ${tankers.length} tankers`);

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    for (const t of tankers) {
      const vesselClass = classifyVessel(t.NAME || '');
      const speed = t.SOG / 10; // AISHub SOG is in 1/10 knot
      const status = determineStatus(speed, t.LATITUDE, t.LONGITUDE);
      const cargoEst = estimateCargoBbl(t.DRAUGHT / 10, 0);

      await upsertVessel({
        mmsi: String(t.MMSI),
        name: (t.NAME || 'UNKNOWN').trim(),
        vessel_class: vesselClass,
        flag: '',
        lat: t.LATITUDE / 600000, // AISHub coords are in 1/10000 min
        lng: t.LONGITUDE / 600000,
        speed,
        heading: t.COG / 10,
        draught: t.DRAUGHT / 10,
        max_draught: 0,
        destination: (t.DESTINATION || '').trim(),
        eta: t.ETA || '',
        status,
        cargo_est_bbl: cargoEst,
        ais_dark: 0,
        snapshot_date: today,
        fetched_at: now,
      });
    }

    log('INFO', `AIS: upserted ${tankers.length} tanker positions`);
  } catch (err) {
    log('ERROR', `AIS fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
