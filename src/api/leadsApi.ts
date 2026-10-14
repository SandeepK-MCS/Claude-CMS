/**
 * Leads Management API Service
 * Handles lead retrieval, creation, assignment rules, and counselor reassignment.
 */

import { apiRequest, getAuthHeaders } from './client';
import { LeadRecord, LeadAssignmentConfiguration } from '../types/leadRegistration';

export interface LeadFilterParams {
  status?: string;
  source?: string;
  priority?: string;
  search?: string;
  counselorId?: string;
}

export async function fetchLeads(
  session?: any,
  filters?: LeadFilterParams
): Promise<LeadRecord[]> {
  const query = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') query.append('status', filters.status);
  if (filters?.source && filters.source !== 'all') query.append('source', filters.source);
  if (filters?.priority && filters.priority !== 'all') query.append('priority', filters.priority);
  if (filters?.search) query.append('search', filters.search);
  if (filters?.counselorId) query.append('counselorId', filters.counselorId);

  const qs = query.toString();
  const endpoint = qs ? `/api/leads?${qs}` : '/api/leads';

  const res = await apiRequest<any>(endpoint, {
    headers: getAuthHeaders(session)
  });

  return Array.isArray(res) ? res : res.leads || [];
}

export async function fetchAssignmentRules(
  session?: any
): Promise<LeadAssignmentConfiguration & { permissions?: any }> {
  return apiRequest('/api/leads/assignment-rules', {
    headers: getAuthHeaders(session)
  });
}

export async function updateAssignmentRules(
  ruleType: 'round_robin' | 'capacity_weighted' | 'strict_manual',
  session?: any
): Promise<any> {
  return apiRequest('/api/leads/assignment-rules', {
    method: 'PUT',
    headers: getAuthHeaders(session),
    body: JSON.stringify({ ruleType })
  });
}

export async function reassignLeadCounselor(
  leadId: string,
  newCounselorId: string,
  reason?: string,
  session?: any
): Promise<{
  lead: LeadRecord;
  previousCounselorName: string;
  newCounselor: any;
  assignmentConfig: any;
}> {
  return apiRequest(`/api/leads/${leadId}/reassign-counselor`, {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify({
      newCounselorId,
      reason: reason || 'Reassigned by Authorized Manager'
    })
  });
}

export async function updateLead(
  leadId: string,
  updates: Record<string, any>,
  session?: any
): Promise<LeadRecord> {
  return apiRequest(`/api/leads/${leadId}`, {
    method: 'PUT',
    headers: getAuthHeaders(session),
    body: JSON.stringify(updates)
  });
}

export async function createLead(
  leadData: Record<string, any>,
  session?: any
): Promise<LeadRecord> {
  return apiRequest('/api/leads', {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(leadData)
  });
}
