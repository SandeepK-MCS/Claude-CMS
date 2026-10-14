import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LeadRecord } from '../types/leadRegistration';
import { fetchLeads, fetchAssignmentRules, reassignLeadCounselor, updateLead } from '../api/leadsApi';
import { StatusBadge } from '../components/common/StatusBadge';
import { ReassignCounselorModal } from '../components/modals/ReassignCounselorModal';
import { EditLeadModal } from '../components/modals/EditLeadModal';
import { 
  UserPlus, 
  Search, 
  Filter, 
  ArrowRightLeft, 
  Edit3, 
  Mail, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Users
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const { session } = useAuth();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // Modals
  const [reassignLead, setReassignLead] = useState<LeadRecord | null>(null);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [leadsData, rulesData] = await Promise.all([
        fetchLeads(session),
        fetchAssignmentRules(session)
      ]);
      setLeads(leadsData);
      setCounselors(rulesData.counselors || []);
    } catch (err: any) {
      console.error('Failed to load leads:', err);
      showNotification(err?.message || 'Failed to load leads from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleConfirmReassign = async (newCounselorId: string, reason: string) => {
    if (!reassignLead) return;
    const res = await reassignLeadCounselor(reassignLead.id, newCounselorId, reason, session);
    showNotification(`Lead successfully reassigned to ${res.newCounselor?.name || 'new counselor'}.`);
    await loadData();
  };

  const handleSaveEdit = async (updates: Record<string, any>) => {
    if (!editLead) return;
    await updateLead(editLead.id, updates, session);
    showNotification(`Lead ${editLead.id} updated in PostgreSQL database.`);
    await loadData();
  };

  const filteredLeads = leads.filter((lead) => {
    const q = search.toLowerCase();
    const fullName = `${lead.contact?.firstName || ''} ${lead.contact?.lastName || ''}`.toLowerCase();
    const matchesQuery =
      fullName.includes(q) ||
      (lead.contact?.email || '').toLowerCase().includes(q) ||
      (lead.contact?.phone || '').includes(q) ||
      (lead.id || '').toLowerCase().includes(q);

    const matchesPriority = filterPriority === 'all' || lead.priority === filterPriority;
    const matchesSource = filterSource === 'all' || lead.source === filterSource;

    return matchesQuery && matchesPriority && matchesSource;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <UserPlus className="w-6 h-6 text-indigo-400" />
              <span>Lead Intake & Round-Robin Cockpit</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Inbound prospective inquiries with deduplication checks, active round-robin bandwidth tracking, and authorized counselor reassignments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              {leads.length} Total Leads in DB
            </span>
          </div>
        </div>

        {/* Live Counselor Bandwidth Cards */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Counselors Availability & Bandwidth ({counselors.length})
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {counselors.map((c) => (
              <div
                key={c.id}
                className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="font-bold text-white truncate">{c.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{c.branch}</div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                  <span className="text-[10px] text-indigo-300 font-semibold">
                    {c.activeLeadCount || 0} / {c.maxLeadCapacity || 35} Leads
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, email, phone, or Lead ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="website">Website</option>
              <option value="education_fair">Education Fair</option>
              <option value="walk_in">Walk-in</option>
              <option value="referral">Referral</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                <th className="py-3.5 px-4">Lead Record</th>
                <th className="py-3.5 px-4">Contact Details</th>
                <th className="py-3.5 px-4">Preferences</th>
                <th className="py-3.5 px-4">Assigned Counselor</th>
                <th className="py-3.5 px-4">Priority & Score</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading lead records from PostgreSQL database...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No lead records match your search criteria.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {lead.contact?.firstName} {lead.contact?.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {lead.id}
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.contact?.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 mt-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{lead.contact?.phone}</span>
                      </div>
                      {lead.contact?.city && (
                        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{lead.contact.city}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">
                        {lead.studyPreferences?.targetDegree || 'Masters'} in {lead.studyPreferences?.targetCourse || 'General'}
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        {Array.isArray(lead.studyPreferences?.preferredCountries)
                          ? lead.studyPreferences.preferredCountries.join(', ')
                          : 'UK, Germany'}
                      </div>
                      {lead.studyPreferences?.cgpaOrPercentage && (
                        <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                          Score: {lead.studyPreferences.cgpaOrPercentage}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">
                        {lead.assignedCounselorName || 'Unassigned'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {lead.assignedBranch || 'Hyderabad'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge type="priority" value={lead.priority} />
                        <span className="text-xs font-bold text-slate-700">
                          {lead.leadScore || 85}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setReassignLead(lead)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Reassign Counselor"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>Reassign</span>
                        </button>
                        <button
                          onClick={() => setEditLead(lead)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer transition-colors"
                          title="Edit Lead Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reassign Counselor Modal */}
      {reassignLead && (
        <ReassignCounselorModal
          isOpen={Boolean(reassignLead)}
          onClose={() => setReassignLead(null)}
          recordTitle={`${reassignLead.contact?.firstName} ${reassignLead.contact?.lastName} (${reassignLead.id})`}
          currentCounselorName={reassignLead.assignedCounselorName}
          currentCounselorId={reassignLead.assignedCounselorId}
          counselors={counselors}
          onConfirm={handleConfirmReassign}
        />
      )}

      {/* Edit Lead Modal */}
      {editLead && (
        <EditLeadModal
          isOpen={Boolean(editLead)}
          onClose={() => setEditLead(null)}
          lead={editLead}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};
