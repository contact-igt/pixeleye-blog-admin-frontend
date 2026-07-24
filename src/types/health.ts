export interface HealthData {
  service: string;
  database: 'connected';
  environment: string;
  version: string;
  response_time_ms: number;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  request_id?: string;
}

