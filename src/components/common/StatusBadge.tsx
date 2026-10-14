import React from 'react';
import { Flame, CheckCircle, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export interface StatusBadgeProps {
  type?: 'priority' | 'stage' | 'status' | 'risk';
  value?: string;
  status?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type = 'status', value, status, className = '' }) => {
  const actualValue = value || status || 'active';
  const normalized = actualValue.toLowerCase().trim();

  if (type === 'priority') {
    if (normalized === 'hot') {
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1 ${className}`}>
          <Flame className="w-3 h-3 text-rose-600" />
          <span>Hot</span>
        </span>
      );
    }
    if (normalized === 'warm') {
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1 ${className}`}>
          <Flame className="w-3 h-3 text-amber-600" />
          <span>Warm</span>
        </span>
      );
    }
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1 ${className}`}>
        <Flame className="w-3 h-3 text-sky-600" />
        <span>Cold</span>
      </span>
    );
  }

  if (type === 'risk') {
    if (normalized === 'critical') {
      return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 ${className}`}>
          Critical
        </span>
      );
    }
    if (normalized === 'high') {
      return (
        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 ${className}`}>
          High
        </span>
      );
    }
    return (
      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}>
        Standard
      </span>
    );
  }

  // Generic status or stage badge
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200 ${className}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
};
