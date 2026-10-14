/**
 * Master Updates & Governance API Service
 * Handles Roles, 42-Item Permissions Catalog, System Users, and Reporting Hierarchies.
 */

import { apiRequest, getAuthHeaders } from './client';

export async function fetchRoles(session?: any): Promise<any[]> {
  const res = await apiRequest<any>('/api/roles?includeInactive=true', {
    headers: getAuthHeaders(session)
  });
  return res.roles || [];
}

export async function fetchPermissions(session?: any): Promise<any[]> {
  const res = await apiRequest<any>('/api/permissions', {
    headers: getAuthHeaders(session)
  });
  return res.permissions || [];
}

export async function fetchUsers(session?: any): Promise<any[]> {
  const res = await apiRequest<any>('/api/users', {
    headers: getAuthHeaders(session)
  });
  return res.users || [];
}

export async function updateUser(
  userId: string,
  updates: Record<string, any>,
  session?: any
): Promise<any> {
  return apiRequest(`/api/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeaders(session),
    body: JSON.stringify(updates)
  });
}

export async function createUser(
  userData: Record<string, any>,
  session?: any
): Promise<any> {
  return apiRequest('/api/users', {
    method: 'POST',
    headers: getAuthHeaders(session),
    body: JSON.stringify(userData)
  });
}

export async function fetchReportingTree(session?: any): Promise<any> {
  const res = await apiRequest<any>('/api/roles', {
    headers: getAuthHeaders(session)
  });
  return res.reportingTree || null;
}
