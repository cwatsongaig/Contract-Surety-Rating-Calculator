import type { RateEntry, CommissionScale, TierBreakdown, PremiumResult } from '../types/rates';
import { TIER_AMOUNTS, TIER_LABELS } from '../types/rates';

/**
 * Find the Maintenance-class rate matching a given contract rate's
 * company, state, and ratingPlan.
 */
export function findMaintenanceRate(
  rates: RateEntry[],
  company: string,
  state: string,
  ratingPlan: string,
): RateEntry | null {
  return rates.find(r =>
    r.company === company && r.state === state &&
    r.class === 'Maintenance' && r.ratingPlan === ratingPlan
  ) ?? null;
}

/**
 * Scale maintenance rate tiers by additional years beyond the base 2-year term.
 * Formula from spreadsheet: if years > 0, rate = baseRate * (1 + years)
 */
export function applyAdditionalMaintYears(
  rate: RateEntry,
  additionalYears: number,
): RateEntry {
  if (additionalYears <= 0) return rate;
  return {
    ...rate,
    tiers: rate.tiers.map(t => t != null ? t * (1 + additionalYears) : null),
  };
}

export function splitContractAmount(contractAmount: number): number[] {
  let remaining = contractAmount;
  return TIER_AMOUNTS.map(tierMax => {
    if (remaining <= 0) return 0;
    const amt = Math.min(remaining, tierMax);
    remaining -= amt;
    return amt;
  });
}

export function validateDebitCredit(pct: number, allowable: number | null): number {
  if (allowable == null) return 0;
  const maxDebit = Math.abs(allowable);
  const maxCredit = -Math.abs(allowable);
  if (pct > maxDebit) return maxDebit;
  if (pct < maxCredit) return maxCredit;
  return pct;
}

export function calculatePremium(
  rate: RateEntry,
  contractAmount: number,
  debitCreditPct: number,
  scale?: CommissionScale,
  timeSurchargeMonths: number = 0,
): PremiumResult {
  const amounts = splitContractAmount(contractAmount);
  const validPct = validateDebitCredit(debitCreditPct, rate.debitCredit);

  const tiers: TierBreakdown[] = TIER_LABELS.map((label, i) => {
    const amount = amounts[i];
    const ratePerM = rate.tiers[i];
    const adjRate = ratePerM != null ? Math.round(ratePerM * (1 + validPct) * 100) / 100 : null;
    const premium = adjRate != null ? (amount / 1000) * adjRate : 0;
    const timeSurcharge = timeSurchargeMonths > 0 ? timeSurchargeMonths * 0.01 * premium : 0;
    const commPct = scale ? scale.tiers[i] : 0;
    const commAmt = premium * commPct;

    const rangeLabels = ['First', 'Next', 'Next', 'Next', 'Next', 'Over'];
    return {
      label: rangeLabels[i],
      rangeLabel: label,
      amount,
      ratePerM,
      debitCreditPct: validPct,
      adjRatePerM: adjRate,
      premium,
      timeSurcharge,
      commissionPct: commPct,
      commissionAmt: commAmt,
    };
  });

  const totalPremium = tiers.reduce((sum, t) => sum + t.premium, 0);
  const totalTimeSurcharge = tiers.reduce((sum, t) => sum + t.timeSurcharge, 0);
  const totalCommission = tiers.reduce((sum, t) => sum + t.commissionAmt, 0);

  return {
    tiers,
    totalPremium: totalPremium + totalTimeSurcharge,
    totalCommission,
    blendedCommissionPct: totalPremium > 0 ? totalCommission / totalPremium : 0,
    contractAmount,
  };
}
