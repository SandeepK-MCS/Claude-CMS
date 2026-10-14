/**
 * University Applications API Service
 * Handles course program applications, admissions status, and offer management.
 */

import { apiRequest, getAuthHeaders } from './client';

export async function fetchApplications(studentId?: string, session?: any): Promise<any[]> {
  const endpoint = studentId ? `/api/applications/${studentId}` : '/api/applications';
  const res = await apiRequest<any>(endpoint, {
    headers: getAuthHeaders(session)
  });
  return Array.isArray(res) ? res : res.applications || [];
}

export async function createApplication(
  applicationData: Record<string, any>,
  session?: any
): Promise<any> {
  return apiRequest('/api/applications', {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(applicationData)
  });
}
