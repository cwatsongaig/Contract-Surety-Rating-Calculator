/**
 * Build-time script: reads Rate Table.xlsm and outputs rateData.json
 * for embedding into the app bundle.
 *
 * Run:  npx tsx scripts/extract-data.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWorkbook } from '../src/services/excelLoader.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '..', '..', 'Rate Table (w_maint).xlsm');
const outPath = path.resolve(__dirname, '..', 'src', 'data', 'rateData.json');

console.log(`Reading: ${excelPath}`);
const buffer = fs.readFileSync(excelPath);
const data = parseWorkbook(buffer.buffer as ArrayBuffer);

console.log(`  Rates: ${data.rates.length}`);
console.log(`  Various Rates: ${data.variousRates.length}`);
console.log(`  Commission Scales: ${data.commissionScales.length}`);
console.log(`  Rate Codes: ${data.rateCodes.length}`);
console.log(`  Companies: ${data.companies.join(', ')}`);
console.log(`  States: ${data.states.length}`);

fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
console.log(`\nWritten to: ${outPath}`);
console.log(`  Size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
