export interface BlogAggregates {
  total: number;
  published: number;
  draft: number;
  trashed: number;
}

export interface MediaAggregates {
  total_active: number;
  tracked_storage_bytes: number;
  tracked_storage_formatted: string;
  missing_alt_text_count: number;
  trashed_count: number;
}

export interface TemplateAggregates {
  system_count: number;
  custom_active: number;
  custom_draft: number;
  custom_archived: number;
}

export interface RecentBlogSummary {
  id: string;
  title: string;
  slug: string;
  status: string;
  created_at: string;
  updated_at: string;
  featured_media?: {
    id: string;
    original_url: string;
  } | null;
  author?: {
    id: string;
    name: string;
  } | null;
}

export interface RecentMediaSummary {
  id: string;
  original_file_name: string;
  purpose: string;
  alt_text: string | null;
  original_url: string | null;
  variants: Record<string, { url: string }>;
  file_size: number | null;
  created_at: string;
}

export interface DashboardStats {
  blogs: BlogAggregates;
  media: MediaAggregates;
  templates: TemplateAggregates;
  recent_blogs: RecentBlogSummary[];
  recent_media: RecentMediaSummary[];
}
