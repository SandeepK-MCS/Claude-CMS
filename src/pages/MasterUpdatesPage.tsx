import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchRoles, fetchPermissions, fetchUsers } from '../api/masterUpdatesApi';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Sliders, 
  ShieldCheck, 
  Users, 
  Network, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

type MasterTab = 'roles' | 'permissions' | 'users' | 'reporting';

export const MasterUpdatesPage: React.FC = () => {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<MasterTab>('roles');
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [r, p, u] = await Promise.all([
        fetchRoles(session),
        fetchPermissions(session),
        fetchUsers(session)
      ]);
      setRoles(r);
      setPermissions(p);
      setUsers(u);
    } catch (err: any) {
      console.error('Failed to load master configuration:', err);
      showNotification(err?.message || 'Failed to load master configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <Sliders className="w-6 h-6 text-indigo-400" />
          <span>Master Configuration & Access Control</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
          Configure organizational roles, granular action permissions, system user accounts, and reporting hierarchy structures.
        </p>

        {/* Navigation Tabs */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'roles' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-300" />
            <span>1. Roles Master ({roles.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'permissions' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-300" />
            <span>2. Permissions Catalog ({permissions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'users' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-sky-400" />
            <span>3. Users Accounts ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reporting')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all ${
              activeTab === 'reporting' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Network className="w-4 h-4 text-emerald-400" />
            <span>4. Reporting Structure</span>
          </button>
        </div>
      </div>

      {/* Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tab 1: Roles Master */}
      {activeTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Database Roles Catalog (`crm."GMI-roles"`)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Hierarchical role matrix defining level, reporting tier, and department.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">Role ID</th>
                  <th className="py-3 px-4">Role Name & Code</th>
                  <th className="py-3 px-4">Level</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Reporting Parent Role</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {roles.map((r) => (
                  <tr key={r.roleId} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">#{r.roleId}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.roleName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{r.roleCode}</div>
                    </td>
                    <td className="py-3 px-4">Level {r.roleLevel || 1}</td>
                    <td className="py-3 px-4 text-slate-600">{r.department || 'Operations'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.parentRoleId ? `Role #${r.parentRoleId}` : 'Top-Level (CEO)'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Permissions Catalog */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">42-Item Permissions Catalog (`/api/permissions`)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Granular DPDP and operational permissions enforcing field-level security and record access.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
              42 Action Rules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {permissions.map((p) => (
              <div
                key={p.action}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-indigo-700 truncate">
                      {p.action}
                    </span>
                    <StatusBadge type="risk" value={p.riskLevel} />
                  </div>
                  <div className="font-bold text-slate-800">{p.label}</div>
                  <p className="text-slate-500 text-[11px] mt-1 leading-snug">{p.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400 font-semibold uppercase">
                  Category: {p.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Users Master */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Users & Accounts (`crm."GMI-users"`)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Registered staff members with reporting manager connections (`reports_to_user_id`).
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {users.length} Users in DB
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Branch</th>
                  <th className="py-3 px-4">Reports To</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                        {u.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{u.branch || 'Corporate HQ'}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.reportsToUserName ? `${u.reportsToUserName} (${u.reportsToUserRole || 'Manager'})` : 'Top-Level'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Reporting Structure */}
      {activeTab === 'reporting' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Organizational Reporting Tree</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live hierarchical tree governing data isolation and caseload supervision.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-xs">
              <div className="font-bold text-indigo-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                <span>Level 1: Chief Executive Officer (CEO) — Corporate HQ</span>
              </div>
              <div className="ml-6 mt-2 space-y-2 border-l-2 border-indigo-200 pl-4">
                <div className="font-semibold text-slate-800">
                  Level 2: Super Admin / Branch Managers
                </div>
                <div className="ml-4 space-y-1 text-slate-600">
                  <div>• Hyderabad - Somajiguda (Branch Manager)</div>
                  <div>• Bangalore (Branch Manager)</div>
                  <div>• Delhi (Branch Manager)</div>
                  <div className="ml-4 pt-1 space-y-1 text-slate-500 border-l border-slate-300 pl-3">
                    <div className="font-bold text-slate-700">Level 3: Counselors & Operations</div>
                    <div>• Manu S K (Hyderabad)</div>
                    <div>• Sandeep Koteshwara (Bangalore)</div>
                    <div>• Pooja Sharma (Hyderabad)</div>
                    <div>• Sneha Patel (Bangalore)</div>
                    <div>• Rajesh Kumar (Delhi)</div>
                    <div>• Ananya Sen (Hyderabad)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
