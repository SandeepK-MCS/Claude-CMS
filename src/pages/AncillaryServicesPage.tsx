import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchAncillaryServices, triggerAncillaryService } from '../api/servicesApi';
import { fetchStudents } from '../api/studentsApi';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Briefcase, 
  CreditCard, 
  Home, 
  Smartphone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Landmark,
  Plane,
  RefreshCw,
  Plus
} from 'lucide-react';

export const AncillaryServicesPage: React.FC = () => {
  const { session } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [servicesData, setServicesData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [selectedServiceType, setSelectedServiceType] = useState('education_loan');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await fetchStudents(session);
      setStudents(res);
      if (res.length > 0) {
        setSelectedStudentId(res[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentServices = async (studentId: string) => {
    if (!studentId) return;
    try {
      const res = await fetchAncillaryServices(studentId, session);
      setServicesData(res);
    } catch (err: any) {
      console.error('Failed to load services for student:', err);
    }
  };

  useEffect(() => {
    loadStudents();
  }, [session]);

  useEffect(() => {
    if (selectedStudentId) {
      loadStudentServices(selectedStudentId);
    }
  }, [selectedStudentId]);

  const handleTriggerService = async (serviceType: string) => {
    if (!selectedStudentId) return;
    try {
      setTriggering(true);
      await triggerAncillaryService(serviceType, { studentId: selectedStudentId }, session);
      showNotification(`Service '${serviceType.replace('_', ' ').toUpperCase()}' triggered successfully.`);
      await loadStudentServices(selectedStudentId);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to trigger service', 'error');
    } finally {
      setTriggering(false);
    }
  };

  const activeStudent = students.find((s) => s.id === selectedStudentId);

  const serviceCategories = [
    {
      type: 'education_loan',
      title: 'Education Loan Sanction',
      icon: Landmark,
      color: 'indigo',
      desc: 'Partnered with SBI, HDFC Credila, Avanse, and Prodigy Finance.'
    },
    {
      type: 'blocked_account',
      title: 'German Blocked Account & Insurance',
      icon: ShieldCheck,
      color: 'emerald',
      desc: 'Coracle & Expatrio mandatory blocked amount (€11,904) facilitation.'
    },
    {
      type: 'forex_card',
      title: 'Forex Travel Card & Remittance',
      icon: CreditCard,
      color: 'violet',
      desc: 'Zero markup student international prepaid multi-currency cards.'
    },
    {
      type: 'accommodation',
      title: 'Overseas Student Housing',
      icon: Home,
      color: 'amber',
      desc: 'AmberStudent & Casita pre-arrival verified apartment bookings.'
    },
    {
      type: 'sim_card',
      title: 'International SIM & Connectivity',
      icon: Smartphone,
      color: 'cyan',
      desc: 'Pre-departure activated UK/EU SIM cards delivered to doorstep.'
    },
    {
      type: 'flight_booking',
      title: 'Student Travel Desk & Baggage Extra',
      icon: Plane,
      color: 'rose',
      desc: 'Discounted fares with 40kg+ student baggage allowance.'
    }
  ];

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
              <span>Ancillary Services & Value-Add Desk</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Education loan tie-ups, blocked account deposit assistance, forex travel cards, overseas student accommodation, and pre-departure SIM kits.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              6 Enterprise Service Desks
            </span>
          </div>
        </div>
      </div>

      {/* Student Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Target Student:</span>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold max-w-xs"
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.personal?.firstName} {s.personal?.lastName} ({s.studentRefNo || s.id})
              </option>
            ))}
          </select>
        </div>

        {activeStudent && (
          <div className="text-xs text-slate-500 flex items-center gap-4">
            <span>Branch: <strong className="text-slate-700">{activeStudent.branch || 'Corporate'}</strong></span>
            <span>Target Country: <strong className="text-slate-700">{activeStudent.preferences?.targetCountries?.[0] || 'Germany'}</strong></span>
            <span>Stage: <strong className="text-indigo-600">{activeStudent.currentStage}</strong></span>
          </div>
        )}
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceCategories.map((svc) => {
          const Icon = svc.icon;
          return (
            <div
              key={svc.type}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-indigo-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                    Active Desk
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">{svc.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{svc.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Direct Integration
                </span>
                <button
                  onClick={() => handleTriggerService(svc.type)}
                  disabled={triggering}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Initiate</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
