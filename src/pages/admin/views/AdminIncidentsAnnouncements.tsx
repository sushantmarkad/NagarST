import React, { useState, useEffect } from 'react';
import { type IncidentReport } from '../../../data/mockAdminData';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { Button, Badge, Modal } from '../../../components/ui';
import {
  AlertTriangle,
  Megaphone,
  Plus,
  Send,
  Bus,
  Check,
  MapPin,
  Clock,
  User,
  Radio,
  CheckCircle2
} from 'lucide-react';

interface Props {
  modeType?: 'incidents' | 'announcements';
}

const loadSavedIncidents = (): IncidentReport[] => {
  try {
    const saved = localStorage.getItem('nagarst_incidents');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

export const AdminIncidentsAnnouncements: React.FC<Props> = ({ modeType = 'incidents' }) => {
  const toast = useToast();
  const confirm = useConfirm();

  const [incidents, setIncidents] = useState<IncidentReport[]>(loadSavedIncidents);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'info' | 'warning' | 'critical'>('warning');
  const [isPublishing, setIsPublishing] = useState(false);

  // New incident modal state
  const [isLogIncidentOpen, setIsLogIncidentOpen] = useState(false);
  const [newIncident, setNewIncident] = useState({
    busNumber: 'AH-09',
    routeNumber: 'R-05',
    type: 'Breakdown' as IncidentReport['type'],
    location: '',
    reportedBy: 'Control Room Officer',
    description: '',
  });

  const handleUpdateStatus = async (id: string, newStatus: IncidentReport['status']) => {
    if (newStatus === 'Resolved') {
      const ok = await confirm({
        title: 'Mark Incident Resolved',
        message: 'Has the road clearance or mechanical maintenance completed and verified?',
        confirmText: 'Mark Resolved',
        cancelText: 'Keep Active',
        variant: 'brand',
      });
      if (!ok) return;
    }

    setIncidents((prev) => {
      const updated = prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc));
      try {
        localStorage.setItem('nagarst_incidents', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    toast.success('Incident Updated', `Status changed to ${newStatus}`);
  };

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.location || !newIncident.description) {
      toast.warning('Incomplete Form', 'Please provide location and description');
      return;
    }

    const created: IncidentReport = {
      id: `INC-${Math.floor(400 + Math.random() * 500)}`,
      type: newIncident.type,
      busNumber: newIncident.busNumber,
      routeNumber: newIncident.routeNumber,
      location: newIncident.location,
      reportedBy: newIncident.reportedBy,
      reportedTime: 'Just now',
      status: 'New',
      description: newIncident.description,
    };

    setIncidents((prev) => {
      const updated = [created, ...prev];
      try {
        localStorage.setItem('nagarst_incidents', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setIsLogIncidentOpen(false);
    setNewIncident({
      busNumber: 'AH-09',
      routeNumber: 'R-05',
      type: 'Breakdown',
      location: '',
      reportedBy: 'Control Room Officer',
      description: '',
    });
    toast.success('Incident Logged', `Incident ${created.id} broadcast to control console`);
  };

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementTitle || !announcementText) return;

    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      const title = announcementTitle;
      const text = announcementText;
      const priority = announcementPriority;

      // Broadcast to user notifications
      try {
        const savedNotifs = localStorage.getItem('nagarst_notifications');
        const notifList = savedNotifs ? JSON.parse(savedNotifs) : [];
        const newNotif = {
          id: `notif-${Date.now()}`,
          title: title,
          message: text,
          time: 'Just now',
          type: priority === 'critical' ? 'alert' : priority === 'warning' ? 'delay' : 'info',
          unread: true
        };
        localStorage.setItem('nagarst_notifications', JSON.stringify([newNotif, ...notifList]));
      } catch {}

      setAnnouncementTitle('');
      setAnnouncementText('');
      toast.success(
        'Public Alert Broadcast',
        `"${title}" was transmitted to commuter apps and bus electronic displays.`
      );
    }, 900);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 lg:p-6">
      {modeType === 'incidents' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Incident Command Board
              </h2>
              <p className="text-xs text-slate-500">
                Track breakdowns, traffic detours, accidents, and driver/conductor telemetry reports.
              </p>
            </div>

            <Button
              onClick={() => setIsLogIncidentOpen(true)}
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
            >
              Log New Incident
            </Button>
          </div>

          {incidents.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Zero Active Incident Reports</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                All Ahilyanagar municipal transit corridors are operating smoothly without mechanical breakdowns or traffic detours.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incidents.map((inc) => (
              <div key={inc.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Bus className="w-4 h-4 text-[#7847CB]" /> Bus {inc.busNumber} • Route {inc.routeNumber}
                    </span>
                    <Badge
                      variant={
                        inc.status === 'Resolved'
                          ? 'success'
                          : inc.status === 'Investigating'
                          ? 'warning'
                          : 'danger'
                      }
                    >
                      {inc.status}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <span className="text-rose-700 uppercase tracking-wide text-[10px] font-extrabold">{inc.type}</span>
                      <span className="text-slate-400">•</span>
                      <span className="flex items-center gap-1 text-slate-700">
                        <MapPin className="w-3 h-3 text-slate-500" /> {inc.location}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">{inc.description}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {inc.reportedBy}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {inc.reportedTime}
                    </span>
                  </div>

                  {inc.status !== 'Resolved' && (
                    <Button
                      onClick={() => handleUpdateStatus(inc.id, 'Resolved')}
                      variant="primary"
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      icon={<Check className="w-3.5 h-3.5" />}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          )}

          {/* Log Incident Modal */}
          <Modal
            isOpen={isLogIncidentOpen}
            onClose={() => setIsLogIncidentOpen(false)}
            title="Log New Field Incident"
            maxWidth="max-w-md"
          >
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bus Number</label>
                  <input
                    type="text"
                    required
                    value={newIncident.busNumber}
                    onChange={(e) => setNewIncident({ ...newIncident, busNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#7847CB] outline-none"
                    placeholder="e.g. AH-14"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Route</label>
                  <input
                    type="text"
                    required
                    value={newIncident.routeNumber}
                    onChange={(e) => setNewIncident({ ...newIncident, routeNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#7847CB] outline-none"
                    placeholder="e.g. R-12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Classification</label>
                <select
                  value={newIncident.type}
                  onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-[#7847CB] outline-none"
                >
                  <option value="Breakdown">Breakdown (Mechanical/Electrical)</option>
                  <option value="Accident">Accident / Collision</option>
                  <option value="Road Block">Road Block / Construction Detour</option>
                  <option value="Dispute">Fare / Pass Dispute</option>
                  <option value="Medical">Medical Emergency</option>
                  <option value="Complaint">Passenger Grievance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location Details</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Market Yard Chowk near Gate 2"
                  value={newIncident.location}
                  onChange={(e) => setNewIncident({ ...newIncident, location: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#7847CB] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Report Description</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide immediate context, severity, and action taken..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#7847CB] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsLogIncidentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Broadcast Incident
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {modeType === 'announcements' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-[#7847CB]" /> Public Transit Service Advisory
            </h2>
            <p className="text-xs text-slate-500">
              Transmit official municipal updates directly to commuter mobile apps and depot displays.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-4 max-w-2xl">
            <form onSubmit={handlePublishAnnouncement} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Advisory Priority</label>
                <div className="flex gap-2">
                  {(['info', 'warning', 'critical'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAnnouncementPriority(p)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs capitalize border transition ${
                        announcementPriority === p
                          ? p === 'critical'
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : p === 'warning'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-purple-50 text-[#7847CB] border-[#7847CB]/30'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Route 12 Service Advisory: Pipeline Road Detour"
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#7847CB]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Announcement Message Details</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe the service update, road maintenance detour, or temporary timing adjustments..."
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#7847CB]"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={isPublishing}
                className="w-full"
                icon={<Send className="w-4 h-4" />}
              >
                Publish Announcement Broadcast
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
