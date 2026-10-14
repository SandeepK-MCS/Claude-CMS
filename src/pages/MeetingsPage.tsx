import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchMeetings, generateMeetingLink, fetchMeetingProviders } from '../api/meetingsApi';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  Calendar, 
  Video, 
  Clock, 
  User, 
  Plus, 
  Link2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

export const MeetingsPage: React.FC = () => {
  const { session } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [providers, setProviders] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newTopic, setNewTopic] = useState('Study Abroad Initial Counselling');
  const [duration, setDuration] = useState(30);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [meetingsData, providersData] = await Promise.all([
        fetchMeetings(session),
        fetchMeetingProviders(session).catch(() => ({ providers: [] }))
      ]);
      setMeetings(meetingsData);
      setProviders(providersData);
    } catch (err: any) {
      console.error('Failed to load meetings:', err);
      showNotification(err?.message || 'Failed to load meetings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await generateMeetingLink({ topic: newTopic, durationMinutes: duration }, session);
      showNotification(`Meeting generated via ${res.provider || 'Google Meet'}: ${res.joinUrl}`);
      await loadData();
    } catch (err: any) {
      showNotification(err?.message || 'Failed to generate meeting link', 'error');
    } finally {
      setGenerating(false);
    }
  };

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
              <Calendar className="w-6 h-6 text-indigo-400" />
              <span>Meetings & Video Consultation Hub</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Automated video room generation, Google Meet / Zoom link orchestration, and counselor slot management.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
              {meetings.length} Scheduled Sessions
            </span>
          </div>
        </div>
      </div>

      {/* Quick Generate Link Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
          <Video className="w-4 h-4 text-indigo-600" />
          <span>Instant Video Consultation Generator</span>
        </h2>
        <form onSubmit={handleCreateMeeting} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Session Topic</label>
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. German APS / Visa Guidance"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Slot Duration</label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={15}>15 Minutes Quick Catchup</option>
              <option value={30}>30 Minutes Standard Counselling</option>
              <option value={45}>45 Minutes Profile Evaluation</option>
              <option value={60}>60 Minutes Comprehensive Consultation</option>
            </select>
          </div>
          <div>
            <button
              type="submit"
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{generating ? 'Creating Room...' : 'Generate Video Room'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Meetings List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Consultation Calendar & Bookings</span>
          </div>
          <span className="text-xs text-slate-500">{meetings.length} recorded</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading consultations from database...
          </div>
        ) : meetings.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            No consultations currently scheduled. Create one above to initiate video counselling.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Topic & ID</th>
                  <th className="py-3 px-4">Counselor / Host</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Time & Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Join Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {meetings.map((m) => (
                  <tr key={m.id || m.meetingId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div>{m.topic || m.title || 'Student Counselling'}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{m.id || m.meetingId}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {m.hostName || m.counselorName || 'Assigned Counsellor'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {m.studentName || m.candidateName || 'Prospective Student'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div>{m.scheduledTime ? new Date(m.scheduledTime).toLocaleString() : 'Flexible Slot'}</div>
                      <div className="text-[10px] text-slate-400">{m.durationMinutes || 30} mins</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={m.status || 'confirmed'} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {m.joinUrl ? (
                        <a
                          href={m.joinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-xs transition"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Pending URL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
