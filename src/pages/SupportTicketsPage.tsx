import React, { useState } from 'react';
import { HelpCircle, Search, Clock, CheckCircle2, AlertCircle, MessageSquare, Headphones, Filter } from 'lucide-react';

interface SupportTicket {
  id: string;
  user: string;
  email: string;
  category: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  priority: 'High' | 'Medium' | 'Low';
  time: string;
}

const INITIAL_TICKETS: SupportTicket[] = [
  {
    id: 'TICK-401',
    user: 'Amit Sharma',
    email: 'amit.sharma@example.com',
    category: 'Payment Issue',
    subject: 'Charged twice for Pro Seller subscription upgrade via UPI',
    status: 'OPEN',
    priority: 'High',
    time: '10 mins ago',
  },
  {
    id: 'TICK-402',
    user: 'Rohan Patel',
    email: 'rohan.p@example.com',
    category: 'Listing Approval',
    subject: 'Ad auto-flagged for wrong category (Car Accessories vs Vehicles)',
    status: 'IN_PROGRESS',
    priority: 'Medium',
    time: '45 mins ago',
  },
  {
    id: 'TICK-403',
    user: 'Neha Kapoor',
    email: 'neha.k@example.com',
    category: 'Account Security',
    subject: 'Lost phone, unable to receive SMS OTP for login',
    status: 'OPEN',
    priority: 'High',
    time: '2 hours ago',
  },
  {
    id: 'TICK-404',
    user: 'Vikram Mehta',
    email: 'vikram.m@example.com',
    category: 'Buyer Fraud',
    subject: 'Buyer requested payment via fake QR code scanner link',
    status: 'RESOLVED',
    priority: 'High',
    time: 'Yesterday',
  },
  {
    id: 'TICK-405',
    user: 'Kiran Rao',
    email: 'kiran.rao@example.com',
    category: 'Feature Request',
    subject: 'Request for scheduled ad bump feature for premium dealers',
    status: 'RESOLVED',
    priority: 'Low',
    time: '2 days ago',
  },
];

export const SupportTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>(INITIAL_TICKETS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  const updateStatus = (id: string, newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t)));
  };

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      t.user.toLowerCase().includes(search.toLowerCase()) ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Page Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-indigo-600" />
            <span>Support Tickets & Help Desk Queue</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolve buyer inquiries, refund disputes, account security escalations, and technical bugs.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Open Tickets</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{openCount}</h3>
            <span className="text-[11px] text-amber-600 font-semibold">Action needed</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">In Progress</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{inProgressCount}</h3>
            <span className="text-[11px] text-blue-600 font-semibold">Under investigation</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Resolved</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{resolvedCount}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold">Closed successfully</span>
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <div className="relative flex-1 w-full min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets by ID, user, subject, or category..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Content Area: Desktop Table + Mobile Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop Table View (≥768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Ticket ID</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600">{t.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{t.user}</p>
                    <p className="text-[10px] text-slate-400">{t.email}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                      {t.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 max-w-xs truncate">{t.subject}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        t.priority === 'High'
                          ? 'bg-rose-50 text-rose-700'
                          : t.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'OPEN'
                          ? 'bg-amber-50 text-amber-700'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {t.status !== 'IN_PROGRESS' && t.status !== 'RESOLVED' && (
                        <button
                          onClick={() => updateStatus(t.id, 'IN_PROGRESS')}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Investigate
                        </button>
                      )}
                      {t.status !== 'RESOLVED' && (
                        <button
                          onClick={() => updateStatus(t.id, 'RESOLVED')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (<768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.map((t) => (
            <div key={t.id} className="p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {t.id}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {t.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{t.subject}</h4>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    t.status === 'OPEN'
                      ? 'bg-amber-50 text-amber-700'
                      : t.status === 'IN_PROGRESS'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {t.status}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{t.user}</p>
                  <p className="text-[10px] text-slate-400">{t.email}</p>
                </div>
                <span className="text-[10px] text-slate-400">{t.time}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    t.priority === 'High'
                      ? 'bg-rose-50 text-rose-700'
                      : t.priority === 'Medium'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Priority: {t.priority}
                </span>

                <div className="flex items-center gap-1.5">
                  {t.status !== 'IN_PROGRESS' && t.status !== 'RESOLVED' && (
                    <button
                      onClick={() => updateStatus(t.id, 'IN_PROGRESS')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Investigate
                    </button>
                  )}
                  {t.status !== 'RESOLVED' && (
                    <button
                      onClick={() => updateStatus(t.id, 'RESOLVED')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
