import { apiRequest } from './api-client';
import type { ApiResponse, HealthData } from '@/types/health';

export function getHealth(): Promise<ApiResponse<HealthData>> {
  return apiRequest<ApiResponse<HealthData>>('/health/ready');
}

