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

export interface DashboardInsights {
  editorial: {
    unpublished: number;
    published_last_7_days?: number;
    published_last_30_days: number;
    created_last_7_days: number;
    created_last_30_days?: number;
  };
  media_quality: {
    failed_deletion_count: number;
    uploaded_last_7_days: number;
    missing_alt_assets?: Array<{ id: string; original_file_name: string; purpose: string }>;
  };
  newsletter: {
    subscribers: { total: number; subscribed: number; pending: number; unsubscribed: number };
    campaigns: { total: number; draft: number; active: number; paused: number; completed: number; failed: number };
    deliveries: { pending: number; processing: number; sent?: number; retry_pending: number; failed: number; uncertain: number };
    worker: {
      worker_status: string;
      claim_status: string;
      database_status: string;
      smtp_status: string;
      active_worker_count: number;
      stale_worker_count: number;
      latest_heartbeat_at: string | null;
      heartbeat_age_seconds: number | null;
      latest_worker?: {
        last_error_code: string | null;
        last_error_message: string | null;
        consecutive_poll_failures: number;
        consecutive_claim_failures: number;
      } | null;
    };
  };
  feedback: { yes_count: number; no_count: number; total_count: number; helpful_percentage: number };
  recent_campaigns: Array<{
    id: string;
    subject: string;
    status: string;
    total_recipients: number;
    sent_count: number;
    failed_count: number;
    updated_at: string;
  }>;
  recent_activity: Array<{
    id: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    actor_name: string | null;
    created_at: string;
  }>;
}

export interface DashboardStats {
  insights?: DashboardInsights;
  blogs: BlogAggregates;
  media: MediaAggregates;
  templates: TemplateAggregates;
  recent_blogs: RecentBlogSummary[];
  recent_media: RecentMediaSummary[];
}
