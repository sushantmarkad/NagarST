import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import {
  Bus,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Search,
  CheckCircle2,
  X,
  Gauge
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';

interface BusRecord {
  id: string;
  bus_number: string;
  plate_number: string;
  capacity: number;
  type: string;
  status: string;
  created_at: string;
}

export const AdminBuses: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();

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
      if (data) setBuses(data);
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
      type: 'Standard',
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
      status: bus.status
    });
    setIsAddBusOpen(true);
  };

  const handleSaveBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isEditMode && currentEditId) {
        const { error: err } = await supabase
          .from('buses')
          .update({
            bus_number: busForm.bus_number.trim(),
            plate_number: busForm.plate_number.trim(),
            capacity: parseInt(busForm.capacity.toString()),
            type: busForm.type,
            status: busForm.status
          })
          .eq('id', currentEditId);
        if (err) throw err;
        toast.success(`Bus ${busForm.bus_number} details updated successfully!`);
      } else {
        const { error: err } = await supabase
          .from('buses')
          .insert([{
            bus_number: busForm.bus_number.trim(),
            plate_number: busForm.plate_number.trim(),
            capacity: parseInt(busForm.capacity.toString()),
            type: busForm.type,
            status: 'Active'
          }]);
        if (err) throw err;
        toast.success(`New bus ${busForm.bus_number} added to fleet!`);
      }
      
      setIsAddBusOpen(false);
      fetchBuses();
    } catch (err: any) {
      toast.error(`Error saving bus: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBus = async (bus: BusRecord) => {
    const isConfirmed = await confirm({
      title: `Delete Bus ${bus.bus_number}?`,
      message: `Are you sure you want to permanently remove vehicle ${bus.bus_number} (${bus.plate_number}) from the municipal fleet directory? This will remove all associated live trip links.`,
      confirmText: 'Delete Vehicle',
      isDestructive: true,
    });

    if (!isConfirmed) return;

    try {
      const { error: err } = await supabase.from('buses').delete().eq('id', bus.id);
      if (err) throw err;
      toast.success(`Bus ${bus.bus_number} was successfully deleted.`);
      fetchBuses();
    } catch (err: any) {
      toast.error(`Error deleting bus: ${err.message}`);
    }
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
            Register, inspect, and manage electric and standard buses in service
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
            Register Bus
          </Button>
        </div>
      </div>

      {/* Fleet Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50/50">
          <span>Registered Vehicles ({filteredBuses.length})</span>
          <Badge variant="brand" size="sm">MSRTC Registered</Badge>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#7847CB]/30 border-t-[#7847CB] rounded-full animate-spin" />
              Loading vehicle directory...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-4">Bus Number</th>
                  <th className="p-4">License Plate</th>
                  <th className="p-4">Type & Capacity</th>
                  <th className="p-4">Operational Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredBuses.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-black text-[#7847CB] text-sm">
                      {b.bus_number}
                    </td>
                    <td className="p-4 font-mono text-slate-700">
                      {b.plate_number}
                    </td>
                    <td className="p-4 text-slate-700">
                      <span className="font-semibold">{b.type}</span> • {b.capacity} passenger seats
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
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
                        title="Edit Bus"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBus(b)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors"
                        title="Delete Bus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredBuses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400 text-xs">
                      No vehicles found matching current query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Bus Accessible Modal */}
      <Modal
        isOpen={isAddBusOpen}
        onClose={() => setIsAddBusOpen(false)}
        title={isEditMode ? `Edit Vehicle ${busForm.bus_number}` : 'Register New Transit Vehicle'}
        description="Enter vehicle registration and chassis configuration"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBus} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Bus Fleet Number (e.g. AH-24)
            </label>
            <input
              required
              type="text"
              value={busForm.bus_number}
              onChange={e => setBusForm({...busForm, bus_number: e.target.value})}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              MSRTC License Plate
            </label>
            <input
              required
              type="text"
              value={busForm.plate_number}
              onChange={e => setBusForm({...busForm, plate_number: e.target.value})}
              placeholder="e.g. MH-16-AZ-4091"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Seating Capacity
              </label>
              <input
                required
                type="number"
                min="10"
                max="100"
                value={busForm.capacity}
                onChange={e => setBusForm({...busForm, capacity: parseInt(e.target.value)})}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB] focus:ring-2 focus:ring-[#7847CB]/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Powertrain Type
              </label>
              <select
                value={busForm.type}
                onChange={e => setBusForm({...busForm, type: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
              >
                <option value="Electric (AC)">Electric (AC)</option>
                <option value="Standard">Standard Diesel</option>
                <option value="Mini-Bus">Mini-Bus</option>
              </select>
            </div>
          </div>

          {isEditMode && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Operational Status
              </label>
              <select
                value={busForm.status}
                onChange={e => setBusForm({...busForm, status: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#7847CB]"
              >
                <option value="Active">Active</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsAddBusOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="md"
              isLoading={isSubmitting}
            >
              {isEditMode ? 'Update Vehicle' : 'Save Vehicle to Fleet'}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
