import { apiRequest, type ApiRequestOptions } from './api-client';
import type { ApiResponse } from '@/types/auth';
import type { DashboardStats } from '@/types/dashboard';

export async function getDashboardStats(options: ApiRequestOptions = {}): Promise<DashboardStats> {
  const response = await apiRequest<ApiResponse<DashboardStats>>('/dashboard/stats', {
    method: 'GET',
    ...options
  });
  return response.data;
}
