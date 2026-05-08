import type { RateEntry } from '../types/rates';
import { TIER_LABELS } from '../types/rates';
import { formatRate } from '../utils/formatters';

const SHORT_TIER_LABELS = [
  '0-100K',
  '100K-500K',
  '500K-2.5M',
  '2.5M-5M',
  '5M-7.5M',
  '7.5M+',
];

interface RateTableProps {
  rates: RateEntry[];
  selectable?: boolean;
  selectedIndices?: Set<number>;
  onToggleSelect?: (index: number) => void;
}

export default function RateTable({ rates, selectable, selectedIndices, onToggleSelect }: RateTableProps) {
  if (rates.length === 0) {
    return <p className="text-gray-500 text-center py-8">No rates match your filters. Try adjusting your selections above.</p>;
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {selectable && (
              <th className="px-3 py-2 w-8"></th>
            )}
            <th className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">Company</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">State</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">Class</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">Rating Plan</th>
            {SHORT_TIER_LABELS.map((label, i) => (
              <th key={label} className="text-right px-3 py-2 font-semibold text-gray-700 whitespace-nowrap" title={TIER_LABELS[i]}>
                {label}
              </th>
            ))}
            <th className="text-right px-3 py-2 font-semibold text-gray-700 whitespace-nowrap" title="Debit/Credit">D/C</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">Max Term</th>
            <th className="text-left px-3 py-2 font-semibold text-gray-700 whitespace-nowrap">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate, i) => {
            const isNotAvailable = rate.tiers.every(t => t === null);
            const isSelected = selectable && selectedIndices?.has(i);
            return (
              <tr
                key={i}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${isNotAvailable ? 'opacity-50' : ''} ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : ''} ${selectable ? 'cursor-pointer' : ''}`}
                onClick={selectable && !isNotAvailable ? () => onToggleSelect?.(i) : undefined}
              >
                {selectable && (
                  <td className="px-3 py-1.5">
                    {!isNotAvailable && (
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-bb-red focus:ring-bb-red cursor-pointer"
                        checked={!!isSelected}
                        onChange={() => onToggleSelect?.(i)}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </td>
                )}
                <td className="px-3 py-1.5 whitespace-nowrap">{rate.company}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{rate.state}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{rate.class}</td>
                <td className="px-3 py-1.5 whitespace-nowrap font-medium">{rate.ratingPlan}</td>
                {rate.tiers.map((tier, j) => (
                  <td key={j} className={`px-3 py-1.5 text-right font-mono whitespace-nowrap ${isNotAvailable ? 'text-red-400' : ''}`}>
                    {isNotAvailable && j === 0 ? 'N/A' : formatRate(tier)}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-right font-mono whitespace-nowrap">
                  {rate.debitCredit != null ? `${(rate.debitCredit * 100).toFixed(0)}%` : '-'}
                </td>
                <td className="px-3 py-1.5 whitespace-nowrap">{rate.maxTerm ?? '-'}</td>
                <td className="px-3 py-1.5 text-xs" title={rate.notes ?? ''}>
                  {rate.notes && rate.notes.includes('SPECIAL PERMISSION') ? (
                    <span className="text-red-600 font-semibold">{rate.notes}</span>
                  ) : rate.notes ?? ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
