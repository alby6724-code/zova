import React, { useState } from 'react';
import { Megaphone, TrendingUp, Eye, MousePointerClick, CheckCircle, Pause, Play, Plus, Search } from 'lucide-react';

interface AdCampaign {
  id: string;
  title: string;
  advertiser: string;
  slot: string;
  impressions: number;
  clicks: number;
  ctr: string;
  status: 'Active' | 'Paused' | 'Scheduled';
  budget: string;
  dates: string;
}

const INITIAL_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'CAM-901',
    title: 'Samsung Galaxy Festive Mega Deals',
    advertiser: 'Samsung Electronics India',
    slot: 'Hero Homepage Carousel (Slot 1)',
    impressions: 142800,
    clicks: 5820,
    ctr: '4.07%',
    status: 'Active',
    budget: '₹45,000',
    dates: 'Sep 1 - Sep 30',
  },
  {
    id: 'CAM-902',
    title: 'Royal Enfield Guaranteed Buyback',
    advertiser: 'Royal Enfield Motors',
    slot: 'Vehicles Category Header Banner',
    impressions: 89400,
    clicks: 3410,
    ctr: '3.81%',
    status: 'Active',
    budget: '₹28,500',
    dates: 'Sep 5 - Sep 25',
  },
  {
    id: 'CAM-903',
    title: 'Indiabulls Home Loans Quick Approval',
    advertiser: 'Indiabulls Financial',
    slot: 'Commercial Real Estate Inline Strip',
    impressions: 54100,
    clicks: 1680,
    ctr: '3.10%',
    status: 'Active',
    budget: '₹19,000',
    dates: 'Sep 10 - Oct 10',
  },
  {
    id: 'CAM-904',
    title: 'Urban Company Appliance Repair Pass',
    advertiser: 'Urban Company',
    slot: 'Electronics Feed Sponsored Card',
    impressions: 32000,
    clicks: 890,
    ctr: '2.78%',
    status: 'Paused',
    budget: '₹12,000',
    dates: 'Sep 1 - Sep 15',
  },
];

export const AdvertisementsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(INITIAL_CAMPAIGNS);
  const [search, setSearch] = useState('');

  const toggleCampaign = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: c.status === 'Active' ? 'Paused' : 'Active' } : c
      )
    );
  };

  const filtered = campaigns.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.advertiser.toLowerCase().includes(search.toLowerCase()) ||
      c.slot.toLowerCase().includes(search.toLowerCase())
  );

  const totalImpressions = campaigns.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalClicks = campaigns.reduce((acc, curr) => acc + curr.clicks, 0);

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-sky-600" />
            <span>Marketplace Advertisements & Banners</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure featured banner slots, track advertiser impressions, and monitor campaign performance.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Total Impressions</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalImpressions.toLocaleString()}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold">↑ 18.2% this week</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Total Clicks</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalClicks.toLocaleString()}</h3>
            <span className="text-[11px] text-blue-600 font-semibold">Avg CTR 3.65%</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Active Campaigns</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
              {campaigns.filter((c) => c.status === 'Active').length}
            </h3>
            <span className="text-[11px] text-purple-600 font-semibold">4 total inventory slots</span>
          </div>
        </div>
      </div>

      {/* Search toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns, advertisers, or placement slots..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Content Area: Desktop Table + Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop Table View (≥768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Campaign</th>
                <th className="py-3.5 px-4">Advertiser</th>
                <th className="py-3.5 px-4">Placement Slot</th>
                <th className="py-3.5 px-4">Impressions</th>
                <th className="py-3.5 px-4">CTR</th>
                <th className="py-3.5 px-4">Budget</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{c.title}</td>
                  <td className="py-3 px-4 text-slate-600">{c.advertiser}</td>
                  <td className="py-3 px-4 font-medium text-blue-600 max-w-xs truncate">{c.slot}</td>
                  <td className="py-3 px-4 font-bold text-slate-800">{c.impressions.toLocaleString()}</td>
                  <td className="py-3 px-4 font-semibold text-emerald-600">{c.ctr}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{c.budget}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => toggleCampaign(c.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        c.status === 'Active'
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-700'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {c.status === 'Active' ? 'Pause' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (<768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map((c) => (
            <div key={c.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{c.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.advertiser}</p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl text-xs space-y-1">
                <p className="text-blue-600 font-semibold truncate">{c.slot}</p>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                  <span>Views: {c.impressions.toLocaleString()}</span>
                  <span>CTR: {c.ctr}</span>
                  <span className="font-bold text-slate-900">{c.budget}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">{c.dates}</span>
                <button
                  onClick={() => toggleCampaign(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    c.status === 'Active'
                      ? 'bg-amber-500 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {c.status === 'Active' ? 'Pause Campaign' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
