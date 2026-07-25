import { apiRequest, type ApiRequestOptions } from './api-client';
import type { ApiResponse } from '@/types/auth';
import type {
  CreateCustomTemplatePayload,
  CustomTemplateDetail,
  CustomTemplateListParams,
  CustomTemplateListResponse,
  CustomTemplateVersionDetail,
  DuplicateCustomTemplatePayload,
  LifecyclePayload,
  SaveCustomTemplateVersionPayload,
  UpdateCustomTemplateMetadataPayload
} from '@/types/custom-templates';

function query(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const stringified = search.toString();
  return stringified ? `?${stringified}` : '';
}

export async function listCustomTemplates(params: CustomTemplateListParams = {}, options: ApiRequestOptions = {}): Promise<CustomTemplateListResponse> {
  const response = await apiRequest<ApiResponse<CustomTemplateListResponse>>(`/custom-templates${query(params as Record<string, unknown>)}`, { method: 'GET', ...options });
  return response.data;
}

export async function createCustomTemplate(payload: CreateCustomTemplatePayload, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>('/custom-templates', { method: 'POST', body: JSON.stringify(payload), ...options });
  return response.data;
}

export async function getCustomTemplate(id: string, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>(`/custom-templates/${encodeURIComponent(id)}`, { method: 'GET', ...options });
  return response.data;
}

export async function updateCustomTemplate(id: string, payload: UpdateCustomTemplateMetadataPayload, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>(`/custom-templates/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload), ...options });
  return response.data;
}

export async function listCustomTemplateVersions(id: string, options: ApiRequestOptions = {}): Promise<CustomTemplateVersionDetail[]> {
  const response = await apiRequest<ApiResponse<CustomTemplateVersionDetail[]>>(`/custom-templates/${encodeURIComponent(id)}/versions`, { method: 'GET', ...options });
  return response.data;
}

export async function getCustomTemplateVersion(id: string, versionId: string, options: ApiRequestOptions = {}): Promise<CustomTemplateVersionDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateVersionDetail>>(`/custom-templates/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`, { method: 'GET', ...options });
  return response.data;
}

export async function saveCustomTemplateVersion(id: string, payload: SaveCustomTemplateVersionPayload, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>(`/custom-templates/${encodeURIComponent(id)}/versions`, { method: 'POST', body: JSON.stringify(payload), ...options });
  return response.data;
}

export async function duplicateCustomTemplate(id: string, payload: DuplicateCustomTemplatePayload = {}, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>(`/custom-templates/${encodeURIComponent(id)}/duplicate`, { method: 'POST', body: JSON.stringify(payload), ...options });
  return response.data;
}

export async function activateCustomTemplate(id: string, payload: LifecyclePayload, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>(`/custom-templates/${encodeURIComponent(id)}/activate`, { method: 'POST', body: JSON.stringify(payload), ...options });
  return response.data;
}

export async function archiveCustomTemplate(id: string, payload: LifecyclePayload, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>(`/custom-templates/${encodeURIComponent(id)}/archive`, { method: 'POST', body: JSON.stringify(payload), ...options });
  return response.data;
}

export async function restoreCustomTemplate(id: string, payload: LifecyclePayload, options: ApiRequestOptions = {}): Promise<CustomTemplateDetail> {
  const response = await apiRequest<ApiResponse<CustomTemplateDetail>>(`/custom-templates/${encodeURIComponent(id)}/restore`, { method: 'POST', body: JSON.stringify(payload), ...options });
  return response.data;
}

export async function permanentlyDeleteCustomTemplate(id: string, options: ApiRequestOptions = {}): Promise<{ id: string }> {
  const response = await apiRequest<ApiResponse<{ id: string }>>(`/custom-templates/${encodeURIComponent(id)}`, { method: 'DELETE', ...options });
  return response.data;
}
