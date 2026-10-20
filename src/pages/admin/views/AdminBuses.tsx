import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { getFirebaseBuses, saveFirebaseBus, deleteFirebaseBus } from '../../../utils/firebaseService';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { useApp } from '../../../context/AppContext';
import {
  Bus,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Search,
  CheckCircle2,
  X,
  Gauge,
  Route as RouteIcon
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import {
  setBusAssignedRoute,
  deleteDemoBus,
  syncSimulatorFleetWithAdminConfig
} from '../../../utils/demoSimulatorEngine';

interface BusRecord {
  id: string;
  bus_number: string;
  plate_number: string;
  capacity: number;
  type: string;
  status: string;
  route_id?: string;
  created_at: string;
}

export const AdminBuses: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { routes, refreshData } = useApp();

  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [busForm, setBusForm] = useState({
    bus_number: '',
    plate_number: '',
    capacity: 35,
    type: 'Standard City',
    route_id: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const deletedRaw = localStorage.getItem('nagarst_deleted_demo_buses');
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      const isDeleted = (id?: string, bNum?: string, pNum?: string) => {
        const norm = (s?: string) => (s || '').trim().toUpperCase().replace(/\s+/g, '');
        const cId = norm(id);
        const cB = norm(bNum);
        const cP = norm(pNum);
        return deletedIds.some(d => {
          const cD = norm(d);
          return (cId && cD === cId) || (cB && cD === cB) || (cP && cD === cP);
        });
      };

      let list: BusRecord[] = [];
      try {
        const fbBuses = await getFirebaseBuses();
        if (fbBuses && fbBuses.length > 0) {
          list = fbBuses.filter(b => !isDeleted(b.id, b.bus_number, b.plate_number)) as any;
        }
      } catch (_) {}

      if (list.length === 0) {
        const { data, error: err } = await supabase
          .from('buses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!err && data) {
          list = data.filter(b => !isDeleted(b.id, b.bus_number, b.plate_number));
        }
      }

      // Merge local buses if any
      try {
        const localRaw = localStorage.getItem('nagarst_custom_buses');
        if (localRaw) {
          const localParsed = JSON.parse(localRaw);
          localParsed.forEach((lb: any) => {
            const bNum = lb.busNumber || lb.bus_number;
            const pNum = lb.plateNumber || lb.plate_number;
            if (isDeleted(lb.id, bNum, pNum)) return;

            if (!list.some(b => b.id === lb.id || b.bus_number.trim().toUpperCase() === (bNum || '').trim().toUpperCase())) {
              list.push({
                id: lb.id,
                bus_number: bNum,
                plate_number: pNum || bNum,
                capacity: lb.capacity || 35,
                type: lb.busType || lb.type || 'Standard City',
                status: lb.status || 'Active',
                route_id: lb.routeId || lb.route_id,
                created_at: lb.created_at || new Date().toISOString()
              });
            }
          });
        }
      } catch (_) {}

      // Deduplicate by bus_number
      const seen = new Set<string>();
      const dedupedList: BusRecord[] = [];
      for (const b of list) {
        const key = b.bus_number.trim().toUpperCase();
        if (!seen.has(key)) {
          seen.add(key);
          dedupedList.push(b);
        }
      }

      setBuses(dedupedList);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch buses');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentEditId(null);
    setBusForm({
      bus_number: '',
      plate_number: '',
      capacity: 35,
      type: 'Standard City',
      route_id: routes.length > 0 ? routes[0].id : '',
      status: 'Active'
    });
    setIsAddBusOpen(true);
  };

  const openEditModal = (bus: BusRecord) => {
    setIsEditMode(true);
    setCurrentEditId(bus.id);
    setBusForm({
      bus_number: bus.bus_number,
      plate_number: bus.plate_number,
      capacity: bus.capacity,
      type: bus.type,
      route_id: bus.route_id || '',
      status: bus.status
    });
    setIsAddBusOpen(true);
  };

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const busNumber = busForm.bus_number.trim();
    const plateNumber = busForm.plate_number.trim() || busNumber;
    const busId = currentEditId || `bus-${Date.now()}`;

    try {
      if (isEditMode && currentEditId) {
        await supabase
          .from('buses')
          .update({
            bus_number: busNumber,
            plate_number: plateNumber,
            capacity: parseInt(busForm.capacity.toString()),
            type: busForm.type,
            route_id: busForm.route_id || null,
            status: busForm.status
          })
          .eq('id', currentEditId);

        toast.success(`Bus ${busNumber} updated successfully!`);
      } else {
        await supabase
          .from('buses')
          .insert([{
            id: busId,
            bus_number: busNumber,
            plate_number: plateNumber,
            capacity: parseInt(busForm.capacity.toString()),
            type: busForm.type,
            route_id: busForm.route_id || null,
            status: 'Active'
          }]);

        toast.success(`New bus ${busNumber} added to fleet!`);
      }

      // Also persist to Firebase Firestore
      try {
        await saveFirebaseBus({
          id: busId,
          bus_number: busNumber,
          plate_number: plateNumber,
          capacity: Number(busForm.capacity),
          type: busForm.type,
          status: busForm.status,
          route_id: busForm.route_id || undefined,
          created_at: new Date().toISOString()
        });
      } catch (fbErr) {
        console.warn('Firebase save bus notice:', fbErr);
      }

      // Also persist to localStorage backup
      try {
        const raw = localStorage.getItem('nagarst_custom_buses');
        const list = raw ? JSON.parse(raw) : [];
        const existingIdx = list.findIndex((b: any) => b.id === busId);
        const item = {
          id: busId,
          busNumber,
          plateNumber,
          busType: busForm.type,
          routeId: busForm.route_id,
          status: busForm.status
        };
        if (existingIdx !== -1) {
          list[existingIdx] = item;
        } else {
          list.push(item);
        }
        localStorage.setItem('nagarst_custom_buses', JSON.stringify(list));
      } catch (_) {}

      setIsAddBusOpen(false);
      await fetchBuses();
      await refreshData();
    } catch (err: any) {
      toast.error(`Error saving bus: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAssignRoute = async (busId: string, newRouteId: string) => {
    try {
      await supabase
        .from('buses')
        .update({ route_id: newRouteId || null })
        .eq('id', busId);

      // Update local storage backup
      try {
        const raw = localStorage.getItem('nagarst_custom_buses');
        if (raw) {
          const list = JSON.parse(raw);
          const found = list.find((b: any) => b.id === busId || b.busNumber === busId);
          if (found) {
            found.routeId = newRouteId;
            localStorage.setItem('nagarst_custom_buses', JSON.stringify(list));
          }
        }
      } catch (_) {}

      // Find the bus being updated
      const busObj = buses.find(b => b.id === busId);
      const busNumber = busObj?.bus_number || busId;

      // Also assign in demoSimulatorEngine so the simulation runtime updates immediately!
      if (newRouteId) {
        setBusAssignedRoute(busNumber, newRouteId);
        setBusAssignedRoute(busId, newRouteId);
      }

      // Update in Firebase Firestore
      try {
        await saveFirebaseBus({
          id: busId,
          bus_number: busNumber,
          plate_number: busObj?.plate_number || busNumber,
          capacity: busObj?.capacity || 35,
          type: busObj?.type || 'Standard City',
          status: busObj?.status || 'Active',
          route_id: newRouteId || undefined
        });
      } catch (_) {}

      setBuses(prev => prev.map(b => b.id === busId ? { ...b, route_id: newRouteId } : b));
      const targetRoute = routes.find(r => r.id === newRouteId);
      toast.success(`Bus ${busNumber} assigned to ${targetRoute?.routeNumber || 'selected route'}!`);
      await refreshData();
    } catch (err: any) {
      toast.error(`Failed to assign route: ${err.message}`);
    }
  };

  const handleDeleteBus = async (bus: BusRecord) => {
    const isConfirmed = await confirm({
      title: `Delete Bus ${bus.bus_number}?`,
      message: `Are you sure you want to permanently remove vehicle ${bus.bus_number} (${bus.plate_number}) from the municipal fleet directory?`,
      confirmText: 'Delete Vehicle',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    const busNumber = bus.bus_number.trim();
    const plateNumber = bus.plate_number?.trim() || '';
    const busId = bus.id;

    // 1. Delete from Firebase Firestore
    try {
      await deleteFirebaseBus(busId);
      if (busNumber !== busId) await deleteFirebaseBus(busNumber);
    } catch (fbErr) {
      console.warn('Firebase delete bus notice:', fbErr);
    }

    // 2. Delete dependent foreign-key records from Supabase
    try {
      await supabase.from('live_locations').delete().eq('bus_id', busId);
      await supabase.from('trips').delete().eq('bus_id', busId);
      await supabase.from('live_locations').delete().eq('bus_id', busNumber);
      await supabase.from('trips').delete().eq('bus_id', busNumber);
      const { error: dbError } = await supabase.from('buses').delete().eq('id', busId);
      if (dbError) {
        await supabase.from('buses').delete().eq('bus_number', busNumber);
      }
    } catch (err: any) {
      console.warn('Supabase delete notice (proceeding with local purge):', err);
    }

    // 2. Add to nagarst_deleted_demo_buses in localStorage
    try {
      const deletedRaw = localStorage.getItem('nagarst_deleted_demo_buses');
      const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
      [
        busId,
        busNumber,
        plateNumber,
        busNumber.toUpperCase(),
        busNumber.replace(/\s+/g, ''),
        plateNumber.toUpperCase(),
        plateNumber.replace(/\s+/g, '')
      ].forEach(key => {
        if (key && !deletedIds.includes(key)) {
          deletedIds.push(key);
        }
      });
      localStorage.setItem('nagarst_deleted_demo_buses', JSON.stringify(deletedIds));
    } catch (_) {}

    // 3. Purge from nagarst_custom_buses in localStorage
    try {
      const raw = localStorage.getItem('nagarst_custom_buses');
      if (raw) {
        const list = JSON.parse(raw);
        const filtered = list.filter((b: any) => {
          const bNum = (b.busNumber || b.bus_number || '').trim().toUpperCase();
          const targetNum = busNumber.toUpperCase();
          const pNum = (b.plateNumber || b.plate_number || '').trim().toUpperCase();
          const targetPlate = plateNumber.toUpperCase();
          return b.id !== busId && bNum !== targetNum && (!targetPlate || pNum !== targetPlate);
        });
        localStorage.setItem('nagarst_custom_buses', JSON.stringify(filtered));
      }
    } catch (_) {}

    // 4. Remove cached live bus state
    try {
      localStorage.removeItem('nagarst_live_bus_' + busId);
      localStorage.removeItem('nagarst_live_bus_' + busNumber);
      const assignmentsRaw = localStorage.getItem('nagarst_demo_assignments');
      if (assignmentsRaw) {
        const assignments = JSON.parse(assignmentsRaw);
        delete assignments[busId];
        delete assignments[busNumber];
        localStorage.setItem('nagarst_demo_assignments', JSON.stringify(assignments));
      }
    } catch (_) {}

    // 5. Delete from demo simulator engine and broadcast offline
    deleteDemoBus(busId);
    deleteDemoBus(busNumber);

    // 6. Immediately remove from local state
    setBuses(prev => prev.filter(b => 
      b.id !== busId && 
      b.bus_number.trim().toUpperCase() !== busNumber.toUpperCase() &&
      (!plateNumber || b.plate_number.trim().toUpperCase() !== plateNumber.toUpperCase())
    ));

    toast.success(`Bus ${busNumber} was successfully deleted.`);

    // 7. Refresh app context
    await refreshData();
  };

  const filteredBuses = buses.filter(b => 
    !searchQuery ||
    b.bus_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Bus className="w-5 h-5 text-[#7847CB]" />
            Municipal Vehicle Fleet Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add buses, assign configured routes, and manage municipal vehicles in service
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus or plate..."
              className="pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#7847CB] w-48"
            />
          </div>

          <Button
            onClick={openAddModal}
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Bus to Fleet
          </Button>
        </div>
      </div>

      {/* Fleet Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50/50">
          <span>Registered Fleet Vehicles ({filteredBuses.length})</span>
          <Badge variant="brand" size="sm">MSRTC Transit Fleet</Badge>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#7847CB]/30 border-t-[#7847CB] rounded-full animate-spin" />
              Loading vehicle directory...
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
              <Bus className="w-8 h-8 text-slate-400" />
              <p className="font-bold text-slate-700">No Vehicles in Fleet</p>
              <p className="text-slate-500 text-[11px]">Click "Add Bus to Fleet" above to register a new bus and assign its route.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4">Bus Identifier</th>
                  <th className="p-4">License Plate</th>
                  <th className="p-4">Type & Capacity</th>
                  <th className="p-4">Assigned Route Corridor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBuses.map((b) => {
                  const assignedRoute = routes.find(r => r.id === b.route_id);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-black text-[#7847CB] text-sm">
                        {b.bus_number}
                      </td>
                      <td className="p-4 font-mono text-slate-700">
                        {b.plate_number}
                      </td>
                      <td className="p-4 text-slate-700">
                        <span className="font-semibold">{b.type}</span> • {b.capacity} seats
                      </td>
                      <td className="p-4">
                        <select
                          value={b.route_id || ''}
                          onChange={(e) => handleQuickAssignRoute(b.id, e.target.value)}
                          className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-[#7847CB] max-w-[220px]"
                        >
                          <option value="">— Unassigned —</option>
                          {routes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.routeNumber || (r as any).route_number} ({r.origin} ➔ {r.destination})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={b.status === 'Active' ? 'success' : b.status === 'Maintenance' ? 'warning' : 'danger'}
                          size="sm"
                          dot
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-[#7847CB] hover:bg-purple-50 transition-colors"
                          title="Edit bus"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBus(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete bus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Bus Modal */}
      <Modal
        isOpen={isAddBusOpen}
        onClose={() => setIsAddBusOpen(false)}
        title={isEditMode ? 'Edit Vehicle Details' : 'Register New Vehicle in Fleet'}
        description="Enter bus specifications and assign to a configured transit route"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBus} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Bus Number (e.g. MH-16 BT-1001)</label>
            <input
              required
              type="text"
              value={busForm.bus_number}
              onChange={(e) => setBusForm({ ...busForm, bus_number: e.target.value })}
              placeholder="e.g. MH-16 BT-1001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-[#7847CB]"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">License Plate Number</label>
            <input
              type="text"
              value={busForm.plate_number}
              onChange={(e) => setBusForm({ ...busForm, plate_number: e.target.value })}
              placeholder="e.g. MH-16 BT-1001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:border-[#7847CB]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Vehicle Type</label>
              <select
                value={busForm.type}
                onChange={(e) => setBusForm({ ...busForm, type: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#7847CB]"
              >
                <option value="Standard City">Standard City</option>
                <option value="AC Express">AC Express</option>
                <option value="EV Metro Shuttle">EV Metro Shuttle</option>
                <option value="Mini Bus">Mini Bus</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Passenger Capacity</label>
              <input
                required
                type="number"
                min="10"
                max="90"
                value={busForm.capacity}
                onChange={(e) => setBusForm({ ...busForm, capacity: parseInt(e.target.value) || 35 })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none focus:border-[#7847CB]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Assign to Route Corridor</label>
            <select
              value={busForm.route_id}
              onChange={(e) => setBusForm({ ...busForm, route_id: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-[#7847CB]"
            >
              <option value="">— Select Configured Route —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.routeNumber || (r as any).route_number} ({r.origin} ➔ {r.destination})
                </option>
              ))}
            </select>
            {routes.length === 0 && (
              <span className="text-[11px] text-amber-600 block mt-1">
                No routes configured yet. Go to "Route Corridors" tab to define routes first.
              </span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddBusOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={isSubmitting}
            >
              {isEditMode ? 'Save Changes' : 'Register Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
