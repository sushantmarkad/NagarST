import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { Bus, Plus, X, Edit2, Trash2, AlertCircle } from 'lucide-react';

export const AdminBuses: React.FC = () => {
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isAddBusOpen, setIsAddBusOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEditId, setCurrentEditId] = useState<string | null>(null);
  
  const [busForm, setBusForm] = useState({
    bus_number: '',
    plate_number: '',
    capacity: 40,
    type: 'Standard',
    status: 'Active'
  });

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    setLoading(true);
    try {
      const { data, error: err } = await supabase
        .from('buses')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      setBuses(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentEditId(null);
    setBusForm({ bus_number: '', plate_number: '', capacity: 40, type: 'Standard', status: 'Active' });
    setIsAddBusOpen(true);
  };

  const openEditModal = (bus: any) => {
    setIsEditMode(true);
    setCurrentEditId(bus.id);
    setBusForm({
      bus_number: bus.bus_number,
      plate_number: bus.plate_number,
      capacity: bus.capacity,
      type: bus.type,
      status: bus.status
    });
    setIsAddBusOpen(true);
  };

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && currentEditId) {
        const { error: err } = await supabase
          .from('buses')
          .update({
            bus_number: busForm.bus_number,
            plate_number: busForm.plate_number,
            capacity: parseInt(busForm.capacity.toString()),
            type: busForm.type,
            status: busForm.status
          })
          .eq('id', currentEditId);
        if (err) throw err;
        alert('Bus updated successfully!');
      } else {
        const { error: err } = await supabase
          .from('buses')
          .insert([{
            bus_number: busForm.bus_number,
            plate_number: busForm.plate_number,
            capacity: parseInt(busForm.capacity.toString()),
            type: busForm.type,
            status: 'Active'
          }]);
        if (err) throw err;
        alert('Bus added successfully!');
      }
      
      setIsAddBusOpen(false);
      fetchBuses();
    } catch (err: any) {
      alert(`Error saving bus: ${err.message}`);
    }
  };

  const handleDeleteBus = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bus? This action cannot be undone.')) return;
    try {
      const { error: err } = await supabase.from('buses').delete().eq('id', id);
      if (err) throw err;
      fetchBuses();
    } catch (err: any) {
      alert(`Error deleting bus: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-6 mx-auto w-full">
      <div className="flex justify-end">
        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-[#7847CB] hover:bg-[#6339a6] text-white font-bold text-xs flex items-center gap-2 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Register New Bus
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {isAddBusOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsAddBusOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Bus className="w-5 h-5 text-[#7847CB]" /> {isEditMode ? 'Edit Bus Details' : 'Register New Bus'}
            </h3>
            <form onSubmit={handleSaveBus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bus Number (e.g. AH-24)</label>
                <input required type="text" value={busForm.bus_number} onChange={e => setBusForm({...busForm, bus_number: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:border-[#7847CB]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Registration Plate</label>
                <input required type="text" value={busForm.plate_number} onChange={e => setBusForm({...busForm, plate_number: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:border-[#7847CB]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Passenger Capacity</label>
                <input required type="number" min="10" max="100" value={busForm.capacity} onChange={e => setBusForm({...busForm, capacity: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:border-[#7847CB]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bus Type</label>
                <select value={busForm.type} onChange={e => setBusForm({...busForm, type: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:border-[#7847CB]">
                  <option value="Standard">Standard</option>
                  <option value="Electric (AC)">Electric (AC)</option>
                  <option value="Mini-Bus">Mini-Bus</option>
                </select>
              </div>
              {isEditMode && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select value={busForm.status} onChange={e => setBusForm({...busForm, status: e.target.value})} className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:border-[#7847CB]">
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Out of Service">Out of Service</option>
                  </select>
                </div>
              )}
              <button type="submit" className="w-full py-2.5 bg-[#7847CB] text-white rounded-xl font-bold text-sm">
                {isEditMode ? 'Update Bus' : 'Save Bus'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Fleet Directory ({buses.length})</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#7847CB]/30 border-t-[#7847CB] rounded-full animate-spin" />
              Loading buses...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Internal ID (UUID)</th>
                  <th className="p-3.5">Bus Number</th>
                  <th className="p-3.5">Plate Number</th>
                  <th className="p-3.5">Type & Capacity</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {buses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-400 text-[9px]">{b.id}</td>
                    <td className="p-3.5 font-extrabold text-[#7847CB]">{b.bus_number}</td>
                    <td className="p-3.5 font-mono text-slate-600">{b.plate_number}</td>
                    <td className="p-3.5 text-slate-700">{b.type} • {b.capacity} seats</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                        b.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        b.status === 'Maintenance' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button onClick={() => openEditModal(b)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteBus(b.id)} className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-500 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {buses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 text-sm">
                      No buses registered yet. Add one above!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
