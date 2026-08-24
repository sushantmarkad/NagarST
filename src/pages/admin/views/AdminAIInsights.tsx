import React, { useState } from 'react';
import { type AIInsight } from '../../../data/mockAdminData';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  ArrowRight,
  RefreshCcw,
  Lightbulb
} from 'lucide-react';

export const AdminAIInsights: React.FC = () => {
  const [insights] = useState<AIInsight[]>([]);
  const [appliedInsightId, setAppliedInsightId] = useState<string | null>(null);

  const handleApplyRecommendation = (id: string, recommendation: string) => {
    setAppliedInsightId(id);
    alert(`AI Recommendation Action Executed:\n"${recommendation}"\n\nDispatch rules updated.`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="p-6 rounded-2xl bg-[#7847CB] text-white shadow-sm flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-400/20 text-sky-200 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Operations Telemetry Insights
          </div>
          <h2 className="text-xl font-extrabold text-white">Predictive Transit Optimization</h2>
          <p className="text-xs text-sky-100/80 mt-1 max-w-2xl">
            Telemetry models analyzing historical passenger flow, traffic delay bottlenecks, and engine thermal sensor diagnostics to recommend proactive dispatch adjustments.
          </p>
        </div>

        <button
          onClick={() => alert('Re-running neural model telemetry pipeline...')}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 border border-white/20 transition hidden sm:flex"
        >
          <RefreshCcw className="w-4 h-4" /> Run Telemetry Sync
        </button>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Active Operational Recommendations ({insights.length})
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border ${
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
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {insight.category} • {insight.routeOrBus}
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900 mt-1">{insight.title}</h4>
                  </div>
                </div>

                <span className="text-[11px] font-semibold text-slate-400">{insight.timestamp}</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                {insight.description}
              </p>

              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Lightbulb className="w-4 h-4 text-[#7847CB] shrink-0" />
                  <div>
                    <span className="font-bold text-[#7847CB] block">Operational Recommendation:</span>
                    <span className="text-slate-800 font-semibold">{insight.recommendation}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleApplyRecommendation(insight.id, insight.recommendation)}
                  disabled={appliedInsightId === insight.id}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    appliedInsightId === insight.id
                      ? 'bg-emerald-600 text-white cursor-default'
                      : 'bg-[#7847CB] text-white hover:bg-[#0a2a42] shadow-xs'
                  }`}
                >
                  {appliedInsightId === insight.id ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Applied
                    </>
                  ) : (
                    <>
                      <span>Deploy Action</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
