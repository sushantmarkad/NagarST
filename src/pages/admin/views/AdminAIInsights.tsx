import React, { useState, useMemo } from 'react';
import { type AIInsight } from '../../../data/mockAdminData';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { useApp } from '../../../context/AppContext';
import { Button, Badge } from '../../../components/ui';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  RefreshCcw,
  Lightbulb,
  ArrowRight,
  Bus
} from 'lucide-react';

export const AdminAIInsights: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { buses, routes, stops, refreshData } = useApp();

  const [appliedInsightIds, setAppliedInsightIds] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Dynamically generate intelligent recommendations from live fleet and corridor conditions
  const insights: AIInsight[] = useMemo(() => {
    const list: AIInsight[] = [];

    // 1. Check for delayed vehicles
    const delayedBus = buses.find((b: any) => b.status === 'delayed');
    if (delayedBus) {
      list.push({
        id: `ai-delay-${delayedBus.id}`,
        title: 'Corridor Congestion & Delay Detected',
        category: 'Delay Detection',
        severity: 'high',
        description: 'Live GPS speed indicates traffic bottlenecks along the corridor.',
        recommendation: `Vehicle ${delayedBus.busNumber} on ${delayedBus.routeName || 'corridor'} is encountering bottlenecks. Advise driver to take peripheral bypass.`,
        routeOrBus: `Bus ${delayedBus.busNumber} (${delayedBus.routeName || 'Active Route'})`,
        timestamp: 'Just now',
      });
    }

    // 2. Check for routes without active vehicles
    const unservedRoute = routes.find((r: any) => !buses.some((b: any) => b.routeId === r.id));
    if (unservedRoute) {
      list.push({
        id: `ai-alloc-${unservedRoute.id}`,
        title: 'Headway Gap & Fleet Allocation Notice',
        category: 'Demand Prediction',
        severity: 'medium',
        description: 'Route corridor currently lacks active assigned bus units.',
        recommendation: `Route ${unservedRoute.routeNumber || unservedRoute.name} currently has no active live bus assigned. Deploy reserve fleet unit from CBS depot.`,
        routeOrBus: `Route ${unservedRoute.routeNumber || unservedRoute.name}`,
        timestamp: 'Just now',
      });
    }

    // 3. Network coverage intelligence
    list.push({
      id: 'ai-net-coverage',
      title: 'Municipal Transit Stop Density Optimization',
      category: 'Demand Prediction',
      severity: 'low',
      description: `All ${stops.length} municipal transit stops are mapped and synced with GPS geofencing.`,
      recommendation: `Municipal stop coverage active across ${stops.length} municipal stations. Dynamic dispatch balancing enabled.`,
      routeOrBus: `${stops.length} Municipal Stops Network`,
      timestamp: 'Today',
    });

    // 4. EV fleet telemetry
    list.push({
      id: 'ai-ev-telemetry',
      title: 'EV Battery & Regenerative Powertrain Health',
      category: 'Maintenance Risk',
      severity: 'low',
      description: 'Fleet battery temperatures registering within standard nominal range.',
      recommendation: 'Fleet telemetry indicates normal battery temperatures across active operational units. Schedule routine depot charging rotation.',
      routeOrBus: `${buses.length} Monitored Vehicles`,
      timestamp: 'Continuous',
    });

    return list;
  }, [buses, routes, stops]);

  const handleApplyRecommendation = async (insight: AIInsight) => {
    const ok = await confirm({
      title: 'Apply Dispatch Optimization',
      message: `Execute AI recommendation for ${insight.routeOrBus}:\n"${insight.recommendation}"?`,
      confirmText: 'Apply Action',
      cancelText: 'Cancel',
      variant: 'brand',
    });
    if (!ok) return;

    setAppliedInsightIds(prev => [...prev, insight.id]);
    toast.success(
      'Optimization Applied',
      `Dispatch rules updated for ${insight.routeOrBus}. Notification sent to depot masters.`
    );
  };

  const handleRunSync = () => {
    setIsSyncing(true);
    refreshData();
    setTimeout(() => {
      setIsSyncing(false);
      toast.success(
        'Telemetry Model Re-calibrated',
        'Ingested real-time GPS locations, route delays, and sensor streams.'
      );
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 lg:p-6">
      {/* Header Banner */}
      <div className="p-6 rounded-xl bg-[#7847CB] text-white shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-200" /> Operational Telemetry & Predictive AI
          </div>
          <h2 className="text-xl font-bold text-white">Predictive Transit Optimization</h2>
          <p className="text-xs text-purple-100/90 mt-1 max-w-2xl leading-relaxed">
            Predictive models analyze historical passenger patterns, live GPS speeds, traffic bottlenecks, and engine telemetry to recommend proactive transit adjustments.
          </p>
        </div>

        <Button
          onClick={handleRunSync}
          variant="outline"
          size="sm"
          loading={isSyncing}
          className="bg-white/10 hover:bg-white/20 text-white border-white/30 shrink-0"
          icon={<RefreshCcw className="w-4 h-4" />}
        >
          Run Telemetry Sync
        </Button>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Active Telemetry Insights ({insights.length})
          </h3>
          <span className="text-xs text-slate-400">Refreshed continuously from active fleet</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {insights.map((insight) => {
            const isApplied = appliedInsightIds.includes(insight.id);
            return (
              <div
                key={insight.id}
                className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border shrink-0 ${
                      insight.category === 'Demand Prediction'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : insight.category === 'Delay Detection'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {insight.category === 'Demand Prediction' && <TrendingUp className="w-5 h-5" />}
                      {insight.category === 'Delay Detection' && <AlertTriangle className="w-5 h-5" />}
                      {insight.category === 'Maintenance Risk' && <Wrench className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {insight.category}
                        </span>
                        <span className="text-xs font-semibold text-[#7847CB]">
                          {insight.routeOrBus}
                        </span>
                        <Badge variant={insight.severity === 'high' ? 'danger' : insight.severity === 'medium' ? 'warning' : 'info'}>
                          {insight.severity.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{insight.title}</h4>
                    </div>
                  </div>

                  <span className="text-xs text-slate-400 whitespace-nowrap">{insight.timestamp}</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                  {insight.description}
                </p>

                <div className="p-3.5 rounded-lg bg-purple-50/60 border border-purple-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-[#7847CB] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-[#7847CB] block">Recommended Operational Action:</span>
                      <span className="text-slate-800 font-medium">{insight.recommendation}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleApplyRecommendation(insight)}
                    disabled={isApplied}
                    variant={isApplied ? 'outline' : 'primary'}
                    size="sm"
                    className={isApplied ? 'text-emerald-700 border-emerald-300 bg-emerald-50 shrink-0' : 'shrink-0'}
                    icon={isApplied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {isApplied ? 'Action Applied' : 'Execute Action'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
