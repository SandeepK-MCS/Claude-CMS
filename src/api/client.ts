/**
 * Shared API HTTP Client
 * Manages request headers, authentication tokens, and standardized JSON error handling.
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}

/**
 * Returns default authentication headers based on stored session or role context.
 */
export function getAuthHeaders(session?: {
  token?: string;
  userId?: string;
  email?: string;
  role?: string;
  name?: string;
}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  if (session?.userId) {
    headers['x-authenticated-user-id'] = session.userId;
  }
  if (session?.email) {
    headers['x-authenticated-user-email'] = session.email;
  }
  if (session?.role) {
    headers['x-authenticated-user-role'] = session.role;
  }
  if (session?.name) {
    headers['x-authenticated-user-name'] = session.name;
  }

  // Fallback for demo administrative access if no session is explicitly passed
  if (!session?.userId && !headers['x-authenticated-user-role']) {
    headers['x-authenticated-user-role'] = 'super_admin';
    headers['x-authenticated-user-id'] = 'usr_sa1';
    headers['x-authenticated-user-email'] = 'sandeepkoteshwar@gmail.com';
    headers['x-authenticated-user-name'] = 'Sandeep Koteshwar (Super Admin)';
  }

  return headers;
}

/**
 * Core API request wrapper with automated JSON parsing and error wrapping.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(url, options);

  let data: any;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    return {} as T;
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}
