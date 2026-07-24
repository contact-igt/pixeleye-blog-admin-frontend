import { apiRequest, type ApiRequestOptions } from './api-client';
import type { ApiResponse } from '@/types/auth';
import type { TemplateDetail, TemplateLibraryResponse } from '@/types/template';

export async function listTemplates(options: ApiRequestOptions = {}): Promise<TemplateLibraryResponse> {
  const response = await apiRequest<ApiResponse<TemplateLibraryResponse>>('/templates', { method: 'GET', ...options });
  return response.data;
}

export async function getTemplate(templateKey: string, options: ApiRequestOptions = {}): Promise<TemplateDetail> {
  const response = await apiRequest<ApiResponse<TemplateDetail>>(`/templates/${encodeURIComponent(templateKey)}`, { method: 'GET', ...options });
  return response.data;
}

