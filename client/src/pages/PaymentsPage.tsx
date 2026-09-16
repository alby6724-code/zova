import React, { useState, useEffect } from 'react';
import { Payment } from '../types/index.js';
import { api } from '../services/api.js';
import { CreditCard, DollarSign, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const data = await api.getPayments();
        setPayments(data.payments);
        setRevenue(data.totalRevenue);
      } catch (err) {
        console.error('Failed to load payments:', err);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top revenue cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
            ₹
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Platform Revenue</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">₹ {revenue.toLocaleString()}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">↑ 28% this month</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold text-lg">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Completed Transactions</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{payments.length}</h3>
            <p className="text-[11px] text-blue-600 font-semibold mt-1">100% settlement rate</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center font-bold text-lg">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Avg. Featured Ad Order</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-0.5">₹ 665</h3>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">High seller conversion</p>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Orders & Payment Transactions</h3>
        </div>
        {/* Desktop Table View (≥768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3.5 px-4">Transaction ID</th>
                <th className="py-3.5 px-4">Listing / Item</th>
                <th className="py-3.5 px-4">Tier / Type</th>
                <th className="py-3.5 px-4">Payer</th>
                <th className="py-3.5 px-4">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">#{p.id}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-900">{p.adTitle}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-medium rounded-md text-[11px]">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{p.payerName}</p>
                    <p className="text-[10px] text-slate-400">{p.payerEmail}</p>
                  </td>
                  <td className="py-3.5 px-4 font-extrabold text-slate-900">₹ {p.amount}</td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {p.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View (<768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {payments.map((p) => (
            <div key={p.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-600">#{p.id}</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> {p.status}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{p.adTitle}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">By {p.payerName}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-slate-900">₹{p.amount}</span>
                  <span className="block text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 font-semibold rounded mt-0.5">
                    {p.type}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
