import React from 'react';
import { 
  Users, 
  UserPlus, 
  Sliders, 
  Clock, 
  Calendar, 
  GraduationCap, 
  Briefcase, 
  Plane, 
  BarChart3 
} from 'lucide-react';

export type NavigationPage = 
  | 'leads'
  | 'students'
  | 'master_updates'
  | 'working_hours'
  | 'meetings'
  | 'applications'
  | 'services'
  | 'visa'
  | 'analytics'
  | 'docs';

interface SidebarProps {
  currentPage: NavigationPage;
  onSelectPage: (page: NavigationPage) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage }) => {
  const menuItems = [
    {
      id: 'leads' as NavigationPage,
      label: 'Lead Management',
      icon: UserPlus,
      badge: 'Live'
    },
    {
      id: 'students' as NavigationPage,
      label: 'Student 360° Profile',
      icon: Users,
      badge: '13 Stages'
    },
    {
      id: 'master_updates' as NavigationPage,
      label: 'Master Updates & Roles',
      icon: Sliders,
      badge: 'Admin'
    },
    {
      id: 'working_hours' as NavigationPage,
      label: 'Working Hours & Shifts',
      icon: Clock,
      badge: 'Shifts'
    },
    {
      id: 'meetings' as NavigationPage,
      label: 'Meetings & Workforce',
      icon: Calendar,
      badge: 'Slots'
    },
    {
      id: 'applications' as NavigationPage,
      label: 'University Applications',
      icon: GraduationCap,
      badge: 'Offers'
    },
    {
      id: 'services' as NavigationPage,
      label: 'Ancillary Services',
      icon: Briefcase,
      badge: 'Loans'
    },
    {
      id: 'visa' as NavigationPage,
      label: 'Visa & Relocation',
      icon: Plane,
      badge: 'APS'
    },
    {
      id: 'analytics' as NavigationPage,
      label: 'Reports & Audit Logs',
      icon: BarChart3,
      badge: 'DPDP'
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300">
      <div className="p-4 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
        Navigation
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                    isActive
                      ? 'bg-indigo-500/30 text-white'
                      : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300">System Environment</div>
        <div className="mt-0.5 text-slate-400">Database: Neon PostgreSQL</div>
        <div className="text-slate-500">Security: RBAC & DPDP Compliance</div>
      </div>
    </aside>
  );
};
