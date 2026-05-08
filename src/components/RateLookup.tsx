import { useState, useMemo } from 'react';
import type { RateData } from '../types/rates';
import { TIER_LABELS } from '../types/rates';
import FilterBar from './FilterBar';
import RateTable from './RateTable';
import RateImageModal from './RateImageModal';
import { formatRate } from '../utils/formatters';

interface RateLookupProps {
  data: RateData;
}

export default function RateLookup({ data }: RateLookupProps) {
  const [company, setCompany] = useState('Great American Insurance');
  const [state, setState] = useState('');
  const [rateClass, setRateClass] = useState('');
  const [ratingPlan, setRatingPlan] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showModal, setShowModal] = useState(false);

  const filteredRates = useMemo(() => {
    return data.rates.filter(r =>
      (!company || r.company === company) &&
      (!state || r.state === state) &&
      (!rateClass || r.class === rateClass) &&
      (!ratingPlan || r.ratingPlan === ratingPlan)
    );
  }, [data.rates, company, state, rateClass, ratingPlan]);

  const toggleSelect = (index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectedRates = useMemo(() => {
    return [...selectedIndices].sort((a, b) => a - b).map(i => filteredRates[i]).filter(Boolean);
  }, [selectedIndices, filteredRates]);

  const handleOpenModal = () => {
    if (selectedRates.length > 0) setShowModal(true);
  };

  // Clear selection when filters change
  const handleCompanyChange = (v: string) => { setCompany(v); setSelectedIndices(new Set()); };
  const handleStateChange = (v: string) => { setState(v); setSelectedIndices(new Set()); };
  const handleClassChange = (v: string) => { setRateClass(v); setSelectedIndices(new Set()); };
  const handlePlanChange = (v: string) => { setRatingPlan(v); setSelectedIndices(new Set()); };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
        <h3 className="text-sm font-semibold text-bb-navy mb-4">Filter Rates</h3>
        <FilterBar
          data={data}
          company={company} state={state} rateClass={rateClass} ratingPlan={ratingPlan}
          onCompanyChange={handleCompanyChange} onStateChange={handleStateChange}
          onClassChange={handleClassChange} onPlanChange={handlePlanChange}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-bb-navy">
            Rate Table
          </h3>
          <div className="flex items-center gap-3">
            {selectedIndices.size > 0 && (
              <button
                onClick={handleOpenModal}
                className="px-3 py-1.5 text-sm font-medium bg-bb-navy text-white rounded-lg hover:bg-bb-navy-light transition-colors"
              >
                Copy Rate Card ({selectedIndices.size})
              </button>
            )}
            <span className="text-xs text-gray-400">{filteredRates.length} rate{filteredRates.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <RateTable
          rates={filteredRates}
          selectable={true}
          selectedIndices={selectedIndices}
          onToggleSelect={toggleSelect}
        />
      </div>

      <RateImageModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Rate Card"
      >
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#374151' }}>Company</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#374151' }}>State</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#374151' }}>Class</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#374151' }}>Plan</th>
              {TIER_LABELS.map(label => (
                <th key={label} style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#374151' }}>{label}</th>
              ))}
              <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '11px', fontWeight: 600, color: '#374151' }}>D/C</th>
            </tr>
          </thead>
          <tbody>
            {selectedRates.map((rate, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '6px 8px', fontSize: '12px' }}>{rate.company}</td>
                <td style={{ padding: '6px 8px', fontSize: '12px' }}>{rate.state}</td>
                <td style={{ padding: '6px 8px', fontSize: '12px' }}>{rate.class}</td>
                <td style={{ padding: '6px 8px', fontSize: '12px', fontWeight: 500 }}>{rate.ratingPlan}</td>
                {rate.tiers.map((tier, j) => (
                  <td key={j} style={{ textAlign: 'right', padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace' }}>
                    {formatRate(tier)}
                  </td>
                ))}
                <td style={{ textAlign: 'right', padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace' }}>
                  {rate.debitCredit != null ? `${(rate.debitCredit * 100).toFixed(0)}%` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </RateImageModal>
    </div>
  );
}
