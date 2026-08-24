import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useApp } from '../../../context/AppContext';
import {
  Bus,
  Users,
  UserCheck,
  Calendar,
  Plus,
  Edit2,
  X
} from 'lucide-react';

interface AdminFleetStaffMgmtProps {
  viewType: 'buses' | 'drivers' | 'conductors' | 'schedules' | 'passengers' | 'tickets_passes';
}

export const AdminFleetStaffMgmt: React.FC<AdminFleetStaffMgmtProps> = ({ viewType }) => {
  const { buses } = useApp();

  const [realDrivers, setRealDrivers] = useState<any[]>([]);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [driverForm, setDriverForm] = useState({ fullName: '', email: '', password: '', busId: '' });
  const [isEditDriverMode, setIsEditDriverMode] = useState(false);
  const [currentEditDriverId, setCurrentEditDriverId] = useState<string | null>(null);

  // Trip/Schedule State
  const [realTrips, setRealTrips] = useState<any[]>([]);
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([]);
  const [availableBuses, setAvailableBuses] = useState<any[]>([]);
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [newTrip, setNewTrip] = useState({ routeId: '', busId: '', driverId: '' });

  useEffect(() => {
    if (viewType === 'drivers') {
      fetchDrivers();
    }
    if (viewType === 'schedules' || viewType === 'drivers') {
      fetchBusesForDropdown(); // Need buses for both drivers and trips
    }
    if (viewType === 'schedules') {
      fetchTrips();
      fetchDrivers(); // Need drivers for trip dropdown
      fetchRoutesForDropdown();
    }
  }, [viewType]);

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
    try {
      if (isEditDriverMode && currentEditDriverId) {
        const { error } = await supabase.from('driver_credentials').update({
          full_name: driverForm.fullName,
          email: driverForm.email,
          password: driverForm.password,
          assigned_bus_id: driverForm.busId
        }).eq('id', currentEditDriverId);
        if (error) throw error;
        alert('Driver updated successfully!');
      } else {
        const { error } = await supabase.from('driver_credentials').insert([{
          full_name: driverForm.fullName,
          email: driverForm.email,
          password: driverForm.password,
          assigned_bus_id: driverForm.busId
        }]);
        if (error) throw error;
        alert('Driver created successfully! They can now log in.');
      }
      setIsAddDriverOpen(false);
      fetchDrivers();
    } catch (err: any) {
      alert(`Error saving driver: ${err.message}`);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    try {
      const { error } = await supabase.from('driver_credentials').delete().eq('id', id);
      if (error) throw error;
      fetchDrivers();
    } catch (err: any) {
      alert(`Error deleting driver: ${err.message}`);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this trip schedule?')) return;
    try {
      const { error } = await supabase.from('trips').delete().eq('id', id);
      if (error) throw error;
      fetchTrips();
    } catch (err: any) {
      alert(`Error deleting trip: ${err.message}`);
    }
  };

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('trips').insert([{
        route_id: newTrip.routeId,
        bus_id: newTrip.busId,
        driver_id: newTrip.driverId,
        status: 'Scheduled'
      }]);
      if (error) throw error;
      alert('Trip/Shift scheduled successfully!');
      setIsAddTripOpen(false);
      fetchTrips();
    } catch (err: any) {
      alert(`Error scheduling trip: ${err.message}`);
    }
  };

  const conductors = [
    { id: 'CND-4029', name: 'Amit Deshmukh', role: 'Conductor', bus: 'AH-24', depot: 'Central Depot', attendance: '99.1%', status: 'On Shift' },
    { id: 'CND-4030', name: 'Vijay Thorat', role: 'Conductor', bus: 'AH-18', depot: 'Savedi Depot', attendance: '95.8%', status: 'On Shift' },
  ];

  return (
    <div className="space-y-4 p-4 lg:p-6 mx-auto w-full">
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (viewType === 'drivers') openAddDriverModal();
            else if (viewType === 'schedules') setIsAddTripOpen(true);
            else alert(`Add new ${viewType} modal opened`);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#7847CB] hover:bg-[#0a2a42] text-white font-bold text-xs flex items-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add {viewType.slice(0, -1)}
        </button>
      </div>

      {isAddDriverOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsAddDriverOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{isEditDriverMode ? 'Edit Driver Account' : 'Create Driver Account'}</h3>
            <form onSubmit={handleSaveDriver} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input required type="text" value={driverForm.fullName} onChange={e => setDriverForm({...driverForm, fullName: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email (Login ID)</label>
                <input required type="email" value={driverForm.email} onChange={e => setDriverForm({...driverForm, email: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                <input required={!isEditDriverMode} type="password" value={driverForm.password} onChange={e => setDriverForm({...driverForm, password: e.target.value})} placeholder={isEditDriverMode ? "Leave blank to keep current" : ""} className="w-full px-3 py-2 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Bus</label>
                <select required value={driverForm.busId} onChange={e => setDriverForm({...driverForm, busId: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none bg-white">
                  <option value="" disabled>Select a Bus</option>
                  {availableBuses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#7847CB] text-white rounded-xl font-bold text-sm">
                {isEditDriverMode ? 'Update Driver' : 'Create Driver'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isAddTripOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsAddTripOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4">Assign Route to Bus (New Shift)</h3>
            <form onSubmit={handleAddTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Route</label>
                <select required value={newTrip.routeId} onChange={e => setNewTrip({...newTrip, routeId: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none bg-white">
                  <option value="" disabled>Choose a Route...</option>
                  {availableRoutes.map(r => <option key={r.id} value={r.id}>{r.route_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Bus</label>
                <select required value={newTrip.busId} onChange={e => setNewTrip({...newTrip, busId: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none bg-white">
                  <option value="" disabled>Choose a Bus...</option>
                  {availableBuses.map(b => <option key={b.id} value={b.id}>{b.bus_number}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assign Driver</label>
                <select required value={newTrip.driverId} onChange={e => setNewTrip({...newTrip, driverId: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none bg-white">
                  <option value="" disabled>Choose a Driver...</option>
                  {realDrivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full py-2.5 bg-[#7847CB] text-white rounded-xl font-bold text-sm">Schedule Trip</button>
            </form>
          </div>
        </div>
      )}

      {viewType === 'buses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Fleet Roster ({buses.length} Vehicles)</span>
            <span className="text-emerald-700">38 Active • 4 Maintenance • 2 Breakdown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Bus Number</th>
                  <th className="p-3.5">Registration Plate</th>
                  <th className="p-3.5">Bus Type</th>
                  <th className="p-3.5">Assigned Route</th>
                  <th className="p-3.5">Driver</th>
                  <th className="p-3.5">Conductor</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {buses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-extrabold text-slate-900">{b.busNumber}</td>
                    <td className="p-3.5 font-mono text-slate-600">{b.plateNumber}</td>
                    <td className="p-3.5 text-slate-700">{b.busType}</td>
                    <td className="p-3.5 font-bold text-[#7847CB]">{b.routeName}</td>
                    <td className="p-3.5">{b.driverName}</td>
                    <td className="p-3.5">{b.conductorName}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        b.status === 'on_time'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : b.status === 'delayed'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {b.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => alert(`Editing Bus ${b.busNumber}`)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(viewType === 'drivers' || viewType === 'conductors') && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Staff Roster</span>
            <span className="text-emerald-700">100% Attendance SLAs Verified</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Badge ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Assigned Bus</th>
                  <th className="p-3.5">Depot</th>
                  <th className="p-3.5">Attendance</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {viewType === 'conductors' && conductors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-[#7847CB]">{s.id}</td>
                    <td className="p-3.5 font-extrabold text-slate-900">{s.name}</td>
                    <td className="p-3.5">{s.role}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{s.bus}</td>
                    <td className="p-3.5">{s.depot}</td>
                    <td className="p-3.5 font-bold text-emerald-700">{s.attendance}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                        {s.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {viewType === 'drivers' && realDrivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-[#7847CB]">{d.id.substring(0,8)}</td>
                    <td className="p-3.5 font-extrabold text-slate-900">{d.full_name}</td>
                    <td className="p-3.5">Driver</td>
                    <td className="p-3.5 font-semibold text-slate-800 text-[9px]">{d.assigned_bus_id}</td>
                    <td className="p-3.5">-</td>
                    <td className="p-3.5 font-bold text-emerald-700">-</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                        {d.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button onClick={() => openEditDriverModal(d)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteDriver(d.id)} className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewType === 'schedules' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Daily Shift Timetable Grid</span>
            <span className="text-[#7847CB]">06:00 AM – 10:00 PM Service Hours</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Trip ID</th>
                  <th className="p-3.5">Route</th>
                  <th className="p-3.5">Bus Number</th>
                  <th className="p-3.5">Driver</th>
                  <th className="p-3.5">Conductor</th>
                  <th className="p-3.5">Departure</th>
                  <th className="p-3.5">Est. Arrival</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {realTrips.map((trip) => (
                  <tr key={trip.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-600 text-[9px]">{trip.id.substring(0,8)}</td>
                    <td className="p-3.5 font-bold text-[#7847CB]">{trip.routes?.route_number || 'N/A'}</td>
                    <td className="p-3.5 font-bold text-slate-900">{trip.buses?.bus_number || 'N/A'}</td>
                    <td className="p-3.5">{trip.driver_credentials?.full_name || 'N/A'}</td>
                    <td className="p-3.5">-</td>
                    <td className="p-3.5 font-mono">{trip.start_time ? new Date(trip.start_time).toLocaleTimeString() : 'TBD'}</td>
                    <td className="p-3.5 font-mono">{trip.end_time ? new Date(trip.end_time).toLocaleTimeString() : 'TBD'}</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        trip.status === 'Active' || trip.status === 'In Progress'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button onClick={() => handleDeleteTrip(trip.id)} className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500 transition" title="Cancel/Delete Trip">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {realTrips.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 text-sm">
                      No trips scheduled. Click "Add Schedule" to link a route, bus, and driver!
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
