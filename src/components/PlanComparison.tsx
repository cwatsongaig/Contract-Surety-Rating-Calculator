import { useState, useMemo } from 'react';
import type { RateData, RateEntry } from '../types/rates';
import { TIER_LABELS } from '../types/rates';
import { calculatePremium, findMaintenanceRate } from '../services/rateEngine';
import { formatCurrency, formatRate } from '../utils/formatters';
import RateImageModal from './RateImageModal';

interface PlanComparisonProps {
  data: RateData;
}

export default function PlanComparison({ data }: PlanComparisonProps) {
  const [company, setCompany] = useState('Great American Insurance');
  const [state, setState] = useState('');
  const [rateClass, setRateClass] = useState('');
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [contractAmount, setContractAmount] = useState('');
  const [showModal, setShowModal] = useState(false);

  const availableRates = useMemo(() => {
    if (!company || !state || !rateClass) return [];
    return data.rates.filter(r =>
      r.company === company && r.state === state && r.class === rateClass &&
      !r.tiers.every(t => t === null)
    );
  }, [data.rates, company, state, rateClass]);

  const availablePlans = useMemo(() => {
    return [...new Set(availableRates.map(r => r.ratingPlan))].sort();
  }, [availableRates]);

  const ratesByPlan = useMemo(() => {
    const map = new Map<string, RateEntry>();
    for (const r of availableRates) {
      if (selectedPlans.includes(r.ratingPlan)) map.set(r.ratingPlan, r);
    }
    return map;
  }, [availableRates, selectedPlans]);

  const maintByPlan = useMemo(() => {
    if (!company || !state || rateClass === 'Maintenance') return new Map<string, RateEntry>();
    const map = new Map<string, RateEntry>();
    for (const plan of selectedPlans) {
      const maint = findMaintenanceRate(data.rates, company, state, plan);
      if (maint) map.set(plan, maint);
    }
    return map;
  }, [data.rates, company, state, rateClass, selectedPlans]);

  const amount = useMemo(() => {
    return Number(contractAmount.replace(/[^0-9.]/g, '')) || 0;
  }, [contractAmount]);

  const results = useMemo(() => {
    if (amount <= 0) return new Map<string, ReturnType<typeof calculatePremium>>();
    const map = new Map<string, ReturnType<typeof calculatePremium>>();
    for (const [plan, rate] of ratesByPlan) {
      map.set(plan, calculatePremium(rate, amount, 0));
    }
    return map;
  }, [ratesByPlan, amount]);

  const maintResults = useMemo(() => {
    if (amount <= 0) return new Map<string, ReturnType<typeof calculatePremium>>();
    const map = new Map<string, ReturnType<typeof calculatePremium>>();
    for (const [plan, rate] of maintByPlan) {
      map.set(plan, calculatePremium(rate, amount, 0));
    }
    return map;
  }, [maintByPlan, amount]);

  const hasMaint = maintByPlan.size > 0;

  const togglePlan = (plan: string) => {
    setSelectedPlans(prev =>
      prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan].slice(0, 4)
    );
  };

  const companies = useMemo(() => [...new Set(data.rates.map(r => r.company))].sort(), [data.rates]);
  const states = useMemo(() => {
    if (!company) return [];
    return [...new Set(data.rates.filter(r => r.company === company).map(r => r.state))].sort();
  }, [data.rates, company]);
  const classes = useMemo(() => {
    if (!company) return [];
    const rates = data.rates.filter(r =>
      r.company === company && (!state || r.state === state)
    );
    return [...new Set(rates.map(r => r.class))].sort();
  }, [data.rates, company, state]);

  const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none transition-colors';

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-bb-navy mb-4">Compare Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
            <select className={selectClass} value={company} onChange={e => { setCompany(e.target.value); setState(''); setRateClass(''); setSelectedPlans([]); }}>
              <option value="">Select...</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
            <select className={selectClass} value={state} onChange={e => { setState(e.target.value); setRateClass(''); setSelectedPlans([]); }}>
              <option value="">Select...</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Class</label>
            <select className={selectClass} value={rateClass} onChange={e => { setRateClass(e.target.value); setSelectedPlans([]); }}>
              <option value="">Select...</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Contract Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="text"
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none font-mono"
                value={contractAmount}
                onChange={e => {
                  const num = Number(e.target.value.replace(/[^0-9]/g, ''));
                  setContractAmount(num ? num.toLocaleString('en-US') : '');
                }}
                placeholder="10,000,000"
              />
            </div>
          </div>
        </div>

        {availablePlans.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">
              Select Plans to Compare (up to 4)
            </label>
            <div className="flex flex-wrap gap-2">
              {availablePlans.map(plan => (
                <button
                  key={plan}
                  onClick={() => togglePlan(plan)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    selectedPlans.includes(plan)
                      ? 'bg-bb-navy text-white border-bb-navy'
                      : 'bg-white text-bb-navy border-gray-300 hover:border-bb-navy'
                  }`}
                >
                  {plan}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedPlans.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-bb-navy">Side-by-Side Comparison</h3>
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 text-sm font-medium bg-bb-navy text-white rounded-lg hover:bg-bb-navy-light transition-colors"
            >
              Copy Rate Card
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-semibold text-gray-700">Contract Range</th>
                  {selectedPlans.map(plan => (
                    <th key={plan} className="text-right px-3 py-2 font-semibold text-gray-700">{plan}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIER_LABELS.map((label, i) => {
                  const rates = selectedPlans.map(plan => ratesByPlan.get(plan)?.tiers[i] ?? null);
                  const validRates = rates.filter((r): r is number => r !== null);
                  const minRate = validRates.length > 0 ? Math.min(...validRates) : null;
                  return (
                    <tr key={label} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-600 text-xs">{label}</td>
                      {rates.map((rate, j) => (
                        <td
                          key={j}
                          className={`px-3 py-2 text-right font-mono ${rate === minRate && validRates.length > 1 ? 'text-green-600 font-bold' : ''}`}
                        >
                          {formatRate(rate)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {amount > 0 && (
                  <>
                    <tr className="bg-gray-50 font-semibold border-t border-gray-300">
                      <td className="px-3 py-2 text-gray-700">Contract Premium</td>
                      {selectedPlans.map(plan => {
                        const r = results.get(plan);
                        return (
                          <td key={plan} className="px-3 py-2 text-right font-mono text-gray-700">
                            {r ? formatCurrency(r.totalPremium) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                    {hasMaint && (
                      <tr className="bg-gray-50">
                        <td className="px-3 py-2 font-semibold text-gray-700">Maintenance Premium</td>
                        {selectedPlans.map(plan => {
                          const mr = maintResults.get(plan);
                          return (
                            <td key={plan} className="px-3 py-2 text-right font-mono text-gray-700">
                              {mr ? formatCurrency(mr.totalPremium) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    <tr className="bg-bb-navy/5 font-bold border-t-2 border-bb-navy/20">
                      <td className="px-3 py-3 text-bb-navy">Total Premium</td>
                      {selectedPlans.map(plan => {
                        const cr = results.get(plan);
                        const mr = maintResults.get(plan);
                        const total = (cr?.totalPremium ?? 0) + (mr?.totalPremium ?? 0);
                        const allTotals = selectedPlans.map(p => {
                          const c = results.get(p)?.totalPremium ?? 0;
                          const m = maintResults.get(p)?.totalPremium ?? 0;
                          return c + m;
                        });
                        const minTotal = Math.min(...allTotals);
                        const isMin = total === minTotal && allTotals.filter(t => t === minTotal).length < selectedPlans.length;
                        return (
                          <td key={plan} className={`px-3 py-3 text-right font-mono ${isMin ? 'text-green-700' : 'text-bb-navy'}`}>
                            {cr ? formatCurrency(total) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!company && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Select a Company, State, and Class, then pick plans to compare.</p>
        </div>
      )}

      {selectedPlans.length > 0 && (
        <RateImageModal
          open={showModal}
          onClose={() => setShowModal(false)}
          title="Plan Comparison Rate Card"
        >
          <div style={{ fontSize: '12px' }}>
            {/* Summary header */}
            <div style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #E5E7EB' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Company</span>{company}</div>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>State</span>{state}</div>
                <div><span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px', display: 'block' }}>Class</span>{rateClass}</div>
              </div>
              {amount > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#6B7280', fontSize: '10px' }}>Contract Amount: </span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(amount)}</span>
                </div>
              )}
            </div>

            {/* Comparison table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{ textAlign: 'left', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>Contract Range</th>
                  {selectedPlans.map(plan => (
                    <th key={plan} style={{ textAlign: 'right', padding: '4px 6px', fontWeight: 600, color: '#374151' }}>{plan}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIER_LABELS.map((label, i) => {
                  const rates = selectedPlans.map(plan => ratesByPlan.get(plan)?.tiers[i] ?? null);
                  const validRates = rates.filter((r): r is number => r !== null);
                  const minRate = validRates.length > 0 ? Math.min(...validRates) : null;
                  return (
                    <tr key={label} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '4px 6px', color: '#4B5563' }}>{label}</td>
                      {rates.map((rate, j) => (
                        <td
                          key={j}
                          style={{
                            textAlign: 'right',
                            padding: '4px 6px',
                            fontFamily: 'monospace',
                            fontWeight: rate === minRate && validRates.length > 1 ? 700 : 400,
                            color: rate === minRate && validRates.length > 1 ? '#16A34A' : undefined,
                          }}
                        >
                          {formatRate(rate)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {amount > 0 && (
                  <>
                    <tr style={{ borderTop: '2px solid #374151', fontWeight: 600, backgroundColor: '#F9FAFB' }}>
                      <td style={{ padding: '6px' }}>Contract Premium</td>
                      {selectedPlans.map(plan => {
                        const r = results.get(plan);
                        return (
                          <td key={plan} style={{ textAlign: 'right', padding: '6px', fontFamily: 'monospace' }}>
                            {r ? formatCurrency(r.totalPremium) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                    {hasMaint && (
                      <tr style={{ backgroundColor: '#F9FAFB' }}>
                        <td style={{ padding: '4px 6px', fontWeight: 600 }}>Maintenance Premium</td>
                        {selectedPlans.map(plan => {
                          const mr = maintResults.get(plan);
                          return (
                            <td key={plan} style={{ textAlign: 'right', padding: '4px 6px', fontFamily: 'monospace' }}>
                              {mr ? formatCurrency(mr.totalPremium) : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                    <tr style={{ borderTop: '2px solid #1B2A4A', fontWeight: 700 }}>
                      <td style={{ padding: '6px', color: '#1B2A4A', fontSize: '13px' }}>Total Premium</td>
                      {selectedPlans.map(plan => {
                        const cr = results.get(plan);
                        const mr = maintResults.get(plan);
                        const total = (cr?.totalPremium ?? 0) + (mr?.totalPremium ?? 0);
                        const allTotals = selectedPlans.map(p => {
                          const c = results.get(p)?.totalPremium ?? 0;
                          const m = maintResults.get(p)?.totalPremium ?? 0;
                          return c + m;
                        });
                        const minTotal = Math.min(...allTotals);
                        const isMin = total === minTotal && allTotals.filter(t => t === minTotal).length < selectedPlans.length;
                        return (
                          <td key={plan} style={{
                            textAlign: 'right',
                            padding: '6px',
                            fontFamily: 'monospace',
                            color: isMin ? '#15803D' : '#1B2A4A',
                            fontSize: '13px',
                          }}>
                            {cr ? formatCurrency(total) : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </RateImageModal>
      )}
    </div>
  );
}
