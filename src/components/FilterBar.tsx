import { useMemo, useEffect } from 'react';
import type { RateData } from '../types/rates';

interface FilterBarProps {
  data: RateData;
  company: string;
  state: string;
  rateClass: string;
  ratingPlan: string;
  onCompanyChange: (v: string) => void;
  onStateChange: (v: string) => void;
  onClassChange: (v: string) => void;
  onPlanChange: (v: string) => void;
}

export default function FilterBar({
  data, company, state, rateClass, ratingPlan,
  onCompanyChange, onStateChange, onClassChange, onPlanChange,
}: FilterBarProps) {
  const filtered = useMemo(() => {
    const rates = data.rates;

    const matchesOther = (r: typeof rates[0], excludeField: string) =>
      (excludeField === 'company' || !company || r.company === company) &&
      (excludeField === 'state' || !state || r.state === state) &&
      (excludeField === 'class' || !rateClass || r.class === rateClass) &&
      (excludeField === 'plan' || !ratingPlan || r.ratingPlan === ratingPlan);

    const companies = [...new Set(rates.filter(r => matchesOther(r, 'company')).map(r => r.company))].sort();
    const states = [...new Set(rates.filter(r => matchesOther(r, 'state')).map(r => r.state))].sort();
    const classes = [...new Set(rates.filter(r => matchesOther(r, 'class')).map(r => r.class))].sort();
    const plans = [...new Set(rates.filter(r => matchesOther(r, 'plan')).map(r => r.ratingPlan))].sort();

    return { companies, states, classes, plans };
  }, [data.rates, company, state, rateClass, ratingPlan]);

  // Auto-clear selections that are no longer valid
  useEffect(() => {
    if (company && !filtered.companies.includes(company)) onCompanyChange('');
  }, [company, filtered.companies, onCompanyChange]);
  useEffect(() => {
    if (state && !filtered.states.includes(state)) onStateChange('');
  }, [state, filtered.states, onStateChange]);
  useEffect(() => {
    if (rateClass && !filtered.classes.includes(rateClass)) onClassChange('');
  }, [rateClass, filtered.classes, onClassChange]);
  useEffect(() => {
    if (ratingPlan && !filtered.plans.includes(ratingPlan)) onPlanChange('');
  }, [ratingPlan, filtered.plans, onPlanChange]);

  const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-bb-red focus:border-bb-red outline-none transition-colors';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
        <select className={selectClass} value={company} onChange={e => onCompanyChange(e.target.value)}>
          <option value="">All Companies</option>
          {filtered.companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
        <select className={selectClass} value={state} onChange={e => onStateChange(e.target.value)}>
          <option value="">All States</option>
          {filtered.states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Class</label>
        <select className={selectClass} value={rateClass} onChange={e => onClassChange(e.target.value)}>
          <option value="">All Classes</option>
          {filtered.classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">Rating Plan</label>
        <select className={selectClass} value={ratingPlan} onChange={e => onPlanChange(e.target.value)}>
          <option value="">All Plans</option>
          {filtered.plans.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  );
}
