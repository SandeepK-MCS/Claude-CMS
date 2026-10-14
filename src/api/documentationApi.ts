/**
 * Technical Documentation API Service
 * Fetches the offline technical documentation markdown content for developers.
 */

import { apiRequest } from './client';

export async function fetchTechnicalDocumentation(): Promise<{
  success: boolean;
  lastUpdated: string;
  content: string;
}> {
  return apiRequest('/api/documentation/technical');
}
