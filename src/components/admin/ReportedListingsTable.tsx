import React, { useState } from 'react';
import { Report } from '../../types/index.js';
import { ShieldAlert, CheckCircle, Trash2, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface ReportedListingsTableProps {
  reports?: Report[];
  onViewAll?: () => void;
  onResolve?: (id: string, action: 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER') => void;
}

export const ReportedListingsTable: React.FC<ReportedListingsTableProps> = ({
  reports,
  onViewAll,
  onResolve,
}) => {
  const { role } = useAuth();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const canModerate = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(role);
  const items = reports || [];

  const getReasonDot = (reason: string) => {
    switch (reason) {
      case 'Fake item':
        return 'bg-amber-500';
      case 'Spam':
        return 'bg-blue-500';
      case 'Wrong category':
        return 'bg-emerald-500';
      case 'Fraud':
        return 'bg-red-500';
      case 'Copyright issue':
        return 'bg-cyan-500';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Reported Listings</h3>
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
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="font-semibold text-slate-600">No reported listings</p>
          <p className="text-[11px] text-slate-400 mt-0.5">All customer ads comply with platform guidelines.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View (≥768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-3 font-medium">Title</th>
                  <th className="pb-3 font-medium">Reason</th>
                  <th className="pb-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelectedReport(r)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    title="Click to take moderation action"
                  >
                    <td className="py-2.5 font-semibold text-slate-800 truncate max-w-[120px]">
                      {r.listingTitle}
                    </td>
                    <td className="py-2.5 flex items-center gap-1.5 text-slate-600">
                      <span className={`w-2 h-2 rounded-full ${getReasonDot(r.reason)}`} />
                      <span>{r.reason}</span>
                    </td>
                    <td className="py-2.5 text-right text-slate-400 whitespace-nowrap text-[11px]">
                      {r.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (<768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {items.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className="py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-bold text-xs text-slate-900 truncate">{r.listingTitle}</p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-0.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getReasonDot(r.reason)}`} />
                    <span className="truncate">{r.reason}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">{r.date}</span>
                  <span className="text-[10px] text-blue-600 font-bold mt-0.5 inline-block">Moderate →</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Moderation Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h4 className="text-sm font-bold text-slate-900">Moderate Reported Listing</h4>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-2 text-xs">
              <div className="p-3 bg-red-50/70 border border-red-100 rounded-xl space-y-1">
                <p className="font-bold text-red-900">{selectedReport.listingTitle}</p>
                <p className="text-red-700">
                  Violation flagged: <span className="font-semibold">{selectedReport.reason}</span>
                </p>
                <p className="text-slate-500 text-[11px]">Reported by: {selectedReport.reportedBy} ({selectedReport.date})</p>
              </div>
            </div>

            {canModerate ? (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    onResolve?.(selectedReport.id, 'DISMISS');
                    setSelectedReport(null);
                  }}
                  className="min-h-[40px] px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" /> Dismiss
                </button>
                <button
                  onClick={() => {
                    onResolve?.(selectedReport.id, 'REMOVE_LISTING');
                    setSelectedReport(null);
                  }}
                  className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Remove Listing
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400">Moderator permissions required.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
