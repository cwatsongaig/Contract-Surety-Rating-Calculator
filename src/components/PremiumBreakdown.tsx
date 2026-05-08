import type { PremiumResult } from '../types/rates';
import { formatCurrency, formatPercent, formatRate } from '../utils/formatters';

interface PremiumBreakdownProps {
  result: PremiumResult;
  maintenanceResult?: PremiumResult | null;
  showCommission: boolean;
}

export default function PremiumBreakdown({ result, maintenanceResult, showCommission }: PremiumBreakdownProps) {
  const hasMaint = !!maintenanceResult;
  const hasTimeSurcharge = result.tiers.some(t => t.timeSurcharge > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-semibold text-gray-700">Contract Range</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700">Amount</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700">Price/M</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700">Debit/Credit</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700">Adj. Price/M</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-700">Contract Premium</th>
            {hasTimeSurcharge && (
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Time Surcharge</th>
            )}
            {hasMaint && (
              <>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Maint. Rate/M</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Maint. Premium</th>
              </>
            )}
            {showCommission && (
              <>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Comm. %</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Comm. $</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {result.tiers.map((tier, i) => {
            const maintTier = maintenanceResult?.tiers[i];
            return (
              <tr key={i} className={`border-b border-gray-100 ${tier.amount === 0 ? 'opacity-40' : ''}`}>
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-600 mr-2">{tier.label}</span>
                  <span className="text-gray-400 text-xs">{tier.rangeLabel}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{formatCurrency(tier.amount)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatRate(tier.ratePerM)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatPercent(tier.debitCreditPct)}</td>
                <td className="px-3 py-2 text-right font-mono">{formatRate(tier.adjRatePerM)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(tier.premium)}</td>
                {hasTimeSurcharge && (
                  <td className="px-3 py-2 text-right font-mono">{formatCurrency(tier.timeSurcharge)}</td>
                )}
                {hasMaint && maintTier && (
                  <>
                    <td className="px-3 py-2 text-right font-mono">{formatRate(maintTier.ratePerM)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{formatCurrency(maintTier.premium)}</td>
                  </>
                )}
                {showCommission && (
                  <>
                    <td className="px-3 py-2 text-right font-mono">{formatPercent(tier.commissionPct)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatCurrency(tier.commissionAmt)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          {hasMaint ? (
            <>
              {(() => {
                const tsCol = hasTimeSurcharge ? 1 : 0;
                const totalTimeSurcharge = result.tiers.reduce((s, t) => s + t.timeSurcharge, 0);
                return (
                  <>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-3 py-2 font-semibold" colSpan={2}>Contract Subtotal</td>
                      <td className="px-3 py-2" colSpan={3}></td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-bb-navy">{formatCurrency(result.totalPremium - totalTimeSurcharge)}</td>
                      {hasTimeSurcharge && (
                        <td className="px-3 py-2 text-right font-mono font-semibold text-bb-navy">{formatCurrency(totalTimeSurcharge)}</td>
                      )}
                      <td className="px-3 py-2" colSpan={2}></td>
                      {showCommission && (
                        <>
                          <td className="px-3 py-2 text-right font-mono text-bb-navy">{formatPercent(result.blendedCommissionPct)}</td>
                          <td className="px-3 py-2 text-right font-mono text-bb-navy">{formatCurrency(result.totalCommission)}</td>
                        </>
                      )}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-3 py-2 font-semibold" colSpan={2}>Maintenance Subtotal</td>
                      <td className="px-3 py-2" colSpan={3 + tsCol}></td>
                      <td className="px-3 py-2" colSpan={1}></td>
                      <td className="px-3 py-2" colSpan={1}></td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-bb-navy">{formatCurrency(maintenanceResult!.totalPremium)}</td>
                      {showCommission && (
                        <td className="px-3 py-2" colSpan={2}></td>
                      )}
                    </tr>
                    <tr className="bg-bb-navy/5 font-bold border-t-2 border-bb-navy/20">
                      <td className="px-3 py-3 text-bb-navy" colSpan={5 + tsCol}>Total Premium</td>
                      <td className="px-3 py-3 text-right font-mono text-bb-navy text-base" colSpan={3}>
                        {formatCurrency(result.totalPremium + maintenanceResult!.totalPremium)}
                      </td>
                      {showCommission && (
                        <td className="px-3 py-3" colSpan={2}></td>
                      )}
                    </tr>
                  </>
                );
              })()}
            </>
          ) : (
            (() => {
              const totalTimeSurcharge = result.tiers.reduce((s, t) => s + t.timeSurcharge, 0);
              return (
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td className="px-3 py-3" colSpan={2}>Subtotal</td>
                  <td className="px-3 py-3" colSpan={3}></td>
                  <td className="px-3 py-3 text-right font-mono text-bb-navy text-base">{formatCurrency(result.totalPremium - totalTimeSurcharge)}</td>
                  {hasTimeSurcharge && (
                    <td className="px-3 py-3 text-right font-mono text-bb-navy text-base">{formatCurrency(totalTimeSurcharge)}</td>
                  )}
                  {showCommission && (
                    <>
                      <td className="px-3 py-3 text-right font-mono text-bb-navy">{formatPercent(result.blendedCommissionPct)}</td>
                      <td className="px-3 py-3 text-right font-mono text-bb-navy">{formatCurrency(result.totalCommission)}</td>
                    </>
                  )}
                </tr>
              );
            })()
          )}
        </tfoot>
      </table>
    </div>
  );
}
