import React from 'react';
import { UserPlus, Tag, BarChart2, Headphones } from 'lucide-react';

interface QuickActionsCardProps {
  onAddUser: () => void;
  onManageListings: () => void;
  onViewReports: () => void;
  onSupportTickets: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  onAddUser,
  onManageListings,
  onViewReports,
  onSupportTickets,
}) => {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
      <h3 className="text-base font-bold text-slate-900 mb-4">Quick Actions</h3>

      <div className="flex flex-col gap-3">
        {/* Blue: + Add New User */}
        <button
          onClick={onAddUser}
          className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-[#3b82f6] hover:bg-blue-600 text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <UserPlus className="w-3.5 h-3.5" />
          </div>
          <span>+ Add New User</span>
        </button>

        {/* Green: Manage Listings */}
        <button
          onClick={onManageListings}
          className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-[#22c55e] hover:bg-emerald-600 text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Tag className="w-3.5 h-3.5" />
          </div>
          <span>Manage Listings</span>
        </button>

        {/* Orange: View Reports */}
        <button
          onClick={onViewReports}
          className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-[#f97316] hover:bg-orange-600 text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <BarChart2 className="w-3.5 h-3.5" />
          </div>
          <span>View Reports</span>
        </button>

        {/* Purple: Support Tickets */}
        <button
          onClick={onSupportTickets}
          className="w-full flex items-center justify-start gap-3 px-4 py-3 bg-[#a855f7] hover:bg-purple-600 text-white rounded-xl font-semibold text-xs shadow-sm hover:shadow transition-all active:scale-[0.98]"
        >
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Headphones className="w-3.5 h-3.5" />
          </div>
          <span>Support Tickets</span>
        </button>
      </div>
    </div>
  );
};
