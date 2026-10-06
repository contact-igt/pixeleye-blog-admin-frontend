import type { MediaAsset } from './media';
import type { AdminRole } from './auth';
import type { BlogBlocksDocument } from './blog-blocks';

export type BlogStatus = 'draft' | 'published' | 'unpublished' | 'trashed';
export type SystemBlogTemplateKey = 'template_1' | 'template_2';
export type BlogTemplateKey = SystemBlogTemplateKey | 'custom_template';
export type BlogTemplateLayout = 'single_column' | 'article_sidebar';

export type BlogTemplateSelection =
  | { kind: 'system'; templateKey: SystemBlogTemplateKey }
  | { kind: 'custom'; customTemplateId: string };

export interface BlogTemplate {
  key: BlogTemplateKey;
  version: number;
  name: string;
  description: string;
  layout: BlogTemplateLayout;
}
export interface BlogTemplateSummary { key: BlogTemplateKey; version: number; name: string; layout: BlogTemplateLayout }
export interface BlogAdminSummary { id: string; name?: string; email?: string; role?: AdminRole }
export interface BlogVersion {
  id: string;
  version_number: number;
  version_type: 'draft' | 'published';
  title: string;
  excerpt: string | null;
  content_json?: unknown;
  content_html?: string | null;
  blocks_json?: BlogBlocksDocument;
  seo_title?: string | null;
  seo_description?: string | null;
  canonical_url?: string | null;
  featured_media_id?: string | null;
  template_key: BlogTemplateKey;
  template_version: number;
  template: BlogTemplateSummary | null;
  custom_template_id?: string | null;
  custom_template_version_id?: string | null;
  template_config_json?: unknown;
  created_at: string;
}
export interface BlogListItem { id: string; title: string; slug: string; excerpt: string | null; status: BlogStatus; previous_status?: BlogStatus | null; featured_media: Partial<MediaAsset> | null; author: BlogAdminSummary | null; published_at: string | null; unpublished_at?: string | null; trashed_at?: string | null; trashed_by?: BlogAdminSummary | null; updated_at: string; created_at: string; has_unpublished_changes: boolean; has_unpublished_template_changes?: boolean }
export interface BlogDetail extends BlogListItem { draft_version: BlogVersion | null; published_version: BlogVersion | null; creator?: BlogAdminSummary | null; updater?: BlogAdminSummary | null }
export interface BlogCategory { name: string; count: number }
export interface BlogPagination { page: number; limit: number; total_items: number; total_pages: number; has_next_page: boolean; has_previous_page: boolean }
export interface BlogListResponse { items: BlogListItem[]; pagination: BlogPagination }
export interface BlogListParams { page?: number; limit?: number; search?: string; status?: BlogStatus | ''; author_id?: string; sort_by?: 'created_at' | 'updated_at' | 'published_at' | 'title' | 'status' | 'trashed_at'; sort_order?: 'asc' | 'desc'; has_featured_image?: 'true' | 'false' | '' }
export interface TipTapNode { type: string; text?: string; attrs?: Record<string, unknown>; content?: TipTapNode[] }
export interface TipTapDocument { type: 'doc'; content?: TipTapNode[] }
export type PublishChecklistStatus = 'complete' | 'incomplete' | 'warning';
export interface PublishChecklistItem { key: string; status: PublishChecklistStatus; message: string }
export interface PublishChecklist { ready: boolean; items: PublishChecklistItem[] }
export interface BlogPayload { blocks_json?: BlogBlocksDocument; title?: string; slug?: string; excerpt?: string | null; content_json?: TipTapDocument; featured_media_id?: string | null; seo_title?: string | null; seo_description?: string | null; canonical_url?: string | null; template_key?: BlogTemplateKey; custom_template_id?: string | null }
