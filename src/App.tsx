import { useState } from 'react';
import RateLookup from './components/RateLookup';
import PremiumCalculator from './components/PremiumCalculator';
import CommissionCalculator from './components/CommissionCalculator';
import PlanComparison from './components/PlanComparison';
import type { RateData } from './types/rates';
import rateDataJson from './data/rateData.json';
import bondboxLogo from './assets/bondbox-logo.png';

const data: RateData = rateDataJson as RateData;

type Tab = 'lookup' | 'premium' | 'commission' | 'compare';

const TABS: { id: Tab; label: string }[] = [
  { id: 'lookup', label: 'Rate Lookup' },
  { id: 'premium', label: 'Premium Calculator' },
  { id: 'commission', label: 'Commission' },
  { id: 'compare', label: 'Compare Plans' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('lookup');

  return (
    <div className="min-h-screen bg-bb-gray">
      {/* Header */}
      <header className="bg-white border-b border-bb-border sticky top-0 z-10">
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img src={bondboxLogo} alt="BondBox" className="h-8" />
              <span className="text-gray-300 text-sm font-light">|</span>
              <h1 className="text-sm font-semibold text-bb-navy tracking-wide">Contract Rate Table</h1>
            </div>
            <span className="text-xs text-gray-400">
              {data.rates.length} rates &middot; {data.companies.length} companies &middot; {data.states.length} states
            </span>
          </div>
        </div>
        {/* Red accent bar */}
        <div className="h-0.5 bg-bb-red" />
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-bb-border">
        <div className="px-4 sm:px-6">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-bb-red text-bb-navy'
                    : 'border-transparent text-gray-400 hover:text-bb-navy hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="px-4 sm:px-6 py-5">
        {activeTab === 'lookup' && <RateLookup data={data} />}
        {activeTab === 'premium' && <PremiumCalculator data={data} />}
        {activeTab === 'commission' && <CommissionCalculator data={data} />}
        {activeTab === 'compare' && <PlanComparison data={data} />}
      </main>
    </div>
  );
}
