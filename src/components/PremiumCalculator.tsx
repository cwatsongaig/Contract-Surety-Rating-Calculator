import { useState, useMemo } from 'react';
import type { RateData, RateEntry } from '../types/rates';
import { TIER_LABELS } from '../types/rates';
import FilterBar from './FilterBar';
import PremiumBreakdown from './PremiumBreakdown';
import RateImageModal from './RateImageModal';
import { calculatePremium, findMaintenanceRate, applyAdditionalMaintYears } from '../services/rateEngine';
import { formatCurrency, formatRate, formatPercent } from '../utils/formatters';

interface PremiumCalculatorProps {
  data: RateData;
}

export default function PremiumCalculator({ data }: PremiumCalculatorProps) {
  const [company, setCompany] = useState('Great American Insurance');
  const [state, setState] = useState('');
  const [rateClass, setRateClass] = useState('');
  const [ratingPlan, setRatingPlan] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [debitCreditInput, setDebitCreditInput] = useState('0');
  const [scaleName, setScaleName] = useState('GAIG Standard');
  const [includeMaintBond, setIncludeMaintBond] = useState(false);
  const [additionalMaintYears, setAdditionalMaintYears] = useState('0');
  const [timeSurchargeMonths, setTimeSurchargeMonths] = useState('0');
  const [showModal, setShowModal] = useState(false);

  const matchingRate: RateEntry | null = useMemo(() => {
    if (!company || !state || !rateClass || !ratingPlan) return null;
    return data.rates.find(r =>
      r.company === company && r.state === state &&
      r.class === rateClass && r.ratingPlan === ratingPlan
    ) ?? null;
  }, [data.rates, company, state, rateClass, ratingPlan]);

  const maintenanceRate: RateEntry | null = useMemo(() => {
    if (!company || !state || !ratingPlan || rateClass === 'Maintenance') return null;
    return findMaintenanceRate(data.rates, company, state, ratingPlan);
  }, [data.rates, company, state, ratingPlan, rateClass]);

  const scale = useMemo(() => {
    return data.commissionScales.find(s => s.name === scaleName) ?? null;
  }, [data.commissionScales, scaleName]);

  const amount = useMemo(() => {
    const cleaned = contractAmount.replace(/[^0-9.]/g, '');
    return Number(cleaned) || 0;
  }, [contractAmount]);

  const debitCreditPct = useMemo(() => {
    const val = Number(debitCreditInput) || 0;
    return val / 100;
  }, [debitCreditInput]);

  const parsedTimeSurchargeMonths = useMemo(() => {
    return Number(timeSurchargeMonths) || 0;
  }, [timeSurchargeMonths]);

  const parsedAdditionalMaintYears = useMemo(() => {
    return Number(additionalMaintYears) || 0;
  }, [additionalMaintYears]);

  const result = useMemo(() => {
    if (!matchingRate || amount <= 0) return null;
    if (matchingRate.tiers.every(t => t === null)) return null;
    const rate = rateClass === 'Maintenance'
      ? applyAdditionalMaintYears(matchingRate, parsedAdditionalMaintYears)
      : matchingRate;
    return calculatePremium(rate, amount, debitCreditPct, scale ?? undefined, parsedTimeSurchargeMonths);
  }, [matchingRate, amount, debitCreditPct, scale, parsedTimeSurchargeMonths, rateClass, parsedAdditionalMaintYears]);

  const maintenanceResult = useMemo(() => {
    if (!includeMaintBond) return null;
    if (!maintenanceRate || amount <= 0) return null;
    if (maintenanceRate.tiers.every(t => t === null)) return null;
    const adjustedRate = applyAdditionalMaintYears(maintenanceRate, parsedAdditionalMaintYears);
    return calculatePremium(adjustedRate, amount, debitCreditPct);
  }, [includeMaintBond, maintenanceRate, amount, debitCreditPct, parsedAdditionalMaintYears]);

  const formatAmountInput = (value: string) => {
    const num = Number(value.replace(/[^0-9]/g, ''));
    if (!num) return value;
    return num.toLocaleString('en-US');
  };

  const totalPremium = result
    ? result.totalPremium + (maintenanceResult?.totalPremium ?? 0)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-bb-navy mb-4">Select Rate</h3>
        <FilterBar
          data={data}
          company={company} state={state} rateClass={rateClass} ratingPlan={ratingPlan}
          onCompanyChange={setCompany} onStateChange={setState}
          onClassChange={setRateClass} onPlanChange={setRatingPlan}
        />
      </div>

      {matchingRate && matchingRate.tiers.every(t => t === null) && (
        <div className="bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          This rating plan is <span className="font-semibold">Not Available</span> for the selected combination.
        </div>
      )}

      {matchingRate && !matchingRate.tiers.every(t => t === null) && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
          <h3 className="text-sm font-semibold text-bb-navy mb-4">Contract Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Contract Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400">$</span>
                <input
                  type="text"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none font-mono"
                  value={contractAmount}
                  onChange={e => setContractAmount(formatAmountInput(e.target.value))}
                  placeholder="10,000,000"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Debit / (Credit) %
                {matchingRate.debitCredit != null && (
                  <span className="text-gray-400 normal-case font-normal ml-1">
                    (max {'\u00B1'}{(matchingRate.debitCredit * 100).toFixed(0)}%)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none font-mono"
                  value={debitCreditInput}
                  onChange={e => setDebitCreditInput(e.target.value)}
                  step="0.1"
                />
                <span className="absolute right-3 top-2 text-gray-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Commission Scale</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none"
                value={scaleName}
                onChange={e => setScaleName(e.target.value)}
              >
                {data.commissionScales.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Time Surcharge Months
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none font-mono"
                value={timeSurchargeMonths}
                onChange={e => setTimeSurchargeMonths(e.target.value)}
                min="0"
                step="1"
              />
            </div>
            {rateClass !== 'Maintenance' && (
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-bb-red focus:ring-bb-red cursor-pointer"
                    checked={includeMaintBond}
                    onChange={e => setIncludeMaintBond(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-700">Include Maintenance Bond</span>
                </label>
              </div>
            )}
            {(includeMaintBond || rateClass === 'Maintenance') && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Addl. Maint. Years
                  <span className="text-gray-400 normal-case font-normal ml-1">(if &gt; 2 yrs)</span>
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none font-mono"
                  value={additionalMaintYears}
                  onChange={e => setAdditionalMaintYears(e.target.value)}
                  min="0"
                  step="1"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-bb-navy">Premium Breakdown</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 text-sm font-medium bg-bb-navy text-white rounded-lg hover:bg-bb-navy-light transition-colors"
              >
                Copy Rate Card
              </button>
              <div className="text-right">
                {maintenanceResult && (
                  <span className="text-xs text-gray-500 mr-3">
                    Contract: {formatCurrency(result.totalPremium)} + Maint: {formatCurrency(maintenanceResult.totalPremium)}
                  </span>
                )}
                <span className="text-lg font-bold text-bb-navy">
                  {totalPremium != null ? formatCurrency(totalPremium) : '-'}
                </span>
              </div>
            </div>
          </div>
          <PremiumBreakdown result={result} maintenanceResult={maintenanceResult} showCommission={true} />
          {matchingRate?.notes && matchingRate.notes.includes('SPECIAL PERMISSION') && (
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-200 text-amber-800 text-xs font-medium">
              {matchingRate.notes}
            </div>
          )}
          {includeMaintBond && !maintenanceResult && rateClass !== 'Maintenance' && (
            <div className="px-5 py-2 bg-amber-50 border-t border-amber-200 text-amber-700 text-xs font-medium">
              No maintenance rate available for {company} / {state} / {ratingPlan}. Try a different Rating Plan (Bureau/Standard/Manual, Reduced, or Merit have broader coverage).
            </div>
          )}
        </div>
      )}

      {!company && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Select a Company, State, Class, and Rating Plan to begin calculating.</p>
        </div>
      )}

      {result && (
        <RateImageModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Premium Rate Card"
        >
          <div style={{ fontSize: '12px' }}>
            {/* Summary header */}
            <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Company</span>{company}</div>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>State</span>{state}</div>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Class</span>{rateClass}</div>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Rating Plan</span>{ratingPlan}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Contract Amount</span>{formatCurrency(amount)}</div>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Debit/Credit</span>{debitCreditInput}%</div>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Commission Scale</span>{scaleName}</div>
                {(includeMaintBond || rateClass === 'Maintenance') && (
                  <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Addl. Maint. Years</span>{additionalMaintYears}</div>
                )}
              </div>
            </div>

            {/* Rate breakdown table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Range</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Amount</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Rate/M</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Adj. Rate/M</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Premium</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Comm. %</th>
                  <th style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Comm. $</th>
                </tr>
              </thead>
              <tbody>
                {result.tiers.map((tier, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td style={{ padding: '4px 6px' }}>{tier.label}</td>
                    <td style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace' }}>{formatCurrency(tier.amount)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace' }}>{formatRate(tier.ratePerM)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace' }}>{formatRate(tier.adjRatePerM)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(tier.premium)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace' }}>{formatPercent(tier.commissionPct)}</td>
                    <td style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace' }}>{formatCurrency(tier.commissionAmt)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #1B2A4A', fontWeight: 700 }}>
                  <td style={{ padding: '6px', color: '#1B2A4A' }} colSpan={4}>Total Premium</td>
                  <td style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace', color: '#1B2A4A', fontSize: '13px' }}>
                    {formatCurrency(result.totalPremium)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace', color: '#1B2A4A' }}>
                    {formatPercent(result.blendedCommissionPct)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace', color: '#1B2A4A' }}>
                    {formatCurrency(result.totalCommission)}
                  </td>
                </tr>
                {maintenanceResult && (
                  <>
                    <tr style={{ borderTop: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '4px 6px', fontWeight: 600 }} colSpan={4}>Maintenance Premium</td>
                      <td style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace', fontWeight: 600 }}>
                        {formatCurrency(maintenanceResult.totalPremium)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                    <tr style={{ borderTop: '2px solid #1B2A4A', fontWeight: 700 }}>
                      <td style={{ padding: '6px', color: '#1B2A4A', fontSize: '13px' }} colSpan={4}>Combined Total</td>
                      <td style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace', color: '#1B2A4A', fontSize: '13px' }} colSpan={3}>
                        {formatCurrency(result.totalPremium + maintenanceResult.totalPremium)}
                      </td>
                    </tr>
                  </>
                )}
              </tfoot>
            </table>
          </div>
        </RateImageModal>
      )}
    </div>
  );
}
