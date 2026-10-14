/**
 * Meetings & Video Scheduling API Service
 * Handles video room links (Google Meet, Zoom, Teams) and calendar bookings.
 */

import { apiRequest, getAuthHeaders } from './client';

export async function fetchMeetings(session?: any): Promise<any[]> {
  const res = await apiRequest<any>('/api/meetings', {
    headers: getAuthHeaders(session)
  });
  return Array.isArray(res) ? res : res.meetings || [];
}

export async function generateMeetingLink(
  params: { topic?: string; durationMinutes?: number; candidateId?: string },
  session?: any
): Promise<{ success: boolean; joinUrl: string; provider: string }> {
  return apiRequest('/api/meetings/generate-link', {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(params)
  });
}

export async function fetchMeetingProviders(session?: any): Promise<any> {
  return apiRequest('/api/meetings/providers', {
    headers: getAuthHeaders(session)
  });
}
