import React, { useState } from 'react';
import { X, UserPlus, Tag, Headphones, Check } from 'lucide-react';
import { UserRole, ListingCategory } from '../../types/index.js';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; role: UserRole; phone?: string; location?: string }) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('BUYER');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Kolkata, West Bengal');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    onSubmit({ name, email, role, phone, location });
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Add New User</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Chandra"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ramesh@example.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="BUYER">Buyer</option>
                <option value="SELLER">Seller</option>
                <option value="SUPPORT">Support</option>
                <option value="MODERATOR">Moderator</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98000 12345"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface SupportTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportTicketsModal: React.FC<SupportTicketsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const tickets = [
    {
      id: 'TKT-2025-8821',
      user: 'Amit Sharma',
      subject: 'Invoice copy required for featured listing payment',
      status: 'OPEN',
      priority: 'MEDIUM',
      category: 'Billing',
      time: '1 hr ago',
    },
    {
      id: 'TKT-2025-8819',
      user: 'Rohit Verma',
      subject: 'Reported buyer phone number was invalid',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      category: 'Safety & Fraud',
      time: '3 hrs ago',
    },
    {
      id: 'TKT-2025-8815',
      user: 'Kavita Sharma',
      subject: 'How to bump up ad to top of search?',
      status: 'RESOLVED',
      priority: 'LOW',
      category: 'General',
      time: '1 day ago',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-purple-600">
            <Headphones className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-900">Support Tickets Queue</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4 divide-y divide-slate-100 max-h-80 overflow-y-auto">
          {tickets.map((t) => (
            <div key={t.id} className="py-3 text-xs flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 font-medium">{t.id}</span>
                  <span className="font-semibold text-slate-900">{t.user}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">
                    {t.category}
                  </span>
                </div>
                <p className="text-slate-600 mt-0.5">{t.subject}</p>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    t.status === 'OPEN'
                      ? 'bg-amber-50 text-amber-700'
                      : t.status === 'IN_PROGRESS'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {t.status}
                </span>
                <span className="block text-[10px] text-slate-400 mt-0.5">{t.time}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
