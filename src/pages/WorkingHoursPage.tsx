import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchStaffWorkingHours, updateStaffWorkingHours, StaffWorkingHoursRecord } from '../api/workingHoursApi';
import { Clock, Save, CheckCircle2, AlertCircle, Users } from 'lucide-react';

export const WorkingHoursPage: React.FC = () => {
  const { session } = useAuth();
  const [availabilityList, setAvailabilityList] = useState<StaffWorkingHoursRecord[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffWorkingHoursRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await fetchStaffWorkingHours(session);
      setAvailabilityList(list);
      if (list.length > 0 && !selectedStaff) {
        setSelectedStaff(list[0]);
      }
    } catch (err: any) {
      console.error('Failed to load working hours:', err);
      showNotification(err?.message || 'Failed to load staff working hours', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      setSaving(true);
      const res = await updateStaffWorkingHours(selectedStaff, session);
      showNotification(res.message || `Working hours saved for ${selectedStaff.staffName}`);
      await loadData();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to save working hours', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/50">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <Clock className="w-6 h-6 text-teal-400" />
          <span>Staff Working Hours & Shift Availability</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
          Configure counselor shifts, daily active hours, buffer intervals, and working days for round-robin assignment and calendar scheduling.
        </p>
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

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs max-w-3xl">
        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Loading staff working hours...
          </div>
        ) : selectedStaff ? (
          <form onSubmit={handleSave} className="space-y-5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Select Staff Member / Counselor:
              </label>
              <select
                value={selectedStaff.staffUserId}
                onChange={(e) => {
                  const found = availabilityList.find((a) => a.staffUserId === e.target.value);
                  if (found) setSelectedStaff({ ...found });
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900"
              >
                {availabilityList.map((st) => (
                  <option key={st.staffUserId} value={st.staffUserId}>
                    {st.staffName} ({st.staffRole?.replace(/_/g, ' ').toUpperCase()}) — {st.branch}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shift Start Time</label>
                <input
                  type="time"
                  value={selectedStaff.workingHoursStart || '09:00'}
                  onChange={(e) =>
                    setSelectedStaff({
                      ...selectedStaff,
                      workingHoursStart: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shift End Time</label>
                <input
                  type="time"
                  value={selectedStaff.workingHoursEnd || '18:00'}
                  onChange={(e) =>
                    setSelectedStaff({
                      ...selectedStaff,
                      workingHoursEnd: e.target.value
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                  const days = selectedStaff.workingDays || [];
                  const active = days.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const next = active ? days.filter((d) => d !== day) : [...days, day];
                        setSelectedStaff({
                          ...selectedStaff,
                          workingDays: next
                        });
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Slot Duration</label>
                <select
                  value={selectedStaff.slotDurationMinutes || 30}
                  onChange={(e) =>
                    setSelectedStaff({
                      ...selectedStaff,
                      slotDurationMinutes: Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Buffer Time</label>
                <select
                  value={selectedStaff.bufferMinutes || 5}
                  onChange={(e) =>
                    setSelectedStaff({
                      ...selectedStaff,
                      bufferMinutes: Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium"
                >
                  <option value={0}>0 Minutes</option>
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Timezone</label>
                <input
                  type="text"
                  value={selectedStaff.timezone || 'Asia/Kolkata'}
                  onChange={(e) =>
                    setSelectedStaff({
                      ...selectedStaff,
                      timezone: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving to Database...' : 'Save Shift Configuration'}</span>
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
};
