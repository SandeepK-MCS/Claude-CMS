import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { BusinessRole } from '../../types/security';
import { GraduationCap, ShieldCheck, Database } from 'lucide-react';

export const Header: React.FC = () => {
  const { session, activeRole, switchRole } = useAuth();

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            Student Lifecycle CRM
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Enterprise
            </span>
          </span>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Global Education Operations & Workforce Suite
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* PostgreSQL Database Status Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <Database className="w-3.5 h-3.5" />
          <span>Neon PostgreSQL Active</span>
        </div>

        {/* Role Switcher Pill */}
        <div className="relative flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Role</span>
            <select
              value={activeRole}
              onChange={(e) => switchRole(e.target.value as BusinessRole)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-4"
            >
              <option value="super_admin" className="bg-slate-900 text-white">Super Admin</option>
              <option value="master_super_admin" className="bg-slate-900 text-white">Master Super Admin</option>
              <option value="branch_manager" className="bg-slate-900 text-white">Branch Manager</option>
              <option value="counselor" className="bg-slate-900 text-white">Counselor</option>
              <option value="student" className="bg-slate-900 text-white">Student</option>
            </select>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-indigo-700 text-white font-bold text-xs flex items-center justify-center">
            {session?.name ? session.name[0].toUpperCase() : 'A'}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-bold text-white leading-tight">
              {session?.name || 'Authorized Staff'}
            </div>
            <div className="text-[10px] text-slate-400">
              {session?.branch || 'Corporate HQ'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
