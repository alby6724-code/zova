import React, { useState, useEffect } from 'react';
import { Report } from '../types/index.js';
import { api } from '../services/api.js';
import { ShieldAlert, CheckCircle, Trash2, Ban } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

export const ReportsPage: React.FC = () => {
  const { role } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);

  const canModerate = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(role);

  const fetchReports = async () => {
    try {
      const data = await api.getReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolve = async (id: string, action: 'DISMISS' | 'REMOVE_LISTING' | 'BAN_USER') => {
    try {
      await api.resolveReport(id, action);
      fetchReports();
    } catch (err) {
      alert('Failed to resolve report');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Safety & Trust — Reported Listings</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review community reports, fraudulent activity, spam, and counterfeit items.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop Table View (≥768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Listing Title</th>
                <th className="py-3.5 px-4">Flag Reason</th>
                <th className="py-3.5 px-4">Reported By</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reports.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{r.listingTitle}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700">
                      {r.reason}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{r.reportedBy}</td>
                  <td className="py-3.5 px-4 text-slate-500">{r.date}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700'
                          : r.status === 'Action Taken'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {canModerate && r.status === 'Pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResolve(r.id, 'DISMISS')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px]"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => handleResolve(r.id, 'REMOVE_LISTING')}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md font-semibold text-[11px]"
                        >
                          Take Down
                        </button>
                        <button
                          onClick={() => handleResolve(r.id, 'BAN_USER')}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded-md font-semibold text-[11px]"
                        >
                          Ban Seller
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (<768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {reports.map((r) => (
            <div key={r.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-900 leading-snug">{r.listingTitle}</h4>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    r.status === 'Pending'
                      ? 'bg-amber-50 text-amber-700'
                      : r.status === 'Action Taken'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {r.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                <span className="px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700 text-[10px]">
                  {r.reason}
                </span>
                <span>Reported by {r.reportedBy}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">{r.date}</span>
                {canModerate && r.status === 'Pending' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResolve(r.id, 'DISMISS')}
                      className="px-2 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={() => handleResolve(r.id, 'REMOVE_LISTING')}
                      className="px-2 py-1 bg-red-600 text-white rounded-lg text-xs font-semibold"
                    >
                      Take Down
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
