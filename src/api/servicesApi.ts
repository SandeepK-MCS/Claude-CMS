/**
 * Ancillary Services API Service
 * Handles education loans, forex cards, sim cards, and student housing.
 */

import { apiRequest, getAuthHeaders } from './client';

export async function fetchAncillaryServices(studentId?: string, session?: any): Promise<any> {
  const endpoint = studentId ? `/api/services/${studentId}` : '/api/services';
  return apiRequest<any>(endpoint, {
    headers: getAuthHeaders(session)
  });
}

export async function triggerAncillaryService(
  serviceType: string,
  payload: Record<string, any>,
  session?: any
): Promise<any> {
  return apiRequest('/api/services/trigger', {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify({ serviceType, ...payload })
  });
}
