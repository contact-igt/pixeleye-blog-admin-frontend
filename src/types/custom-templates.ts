import type { CustomTemplateLayoutConfigV1 } from '@/components/blogs/custom-template/custom-template.types';
import type { AdminRole } from './auth';

export type CustomTemplateStatus = 'draft' | 'active' | 'archived';

export interface CustomTemplateAdminSummary {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

export interface CustomTemplateUsage {
  total_blog_versions: number;
  distinct_blogs: number;
  published_blog_versions: number;
}

export interface CustomTemplateVersionRef {
  id: string;
  version_number: number;
}

export interface CustomTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  status: CustomTemplateStatus;
  status_before_archive: CustomTemplateStatus | null;
  owner: CustomTemplateAdminSummary | null;
  current_version: CustomTemplateVersionRef | null;
  schema_version: number | null;
  lock_version: number;
  activated_at: string | null;
  archived_at: string | null;
  restored_at: string | null;
  created_at: string;
  updated_at: string;
  usage: CustomTemplateUsage | null;
}

export interface CustomTemplatePermissions {
  can_edit: boolean;
  can_activate: boolean;
  can_archive: boolean;
  can_restore: boolean;
  can_duplicate: boolean;
  can_permanently_delete: boolean;
}

export interface CustomTemplateVersionDetail extends CustomTemplateVersionRef {
  schema_version: number;
  change_summary: string | null;
  created_by: CustomTemplateAdminSummary | null;
  created_at: string;
  layout_config_json?: CustomTemplateLayoutConfigV1;
  is_current?: boolean;
}

export interface CustomTemplateDetail extends CustomTemplateSummary {
  creator: CustomTemplateAdminSummary | null;
  updater: CustomTemplateAdminSummary | null;
  activated_by: CustomTemplateAdminSummary | null;
  archived_by: CustomTemplateAdminSummary | null;
  restored_by: CustomTemplateAdminSummary | null;
  current_version_detail: CustomTemplateVersionDetail | null;
  permissions: CustomTemplatePermissions;
}

export interface CustomTemplatePagination {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface CustomTemplateListResponse {
  items: CustomTemplateSummary[];
  pagination: CustomTemplatePagination;
}

export interface CustomTemplateListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomTemplateStatus;
  owner_id?: string;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface CreateCustomTemplatePayload {
  name: string;
  description?: string | null;
  layout_config_json: CustomTemplateLayoutConfigV1;
}

export interface UpdateCustomTemplateMetadataPayload {
  name?: string;
  description?: string | null;
  expected_lock_version: number;
}

export interface SaveCustomTemplateVersionPayload {
  layout_config_json: CustomTemplateLayoutConfigV1;
  change_summary?: string | null;
  expected_lock_version: number;
}

export interface LifecyclePayload {
  expected_lock_version: number;
}

export interface DuplicateCustomTemplatePayload {
  name?: string;
  source_version_id?: string;
}

export const CUSTOM_TEMPLATE_VERSION_CONFLICT = 'CUSTOM_TEMPLATE_VERSION_CONFLICT';
export const CUSTOM_TEMPLATE_IN_USE = 'CUSTOM_TEMPLATE_IN_USE';

export interface CustomTemplateConflictData {
  code: typeof CUSTOM_TEMPLATE_VERSION_CONFLICT;
  lock_version: number;
  current_version_id: string | null;
  updated_at: string;
}
