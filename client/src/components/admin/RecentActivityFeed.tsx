import React from 'react';
import { UserPlus, PlusCircle, MessageSquare, PhoneCall, AlertTriangle, CreditCard, Activity as ActivityIcon } from 'lucide-react';
import { Activity } from '../../types/index.js';

interface RecentActivityFeedProps {
  activities?: Activity[];
  onViewAll?: () => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({ activities, onViewAll }) => {
  const items = activities || [];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registered':
        return { icon: UserPlus, bg: 'bg-blue-50 text-blue-600 border border-blue-200' };
      case 'listing_posted':
        return { icon: PlusCircle, bg: 'bg-emerald-50 text-emerald-600 border border-emerald-200' };
      case 'message_received':
        return { icon: MessageSquare, bg: 'bg-purple-50 text-purple-600 border border-purple-200' };
      case 'contact_request':
        return { icon: PhoneCall, bg: 'bg-orange-50 text-orange-600 border border-orange-200' };
      case 'listing_reported':
        return { icon: AlertTriangle, bg: 'bg-red-50 text-red-600 border border-red-200' };
      case 'payment_received':
        return { icon: CreditCard, bg: 'bg-sky-50 text-sky-600 border border-sky-200' };
      default:
        return { icon: UserPlus, bg: 'bg-slate-50 text-slate-600' };
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
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
            <ActivityIcon className="w-5 h-5" />
          </div>
          <p className="font-semibold text-slate-600">No recent activity</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Live platform activity events will show here in real time.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {items.slice(0, 7).map((item) => {
            const { icon: Icon, bg } = getActivityIcon(item.type);
            return (
              <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 leading-tight">{item.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 mt-0.5">{item.timeAgo}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
