/**
 * Working Hours & Shifts API Service
 * Handles counselor shifts, working days, slot intervals, and buffer configuration.
 */

import { apiRequest, getAuthHeaders } from './client';

export interface StaffWorkingHoursRecord {
  staffUserId: string;
  userId?: string;
  staffName: string;
  name?: string;
  staffRole?: string;
  role?: string;
  email?: string;
  branch?: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  slotDurationMinutes: number;
  bufferMinutes: number;
  timezone: string;
  isAvailable?: boolean;
}

export async function fetchStaffWorkingHours(session?: any): Promise<StaffWorkingHoursRecord[]> {
  const res = await apiRequest<any>('/api/meetings/availability', {
    headers: getAuthHeaders(session)
  });
  return Array.isArray(res) ? res : [];
}

export async function updateStaffWorkingHours(
  data: Partial<StaffWorkingHoursRecord>,
  session?: any
): Promise<{ success: boolean; message: string; availability: StaffWorkingHoursRecord }> {
  return apiRequest('/api/meetings/availability', {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(data)
  });
}
