import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ArrowRightLeft } from 'lucide-react';

export interface ReassignCounselorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordTitle: string;
  currentCounselorName: string;
  currentCounselorId?: string;
  counselors: Array<{
    id: string;
    name: string;
    email?: string;
    branch?: string;
    activeLeadCount?: number;
  }>;
  onConfirm: (newCounselorId: string, reason: string) => Promise<void>;
}

export const ReassignCounselorModal: React.FC<ReassignCounselorModalProps> = ({
  isOpen,
  onClose,
  recordTitle,
  currentCounselorName,
  currentCounselorId,
  counselors,
  onConfirm
}) => {
  const [selectedCounselorId, setSelectedCounselorId] = useState(
    counselors.find((c) => c.id !== currentCounselorId)?.id || currentCounselorId || ''
  );
  const [reason, setReason] = useState('Staff workload balancing and schedule optimization');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCounselorId) {
      setError('Please select an active counselor.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onConfirm(selectedCounselorId, reason);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to reassign counselor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reassign Counselor"
      subtitle="Transfer record assignment to an active counselor in PostgreSQL database."
      icon={<ArrowRightLeft className="w-5 h-5 text-indigo-600" />}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="text-[11px] text-slate-500">Selected Record:</div>
          <div className="font-bold text-slate-900 text-sm mt-0.5">{recordTitle}</div>
          <div className="text-xs text-slate-600 mt-1">
            Currently Assigned: <strong className="text-slate-900">{currentCounselorName || 'Unassigned'}</strong>
          </div>
        </div>

        <div>
          <label className="font-bold text-slate-700 block mb-2">
            Select New Assigned Counselor ({counselors.length} Available in DB):
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {counselors.map((c) => {
              const isCurrent = c.id === currentCounselorId;
              const isSelected = selectedCounselorId === c.id;
              return (
                <label
                  key={c.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="reassignCounselorChoice"
                      value={c.id}
                      checked={isSelected}
                      onChange={() => setSelectedCounselorId(c.id)}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        {c.name} {isCurrent ? '(Current)' : ''}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.branch} {c.email ? `• ${c.email}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-indigo-700 px-2 py-0.5 rounded-md bg-indigo-100">
                    {c.activeLeadCount || 0} Leads
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className="font-semibold text-slate-700 block mb-1">
            Reason / Reassignment Note:
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer shadow-sm transition-all"
          >
            {loading ? 'Reassigning in DB...' : 'Confirm Reassignment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
