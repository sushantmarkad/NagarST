import React, { useState } from 'react';
import { type IncidentReport } from '../../../data/mockAdminData';
import {
  AlertTriangle,
  Megaphone,
  Plus,
  CheckCircle2,
  Send,
  Bus,
  Check
} from 'lucide-react';

interface Props {
  modeType?: 'incidents' | 'announcements';
}

export const AdminIncidentsAnnouncements: React.FC<Props> = ({ modeType = 'incidents' }) => {
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [published, setPublished] = useState(false);

  const handleUpdateStatus = (id: string, newStatus: IncidentReport['status']) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc))
    );
  };

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementText) return;

    setPublished(true);
    setTimeout(() => {
      setPublished(false);
      setAnnouncementTitle('');
      setAnnouncementText('');
      alert('Official Public Alert published to all Passenger App users!');
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {modeType === 'incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700" /> Incident Command Board
              </h2>
              <p className="text-xs text-slate-500">
                Track breakdowns, traffic detours, accidents, and driver/conductor field reports.
              </p>
            </div>

            <button
              onClick={() => alert('New Incident Log Modal Opened')}
              className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <Plus className="w-4 h-4" /> Log New Field Incident
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {incidents.map((inc) => (
              <div key={inc.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-[#7847CB]" /> Bus {inc.busNumber} ({inc.routeNumber})
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                    inc.status === 'Resolved'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : inc.status === 'Investigating'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {inc.status}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <span className="font-bold text-rose-800 block">{inc.type} • {inc.location}</span>
                  <p className="text-slate-600 text-xs">{inc.description}</p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-medium">
                  <span>Reported by {inc.reportedBy}</span>
                  <span>{inc.reportedTime}</span>
                </div>

                {inc.status !== 'Resolved' && (
                  <button
                    onClick={() => handleUpdateStatus(inc.id, 'Resolved')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark Incident Resolved
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {modeType === 'announcements' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#7847CB]" /> Public Service Announcement Publisher
            </h2>
            <p className="text-xs text-slate-500">
              Publish official transit announcements that instantly display in the Passenger Mobile Application.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4 max-w-2xl">
            {published ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h3 className="text-sm font-bold">Service Alert Published to Mobile App</h3>
                <p className="text-xs text-emerald-700">All connected passenger apps received push notification bulletin.</p>
              </div>
            ) : (
              <form onSubmit={handlePublishAnnouncement} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Route 12 Service Advisory: Pipeline Road Detour"
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-semibold focus:outline-none focus:border-[#7847CB]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Announcement Message Details</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the service update, road maintenance detour, or timing adjustments..."
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-[#0f3c5c]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#0f3c5c] hover:bg-[#0a2a42] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Send className="w-4 h-4" /> Publish Announcement Broadcast
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
