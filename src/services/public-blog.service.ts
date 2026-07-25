import { apiRequest, type ApiRequestOptions } from './api-client';
import type { ApiResponse } from '@/types/auth';
import type { BlogDetail } from '@/types/blog';

export async function getPublicBlogBySlug(slug: string, options: ApiRequestOptions = {}): Promise<BlogDetail> {
  const response = await apiRequest<ApiResponse<BlogDetail>>(
    `/public/blogs/${encodeURIComponent(slug)}`,
    { method: 'GET', auth: false, ...options }
  );
  return response.data;
}

export async function listPublicBlogs(params: Record<string, unknown> = {}, options: ApiRequestOptions = {}): Promise<any> {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const queryString = search.toString();
  const path = `/public/blogs${queryString ? `?${queryString}` : ''}`;

  const response = await apiRequest<ApiResponse<any>>(
    path,
    { method: 'GET', auth: false, ...options }
  );
  return response.data;
}
