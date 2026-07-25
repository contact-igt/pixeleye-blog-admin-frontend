import { apiRequest, type ApiRequestOptions } from './api-client';
import type { ApiResponse } from '@/types/auth';
import type { MediaAsset, MediaListParams, MediaListResponse } from '@/types/media';

function mediaQuery(params: MediaListParams = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : '';
}

export async function listMediaAssets(params: MediaListParams = {}, options: ApiRequestOptions = {}): Promise<MediaListResponse> {
  const response = await apiRequest<ApiResponse<MediaListResponse>>(`/media/assets${mediaQuery(params)}`, { method: 'GET', ...options });
  return response.data;
}

export async function listTrashedMediaAssets(params: MediaListParams = {}, options: ApiRequestOptions = {}): Promise<MediaListResponse> {
  const response = await apiRequest<ApiResponse<MediaListResponse>>(`/media/assets/trash${mediaQuery(params)}`, { method: 'GET', ...options });
  return response.data;
}

export async function getMediaAsset(id: string, options: ApiRequestOptions = {}): Promise<MediaAsset> {
  const response = await apiRequest<ApiResponse<MediaAsset>>(`/media/assets/${encodeURIComponent(id)}`, { method: 'GET', ...options });
  return response.data;
}

export async function uploadMediaAsset(formData: FormData, options: ApiRequestOptions = {}): Promise<MediaAsset> {
  const response = await apiRequest<ApiResponse<MediaAsset>>('/media/assets', { method: 'POST', body: formData, ...options });
  return response.data;
}

export async function moveMediaAssetToTrash(id: string, options: ApiRequestOptions = {}): Promise<MediaAsset & { already_trashed?: boolean; already_deleted?: boolean }> {
  const response = await apiRequest<ApiResponse<MediaAsset & { already_trashed?: boolean; already_deleted?: boolean }>>(`/media/assets/${encodeURIComponent(id)}`, { method: 'DELETE', ...options });
  return response.data;
}

export const deleteMediaAsset = moveMediaAssetToTrash;

export async function restoreMediaAsset(id: string, options: ApiRequestOptions = {}): Promise<MediaAsset & { already_active?: boolean }> {
  const response = await apiRequest<ApiResponse<MediaAsset & { already_active?: boolean }>>(`/media/assets/${encodeURIComponent(id)}/restore`, { method: 'POST', ...options });
  return response.data;
}

export async function permanentlyDeleteMediaAsset(id: string, options: ApiRequestOptions = {}): Promise<MediaAsset & { deleted_object_count?: number; already_deleted?: boolean; already_deleting?: boolean }> {
  const response = await apiRequest<ApiResponse<MediaAsset & { deleted_object_count?: number; already_deleted?: boolean; already_deleting?: boolean }>>(`/media/assets/${encodeURIComponent(id)}/permanent`, { method: 'DELETE', ...options });
  return response.data;
}

export async function updateMediaAsset(id: string, updates: { purpose?: string; alt_text?: string | null; original_file_name?: string }, options: ApiRequestOptions = {}): Promise<MediaAsset> {
  const response = await apiRequest<ApiResponse<MediaAsset>>(`/media/assets/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(updates), ...options });
  return response.data;
}

