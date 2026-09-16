import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import { CategoryBreakdown, PlatformActivityPoint, UserTypeDistribution } from '../../types/index.js';

// 1. Listings by Category Donut Chart matching ox.jpeg
interface CategoryDonutChartProps {
  categories?: CategoryBreakdown[];
  totalListings?: number;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories = [
    { name: 'Mobiles & Tablets', count: 9842, percentage: 21, color: '#3b82f6' },
    { name: 'Electronics', count: 8736, percentage: 19, color: '#22c55e' },
    { name: 'Vehicles', count: 7215, percentage: 16, color: '#06b6d4' },
    { name: 'Home & Furniture', count: 6482, percentage: 14, color: '#d946ef' },
    { name: 'Fashion & Beauty', count: 4927, percentage: 11, color: '#a855f7' },
    { name: 'Jobs', count: 3214, percentage: 7, color: '#f97316' },
    { name: 'Others', count: 5366, percentage: 12, color: '#64748b' },
  ],
  totalListings = 45782,
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-w-0 w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-slate-900">Listings by Category</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Donut with center text */}
        <div className="relative w-full h-48 flex items-center justify-center min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categories}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
              >
                {categories.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-lg font-extrabold text-slate-900 leading-tight">
              {totalListings.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Total Listings</span>
          </div>
        </div>

        {/* Legend listing matching ox.jpeg */}
        <div className="space-y-2 text-xs min-w-0">
          {categories.map((cat) => (
            <div key={cat.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-600 font-medium truncate max-w-[130px]">{cat.name}</span>
              </div>
              <div className="flex items-center gap-2 text-right shrink-0">
                <span className="font-semibold text-slate-800">{cat.count.toLocaleString()}</span>
                <span className="text-slate-400 text-[11px] w-8">({cat.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 2. Platform Activity Line Chart matching ox.jpeg
interface PlatformActivityChartProps {
  activity?: PlatformActivityPoint[];
}

export const PlatformActivityChart: React.FC<PlatformActivityChartProps> = ({
  activity = [
    { date: 'Sep 3', users: 8200, listings: 3400, chats: 1800 },
    { date: 'Sep 4', users: 9100, listings: 4200, chats: 2300 },
    { date: 'Sep 5', users: 10400, listings: 5800, chats: 3100 },
    { date: 'Sep 6', users: 11200, listings: 6700, chats: 3900 },
    { date: 'Sep 7', users: 12800, listings: 7900, chats: 4800 },
    { date: 'Sep 8', users: 14300, listings: 9100, chats: 5600 },
    { date: 'Sep 9', users: 16500, listings: 10800, chats: 6900 },
  ],
}) => {
  const [filter, setFilter] = useState('Last 7 Days');

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-100 shadow-sm flex flex-col justify-between min-w-0 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Platform Activity</h3>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-2.5 sm:gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Users
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Listings
            </span>
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" /> Chats
            </span>
          </div>

          <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all shrink-0">
            <span>{filter}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}K` : v)}
              domain={[0, 20000]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            />
            <Line
              type="monotone"
              dataKey="users"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#3b82f6', strokeWidth: 1, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="listings"
              stroke="#22c55e"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#22c55e', strokeWidth: 1, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="chats"
              stroke="#a855f7"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#a855f7', strokeWidth: 1, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 3. User Type Donut Chart matching ox.jpeg
interface UserTypeDonutChartProps {
  distribution?: UserTypeDistribution;
  totalUsers?: number;
}

export const UserTypeDonutChart: React.FC<UserTypeDonutChartProps> = ({
  distribution = {
    buyers: { count: 19482, percentage: 68 },
    sellers: { count: 8981, percentage: 32 },
  },
  totalUsers = 28463,
}) => {
  const data = [
    { name: 'Buyers', value: distribution.buyers.count, color: '#3b82f6' },
    { name: 'Sellers', value: distribution.sellers.count, color: '#22c55e' },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
      <h3 className="text-base font-bold text-slate-900 mb-2">User Type</h3>

      <div className="flex items-center justify-between gap-4">
        {/* Donut */}
        <div className="relative w-36 h-36 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-base font-bold text-slate-900 leading-tight">
              {totalUsers.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Total Users</span>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3 text-xs flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
              <span className="text-slate-600 font-medium">Buyers</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-800">
                {distribution.buyers.count.toLocaleString()}
              </span>
              <span className="text-slate-400 text-[11px] ml-1">({distribution.buyers.percentage}%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
              <span className="text-slate-600 font-medium">Sellers</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-slate-800">
                {distribution.sellers.count.toLocaleString()}
              </span>
              <span className="text-slate-400 text-[11px] ml-1">({distribution.sellers.percentage}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
