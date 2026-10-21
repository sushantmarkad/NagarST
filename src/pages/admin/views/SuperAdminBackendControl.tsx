import React, { useState, useEffect } from 'react';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { Button, Badge } from '../../../components/ui';
import {
  Server,
  Database,
  Play,
  Square,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Radio
} from 'lucide-react';
import { getFirebaseBuses, getFirebaseRoutes, clearFirebaseCollection } from '../../../utils/firebaseService';

export const SuperAdminBackendControl: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [backendStatus, setBackendStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const fetchBackendStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch('http://localhost:3001/api/firebase/status');
      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data);
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }
    } catch (e) {
      setServerOnline(false);
      setBackendStatus(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchBackendStatus();
    const interval = setInterval(fetchBackendStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartSimulator = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speedMultiplier: 2, delayMinutes: 0 }),
      });
      if (res.ok) {
        toast.success('Simulator Started', 'Backend is streaming live locations to Firebase Firestore.');
        await fetchBackendStatus();
      } else {
        toast.error('Simulator Error', 'Could not start backend simulator.');
      }
    } catch (err: any) {
      toast.error('Connection Failed', 'Backend server (port 3001) is not responding.');
    } finally {
      setLoading(false);
    }
  };

  const handleStopSimulator = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/demo/stop', {
        method: 'POST',
      });
      if (res.ok) {
        toast.info('Simulator Stopped', 'Backend stopped telemetry and cleared live locations.');
        await fetchBackendStatus();
      } else {
        toast.error('Simulator Error', 'Could not stop simulator.');
      }
    } catch (err: any) {
      toast.error('Connection Failed', 'Backend server (port 3001) is not responding.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCollection = async (collectionName: 'routes' | 'buses' | 'live_locations') => {
    const ok = await confirm({
      title: `Clear Firebase "${collectionName}"?`,
      message: `Are you sure you want to delete all documents from the Firestore "${collectionName}" collection?`,
      confirmText: 'Delete All Documents',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;

    setLoading(true);
    try {
      await clearFirebaseCollection(collectionName);
      toast.success('Collection Cleared', `Successfully emptied ${collectionName} in Firebase.`);
      await fetchBackendStatus();
    } catch (err: any) {
      toast.error('Failed to Clear', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-[#7847CB] rounded-xl border border-purple-200">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Backend Server & Firebase Operations</h2>
              <p className="text-xs text-slate-500">
                Direct control over Node.js Express/Socket.IO backend (Port 3001) and Firebase Firestore (<span className="font-mono text-purple-700">nagarst-16040</span>)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            serverOnline === true
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : serverOnline === false
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              serverOnline === true ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`} />
            <span>{serverOnline === true ? 'Backend Server Online (Port 3001)' : 'Backend Offline'}</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={fetchBackendStatus}
            disabled={checking}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Grid: Server Telemetry & Firestore Collections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Live Locations in Firebase */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Live Telemetry Pushes</span>
            <Radio className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {backendStatus?.collections?.live_locations ?? '0'}
            </span>
            <span className="text-[11px] font-medium text-slate-500">active vehicles</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Firestore: live_locations</p>
        </div>

        {/* Card 2: Routes in Firebase */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Configured Routes</span>
            <Layers className="w-4 h-4 text-[#7847CB]" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {backendStatus?.collections?.routes ?? '0'}
            </span>
            <span className="text-[11px] font-medium text-slate-500">corridors</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Firestore: routes</p>
        </div>

        {/* Card 3: Buses in Firebase */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Vehicle Fleet</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {backendStatus?.collections?.buses ?? '0'}
            </span>
            <span className="text-[11px] font-medium text-slate-500">registered buses</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Firestore: buses</p>
        </div>

        {/* Card 4: Registered Users */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">User Profiles</span>
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tabular-nums">
              {backendStatus?.collections?.users ?? '0'}
            </span>
            <span className="text-[11px] font-medium text-slate-500">accounts</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Firestore: users</p>
        </div>
      </div>

      {/* Control Panels: Simulator & Firebase Purge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Backend Simulator Controller */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-[#7847CB]" />
              <h3 className="font-bold text-sm text-slate-900">Backend Multi-Bus GPS Simulator</h3>
            </div>
            <Badge variant={backendStatus?.simulatorRunning ? 'success' : 'neutral'}>
              {backendStatus?.simulatorRunning ? 'SIMULATOR ACTIVE' : 'IDLE'}
            </Badge>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            The backend server calculates high-fidelity GPS waypoints along Ahilyanagar road networks (Maliwada ↔ Savedi, MG Road ↔ Station) and streams coordinates to Firebase Firestore in real time.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleStartSimulator}
              disabled={loading || backendStatus?.simulatorRunning}
              icon={<Play className="w-3.5 h-3.5 fill-current" />}
            >
              Start Backend Simulation
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopSimulator}
              disabled={loading || !backendStatus?.simulatorRunning}
              icon={<Square className="w-3.5 h-3.5 fill-current" />}
            >
              Stop Simulation
            </Button>
          </div>
        </div>

        {/* 2. Direct Firestore Database Tools */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-600" />
            <h3 className="font-bold text-sm text-slate-900">Firestore Collection Management</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Quickly clear collections in your Firebase project (<span className="font-mono text-slate-700">nagarst-16040</span>) whenever you want a completely fresh database state.
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClearCollection('live_locations')}
              disabled={loading}
              className="text-xs justify-center"
              icon={<Trash2 className="w-3 h-3 text-rose-500" />}
            >
              Clear Live Telemetry
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClearCollection('routes')}
              disabled={loading}
              className="text-xs justify-center"
              icon={<Trash2 className="w-3 h-3 text-rose-500" />}
            >
              Clear Routes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleClearCollection('buses')}
              disabled={loading}
              className="text-xs justify-center"
              icon={<Trash2 className="w-3 h-3 text-rose-500" />}
            >
              Clear Buses
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
