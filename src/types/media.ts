import type { AdminRole } from './auth';

export type MediaPurpose = 'avatar' | 'thumbnail' | 'card' | 'content' | 'hero';
export type MediaStatus = 'active' | 'trashed' | 'deleting' | 'delete_failed' | 'deleted';
export type MediaProvider = 'cloudflare_r2' | 'cloudflare_images';

export const mediaPurposes: readonly MediaPurpose[] = ['avatar', 'thumbnail', 'card', 'content', 'hero'];

export interface MediaVariant {
  url: string;
  width: number | null;
  height: number | null;
  size_bytes: number;
  mime_type: string;
}

export interface MediaUploaderSummary {
  id: string;
  name?: string;
  email?: string;
  role?: AdminRole;
}

export interface MediaAsset {
  id: string;
  purpose: MediaPurpose;
  alt_text: string | null;
  original_file_name: string | null;
  storage_provider: MediaProvider;
  original_url: string | null;
  variants: Partial<Record<'thumbnail' | 'card' | 'content' | 'hero' | 'avatar', MediaVariant>>;
  width: number | null;
  height: number | null;
  file_size: number | null;
  size_bytes?: number | null;
  mime_type?: string | null;
  output_mime_type: string | null;
  status: MediaStatus;
  uploaded_by: MediaUploaderSummary | null;
  trashed_by?: MediaUploaderSummary | null;
  trashed_at?: string | null;
  purge_after?: string | null;
  days_remaining?: number | null;
  restored_at?: string | null;
  restored_by?: MediaUploaderSummary | null;
  deleted_at?: string | null;
  deleted_by?: MediaUploaderSummary | null;
  delete_failure?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaPagination {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface MediaListResponse {
  items: MediaAsset[];
  pagination: MediaPagination;
}

export interface MediaListParams {
  page?: number;
  limit?: number;
  search?: string;
  purpose?: MediaPurpose | '';
  status?: MediaStatus | '';
  storage_provider?: MediaProvider | '';
  uploaded_by?: string;
  trashed_by?: string;
  sort_by?: 'created_at' | 'updated_at' | 'original_file_name' | 'purpose' | 'status' | 'file_size' | 'trashed_at' | 'purge_after';
  sort_order?: 'asc' | 'desc';
}

