import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import { Calendar, Download, TrendingUp, BarChart3, Users, IndianRupee, Route } from 'lucide-react';

export const AdminAnalytics: React.FC = () => {
  const hourlyData = [
    { hour: '06:00', passengers: 420 },
    { hour: '08:00', passengers: 1850 },
    { hour: '10:00', passengers: 2610 },
    { hour: '12:00', passengers: 1200 },
    { hour: '14:00', passengers: 950 },
    { hour: '16:00', passengers: 1400 },
    { hour: '18:00', passengers: 2800 },
    { hour: '20:00', passengers: 1600 },
    { hour: '22:00', passengers: 400 },
  ];

  const routeAnalytics = [
    { name: 'Route 12 (CBS-Savedi)', passengers: 4820, revenue: 62500, delay: 2.1 },
    { name: 'Route 07 (MIDC-Market)', passengers: 3950, revenue: 51200, delay: 4.8 },
    { name: 'Route 05 (Station-PVP)', passengers: 2840, revenue: 36800, delay: 1.5 },
    { name: 'Route 03 (Express-Ring)', passengers: 1980, revenue: 25700, delay: 0.9 },
  ];

  const paymentBreakdown = [
    { name: 'UPI / QR Digital', value: 58, color: '#7847CB' },
    { name: 'Cash On-Bus', value: 28, color: '#10b981' },
    { name: 'Monthly Student Pass', value: 14, color: '#64748b' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#7847CB]" /> Performance & Revenue Analytics
        </h2>
        <p className="text-xs text-slate-500">
          Purposeful operational metrics: hourly passenger density curves, route demand comparison, and digital collection ratios.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#7847CB]" /> Hourly Passenger Density & Peak Hour Curve
            </h3>
            <p className="text-xs text-slate-500">Identify rush hours (08:00 AM – 10:00 AM and 05:00 PM – 07:00 PM)</p>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-50 text-[#7847CB] font-bold border border-blue-100 text-xs">
            Peak Density: 2,610 riders / hr
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="passengerColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7847CB" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#7847CB" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#7847CB', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="passengers" stroke="#7847CB" strokeWidth={2.5} fillOpacity={1} fill="url(#passengerColor)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Route className="w-5 h-5 text-[#7847CB]" /> Route Revenue Comparison
            </h3>
            <span className="text-xs text-slate-500 font-medium">Route 12 is top revenue generator</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeAnalytics}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#7847CB', color: '#fff', borderRadius: '12px', fontSize: '12px' }}
                />
                <Bar dataKey="revenue" fill="#7847CB" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <IndianRupee className="w-5 h-5 text-amber-700" /> Payment Distribution
            </h3>
            <p className="text-xs text-slate-500">Digital QR adoption reaches 58%</p>
          </div>

          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs font-semibold pt-2 border-t border-slate-100">
            {paymentBreakdown.map((item) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700">{item.name}</span>
                </div>
                <span className="font-extrabold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
