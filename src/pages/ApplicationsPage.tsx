import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApplications, createApplication } from '../api/applicationsApi';
import { fetchStudents } from '../api/studentsApi';
import { MASTER_UNIVERSITIES } from '../data/universityMasterData';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Briefcase, 
  Search, 
  GraduationCap, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  MapPin, 
  ExternalLink,
  Award,
  Calendar
} from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const { session } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedUniId, setSelectedUniId] = useState(MASTER_UNIVERSITIES[0]?.id || '');
  const [courseName, setCourseName] = useState('M.Sc. Computer Science');
  const [category, setCategory] = useState<'Ambitious' | 'Moderate' | 'Safe'>('Moderate');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [appsData, studentsData] = await Promise.all([
        fetchApplications(undefined, session),
        fetchStudents(session).catch(() => [])
      ]);
      setApplications(appsData);
      setStudents(studentsData);
      if (studentsData.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentsData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load applications:', err);
      showNotification(err?.message || 'Failed to load applications', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const uni = MASTER_UNIVERSITIES.find((u) => u.id === selectedUniId);
      const student = students.find((s) => s.id === selectedStudentId);

      await createApplication({
        studentId: selectedStudentId,
        studentName: student ? `${student.personal?.firstName || ''} ${student.personal?.lastName || ''}`.trim() : 'Student',
        studentRefNo: student?.studentRefNo,
        universityId: selectedUniId,
        universityName: uni?.universityName || uni?.name || 'Partner University',
        country: uni?.country || 'Germany',
        courseName,
        category,
        status: 'draft'
      }, session);

      showNotification('Application docket created successfully.');
      setShowAddModal(false);
      await loadData();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to create application', 'error');
    }
  };

  const filtered = applications.filter((app) => {
    const q = search.toLowerCase();
    const uniName = (app.universityName || '').toLowerCase();
    const course = (app.courseName || '').toLowerCase();
    const stdName = (app.studentName || '').toLowerCase();
    const matchesSearch = uniName.includes(q) || course.includes(q) || stdName.includes(q);
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/80 border-rose-800 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <Briefcase className="w-6 h-6 text-indigo-400" />
              <span>University Applications & Offer Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Global university filings, Ambitious/Moderate/Safe categorization, admission offers, and tuition deposit deadlines.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              {applications.length} Active Dossiers
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Application</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search university, student, or course..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-slate-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs rounded-xl border border-slate-200 px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Stages</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="conditional_offer">Conditional Offer</option>
            <option value="unconditional_offer">Unconditional Offer</option>
            <option value="accepted">Accepted / Deposited</option>
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading university applications from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No applications match current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">University & Course</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Country & Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Offer & Deposit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((app) => (
                  <tr key={app.id || app.applicationId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <div>{app.universityName}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{app.courseName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      <div className="font-medium">{app.studentName || 'Student Profile'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{app.studentRefNo || app.studentId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{app.country || 'Global'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          app.category === 'Ambitious'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : app.category === 'Moderate'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {app.category || 'Moderate'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={app.status || 'draft'} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {app.offerReceivedDate || app.depositDeadline ? (
                        <div className="text-[11px] font-semibold text-emerald-600">
                          Offer Received
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">In Progress</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              <span>Create University Application</span>
            </h3>

            <form onSubmit={handleCreateApplication} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.personal?.firstName} {s.personal?.lastName} ({s.studentRefNo || s.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target University</label>
                <select
                  value={selectedUniId}
                  onChange={(e) => setSelectedUniId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {MASTER_UNIVERSITIES.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.universityName || u.name} - {u.country} ({u.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Course Name</label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Ambitious">Ambitious (Reach)</option>
                  <option value="Moderate">Moderate (Target)</option>
                  <option value="Safe">Safe (Safety)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-sm"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
