import * as XLSX from 'xlsx';
import type { RateData, RateEntry, VariousRate, CommissionScale, RateCode } from '../types/rates';

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}

function num(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'not available') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

function sheetRows(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as unknown as unknown[][];
}

function parseRates(ws: XLSX.WorkSheet): RateEntry[] {
  const rows = sheetRows(ws);
  const entries: RateEntry[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const company = str(row[0]);
    if (!company || company === 'Company') continue;

    const tierValues = [row[4], row[5], row[6], row[7], row[8], row[9]].map(num);
    const isNotAvailable = tierValues.every(t => t === null) &&
      str(row[4])?.toLowerCase() === 'not available';

    entries.push({
      company,
      state: str(row[1]) ?? '',
      class: str(row[2]) ?? '',
      ratingPlan: str(row[3]) ?? '',
      tiers: isNotAvailable ? [null, null, null, null, null, null] : tierValues,
      debitCredit: num(row[10]),
      maxTerm: str(row[11]),
      rateFiling: str(row[12]),
      notes: str(row[13]),
    });
  }
  return entries;
}

function parseVariousRates(ws: XLSX.WorkSheet): VariousRate[] {
  const rows = sheetRows(ws);
  const entries: VariousRate[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const company = str(row[0]);
    if (!company || company === 'Company') continue;

    entries.push({
      company,
      state: str(row[1]),
      class: str(row[2]) ?? '',
      ratingPlan: str(row[3]) ?? '',
      tiers: [row[4], row[5], row[6], row[7], row[8], row[9]].map(num),
      debitCredit: num(row[10]),
      maxTerm: str(row[11]),
      minimumPremium: num(row[12]),
      notes: str(row[13]),
    });
  }
  return entries;
}

function parseCommissionScales(ws: XLSX.WorkSheet): CommissionScale[] {
  const rows = sheetRows(ws);
  const scales: CommissionScale[] = [];

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;
    const name = str(row[0]);
    if (!name) continue;

    scales.push({
      name,
      tiers: [row[1], row[2], row[3], row[4], row[5], row[6]].map(v => {
        const n = num(v);
        return n ?? 0;
      }),
    });
  }
  return scales;
}

function parseRateCodes(ws: XLSX.WorkSheet): RateCode[] {
  const rows = sheetRows(ws);
  const codes: RateCode[] = [];
  let currentClass = '';

  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const classVal = str(row[2]);
    if (classVal && classVal.startsWith('Class')) {
      currentClass = classVal.split('\n')[0].trim();
      continue;
    }
    if (classVal === 'Supply') {
      currentClass = 'Supply';
      continue;
    }

    if (!row[3] && !row[4] && !row[5]) continue;

    codes.push({
      class: currentClass,
      federal: row[3] != null ? row[3] as string | number : '',
      public: row[4] != null ? row[4] as string | number : '',
      private: row[5] != null ? row[5] as string | number : '',
      federalPPP: str(row[6]) ?? '',
      publicPPP: str(row[7]) ?? '',
      description: str(row[8]) ?? '',
    });
  }
  return codes;
}

function unique(arr: string[]): string[] {
  return [...new Set(arr)].filter(Boolean).sort();
}

export async function loadFromFile(file: File): Promise<RateData> {
  const buffer = await file.arrayBuffer();
  return parseWorkbook(buffer);
}

export async function loadFromUrl(url: string): Promise<RateData> {
  const resp = await fetch(url);
  const buffer = await resp.arrayBuffer();
  return parseWorkbook(buffer);
}

export function parseWorkbook(buffer: ArrayBuffer): RateData {
  const wb = XLSX.read(buffer, { type: 'array' });

  const rates = parseRates(wb.Sheets['Rates']);
  const variousRates = parseVariousRates(wb.Sheets['Various Rates']);
  const commissionScales = parseCommissionScales(wb.Sheets['Approved Scales']);
  const rateCodes = parseRateCodes(wb.Sheets['Rate Codes']);

  return {
    rates,
    variousRates,
    commissionScales,
    rateCodes,
    companies: unique(rates.map(r => r.company)),
    states: unique(rates.map(r => r.state)),
    classes: unique(rates.map(r => r.class)),
    ratingPlans: unique(rates.map(r => r.ratingPlan)),
  };
}
