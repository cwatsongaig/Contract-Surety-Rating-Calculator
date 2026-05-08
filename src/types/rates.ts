export interface RateEntry {
  company: string;
  state: string;
  class: string;
  ratingPlan: string;
  tiers: (number | null)[];
  debitCredit: number | null;
  maxTerm: string | null;
  rateFiling: string | null;
  notes: string | null;
}

export interface VariousRate {
  company: string;
  state: string | null;
  class: string;
  ratingPlan: string;
  tiers: (number | null)[];
  debitCredit: number | null;
  maxTerm: string | null;
  minimumPremium: number | null;
  notes: string | null;
}

export interface CommissionScale {
  name: string;
  tiers: number[];
}

export interface RateCode {
  class: string;
  federal: string | number;
  public: string | number;
  private: string | number;
  federalPPP: string;
  publicPPP: string;
  description: string;
}

export interface RateData {
  rates: RateEntry[];
  variousRates: VariousRate[];
  commissionScales: CommissionScale[];
  rateCodes: RateCode[];
  companies: string[];
  states: string[];
  classes: string[];
  ratingPlans: string[];
}

export const TIER_LABELS = [
  '$0 - $100,000',
  '$100,001 - $500,000',
  '$500,001 - $2,500,000',
  '$2,500,001 - $5,000,000',
  '$5,000,001 - $7,500,000',
  '$7,500,001 and Up',
] as const;

export const TIER_LIMITS = [100_000, 500_000, 2_500_000, 5_000_000, 7_500_000, Infinity];

export const TIER_AMOUNTS = [100_000, 400_000, 2_000_000, 2_500_000, 2_500_000, Infinity];

export interface TierBreakdown {
  label: string;
  rangeLabel: string;
  amount: number;
  ratePerM: number | null;
  debitCreditPct: number;
  adjRatePerM: number | null;
  premium: number;
  timeSurcharge: number;
  commissionPct: number;
  commissionAmt: number;
}

export interface PremiumResult {
  tiers: TierBreakdown[];
  totalPremium: number;
  totalCommission: number;
  blendedCommissionPct: number;
  contractAmount: number;
}
