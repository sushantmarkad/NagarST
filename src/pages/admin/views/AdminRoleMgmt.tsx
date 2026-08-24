import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabaseClient';
import { ShieldCheck, UserCog, AlertCircle } from 'lucide-react';
import { type UserRole } from '../../../data/mockAuth';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
  admin_request_status?: string;
}

export const AdminRoleMgmt: React.FC = () => {
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

  const updateRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error: err } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (err) throw err;
      
      // Update local state to reflect change without full refetch
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole, admin_request_status: 'APPROVED' } : u));
    } catch (err: any) {
      alert(`Error updating role: ${err.message}`);
    }
  };

  const rejectRequest = async (userId: string) => {
    try {
      const { error: err } = await supabase
        .from('user_profiles')
        .update({ admin_request_status: 'REJECTED' })
        .eq('id', userId);

      if (err) throw err;
      
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, admin_request_status: 'REJECTED' } : u));
    } catch (err: any) {
      alert(`Error rejecting request: ${err.message}`);
    }
  };

  const pendingRequests = users.filter(u => u.admin_request_status === 'PENDING');
  const otherUsers = users.filter(u => u.admin_request_status !== 'PENDING');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#7847CB]" />
          Super Admin Role Management
        </h2>
        <p className="text-xs text-slate-500">
          Manage system access levels for registered users. Upgrade users to City Admins so they can manage the fleet.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Registered Users</span>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500 text-sm flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-[#7847CB]/30 border-t-[#7847CB] rounded-full animate-spin" />
              Loading users...
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">User ID</th>
                  <th className="p-3.5">Full Name</th>
                  <th className="p-3.5">Joined Date</th>
                  <th className="p-3.5">Current Role</th>
                  <th className="p-3.5 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pendingRequests.length > 0 && (
                  <tr>
                    <td colSpan={5} className="bg-amber-50/50 p-2 text-xs font-bold text-amber-800 border-b border-amber-100">
                      Pending Approvals ({pendingRequests.length})
                    </td>
                  </tr>
                )}
                {[...pendingRequests, ...otherUsers].map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono text-slate-500 text-[10px]">{u.id}</td>
                    <td className="p-3.5 font-extrabold text-slate-900">{u.full_name}</td>
                    <td className="p-3.5 text-slate-600">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      {u.admin_request_status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full font-bold text-[9px] bg-amber-50 text-amber-700 border border-amber-200 block mb-1 w-max">
                          REQUEST PENDING
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] border ${
                        u.role === 'SUPER_ADMIN' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200' 
                          : u.role === 'CITY_ADMIN'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right flex justify-end gap-2 items-center">
                      {u.admin_request_status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => updateRole(u.id, 'CITY_ADMIN')}
                            className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold text-[10px] rounded-lg transition-colors border border-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectRequest(u.id)}
                            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[10px] rounded-lg transition-colors border border-rose-200"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <select
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] rounded-lg px-2 py-1 outline-none focus:border-[#7847CB]"
                        value={u.role}
                        onChange={(e) => updateRole(u.id, e.target.value as UserRole)}
                        disabled={u.role === 'SUPER_ADMIN'} // Prevent demoting other super admins easily via this simple UI
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
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">
                      No users found.
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
