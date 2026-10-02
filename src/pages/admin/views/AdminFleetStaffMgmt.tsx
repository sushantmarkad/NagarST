import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useApp } from '../../../context/AppContext';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { Button, Badge, Modal } from '../../../components/ui';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Users,
  ShieldCheck,
  Clock,
  Bus as BusIcon
} from 'lucide-react';

interface AdminFleetStaffMgmtProps {
  viewType: 'buses' | 'drivers' | 'conductors' | 'schedules' | 'passengers' | 'tickets_passes';
}

export const AdminFleetStaffMgmt: React.FC<AdminFleetStaffMgmtProps> = ({ viewType }) => {
  const { buses } = useApp();
  const toast = useToast();
  const confirm = useConfirm();

  const [realDrivers, setRealDrivers] = useState<any[]>([]);
  const [realConductors, setRealConductors] = useState<any[]>([]);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({ fullName: '', email: '', password: '', busId: '' });
  const [isEditDriverMode, setIsEditDriverMode] = useState(false);
  const [currentEditDriverId, setCurrentEditDriverId] = useState<string | null>(null);
  const [isSubmittingDriver, setIsSubmittingDriver] = useState(false);

  // Trip/Schedule State
  const [realTrips, setRealTrips] = useState<any[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({ routeId: '', busId: '', driverId: '' });
  const [isSubmittingTrip, setIsSubmittingTrip] = useState(false);

  useEffect(() => {
    if (viewType === 'drivers') {
      fetchDrivers();
    }
    if (viewType === 'conductors') {
      fetchConductors();
    }
    if (viewType === 'schedules' || viewType === 'drivers') {
      fetchBusesForDropdown();
    }
    if (viewType === 'schedules') {
      fetchTrips();
      fetchDrivers();
      fetchRoutesForDropdown();
    }
  }, [viewType]);

  const fetchConductors = async () => {
    try {
      const { data, error } = await supabase.from('user_profiles').select('*').eq('role', 'CONDUCTOR');
      if (!error && data) {
        setRealConductors(data);
      }
    } catch {
      // Fallback
    }
  };

  const fetchBusesForDropdown = async () => {
    const { data } = await supabase.from('buses').select('id, bus_number');
    if (data) setAvailableBuses(data);
  };

  const fetchRoutesForDropdown = async () => {
    const { data } = await supabase.from('routes').select('id, route_number');
    if (data) setAvailableRoutes(data);
  };

  const fetchTrips = async () => {
    const { data, error } = await supabase.from('trips').select(`
      id,
      status,
      start_time,
      end_time,
      buses(bus_number),
      routes(route_number),
      driver_credentials(full_name)
    `).order('created_at', { ascending: false });
    
    if (!error && data) {
      setRealTrips(data);
    }
  };

  const fetchDrivers = async () => {
    const { data, error } = await supabase.from('driver_credentials').select('*');
    if (!error && data) {
      setRealDrivers(data);
    }
  };

  const openAddDriverModal = () => {
    setIsEditDriverMode(false);
    setCurrentEditDriverId(null);
    setDriverForm({ fullName: '', email: '', password: '', busId: '' });
    setIsAddDriverOpen(true);
  };

  const openEditDriverModal = (driver: any) => {
    setIsEditDriverMode(true);
    setCurrentEditDriverId(driver.id);
    setDriverForm({
      fullName: driver.full_name,
      email: driver.email,
      password: driver.password || '',
      busId: driver.assigned_bus_id || ''
    });
    setIsAddDriverOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingDriver(true);
    try {
      if (isEditDriverMode && currentEditDriverId) {
        const { error } = await supabase.from('driver_credentials').update({
          full_name: driverForm.fullName,
          email: driverForm.email,
          password: driverForm.password,
          assigned_bus_id: driverForm.busId
        }).eq('id', currentEditDriverId);
        if (error) throw error;
        toast.success('Driver Updated', 'Driver credentials have been updated.');
      } else {
        const { error } = await supabase.from('driver_credentials').insert([{
          full_name: driverForm.fullName,
          email: driverForm.email,
          password: driverForm.password,
          assigned_bus_id: driverForm.busId
        }]);
        if (error) throw error;
        toast.success('Driver Created', 'Driver account created. They can now log in.');
      }
      setIsAddDriverOpen(false);
      fetchDrivers();
    } catch (err: any) {
      toast.error('Driver Save Failed', err.message || 'Unable to save driver account');
    } finally {
      setIsSubmittingDriver(false);
    }
  };

  const handleDeleteDriver = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Driver Account',
      message: `Are you sure you want to permanently delete driver "${name}"? Their login access will be revoked immediately.`,
      confirmText: 'Delete Driver',
      cancelText: 'Keep Driver',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      // Clean up any trips associated with this driver to prevent foreign key errors
      await supabase.from('trips').delete().eq('driver_id', id);

      const { data, error } = await supabase.from('driver_credentials').delete().eq('id', id).select();
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning(
          'Supabase RLS Blocked Deletion',
          'Postgres Row-Level Security prevented deletion. In Supabase SQL Editor run: DELETE FROM public.driver_credentials WHERE id = \'' + id + '\';'
        );
        return;
      }

      toast.success('Driver Deleted', `Driver "${name}" was removed.`);
      fetchDrivers();
    } catch (err: any) {
      toast.error('Deletion Failed', err.message || 'Could not delete driver record.');
    }
  };

  const handleDeleteTrip = async (id: string) => {
    const confirmed = await confirm({
      title: 'Cancel Trip Schedule',
      message: 'Are you sure you want to delete this trip schedule? Assigned crew and fleet will be released.',
      confirmText: 'Delete Trip',
      cancelText: 'Keep Schedule',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
      toast.success('Trip Removed', 'The scheduled trip was cancelled and removed.');
      fetchTrips();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not delete trip schedule.');
    }
  };

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTrip(true);
    try {
      const { error } = await supabase.from('trips').insert([{
        route_id: newTrip.routeId,
        bus_id: newTrip.busId,
        driver_id: newTrip.driverId,
        status: 'Scheduled'
      }]);
      if (error) throw error;
      toast.success('Trip Scheduled', 'Route and bus have been successfully assigned.');
      setIsAddTripOpen(false);
      fetchTrips();
    } catch (err: any) {
      toast.error('Scheduling Failed', err.message || 'Could not schedule trip.');
    } finally {
      setIsSubmittingTrip(false);
    }
  };



  return (
    <div className="space-y-4 p-4 lg:p-6 mx-auto w-full">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-base font-bold text-slate-900 capitalize flex items-center gap-2">
            {viewType === 'drivers' && <Users className="w-5 h-5 text-[#7847CB]" />}
            {viewType === 'conductors' && <ShieldCheck className="w-5 h-5 text-[#7847CB]" />}
            {viewType === 'schedules' && <Calendar className="w-5 h-5 text-[#7847CB]" />}
            {viewType === 'buses' && <BusIcon className="w-5 h-5 text-[#7847CB]" />}
            {viewType} Management
          </h2>
          <p className="text-xs text-slate-500">Municipal fleet rosters, operational shifts, and personnel controls</p>
        </div>

        <div className="flex items-center gap-2">
          {viewType === 'drivers' && (
            <Button onClick={openAddDriverModal} variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              Add Driver
            </Button>
          )}
          {viewType === 'schedules' && (
            <Button onClick={() => setIsAddTripOpen(true)} variant="primary" size="sm" icon={<Plus className="w-4 h-4" />}>
              Schedule Trip
            </Button>
          )}
        </div>
      </div>

      {/* Driver Add/Edit Modal */}
      <Modal
        isOpen={isAddDriverOpen}
        onClose={() => setIsAddDriverOpen(false)}
        title={isEditDriverMode ? 'Edit Driver Credentials' : 'Add New Driver'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveDriver} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
            <input
              required
              type="text"
              value={driverForm.fullName}
              onChange={e => setDriverForm({...driverForm, fullName: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7847CB]"
              placeholder="e.g. Ramesh Patil"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Driver Login ID)</label>
            <input
              required
              type="email"
              value={driverForm.email}
              onChange={e => setDriverForm({...driverForm, email: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7847CB]"
              placeholder="driver@nagarbus.gov.in"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              required={!isEditDriverMode}
              type="password"
              value={driverForm.password}
              onChange={e => setDriverForm({...driverForm, password: e.target.value})}
              placeholder={isEditDriverMode ? 'Leave blank to preserve current' : 'Min 6 characters'}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7847CB]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Vehicle</label>
            <select
              required
              value={driverForm.busId}
              onChange={e => setDriverForm({...driverForm, busId: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-[#7847CB]"
            >
              <option value="" disabled>Select a vehicle from fleet</option>
              {availableBuses.map(b => (
                <option key={b.id} value={b.id}>{b.bus_number}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddDriverOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSubmittingDriver}>
              {isEditDriverMode ? 'Save Changes' : 'Create Driver'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Trip Assignment Modal */}
      <Modal
        isOpen={isAddTripOpen}
        onClose={() => setIsAddTripOpen(false)}
        title="Schedule New Bus Shift"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddTrip} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Route</label>
            <select
              required
              value={newTrip.routeId}
              onChange={e => setNewTrip({...newTrip, routeId: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-[#7847CB]"
            >
              <option value="" disabled>Select route...</option>
              {availableRoutes.map(r => (
                <option key={r.id} value={r.id}>{r.route_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bus</label>
            <select
              required
              value={newTrip.busId}
              onChange={e => setNewTrip({...newTrip, busId: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-[#7847CB]"
            >
              <option value="" disabled>Select bus...</option>
              {availableBuses.map(b => (
                <option key={b.id} value={b.id}>{b.bus_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Driver</label>
            <select
              required
              value={newTrip.driverId}
              onChange={e => setNewTrip({...newTrip, driverId: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-[#7847CB]"
            >
              <option value="" disabled>Assign driver...</option>
              {realDrivers.map(d => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddTripOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={isSubmittingTrip}>
              Schedule Trip
            </Button>
          </div>
        </form>
      </Modal>

      {/* Buses view */}
      {viewType === 'buses' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>Fleet Roster ({buses.length} Vehicles)</span>
            <span className="text-emerald-700">All Vehicles Monitored</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Bus Number</th>
                  <th className="p-3.5">Plate Number</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Driver</th>
                  <th className="p-3.5">Conductor</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {buses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900">{b.busNumber}</td>
                    <td className="p-3.5 font-mono text-slate-600">{b.plateNumber}</td>
                    <td className="p-3.5 text-slate-700">{b.busType}</td>
                    <td className="p-3.5 font-semibold text-[#7847CB]">{b.routeName}</td>
                    <td className="p-3.5 text-slate-700">{b.driverName || '—'}</td>
                    <td className="p-3.5 text-slate-700">{b.conductorName || '—'}</td>
                    <td className="p-3.5">
                      <Badge variant={b.status === 'on_time' ? 'success' : b.status === 'delayed' ? 'warning' : 'danger'}>
                        {b.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drivers / Conductors view */}
      {(viewType === 'drivers' || viewType === 'conductors') && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span>{viewType === 'drivers' ? `Active Drivers (${realDrivers.length})` : 'Conductor Staff Roster'}</span>
            <span className="text-emerald-700 font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Municipal Personnel
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Assigned Bus</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {viewType === 'conductors' && realConductors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-500">{s.id?.substring(0, 8)}</td>
                    <td className="p-3.5 font-bold text-slate-900">{s.full_name || s.name || s.email || 'Conductor'}</td>
                    <td className="p-3.5 text-slate-600">Bus Conductor</td>
                    <td className="p-3.5 font-semibold text-slate-800">{s.assigned_bus_id || 'Depot Assigned'}</td>
                    <td className="p-3.5">
                      <Badge variant="success">Active</Badge>
                    </td>
                    <td className="p-3.5 text-right text-slate-400 text-xs">
                      Managed by Depot
                    </td>
                  </tr>
                ))}
                {viewType === 'conductors' && realConductors.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No conductor accounts found in the database. Conductors can register or be provisioned by admin.
                    </td>
                  </tr>
                )}
                {viewType === 'drivers' && realDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-500">{d.id.substring(0, 8)}</td>
                    <td className="p-3.5 font-bold text-slate-900">{d.full_name}</td>
                    <td className="p-3.5 text-slate-600">Bus Driver</td>
                    <td className="p-3.5 font-mono text-xs text-slate-700">
                      {availableBuses.find(b => b.id === d.assigned_bus_id)?.bus_number || d.assigned_bus_id || 'Unassigned'}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="brand">{d.status || 'Active'}</Badge>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDriverModal(d)}
                        title="Edit Driver"
                        className="p-1.5 h-8 w-8 text-slate-600 hover:text-slate-900"
                        icon={<Edit2 className="w-3.5 h-3.5" />}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDriver(d.id, d.full_name)}
                        title="Delete Driver"
                        className="p-1.5 h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    </td>
                  </tr>
                ))}
                {viewType === 'drivers' && realDrivers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-xs">
                      No driver accounts found. Click "Add Driver" above to register a driver.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedules view */}
      {viewType === 'schedules' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#7847CB]" /> Daily Shift Timetable Grid
            </span>
            <span className="text-[#7847CB] font-mono text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 06:00 AM – 10:00 PM Service Hours
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Trip ID</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Bus Number</th>
                  <th className="p-3.5">Driver</th>
                  <th className="p-3.5">Departure</th>
                  <th className="p-3.5">Est. Arrival</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {realTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-500 text-[10px]">{trip.id.substring(0, 8)}</td>
                    <td className="p-3.5 font-semibold text-[#7847CB]">{trip.routes?.route_number || 'N/A'}</td>
                    <td className="p-3.5 font-bold text-slate-900">{trip.buses?.bus_number || 'N/A'}</td>
                    <td className="p-3.5 text-slate-700">{trip.driver_credentials?.full_name || 'N/A'}</td>
                    <td className="p-3.5 font-mono text-slate-600">{trip.start_time ? new Date(trip.start_time).toLocaleTimeString() : 'TBD'}</td>
                    <td className="p-3.5 font-mono text-slate-600">{trip.end_time ? new Date(trip.end_time).toLocaleTimeString() : 'TBD'}</td>
                    <td className="p-3.5">
                      <Badge variant={trip.status === 'Active' || trip.status === 'In Progress' ? 'success' : 'neutral'}>
                        {trip.status}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="p-1.5 h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        title="Cancel Shift"
                        icon={<Trash2 className="w-3.5 h-3.5" />}
                      />
                    </td>
                  </tr>
                ))}
                {realTrips.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                      No active shifts scheduled. Click "Schedule Trip" above to pair a bus, route, and driver.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
