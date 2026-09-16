import React from 'react';
import { Users, Tag, MessageSquare, Phone, AlertTriangle, ArrowUp } from 'lucide-react';

export interface KPICardProps {
  title: string;
  count: number | string;
  change: string;
  positive: boolean;
  type: 'users' | 'listings' | 'chats' | 'clicks' | 'reports';
}

export const KPICard: React.FC<KPICardProps> = ({ title, count, change, positive, type }) => {
  const getTheme = () => {
    switch (type) {
      case 'users':
        return {
          icon: Users,
          iconBg: 'bg-[#3b82f6]',
          iconColor: 'text-white',
          lightBg: 'bg-blue-50/60',
          textColor: 'text-blue-600',
        };
      case 'listings':
        return {
          icon: Tag,
          iconBg: 'bg-[#22c55e]',
          iconColor: 'text-white',
          lightBg: 'bg-emerald-50/60',
          textColor: 'text-emerald-600',
        };
      case 'chats':
        return {
          icon: MessageSquare,
          iconBg: 'bg-[#f97316]',
          iconColor: 'text-white',
          lightBg: 'bg-orange-50/60',
          textColor: 'text-orange-600',
        };
      case 'clicks':
        return {
          icon: Phone,
          iconBg: 'bg-[#a855f7]',
          iconColor: 'text-white',
          lightBg: 'bg-purple-50/60',
          textColor: 'text-purple-600',
        };
      case 'reports':
        return {
          icon: AlertTriangle,
          iconBg: 'bg-[#ef4444]',
          iconColor: 'text-white',
          lightBg: 'bg-red-50/60',
          textColor: 'text-red-600',
        };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-center gap-2.5 sm:gap-4 min-w-0">
      {/* Icon with rounded rectangle matching ox.jpeg */}
      <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${theme.iconBg} flex items-center justify-center ${theme.iconColor} shrink-0 shadow-sm`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>

      {/* Stats and Trend */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 truncate">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5 truncate">
          {typeof count === 'number' ? count.toLocaleString() : count}
        </h3>
        <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
          <span className={`inline-flex items-center gap-0.5 text-[11px] sm:text-xs font-semibold shrink-0 ${positive ? 'text-emerald-600' : 'text-red-600'}`}>
            <ArrowUp className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${positive ? '' : 'rotate-180'}`} />
            {change}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal truncate hidden sm:inline">vs last 7 days</span>
        </div>
      </div>
    </div>
  );
};
