import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Edit3 } from 'lucide-react';
import { StudentMasterProfile } from '../../types/crm';

export interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentMasterProfile;
  onSave: (updates: Record<string, any>) => Promise<void>;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave
}) => {
  const [formData, setFormData] = useState({
    firstName: student.personal?.firstName || '',
    lastName: student.personal?.lastName || '',
    email: student.personal?.email || '',
    phone: student.personal?.phone || '',
    city: student.personal?.city || '',
    passportNumber: student.personal?.passportNumber || '',
    branch: student.branch || 'Corporate HQ',
    highestQualification: student.academics?.highestQualification || 'B.Tech',
    institution: student.academics?.institution || 'JNTU',
    scoreValue: student.academics?.scoreValue || '8.5'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await onSave({
        personal: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          city: formData.city,
          passportNumber: formData.passportNumber
        },
        branch: formData.branch,
        academics: {
          highestQualification: formData.highestQualification,
          institution: formData.institution,
          scoreValue: formData.scoreValue
        }
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update student profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Student (${student.studentRefNo})`}
      subtitle="Update personal information, branch location, and academic records in PostgreSQL."
      icon={<Edit3 className="w-5 h-5 text-indigo-600" />}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">First Name *</label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Last Name</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Phone *</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Passport Number</label>
            <input
              type="text"
              value={formData.passportNumber}
              onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Assigned Branch</label>
            <input
              type="text"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Highest Degree</label>
            <input
              type="text"
              value={formData.highestQualification}
              onChange={(e) => setFormData({ ...formData, highestQualification: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Institution</label>
            <input
              type="text"
              value={formData.institution}
              onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Score / GPA</label>
            <input
              type="text"
              value={formData.scoreValue}
              onChange={(e) => setFormData({ ...formData, scoreValue: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium"
            />
          </div>
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
            {loading ? 'Saving to Database...' : 'Save Student Details'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
