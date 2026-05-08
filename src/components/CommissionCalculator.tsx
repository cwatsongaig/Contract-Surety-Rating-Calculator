import type { RateData } from '../types/rates';
import { TIER_LABELS } from '../types/rates';
import { formatPercent } from '../utils/formatters';

interface CommissionCalculatorProps {
  data: RateData;
}

export default function CommissionCalculator({ data }: CommissionCalculatorProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
      <h3 className="text-sm font-semibold text-bb-navy mb-4">All Commission Scales</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Scale</th>
              {TIER_LABELS.map(l => (
                <th key={l} className="text-right px-3 py-2 font-semibold text-gray-700 text-xs">{l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.commissionScales.map(s => (
              <tr
                key={s.name}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-2">{s.name}</td>
                {s.tiers.map((t, i) => (
                  <td key={i} className="px-3 py-2 text-right font-mono">{formatPercent(t)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
