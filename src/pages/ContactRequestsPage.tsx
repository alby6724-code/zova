import React, { useState } from 'react';
import { Search, Phone, MessageSquare, CheckCircle2, Clock, PhoneCall, ExternalLink, Filter } from 'lucide-react';

interface ContactLead {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;
  sellerName: string;
  listingTitle: string;
  message: string;
  status: 'Pending' | 'Contacted' | 'Resolved';
  time: string;
}

const INITIAL_LEADS: ContactLead[] = [
  {
    id: 'REQ-1048',
    buyerName: 'Rahul Verma',
    buyerPhone: '+91 98765 43210',
    buyerEmail: 'rahul.verma@example.com',
    sellerName: 'Amit Sharma',
    listingTitle: 'iPhone 15 Pro Max 256GB (Natural Titanium)',
    message: 'Interested in buying. Is price negotiable for immediate cash payment?',
    status: 'Pending',
    time: '12 mins ago',
  },
  {
    id: 'REQ-1047',
    buyerName: 'Priya Patel',
    buyerPhone: '+91 98111 22334',
    buyerEmail: 'priya.patel@example.com',
    sellerName: 'Vikram Singh',
    listingTitle: 'Royal Enfield Classic 350 - Gunmetal Grey',
    message: 'Want to inspect the vehicle and take a test ride this weekend in Indiranagar.',
    status: 'Contacted',
    time: '45 mins ago',
  },
  {
    id: 'REQ-1046',
    buyerName: 'Karan Malhotra',
    buyerPhone: '+91 99223 34455',
    buyerEmail: 'karan.m@example.com',
    sellerName: 'Suresh Kumar',
    listingTitle: 'MacBook Air M2 16GB / 512GB SSD',
    message: 'Please provide battery cycle count and original purchase invoice copy.',
    status: 'Pending',
    time: '2 hours ago',
  },
  {
    id: 'REQ-1045',
    buyerName: 'Ananya Sen',
    buyerPhone: '+91 97654 32198',
    sellerName: 'Neha Gupta',
    listingTitle: 'Honda Activa 6G (Single Owner, 2023)',
    message: 'Is full insurance valid till 2026? What is the transfer fee estimate?',
    status: 'Resolved',
    time: 'Yesterday',
  },
  {
    id: 'REQ-1044',
    buyerName: 'Mohit Sharma',
    buyerPhone: '+91 98450 11223',
    sellerName: 'Rajesh Motors',
    listingTitle: 'Hyundai Creta SX Petrol (Automatic)',
    message: 'Requesting callback regarding financing options and vehicle inspection history.',
    status: 'Contacted',
    time: '2 days ago',
  },
];

export const ContactRequestsPage: React.FC = () => {
  const [leads, setLeads] = useState<ContactLead[]>(INITIAL_LEADS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Contacted' | 'Resolved'>('All');

  const filteredLeads = leads.filter((item) => {
    const matchesSearch =
      item.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      item.listingTitle.toLowerCase().includes(search.toLowerCase()) ||
      item.sellerName.toLowerCase().includes(search.toLowerCase()) ||
      item.buyerPhone.includes(search);
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const updateStatus = (id: string, newStatus: 'Pending' | 'Contacted' | 'Resolved') => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
  };

  const pendingCount = leads.filter((l) => l.status === 'Pending').length;
  const contactedCount = leads.filter((l) => l.status === 'Contacted').length;
  const resolvedCount = leads.filter((l) => l.status === 'Resolved').length;

  return (
    <div className="space-y-6 pb-12 w-full max-w-full">
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-purple-600" />
            <span>Contact Requests & Buyer Leads</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor buyer-seller direct lead generations, call triggers, and callback requests.
          </p>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Phone className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Pending Callbacks</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{pendingCount}</h3>
            <span className="text-[11px] text-amber-600 font-semibold">Requires action</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">In Progress</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{contactedCount}</h3>
            <span className="text-[11px] text-blue-600 font-semibold">Contact initiated</span>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Resolved Leads</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{resolvedCount}</h3>
            <span className="text-[11px] text-emerald-600 font-semibold">Successfully connected</span>
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
            placeholder="Search by buyer, listing, or phone..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Contacted">Contacted</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Content Area: Desktop Table + Mobile Stacked Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Desktop Table View (≥768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Lead ID</th>
                <th className="py-3.5 px-4">Buyer Details</th>
                <th className="py-3.5 px-4">Target Listing</th>
                <th className="py-3.5 px-4">Seller</th>
                <th className="py-3.5 px-4">Inquiry Note</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-purple-600">{lead.id}</td>
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{lead.buyerName}</p>
                    <a
                      href={`tel:${lead.buyerPhone}`}
                      className="text-[11px] text-slate-500 hover:text-purple-600 font-mono flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-purple-500" />
                      {lead.buyerPhone}
                    </a>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 max-w-[180px] truncate">
                    {lead.listingTitle}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{lead.sellerName}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate text-[11px]">
                    "{lead.message}"
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lead.status === 'Pending'
                          ? 'bg-amber-50 text-amber-700'
                          : lead.status === 'Contacted'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {lead.status !== 'Contacted' && (
                        <button
                          onClick={() => updateStatus(lead.id, 'Contacted')}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Mark Contacted
                        </button>
                      )}
                      {lead.status !== 'Resolved' && (
                        <button
                          onClick={() => updateStatus(lead.id, 'Resolved')}
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
          {filteredLeads.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No contact requests found matching filters.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <div key={lead.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      {lead.id}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{lead.buyerName}</h4>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      lead.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700'
                        : lead.status === 'Contacted'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>

                <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl space-y-1">
                  <p className="font-semibold text-slate-900 truncate">Ad: {lead.listingTitle}</p>
                  <p className="text-[11px] text-slate-500">Seller: {lead.sellerName}</p>
                  <p className="text-[11px] text-slate-600 italic">"{lead.message}"</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <a
                    href={`tel:${lead.buyerPhone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Buyer</span>
                  </a>

                  <div className="flex items-center gap-1.5">
                    {lead.status !== 'Contacted' && (
                      <button
                        onClick={() => updateStatus(lead.id, 'Contacted')}
                        className="px-2.5 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold"
                      >
                        Contacted
                      </button>
                    )}
                    {lead.status !== 'Resolved' && (
                      <button
                        onClick={() => updateStatus(lead.id, 'Resolved')}
                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
