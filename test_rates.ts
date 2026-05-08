/**
 * Automated test: loads Rate Table.xlsm via the same code paths as the app,
 * then validates premium & commission calculations against known Excel values.
 *
 * Run:  npx tsx test_rates.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import app modules
import { TIER_LABELS } from './src/types/rates.ts';
import { splitContractAmount, validateDebitCredit, calculatePremium } from './src/services/rateEngine.ts';
import { loadFromFile } from './src/services/excelLoader.ts';

// ─── helpers ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  FAIL: ${msg}`);
  }
}

function near(a: number, b: number, tol = 0.01): boolean {
  return Math.abs(a - b) <= tol;
}

// ─── Test data extracted from Excel via Python/openpyxl ──────────────
const testCases: Array<{
  company: string; state: string; class: string; plan: string;
  tiers: number[]; debitCredit: number | null;
}> = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'test_cases.json'), 'utf-8'));

const referenceCalc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'reference_calc.json'), 'utf-8'));

const commissionScalesRef: Array<{ name: string; tiers: number[] }> =
  JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'commission_scales.json'), 'utf-8'));

// ─── main ────────────────────────────────────────────────────────────
async function main() {
  console.log('Contract Rate Table - Automated Verification\n');
  console.log('='.repeat(60));

  // ── 1. Unit test: splitContractAmount ──
  console.log('\n1. splitContractAmount()');

  const split10M = splitContractAmount(10_000_000);
  assert(split10M[0] === 100_000, `Tier 1: expected 100000, got ${split10M[0]}`);
  assert(split10M[1] === 400_000, `Tier 2: expected 400000, got ${split10M[1]}`);
  assert(split10M[2] === 2_000_000, `Tier 3: expected 2000000, got ${split10M[2]}`);
  assert(split10M[3] === 2_500_000, `Tier 4: expected 2500000, got ${split10M[3]}`);
  assert(split10M[4] === 2_500_000, `Tier 5: expected 2500000, got ${split10M[4]}`);
  assert(split10M[5] === 2_500_000, `Tier 6: expected 2500000, got ${split10M[5]}`);
  console.log(`  $10M split: [${split10M.join(', ')}]`);

  const split500K = splitContractAmount(500_000);
  assert(split500K[0] === 100_000, `$500K Tier 1: expected 100000, got ${split500K[0]}`);
  assert(split500K[1] === 400_000, `$500K Tier 2: expected 400000, got ${split500K[1]}`);
  assert(split500K[2] === 0, `$500K Tier 3: expected 0, got ${split500K[2]}`);
  console.log(`  $500K split: [${split500K.join(', ')}]`);

  const split250K = splitContractAmount(250_000);
  assert(split250K[0] === 100_000, `$250K Tier 1: expected 100000, got ${split250K[0]}`);
  assert(split250K[1] === 150_000, `$250K Tier 2: expected 150000, got ${split250K[1]}`);
  assert(split250K[2] === 0, `$250K Tier 3: expected 0, got ${split250K[2]}`);
  console.log(`  $250K split: [${split250K.join(', ')}]`);

  const split50M = splitContractAmount(50_000_000);
  const totalSplit = split50M.reduce((a, b) => a + b, 0);
  assert(totalSplit === 50_000_000, `$50M total: expected 50000000, got ${totalSplit}`);
  assert(split50M[5] === 42_500_000, `$50M Tier 6: expected 42500000, got ${split50M[5]}`);
  console.log(`  $50M split: [${split50M.join(', ')}]`);

  // ── 2. Unit test: validateDebitCredit ──
  console.log('\n2. validateDebitCredit()');

  assert(validateDebitCredit(0, 0.25) === 0, 'DC: 0% within ±25% => 0');
  assert(validateDebitCredit(0.10, 0.25) === 0.10, 'DC: 10% within ±25% => 10%');
  assert(validateDebitCredit(0.30, 0.25) === 0.25, 'DC: 30% clamped to 25%');
  assert(validateDebitCredit(-0.30, 0.25) === -0.25, 'DC: -30% clamped to -25%');
  assert(validateDebitCredit(0.50, null) === 0, 'DC: null allowable => 0');
  assert(validateDebitCredit(0.10, 0) === 0, 'DC: 0% allowable clamps to 0');
  console.log('  All debit/credit validations passed');

  // ── 3. Load Excel file via app's loader ──
  console.log('\n3. Loading Excel file via excelLoader...');

  const filePath = path.resolve(__dirname, '..', 'Rate Table.xlsm');
  const buffer = fs.readFileSync(filePath);
  const blob = new Blob([buffer]);
  // Create a File-like object
  const file = new File([buffer], 'Rate Table.xlsm');
  const data = await loadFromFile(file);

  console.log(`  Loaded: ${data.rates.length} rates, ${data.variousRates.length} various rates`);
  console.log(`  Companies: ${data.companies.join(', ')}`);
  console.log(`  States: ${data.states.length}`);
  console.log(`  Classes: ${data.classes.join(', ')}`);
  console.log(`  Plans: ${data.ratingPlans.join(', ')}`);
  console.log(`  Commission scales: ${data.commissionScales.map(s => s.name).join(', ')}`);

  assert(data.rates.length > 2700, `Expected >2700 rates, got ${data.rates.length}`);
  assert(data.companies.length === 2, `Expected 2 companies, got ${data.companies.length}`);
  assert(data.states.length >= 50, `Expected >=50 states, got ${data.states.length}`);
  assert(data.commissionScales.length === 6, `Expected 6 commission scales, got ${data.commissionScales.length}`);

  // ── 4. Validate commission scales match Excel ──
  console.log('\n4. Commission Scales validation');

  for (const refScale of commissionScalesRef) {
    const appScale = data.commissionScales.find(s => s.name === refScale.name);
    assert(!!appScale, `Scale "${refScale.name}" found in loaded data`);
    if (appScale) {
      for (let i = 0; i < 6; i++) {
        assert(
          near(appScale.tiers[i], refScale.tiers[i]),
          `Scale "${refScale.name}" tier ${i}: expected ${refScale.tiers[i]}, got ${appScale.tiers[i]}`
        );
      }
    }
  }
  console.log('  All commission scales validated');

  // ── 5. Validate rate data matches Excel ──
  console.log('\n5. Rate data validation (19 test cases)');

  for (const tc of testCases) {
    const match = data.rates.find(r =>
      r.company === tc.company && r.state === tc.state &&
      r.class === tc.class && r.ratingPlan === tc.plan
    );

    assert(!!match, `Found rate: ${tc.company} / ${tc.state} / ${tc.class} / ${tc.plan}`);
    if (!match) continue;

    // Check each tier rate
    for (let i = 0; i < 6; i++) {
      const expected = tc.tiers[i];
      const actual = match.tiers[i];
      if (expected === null) {
        assert(actual === null, `${tc.plan} tier ${i}: expected null, got ${actual}`);
      } else {
        assert(
          actual !== null && near(actual, expected),
          `${tc.company.slice(0, 10)} ${tc.state} ${tc.class} ${tc.plan} tier ${i}: expected ${expected}, got ${actual}`
        );
      }
    }

    // Check debit/credit
    if (tc.debitCredit === null) {
      assert(match.debitCredit === null, `${tc.plan} debitCredit: expected null, got ${match.debitCredit}`);
    } else {
      assert(
        match.debitCredit !== null && near(match.debitCredit, tc.debitCredit),
        `${tc.plan} debitCredit: expected ${tc.debitCredit}, got ${match.debitCredit}`
      );
    }
  }

  // ── 6. Reference calculation: exact match with Rate Look-up sheet ──
  console.log('\n6. Reference calculation (Rate Look-up sheet exact match)');
  console.log(`  Test: ${referenceCalc.company} / ${referenceCalc.state} / ${referenceCalc.class} / ${referenceCalc.plan}`);
  console.log(`  Contract: $${referenceCalc.contractAmount.toLocaleString()}, DC: ${referenceCalc.debitCreditPct * 100}%`);

  const refRate = data.rates.find(r =>
    r.company === referenceCalc.company && r.state === referenceCalc.state &&
    r.class === referenceCalc.class && r.ratingPlan === referenceCalc.plan
  );
  assert(!!refRate, 'Reference rate found');

  if (refRate) {
    const refScale = data.commissionScales.find(s => s.name === referenceCalc.commScale);
    assert(!!refScale, `Commission scale "${referenceCalc.commScale}" found`);

    const result = calculatePremium(
      refRate,
      referenceCalc.contractAmount,
      referenceCalc.debitCreditPct,
      refScale ?? undefined
    );

    console.log(`\n  Tier-by-tier comparison:`);
    console.log(`  ${'Tier'.padEnd(10)} ${'Expected'.padStart(12)} ${'Got'.padStart(12)} ${'Match'.padStart(7)}`);
    for (let i = 0; i < 6; i++) {
      const exp = referenceCalc.expectedTierPremiums[i];
      const got = result.tiers[i].premium;
      const ok = near(exp, got, 0.02);
      assert(ok, `Tier ${i + 1} premium: expected ${exp}, got ${got}`);
      console.log(`  ${TIER_LABELS[i].padEnd(28)} ${exp.toFixed(2).padStart(12)} ${got.toFixed(2).padStart(12)} ${ok ? '  OK' : ' FAIL'}`);
    }

    // Total premium
    const totalOk = near(referenceCalc.expectedTotal, result.totalPremium, 0.02);
    assert(totalOk, `Total premium: expected ${referenceCalc.expectedTotal}, got ${result.totalPremium}`);
    console.log(`\n  Total Premium:    Expected $${referenceCalc.expectedTotal.toFixed(2)}, Got $${result.totalPremium.toFixed(2)} ${totalOk ? 'OK' : 'FAIL'}`);

    // Commission per tier
    console.log(`\n  Commission comparison (${referenceCalc.commScale}):`);
    for (let i = 0; i < 6; i++) {
      const exp = referenceCalc.expectedCommissions[i];
      const got = result.tiers[i].commissionAmt;
      const ok = near(exp, got, 0.02);
      assert(ok, `Tier ${i + 1} commission: expected ${exp}, got ${got}`);
      console.log(`  ${TIER_LABELS[i].padEnd(28)} ${exp.toFixed(2).padStart(12)} ${got.toFixed(2).padStart(12)} ${ok ? '  OK' : ' FAIL'}`);
    }

    // Total commission
    const commOk = near(referenceCalc.expectedTotalCommission, result.totalCommission, 0.02);
    assert(commOk, `Total commission: expected ${referenceCalc.expectedTotalCommission}, got ${result.totalCommission}`);
    console.log(`\n  Total Commission: Expected $${referenceCalc.expectedTotalCommission.toFixed(2)}, Got $${result.totalCommission.toFixed(2)} ${commOk ? 'OK' : 'FAIL'}`);

    // Blended commission %
    const blendOk = near(referenceCalc.expectedBlendedCommPct, result.blendedCommissionPct, 0.0001);
    assert(blendOk, `Blended comm %: expected ${referenceCalc.expectedBlendedCommPct}, got ${result.blendedCommissionPct}`);
    console.log(`  Blended Comm %:   Expected ${(referenceCalc.expectedBlendedCommPct * 100).toFixed(4)}%, Got ${(result.blendedCommissionPct * 100).toFixed(4)}% ${blendOk ? 'OK' : 'FAIL'}`);
  }

  // ── 7. Premium calculations across all 19 test cases at multiple amounts ──
  console.log('\n7. Premium calculations across test cases');

  const contractAmounts = [50_000, 250_000, 1_000_000, 5_000_000, 10_000_000, 25_000_000];
  const gaigStd = data.commissionScales.find(s => s.name === 'GAIG Standard')!;

  for (const tc of testCases) {
    const rate = data.rates.find(r =>
      r.company === tc.company && r.state === tc.state &&
      r.class === tc.class && r.ratingPlan === tc.plan
    );
    if (!rate) continue;

    for (const amt of contractAmounts) {
      const result = calculatePremium(rate, amt, 0, gaigStd);
      const amounts = splitContractAmount(amt);

      // Manually compute expected premium
      let expectedTotal = 0;
      for (let i = 0; i < 6; i++) {
        const tierRate = rate.tiers[i];
        if (tierRate !== null) {
          expectedTotal += (amounts[i] / 1000) * tierRate;
        }
      }

      assert(
        near(expectedTotal, result.totalPremium, 0.02),
        `${tc.company.slice(0, 10)} ${tc.state} ${tc.class} ${tc.plan} @ $${amt.toLocaleString()}: expected ${expectedTotal.toFixed(2)}, got ${result.totalPremium.toFixed(2)}`
      );

      // Verify commission = sum(premium_i * commRate_i)
      let expectedComm = 0;
      for (let i = 0; i < 6; i++) {
        expectedComm += result.tiers[i].premium * gaigStd.tiers[i];
      }
      assert(
        near(expectedComm, result.totalCommission, 0.02),
        `Commission for ${tc.plan} @ $${amt.toLocaleString()}: expected ${expectedComm.toFixed(2)}, got ${result.totalCommission.toFixed(2)}`
      );
    }
  }

  // ── 8. Debit/Credit adjustment test ──
  console.log('\n8. Debit/Credit adjustment tests');

  const rateForDC = data.rates.find(r =>
    r.company === 'Great American Insurance' && r.state === 'Alabama' &&
    r.class === 'Class B' && r.ratingPlan === 'Reduced'
  )!;

  // +25% debit
  const resultDebit = calculatePremium(rateForDC, 10_000_000, 0.25);
  // Each tier rate should be multiplied by 1.25
  for (let i = 0; i < 6; i++) {
    if (rateForDC.tiers[i] !== null) {
      const expectedAdj = rateForDC.tiers[i]! * 1.25;
      assert(
        near(resultDebit.tiers[i].adjRatePerM!, expectedAdj, 0.01),
        `+25% debit tier ${i}: expected adj rate ${expectedAdj}, got ${resultDebit.tiers[i].adjRatePerM}`
      );
    }
  }
  // Total with +25% should be 72000 * 1.25 = 90000
  assert(near(resultDebit.totalPremium, 90_000, 0.02), `+25% debit total: expected 90000, got ${resultDebit.totalPremium}`);
  console.log(`  +25% debit: $${resultDebit.totalPremium.toFixed(2)} (expected $90,000.00)`);

  // -25% credit
  const resultCredit = calculatePremium(rateForDC, 10_000_000, -0.25);
  // Total with -25% should be 72000 * 0.75 = 54000
  assert(near(resultCredit.totalPremium, 54_000, 0.02), `-25% credit total: expected 54000, got ${resultCredit.totalPremium}`);
  console.log(`  -25% credit: $${resultCredit.totalPremium.toFixed(2)} (expected $54,000.00)`);

  // Over-limit (30%) should clamp to 25%
  const resultOverLimit = calculatePremium(rateForDC, 10_000_000, 0.30);
  assert(near(resultOverLimit.totalPremium, 90_000, 0.02), `30% (clamped) total: expected 90000, got ${resultOverLimit.totalPremium}`);
  console.log(`  +30% (clamped to 25%): $${resultOverLimit.totalPremium.toFixed(2)} (expected $90,000.00)`);

  // Hawaii ($5 flat, dc=0) - no adjustment possible
  const hawaiiRate = data.rates.find(r =>
    r.company === 'Great American Insurance' && r.state === 'Hawaii' &&
    r.class === 'Class A' && r.ratingPlan === '$5 Rate Structure'
  )!;
  if (hawaiiRate) {
    const resultHawaii = calculatePremium(hawaiiRate, 10_000_000, 0.10);
    // dc=0 means any debit is clamped to 0
    assert(near(resultHawaii.totalPremium, 50_000, 0.02), `Hawaii (dc=0, input 10%): expected 50000, got ${resultHawaii.totalPremium}`);
    console.log(`  Hawaii $5 flat (dc=0, input 10%): $${resultHawaii.totalPremium.toFixed(2)} (expected $50,000.00)`);
  }

  // ── 9. Edge cases ──
  console.log('\n9. Edge cases');

  // Zero contract
  const resultZero = calculatePremium(rateForDC, 0, 0);
  assert(resultZero.totalPremium === 0, `$0 contract: expected 0, got ${resultZero.totalPremium}`);
  console.log(`  $0 contract: $${resultZero.totalPremium.toFixed(2)}`);

  // $1 contract
  const result1 = calculatePremium(rateForDC, 1, 0);
  const expected1 = (1 / 1000) * 14.4;
  assert(near(result1.totalPremium, expected1, 0.001), `$1 contract: expected ${expected1}, got ${result1.totalPremium}`);
  console.log(`  $1 contract: $${result1.totalPremium.toFixed(4)} (expected $${expected1.toFixed(4)})`);

  // Exactly $100,000 (boundary)
  const result100K = calculatePremium(rateForDC, 100_000, 0);
  assert(near(result100K.totalPremium, 1440, 0.02), `$100K: expected 1440, got ${result100K.totalPremium}`);
  console.log(`  $100,000 (tier 1 boundary): $${result100K.totalPremium.toFixed(2)} (expected $1,440.00)`);

  // $100,001 (just into tier 2)
  const result100K1 = calculatePremium(rateForDC, 100_001, 0);
  const expected100K1 = (100_000 / 1000) * 14.4 + (1 / 1000) * 14.4;
  assert(near(result100K1.totalPremium, expected100K1, 0.02), `$100,001: expected ${expected100K1}, got ${result100K1.totalPremium}`);
  console.log(`  $100,001 (just into tier 2): $${result100K1.totalPremium.toFixed(4)} (expected $${expected100K1.toFixed(4)})`);

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed === 0) {
    console.log('ALL TESTS PASSED');
  } else {
    console.log('SOME TESTS FAILED - see details above');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(2);
});
