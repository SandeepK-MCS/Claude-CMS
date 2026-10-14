import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentMasterProfile } from '../types/crm';
import { fetchStudents, updateStudent, transitionStudentStage, reassignStudentCounselor } from '../api/studentsApi';
import { fetchAssignmentRules } from '../api/leadsApi';
import { StatusBadge } from '../components/common/StatusBadge';
import { ReassignCounselorModal } from '../components/modals/ReassignCounselorModal';
import { EditStudentModal } from '../components/modals/EditStudentModal';
import { 
  Users, 
  Search, 
  Filter, 
  ArrowRightLeft, 
  Edit3, 
  Mail, 
  Phone, 
  GraduationCap, 
  ChevronRight, 
  Award,
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const { session } = useAuth();
  const [students, setStudents] = useState<StudentMasterProfile[]>([]);
  const [counselors, setCounselors] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentMasterProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Modals
  const [reassignStudent, setReassignStudent] = useState<StudentMasterProfile | null>(null);
  const [editStudent, setEditStudent] = useState<StudentMasterProfile | null>(null);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, rulesData] = await Promise.all([
        fetchStudents(session),
        fetchAssignmentRules(session)
      ]);
      setStudents(studentsData);
      setCounselors(rulesData.counselors || []);
      if (studentsData.length > 0 && !selectedStudent) {
        setSelectedStudent(studentsData[0]);
      }
    } catch (err: any) {
      console.error('Failed to load students:', err);
      showNotification(err?.message || 'Failed to load student profiles', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleConfirmReassign = async (newCounselorId: string, reason: string) => {
    if (!reassignStudent) return;
    const res = await reassignStudentCounselor(reassignStudent.id, newCounselorId, reason, session);
    showNotification(`Student successfully reassigned to ${res.student?.assignedCounselorName || 'counselor'}.`);
    await loadData();
  };

  const handleSaveEdit = async (updates: Record<string, any>) => {
    if (!editStudent) return;
    await updateStudent(editStudent.id, updates, session);
    showNotification(`Student ${editStudent.studentRefNo} updated in database.`);
    await loadData();
  };

  const handleAdvanceStage = async (studentId: string, nextStage: string) => {
    try {
      await transitionStudentStage(studentId, nextStage, 'Stage updated from student cockpit', session);
      showNotification(`Student progressed to ${nextStage.replace(/_/g, ' ').toUpperCase()}`);
      await loadData();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to transition stage', 'error');
    }
  };

  const filteredStudents = students.filter((s) => {
    const q = search.toLowerCase();
    const fullName = `${s.personal?.firstName || ''} ${s.personal?.lastName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(q) ||
      (s.personal?.email || '').toLowerCase().includes(q) ||
      (s.studentRefNo || '').toLowerCase().includes(q);

    const matchesStage = stageFilter === 'all' || s.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-400" />
              <span>Student 360° Master Record & Lifecycle</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Complete student dossier tracking 13 milestones across course shortlisting, university applications, admissions offers, Germany APS, and visa files.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold self-start md:self-auto">
            {students.length} Enrolled Profiles in DB
          </span>
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

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search students by name, email, or Student Ref No..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="bg-transparent font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all">All Lifecycle Stages</option>
            <option value="lead">Lead</option>
            <option value="counselling">Counselling</option>
            <option value="profile_building">Profile Building</option>
            <option value="university_shortlisting">University Shortlisting</option>
            <option value="document_collection">Document Collection</option>
            <option value="applications_in_progress">Applications in Progress</option>
            <option value="offer_management">Offer Management</option>
            <option value="visa_preparation">Visa Preparation</option>
            <option value="visa_filed">Visa Filed</option>
            <option value="pre_departure">Pre-Departure</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Student List & Detailed 360 View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Student Cards */}
        <div className="lg:col-span-5 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading student records from PostgreSQL database...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No students found.
            </div>
          ) : (
            filteredStudents.map((s) => {
              const isSelected = selectedStudent?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {s.personal?.firstName} {s.personal?.lastName}
                      </div>
                      <div className="text-[11px] font-mono font-semibold text-indigo-700">
                        {s.studentRefNo}
                      </div>
                    </div>
                    <StatusBadge type="stage" value={s.currentStage} />
                  </div>

                  <div className="mt-3 text-xs space-y-1 text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{s.personal?.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{s.personal?.phone}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">
                      Counselor: <strong className="text-slate-800">{s.assignedCounselorName}</strong>
                    </span>
                    <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                      View Profile <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: 360° Profile Details */}
        <div className="lg:col-span-7">
          {selectedStudent ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedStudent.personal?.firstName} {selectedStudent.personal?.lastName}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {selectedStudent.studentRefNo}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Branch: {selectedStudent.branch} • Assigned to: {selectedStudent.assignedCounselorName}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReassignStudent(selectedStudent)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Reassign Counselor</span>
                  </button>
                  <button
                    onClick={() => setEditStudent(selectedStudent)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>

              {/* Lifecycle Stage Progression */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Current Lifecycle Milestone
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-900 text-sm uppercase">
                      {selectedStudent.currentStage?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStudent.currentStage}
                      onChange={(e) => handleAdvanceStage(selectedStudent.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white cursor-pointer"
                    >
                      <option value="counselling">Counselling</option>
                      <option value="profile_building">Profile Building</option>
                      <option value="university_shortlisting">University Shortlisting</option>
                      <option value="document_collection">Document Collection</option>
                      <option value="applications_in_progress">Applications in Progress</option>
                      <option value="offer_management">Offer Management</option>
                      <option value="visa_preparation">Visa Preparation</option>
                      <option value="visa_filed">Visa Filed</option>
                      <option value="pre_departure">Pre-Departure</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Personal & Academic Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Personal Details</span>
                  </div>
                  <div><strong>Email:</strong> {selectedStudent.personal?.email}</div>
                  <div><strong>Phone:</strong> {selectedStudent.personal?.phone}</div>
                  <div><strong>City / State:</strong> {selectedStudent.personal?.city || 'N/A'}, {selectedStudent.personal?.state || 'N/A'}</div>
                  <div><strong>Passport:</strong> {selectedStudent.personal?.passportNumber || 'Not Uploaded'}</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Academic History</span>
                  </div>
                  <div><strong>Highest Degree:</strong> {selectedStudent.academics?.highestQualification || 'B.Tech'}</div>
                  <div><strong>Institution:</strong> {selectedStudent.academics?.institution || 'JNTU'}</div>
                  <div><strong>Score / GPA:</strong> {selectedStudent.academics?.scoreValue || '8.5'}</div>
                  <div><strong>English Test:</strong> {selectedStudent.academics?.englishTest?.testType || 'IELTS'} (Score: {selectedStudent.academics?.englishTest?.overallScore || '7.5'})</div>
                </div>
              </div>

              {/* Applications List */}
              <div>
                <div className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600" />
                  <span>University Applications ({selectedStudent.applications?.length || 0})</span>
                </div>
                {selectedStudent.applications && selectedStudent.applications.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudent.applications.map((app) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{app.universityName}</div>
                          <div className="text-[11px] text-slate-500">{app.courseName} • {app.country}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700">
                          {app.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-slate-100 text-xs text-slate-400">
                    No applications submitted yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              Select a student to view their 360° master profile.
            </div>
          )}
        </div>
      </div>

      {/* Reassign Counselor Modal */}
      {reassignStudent && (
        <ReassignCounselorModal
          isOpen={Boolean(reassignStudent)}
          onClose={() => setReassignStudent(null)}
          recordTitle={`${reassignStudent.personal?.firstName} ${reassignStudent.personal?.lastName} (${reassignStudent.studentRefNo})`}
          currentCounselorName={reassignStudent.assignedCounselorName}
          currentCounselorId={reassignStudent.assignedCounselorId}
          counselors={counselors}
          onConfirm={handleConfirmReassign}
        />
      )}

      {/* Edit Student Modal */}
      {editStudent && (
        <EditStudentModal
          isOpen={Boolean(editStudent)}
          onClose={() => setEditStudent(null)}
          student={editStudent}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};
