"""
Contract Surety Bond Premium Calculation Engine

Implements the graduated-tier premium calculation with debit/credit adjustments,
time surcharges, maintenance bond calculations, and commission computations.

Ported from the React/TypeScript rateEngine.ts implementation.

Rating flow:
  1. Split contract amount into 6 graduated tiers
  2. Apply per-tier rates (rate per $1,000)
  3. Apply debit/credit adjustment (clamped to allowable range)
  4. Compute adjusted rate and tier premium
  5. Add time surcharge (monthly, 1% of premium per month)
  6. Compute commission per tier from selected scale
  7. Sum totals
"""

from dataclasses import dataclass, field
from math import inf
from typing import Optional

from rate_data import TIER_AMOUNTS, TIER_LABELS


@dataclass
class TierBreakdown:
    """One tier in the premium calculation breakdown."""
    label: str           # "First", "Next", "Over"
    range_label: str     # e.g. "$0 - $100,000"
    amount: float        # Dollar amount allocated to this tier
    rate_per_m: Optional[float]  # Base rate per $1,000
    debit_credit_pct: float      # Applied debit/credit percentage
    adj_rate_per_m: Optional[float]  # Adjusted rate per $1,000
    premium: float       # Tier premium
    time_surcharge: float  # Time surcharge for this tier
    commission_pct: float  # Commission percentage
    commission_amt: float  # Commission dollar amount


@dataclass
class PremiumResult:
    """Complete result of a premium calculation."""
    tiers: list = field(default_factory=list)  # List[TierBreakdown]
    total_premium: float = 0.0
    total_commission: float = 0.0
    blended_commission_pct: float = 0.0
    contract_amount: float = 0.0


def split_contract_amount(contract_amount: float) -> list:
    """
    Split a contract amount into the 6 graduated tier buckets.

    Tier amounts: $100K, $400K, $2M, $2.5M, $2.5M, remainder
    """
    remaining = contract_amount
    amounts = []
    for tier_max in TIER_AMOUNTS:
        if remaining <= 0:
            amounts.append(0.0)
        else:
            amt = min(remaining, tier_max)
            remaining -= amt
            amounts.append(amt)
    return amounts


def validate_debit_credit(pct: float, allowable: Optional[float]) -> float:
    """
    Clamp a debit/credit percentage to the allowable range.

    Args:
        pct: The requested debit/credit percentage (as decimal, e.g. 0.25)
        allowable: The maximum allowable deviation (as decimal), or None if not applicable

    Returns:
        Clamped percentage
    """
    if allowable is None:
        return 0.0
    max_debit = abs(allowable)
    max_credit = -abs(allowable)
    if pct > max_debit:
        return max_debit
    if pct < max_credit:
        return max_credit
    return pct


def find_maintenance_rate(rates: list, company: str, state: str, rating_plan: str) -> Optional[dict]:
    """
    Find the Maintenance-class rate matching a given contract rate's
    company, state, and rating plan.
    """
    for r in rates:
        if (r["company"] == company and r["state"] == state and
                r["bond_class"] == "Maintenance" and r["rating_plan"] == rating_plan):
            return r
    return None


def apply_additional_maint_years(rate: dict, additional_years: int) -> dict:
    """
    Scale maintenance rate tiers by additional years beyond the base 2-year term.
    Formula: if years > 0, rate = baseRate * (1 + years)
    """
    if additional_years <= 0:
        return rate
    return {
        **rate,
        "tiers": [t * (1 + additional_years) if t is not None else None for t in rate["tiers"]],
    }


def calculate_premium(
    rate: dict,
    contract_amount: float,
    debit_credit_pct: float = 0.0,
    scale: Optional[dict] = None,
    time_surcharge_months: int = 0,
) -> PremiumResult:
    """
    Calculate the contract surety bond premium using graduated tiers.

    Args:
        rate: Rate dict with 'tiers' (6 rates per $1,000) and 'debit_credit'
        contract_amount: Dollar amount of the contract
        debit_credit_pct: Debit/credit adjustment as decimal (e.g. 0.10 = +10%)
        scale: Commission scale dict with 'tiers' (6 percentages), or None
        time_surcharge_months: Number of months for time surcharge (1% per month)

    Returns:
        PremiumResult with itemized tier breakdown
    """
    amounts = split_contract_amount(contract_amount)
    valid_pct = validate_debit_credit(debit_credit_pct, rate.get("debit_credit"))

    range_labels = ["First", "Next", "Next", "Next", "Next", "Over"]

    tiers = []
    for i, label in enumerate(TIER_LABELS):
        amount = amounts[i]
        rate_per_m = rate["tiers"][i]

        # Adjusted rate: base rate * (1 + debit/credit%)
        if rate_per_m is not None:
            adj_rate = round(rate_per_m * (1 + valid_pct) * 100) / 100
        else:
            adj_rate = None

        # Premium for this tier
        premium = (amount / 1000.0) * adj_rate if adj_rate is not None else 0.0

        # Time surcharge: 1% per month of tier premium
        time_surcharge = time_surcharge_months * 0.01 * premium if time_surcharge_months > 0 else 0.0

        # Commission
        comm_pct = scale["tiers"][i] if scale else 0.0
        comm_amt = premium * comm_pct

        tiers.append(TierBreakdown(
            label=range_labels[i],
            range_label=label,
            amount=amount,
            rate_per_m=rate_per_m,
            debit_credit_pct=valid_pct,
            adj_rate_per_m=adj_rate,
            premium=premium,
            time_surcharge=time_surcharge,
            commission_pct=comm_pct,
            commission_amt=comm_amt,
        ))

    total_premium_before_surcharge = sum(t.premium for t in tiers)
    total_time_surcharge = sum(t.time_surcharge for t in tiers)
    total_premium = total_premium_before_surcharge + total_time_surcharge
    total_commission = sum(t.commission_amt for t in tiers)
    blended_pct = total_commission / total_premium_before_surcharge if total_premium_before_surcharge > 0 else 0.0

    return PremiumResult(
        tiers=tiers,
        total_premium=total_premium,
        total_commission=total_commission,
        blended_commission_pct=blended_pct,
        contract_amount=contract_amount,
    )
