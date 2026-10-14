/**
 * Students 360° Management API Service
 * Handles enrolled student records, 13 lifecycle milestones, and staff reassignment.
 */

import { apiRequest, getAuthHeaders } from './client';
import { StudentMasterProfile } from '../types/crm';

export interface StudentFilterParams {
  stage?: string;
  branch?: string;
  search?: string;
}

export async function fetchStudents(
  session?: any,
  filters?: StudentFilterParams
): Promise<StudentMasterProfile[]> {
  const query = new URLSearchParams();
  if (filters?.stage && filters.stage !== 'all') query.append('stage', filters.stage);
  if (filters?.branch && filters.branch !== 'all') query.append('branch', filters.branch);
  if (filters?.search) query.append('search', filters.search);

  const qs = query.toString();
  const endpoint = qs ? `/api/students?${qs}` : '/api/students';

  const res = await apiRequest<any>(endpoint, {
    headers: getAuthHeaders(session)
  });

  return Array.isArray(res) ? res : res.students || [];
}

export async function fetchStudentById(
  studentId: string,
  session?: any
): Promise<StudentMasterProfile> {
  const res = await apiRequest<any>(`/api/students/${studentId}`, {
    headers: getAuthHeaders(session)
  });
  return res.student || res;
}

export async function updateStudent(
  studentId: string,
  updates: Record<string, any>,
  session?: any
): Promise<StudentMasterProfile> {
  const res = await apiRequest<any>(`/api/students/${studentId}`, {
    method: 'PUT',
    headers: getAuthHeaders(session),
    body: JSON.stringify(updates)
  });
  return res.student || res;
}

export async function transitionStudentStage(
  studentId: string,
  stage: string,
  reason?: string,
  session?: any
): Promise<{ success: boolean; student: StudentMasterProfile }> {
  return apiRequest(`/api/students/${studentId}/stage`, {
    method: 'PATCH',
    headers: getAuthHeaders(session),
    body: JSON.stringify({
      stage,
      reason: reason || 'Stage transition executed from student management portal'
    })
  });
}

export async function reassignStudentCounselor(
  studentId: string,
  newCounselorId: string,
  reason?: string,
  session?: any
): Promise<{ success: boolean; student: StudentMasterProfile }> {
  return apiRequest(`/api/students/${studentId}/reassign-counselor`, {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify({
      newCounselorId,
      reason: reason || 'Student counselor updated by management'
    })
  });
}
