import React, { useState } from 'react';
import { Listing } from '../../types/index.js';
import { Eye, CheckCircle2, AlertTriangle, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface RecentListingsTableProps {
  listings: Listing[];
  onViewAll?: () => void;
  onUpdateStatus?: (id: string, status: string) => void;
}

export const RecentListingsTable: React.FC<RecentListingsTableProps> = ({
  listings,
  onViewAll,
  onUpdateStatus,
}) => {
  const { role } = useAuth();
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const canModerate = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(role);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Recent Listings</h3>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          View All
        </button>
      </div>

      {/* Desktop Table View (≥768px) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-semibold">
              <th className="pb-3 font-medium">Image</th>
              <th className="pb-3 font-medium">Title</th>
              <th className="pb-3 font-medium">Seller</th>
              <th className="pb-3 font-medium">Category</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {listings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  <p className="font-semibold text-slate-600">No listings found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">New ads posted by users will show up here.</p>
                </td>
              </tr>
            ) : (
              listings.slice(0, 5).map((listing) => (
                <tr key={listing.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Image Thumbnail matching ox.jpeg */}
                  <td className="py-3 pr-3">
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                    />
                  </td>

                  {/* Title */}
                  <td className="py-3 font-semibold text-slate-800 max-w-[180px] truncate">
                    {listing.title}
                  </td>

                  {/* Seller */}
                  <td className="py-3 text-slate-600">{listing.sellerName}</td>

                  {/* Category */}
                  <td className="py-3 text-slate-500">{listing.category}</td>

                  {/* Price */}
                  <td className="py-3 font-bold text-slate-900">
                    ₹ {listing.price.toLocaleString()}
                  </td>

                  {/* Status Pill */}
                  <td className="py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        listing.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : listing.status === 'Flagged'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {listing.status}
                    </span>
                  </td>

                  {/* Action View Button */}
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedListing(listing)}
                      className="px-3 py-1 bg-[#2563eb] hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm transition-all cursor-pointer"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View (<768px) */}
      <div className="md:hidden divide-y divide-slate-100">
        {listings.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-600">No listings found</p>
            <p className="text-[11px] mt-0.5">New ads posted by users will show up here.</p>
          </div>
        ) : (
          listings.slice(0, 5).map((listing) => (
            <div key={listing.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={listing.image}
                  alt={listing.title}
                  className="w-12 h-12 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{listing.title}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="truncate">{listing.sellerName}</span>
                    <span>•</span>
                    <span className="truncate">{listing.category}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-900">₹{listing.price.toLocaleString()}</span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        listing.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : listing.status === 'Flagged'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {listing.status}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedListing(listing)}
                className="px-3 py-1.5 bg-[#2563eb] text-white rounded-lg text-xs font-bold shrink-0 shadow-sm"
              >
                View
              </button>
            </div>
          ))
        )}
      </div>

      {/* Listing Detail & Moderation Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                  {selectedListing.category}
                </span>
                <h4 className="text-lg font-bold text-slate-900">{selectedListing.title}</h4>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-4">
              <img
                src={selectedListing.image}
                alt={selectedListing.title}
                className="w-full h-48 rounded-xl object-cover"
              />
              <div>
                <p className="text-xs text-slate-400 font-medium">Description</p>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {selectedListing.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400">Price:</span>{' '}
                  <span className="font-bold text-slate-900">₹ {selectedListing.price.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400">Seller:</span>{' '}
                  <span className="font-medium text-slate-800">{selectedListing.sellerName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Location:</span>{' '}
                  <span className="text-slate-800">{selectedListing.location}</span>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>{' '}
                  <span className="font-semibold text-emerald-600">{selectedListing.status}</span>
                </div>
              </div>
            </div>

            {/* Moderation Controls (RBAC Protected) */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              {canModerate ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onUpdateStatus?.(selectedListing.id, 'Active');
                      setSelectedListing(null);
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => {
                      onUpdateStatus?.(selectedListing.id, 'Flagged');
                      setSelectedListing(null);
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" /> Flag
                  </button>
                  <button
                    onClick={() => {
                      onUpdateStatus?.(selectedListing.id, 'Removed');
                      setSelectedListing(null);
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">View only: Moderator permissions required to edit.</p>
              )}
              <button
                onClick={() => setSelectedListing(null)}
                className="min-h-[38px] px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold ml-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
