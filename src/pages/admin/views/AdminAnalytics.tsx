import React, { useMemo } from 'react';
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
import { BarChart3, Users, IndianRupee, Route, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '../../../components/ui';
import { useApp } from '../../../context/AppContext';

export const AdminAnalytics: React.FC = () => {
  const { routes, buses, tickets, passes } = useApp();

  // Dynamic route revenue analytics derived from database routes and issued tickets
  const routeAnalytics = useMemo(() => {
    if (!routes || routes.length === 0) return [];

    return routes.map((r) => {
      const routeTickets = tickets.filter(
        (t) =>
          (r.origin && t.sourceStop?.toLowerCase().includes(r.origin.toLowerCase())) ||
          (r.destination && t.destinationStop?.toLowerCase().includes(r.destination.toLowerCase()))
      );
      const totalRev = routeTickets.reduce((sum, t) => sum + (t.fare || r.baseFare || 15), 0);
      const passengerCount = routeTickets.reduce((sum, t) => sum + (t.passengerCount || 1), 0);

      return {
        name: `R-${r.routeNumber || r.id.substring(0, 4)} (${r.origin} - ${r.destination})`,
        shortName: `R-${r.routeNumber || r.id.substring(0, 4)}`,
        passengers: passengerCount,
        revenue: totalRev,
        delay: 0,
      };
    });
  }, [routes, tickets]);

  // Payment breakdown derived from real ticket and pass ledger
  const paymentBreakdown = useMemo(() => {
    const totalTransactions = tickets.length + passes.length;
    if (totalTransactions === 0) {
      return [
        { name: 'UPI / QR Digital', value: 0, count: 0, color: '#7847CB' },
        { name: 'Cash On-Bus', value: 0, count: 0, color: '#10b981' },
        { name: 'Transit Passes', value: 0, count: 0, color: '#64748b' },
      ];
    }

    const digitalTickets = tickets.filter(t => t.status === 'active' || t.status === 'used').length;
    const passesCount = passes.length;
    const cashTickets = Math.max(0, tickets.length - digitalTickets);

    const digitalPct = Math.round((digitalTickets / totalTransactions) * 100);
    const passPct = Math.round((passesCount / totalTransactions) * 100);
    const cashPct = Math.max(0, 100 - digitalPct - passPct);

    return [
      { name: 'UPI / QR Digital', value: digitalPct, count: digitalTickets, color: '#7847CB' },
      { name: 'Cash On-Bus', value: cashPct, count: cashTickets, color: '#10b981' },
      { name: 'Transit Passes', value: passPct, count: passesCount, color: '#64748b' },
    ];
  }, [tickets, passes]);

  // Hourly curve derived from real tickets or active operational hours
  const hourlyData = useMemo(() => {
    const hours = ['06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    return hours.map((hour) => {
      const hourInt = parseInt(hour.split(':')[0], 10);
      const matchingTickets = tickets.filter((t) => {
        if (!t.purchaseTime) return false;
        const matchHour = parseInt(t.purchaseTime.split(':')[0], 10);
        return matchHour >= hourInt && matchHour < hourInt + 2;
      });
      return {
        hour,
        passengers: matchingTickets.reduce((sum, t) => sum + (t.passengerCount || 1), 0),
      };
    });
  }, [tickets]);

  const totalRevenue = routeAnalytics.reduce((sum, r) => sum + r.revenue, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 lg:p-6">
      {/* Title & Summary */}
      <div className="bg-white p-4 rounded-xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[#7847CB]" /> Municipal Performance & Fleet Analytics
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Operational metrics: passenger density curves, route revenue comparison, and digital collection ratios.
        </p>
      </div>

      {/* Hourly Passenger Density */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#7847CB]" /> Hourly Passenger Density & Peak Commute Profile
            </h3>
            <p className="text-xs text-slate-500">Rush hours concentrated at 08:00–10:00 AM and 05:00–07:00 PM</p>
          </div>
          <Badge variant="brand">
            Peak: 2,800 riders / hr
          </Badge>
        </div>

        <div className="h-72 w-full min-h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="passengerColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7847CB" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7847CB" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1b4b',
                  color: '#fff',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px'
                }}
              />
              <Area
                type="monotone"
                dataKey="passengers"
                stroke="#7847CB"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#passengerColor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Route Revenue & Payment Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Route className="w-4 h-4 text-[#7847CB]" /> Route Revenue & Ridership Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                {routes.length > 0 
                  ? `Computed from ${routes.length} municipal corridor(s) and issued passenger tickets` 
                  : 'No active corridors found in routes table'}
              </p>
            </div>
            {totalRevenue > 0 && (
              <Badge variant="brand">Total: ₹{totalRevenue.toLocaleString()}</Badge>
            )}
          </div>

          {routeAnalytics.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Route className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">No Routes in Database</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Add routes in Route Corridor Manager to view real ridership and revenue curves.</p>
            </div>
          ) : (
            <div className="h-64 w-full min-h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={routeAnalytics} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" interval={0} angle={-10} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e1b4b',
                      color: '#fff',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px'
                    }}
                    formatter={(val: any) => [`₹${val}`, 'Daily Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#7847CB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" /> Digital vs Cash Split
            </h3>
            <p className="text-xs text-slate-500">
              {tickets.length + passes.length > 0 
                ? `${paymentBreakdown[0].value}% digital QR ticketing compliance` 
                : 'Awaiting transactions from ticketing ledger'}
            </p>
          </div>

          <div className="h-48 w-full min-h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Share']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs font-medium pt-3 border-t border-slate-100">
            {paymentBreakdown.map((item) => (
              <div key={item.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
