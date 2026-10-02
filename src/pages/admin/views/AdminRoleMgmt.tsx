import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { useToast, useConfirm } from '../../../context/FeedbackContext';
import { Badge, Button } from '../../../components/ui';
import { ShieldCheck, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { type UserRole } from '../../../data/mockAuth';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
  admin_request_status?: string;
}

export const AdminRoleMgmt: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      if (data) {
        setUsers(data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (userId: string, newRole: UserRole, userName: string) => {
    const isElevation = newRole === 'CITY_ADMIN' || newRole === 'SUPER_ADMIN';
    if (isElevation) {
      const confirmed = await confirm({
        title: 'Confirm Role Elevation',
        message: `Are you sure you want to elevate "${userName}" to ${newRole.replace('_', ' ')}? This grants access to municipal administrative data.`,
        confirmText: 'Confirm Elevation',
        cancelText: 'Cancel',
        variant: 'brand',
      });
      if (!confirmed) return;
    }

    try {
      const { error: err } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (err) throw err;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole, admin_request_status: 'APPROVED' } : u));
      toast.success('Role Updated', `${userName}'s role set to ${newRole.replace('_', ' ')}.`);
    } catch (err: any) {
      toast.error('Role Update Failed', err.message || 'Could not update role');
    }
  };

  const rejectRequest = async (userId: string, userName: string) => {
    const confirmed = await confirm({
      title: 'Reject Admin Request',
      message: `Decline administrative role request for "${userName}"?`,
      confirmText: 'Reject Request',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const { error: err } = await supabase
        .from('user_profiles')
        .update({ admin_request_status: 'REJECTED' })
        .eq('id', userId);

      if (err) throw err;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, admin_request_status: 'REJECTED' } : u));
      toast.info('Request Declined', `Administrative access declined for ${userName}.`);
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not decline request');
    }
  };

  const pendingRequests = users.filter(u => u.admin_request_status === 'PENDING');
  const otherUsers = users.filter(u => u.admin_request_status !== 'PENDING');

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 lg:p-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#7847CB]" />
          Super Admin Access Control & Role Management
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Review and audit access levels for registered municipal users. Elevate verified staff to City Administrator roles.
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>Registered System Profiles ({users.length})</span>
          {pendingRequests.length > 0 && (
            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-bold">
              {pendingRequests.length} Pending Approval{pendingRequests.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-10 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#7847CB]/30 border-t-[#7847CB] rounded-full animate-spin" />
              Loading system accounts...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">User ID</th>
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Joined Date</th>
                  <th className="p-3.5">Current Role</th>
                  <th className="p-3.5 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pendingRequests.length > 0 && (
                  <tr>
                    <td colSpan={5} className="bg-amber-50/60 p-2.5 text-xs font-bold text-amber-800 border-b border-amber-200">
                      Pending Administrator Access Requests ({pendingRequests.length})
                    </td>
                  </tr>
                )}
                {[...pendingRequests, ...otherUsers].map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">{u.id.substring(0, 10)}...</td>
                    <td className="p-3.5 font-bold text-slate-900">{u.full_name || 'Anonymous User'}</td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(u.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-col gap-1 items-start">
                        {u.admin_request_status === 'PENDING' && (
                          <span className="px-2 py-0.5 rounded-full font-bold text-[9px] bg-amber-50 text-amber-800 border border-amber-200">
                            APPROVAL REQUESTED
                          </span>
                        )}
                        <Badge
                          variant={
                            u.role === 'SUPER_ADMIN'
                              ? 'brand'
                              : u.role === 'CITY_ADMIN'
                              ? 'info'
                              : 'neutral'
                          }
                        >
                          {u.role.replace('_', ' ')}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3.5 text-right flex justify-end gap-2 items-center">
                      {u.admin_request_status === 'PENDING' && (
                        <div className="flex items-center gap-1.5 mr-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => updateRole(u.id, 'CITY_ADMIN', u.full_name)}
                            className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-2.5"
                            icon={<CheckCircle className="w-3.5 h-3.5" />}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => rejectRequest(u.id, u.full_name)}
                            className="h-7 text-xs px-2.5"
                            icon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                      <select
                        className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-medium rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-[#7847CB]"
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value as UserRole, u.full_name)}
                        disabled={u.role === 'SUPER_ADMIN'}
                      >
                        <option value="PASSENGER">PASSENGER</option>
                        <option value="CITY_ADMIN">CITY ADMIN</option>
                        <option value="SUPER_ADMIN" disabled>SUPER ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-xs">
                      No registered user records found.
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
