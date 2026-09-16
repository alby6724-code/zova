import React from 'react';
import { TopSeller } from '../../types/index.js';
import { Users } from 'lucide-react';

interface TopSellersCardProps {
  sellers?: TopSeller[];
  onViewAll?: () => void;
}

export const TopSellersCard: React.FC<TopSellersCardProps> = ({ sellers, onViewAll }) => {
  const items = sellers || [];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Top Sellers</h3>
        {onViewAll && items.length > 0 && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            View All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-slate-400">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
            <Users className="w-5 h-5" />
          </div>
          <p className="font-semibold text-slate-600">No sellers registered yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Top performing sellers will be ranked here.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (≥768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-3 font-medium">Seller</th>
                  <th className="pb-3 font-medium text-center">Listings</th>
                  <th className="pb-3 font-medium text-right">Total Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 flex items-center gap-2.5">
                      <img
                        src={s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={s.name}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      <span className="font-semibold text-slate-800">{s.name}</span>
                    </td>
                    <td className="py-2.5 text-center text-slate-700 font-medium">{s.listings}</td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      {s.totalViews.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (<768px) */}
          <div className="md:hidden divide-y divide-slate-50">
            {items.map((s) => (
              <div key={s.id} className="py-2.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={s.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={s.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-500">{s.listings} active listings</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-xs text-slate-900">{s.totalViews.toLocaleString()}</span>
                  <span className="block text-[10px] text-slate-400">views</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
