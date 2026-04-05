import { log } from '../types';
import { upsertSanction } from '../db';

const OFAC_SDN_URL = 'https://sanctionslistservice.ofac.treas.gov/api/publicationpreview/exports/sdn.csv';

/**
 * Parse MMSI or IMO from the Remarks field.
 * Remarks may contain entries like "IMO 1234567" or "MMSI 123456789".
 */
function extractIdentifiers(remarks: string): { mmsi: string; imo: string } {
  let mmsi = '';
  let imo = '';

  const imoMatch = remarks.match(/IMO\s+(\d{7})/i);
  if (imoMatch && imoMatch[1]) imo = imoMatch[1];

  const mmsiMatch = remarks.match(/MMSI\s+(\d{9})/i);
  if (mmsiMatch && mmsiMatch[1]) mmsi = mmsiMatch[1];

  return { mmsi, imo };
}

/**
 * Parse a CSV line respecting quoted fields.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export async function fetchOFACSanctions(): Promise<void> {
  try {
    log('INFO', 'Fetching OFAC SDN sanctions list...');

    const response = await fetch(OFAC_SDN_URL);
    if (!response.ok) {
      log('WARN', `OFAC SDN fetch returned ${response.status} — skipping`);
      return;
    }

    const text = await response.text();
    const lines = text.split('\n').filter((l) => l.trim().length > 0);

    // CSV has NO header row. Columns:
    // 0: ent_num, 1: SDN_Name, 2: SDN_Type, 3: Program, 4: Title,
    // 5: Call_Sign, 6: Vess_Type, 7: Tonnage, 8: GRT, 9: Vess_Flag,
    // 10: Vess_Owner, 11: Remarks
    let count = 0;

    for (const line of lines) {
      const fields = parseCsvLine(line);
      if (fields.length < 12) continue;

      const sdnName = fields[1];
      const sdnType = (fields[2] || '').toLowerCase();
      const program = fields[3];
      const vessType = fields[6];
      const remarks = fields[11] || '';

      // Filter to vessel-related entries
      const isVessel = sdnType.includes('vessel') || (vessType && vessType.trim().length > 0);
      if (!isVessel) continue;

      const { mmsi, imo } = extractIdentifiers(remarks);

      upsertSanction({
        entity_name: sdnName,
        entity_type: 'vessel',
        mmsi,
        imo,
        source: 'OFAC',
        program,
      });
      count++;
    }

    log('INFO', `OFAC sanctions processed: ${count} vessel entries`);
  } catch (err) {
    log('ERROR', `OFAC sanctions fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
