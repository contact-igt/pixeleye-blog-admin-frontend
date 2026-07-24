import { apiRequest, type ApiRequestOptions } from './api-client';
import type { ApiResponse } from '@/types/auth';
import type { BlogDetail, BlogListParams, BlogListResponse, BlogPayload, BlogTemplate, PublishChecklist } from '@/types/blog';

function query(params: BlogListParams = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') search.set(key, String(value)); });
  const text = search.toString();
  return text ? `?${text}` : '';
}

export async function listBlogTemplates(options: ApiRequestOptions = {}): Promise<BlogTemplate[]> {
  const response = await apiRequest<ApiResponse<BlogTemplate[]>>('/blogs/templates', { method: 'GET', ...options });
  return response.data;
}
export async function createBlog(payload: BlogPayload, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>('/blogs', { method: 'POST', body: JSON.stringify(payload), ...options });
  return response.data;
}
export async function listBlogs(params: BlogListParams = {}, options: ApiRequestOptions = {}): Promise<BlogListResponse> {
  const response = await apiRequest<ApiResponse<BlogListResponse>>(`/blogs${query(params)}`, { method: 'GET', ...options });
  return response.data;
}
export async function listTrashedBlogs(params: BlogListParams = {}, options: ApiRequestOptions = {}): Promise<BlogListResponse> {
  const response = await apiRequest<ApiResponse<BlogListResponse>>(`/blogs/trash${query(params)}`, { method: 'GET', ...options });
  return response.data;
}
export async function getBlog(id: string, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>(`/blogs/${encodeURIComponent(id)}`, { method: 'GET', ...options });
  return response.data;
}
export async function updateBlog(id: string, payload: BlogPayload, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>(`/blogs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload), ...options });
  return response.data;
}
export async function publishBlog(id: string, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>(`/blogs/${encodeURIComponent(id)}/publish`, { method: 'POST', ...options });
  return response.data;
}
export async function unpublishBlog(id: string, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>(`/blogs/${encodeURIComponent(id)}/unpublish`, { method: 'POST', ...options });
  return response.data;
}
export async function moveBlogToTrash(id: string, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>(`/blogs/${encodeURIComponent(id)}`, { method: 'DELETE', ...options });
  return response.data;
}
export async function restoreBlog(id: string, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>(`/blogs/${encodeURIComponent(id)}/restore`, { method: 'POST', ...options });
  return response.data;
}


export async function getPublishChecklist(id: string, options: ApiRequestOptions = {}): Promise<PublishChecklist> {
  const response = await apiRequest<ApiResponse<PublishChecklist>>(`/blogs/${encodeURIComponent(id)}/publish-checklist`, { method: 'GET', ...options });
  return response.data;
}
