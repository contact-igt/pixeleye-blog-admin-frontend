import { apiRequest, apiRequestFile } from './api-client';
import type { ApiFileResponse } from './api-client';
import type { ApiResponse } from '@/types/auth';
import type { AdminSubscriber, Subscriber as ApiSubscriber, SubscriberExportFilters, SubscriberStatus } from '@/types/newsletter';

interface RawSubscriberListResponse {
  items: ApiSubscriber[];
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

export interface SubscriberListResponse {
  items: AdminSubscriber[];
  pagination: RawSubscriberListResponse['pagination'];
}

export interface SubscriberStatsResponse {
  total_subscribers: number;
  subscribed: number;
  pending: number;
  unsubscribed: number;
}

export interface CampaignStatsResponse {
  total_campaigns: number;
  draft: number;
  active: number;
  completed: number;
  failed: number;
}

export type WorkerHealthStatus = 'starting' | 'active' | 'degraded' | 'stale' | 'offline' | 'stopping' | 'stopped' | 'failed';
export type ClaimHealthStatus = 'healthy' | 'idle' | 'processing' | 'claim_failed' | 'blocked' | 'unknown';
export type SmtpHealthStatus = 'ready' | 'auth_failed' | 'unavailable' | 'not_configured' | 'unknown';

export interface WorkerHealthResponse {
  worker_status: WorkerHealthStatus;
  claim_status: ClaimHealthStatus;
  database_status: 'ready' | 'unavailable' | 'unknown';
  smtp_status: SmtpHealthStatus;
  active_worker_count: number;
  stale_worker_count: number;
  latest_heartbeat_at: string | null;
  heartbeat_age_seconds: number | null;
  latest_worker: {
    worker_instance_id: string;
    process_id: number;
    hostname: string;
    status: Exclude<WorkerHealthStatus, 'stale' | 'offline'>;
    claim_status: ClaimHealthStatus;
    started_at: string | null;
    last_heartbeat_at: string;
    heartbeat_age_seconds: number;
    last_successful_poll_at: string | null;
    last_successful_claim_at: string | null;
    last_successful_send_at: string | null;
    database_ready: boolean;
    smtp_ready: boolean;
    last_error_code: string | null;
    last_error_message: string | null;
    consecutive_poll_failures: number;
    consecutive_claim_failures: number;
    last_claim_error_at: string | null;
    last_heartbeat_error_at: string | null;
    last_recovery_at: string | null;
    stopped_at: string | null;
  } | null;
  thresholds: { heartbeat_interval_seconds: number; stale_after_seconds: number };
}

export interface DeliveryDiagnosticsResponse {
  counts: {
    pending: number;
    processing: number;
    retry_pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    uncertain: number;
  };
  last_worker_heartbeat: string | null;
  last_processing_attempt: string | null;
  next_retry_at: string | null;
  latest_error: { code: string; message: string; at: string } | null;
}

export interface QueuePreviewResponse {
  campaign_id: string;
  campaign_status: string;
  subject: string;
  blog: { id: string; title: string | null; slug: string } | null;
  blog_version: { id: string; version_number: number } | null;
  eligible_recipient_count: number;
  excluded_counts: { pending: number; unsubscribed: number; deleted: number; invalid_email: number };
  can_queue: boolean;
  blocking_reason: string | null;
}

export interface CampaignListResponse {
  items: Array<{
    id: string;
    blog_id: string;
    blog_version_id: string;
    subject: string;
    preview_text: string | null;
    status: string;
    total_recipients: number;
    queued_count: number;
    sent_count: number;
    failed_count: number;
    cancelled_count: number;
    created_by: string | null;
    queued_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total_items: number;
    total_pages: number;
    has_next_page: boolean;
    has_previous_page: boolean;
  };
}

export interface FeedbackSummaryResponse {
  blog_id: string;
  published_version_id: string | null;
  yes_count: number;
  no_count: number;
  total_count: number;
  helpful_percentage: number;
  versions: Array<{
    blog_version_id: string;
    yes_count: number;
    no_count: number;
    total_count: number;
    helpful_percentage: number;
  }>;
}


function normalizeSubscriber(subscriber: ApiSubscriber): AdminSubscriber {
  return {
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    source: subscriber.source ?? '',
    consentVersion: subscriber.consent_version ?? '',
    consentAt: subscriber.consent_at,
    verificationSentAt: subscriber.verification_sent_at,
    verifiedAt: subscriber.verified_at,
    unsubscribedAt: subscriber.unsubscribed_at,
    resubscriptionRequestedAt: subscriber.resubscription_requested_at,
    createdAt: subscriber.created_at,
    updatedAt: subscriber.updated_at,
  };
}

export const newsletterService = {
  async getSubscribers(page = 1, limit = 20, search = '', status: SubscriberStatus | '' = ''): Promise<SubscriberListResponse> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { status }),
    });
    const response = await apiRequest<ApiResponse<RawSubscriberListResponse>>(
      `/admin/newsletter/subscribers?${params}`,
      { method: 'GET' },
    );

    return {
      items: response.data.items.map(normalizeSubscriber),
      pagination: response.data.pagination,
    };
  },

  async getSubscriber(id: string): Promise<AdminSubscriber> {
    const response = await apiRequest<ApiResponse<ApiSubscriber>>(`/admin/newsletter/subscribers/${id}`, {
      method: 'GET',
    });
    return normalizeSubscriber(response.data);
  },

  async getSubscriberStats() {
    const response = await apiRequest<ApiResponse<SubscriberStatsResponse>>('/admin/newsletter/subscribers/stats', {
      method: 'GET',
    });
    return response.data;
  },

  async exportSubscribers(filters: SubscriberExportFilters = {}): Promise<ApiFileResponse> {
    const search = filters.search?.trim();
    const source = filters.source?.trim();
    const params = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(source ? { source } : {}),
    });
    const query = params.toString();
    return apiRequestFile(`/admin/newsletter/subscribers/export${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: { Accept: 'text/csv' },
    });
  },

  async createSubscriber(payload: { email: string; source?: string; consent_note?: string }) {
    const response = await apiRequest<ApiResponse<any>>('/admin/newsletter/subscribers', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        source: payload.source || 'admin_manual',
        ...(payload.consent_note && { consent_note: payload.consent_note }),
      }),
    });
    return response.data;
  },

  async resendSubscriberVerification(subscriberId: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/subscribers/${subscriberId}/resend-verification`,
      { method: 'POST', body: JSON.stringify({}) },
    );
    return response.data;
  },

  async sendSubscriberResubscription(subscriberId: string) {
    const response = await apiRequest<ApiResponse<any>>(`/admin/newsletter/subscribers/${subscriberId}/send-resubscription`, {
      method: 'POST', body: JSON.stringify({})
    });
    return response.data;
  },

  async deleteSubscriber(subscriberId: string, reason?: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/subscribers/${subscriberId}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ ...(reason && { reason }) })
      }
    );
    return response.data;
  },

  async getCampaignStats() {
    const response = await apiRequest<ApiResponse<CampaignStatsResponse>>('/admin/newsletter/campaigns/stats', {
      method: 'GET'
    });
    return response.data;
  },

  async getCampaigns(page = 1, status = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      ...(status && { status })
    });
    const response = await apiRequest<ApiResponse<CampaignListResponse>>(
      `/admin/newsletter/campaigns?${params}`,
      { method: 'GET' }
    );
    return response.data;
  },

  async getCampaign(id: string) {
    const response = await apiRequest<ApiResponse<any>>(`/admin/newsletter/campaigns/${id}`, {
      method: 'GET',
      cache: 'no-store'
    });
    return response.data;
  },

  async createCampaign(blogId: string, subject: string, previewText?: string) {
    const response = await apiRequest<ApiResponse<any>>('/admin/newsletter/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        blog_id: blogId,
        subject,
        preview_text: previewText
      })
    });
    return response.data;
  },

  async updateCampaign(id: string, subject?: string, previewText?: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/campaigns/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          ...(subject && { subject }),
          ...(previewText !== undefined && { preview_text: previewText })
        })
      }
    );
    return response.data;
  },

  async sendTestEmail(campaignId: string, recipientEmail: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/campaigns/${campaignId}/send-test`,
      {
        method: 'POST',
        body: JSON.stringify({ recipient_email: recipientEmail })
      }
    );
    return response.data;
  },

  async getWorkerHealth() {
    const response = await apiRequest<ApiResponse<WorkerHealthResponse>>('/admin/newsletter/worker-health', {
      method: 'GET',
      cache: 'no-store'
    });
    return response.data;
  },

  async getDeliveryDiagnostics(id: string) {
    const response = await apiRequest<ApiResponse<DeliveryDiagnosticsResponse>>(
      `/admin/newsletter/campaigns/${id}/delivery-diagnostics`,
      { method: 'GET', cache: 'no-store' }
    );
    return response.data;
  },

  async getQueuePreview(id: string) {
    const response = await apiRequest<ApiResponse<QueuePreviewResponse>>(`/admin/newsletter/campaigns/${id}/queue-preview`, { method: 'GET' });
    return response.data;
  },

  async queueCampaign(id: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/campaigns/${id}/queue`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return response.data;
  },

  async pauseCampaign(id: string, reasonCode?: string, reasonMessage?: string) {
    const response = await apiRequest<ApiResponse<any>>(`/admin/newsletter/campaigns/${id}/pause`, {
      method: 'POST', body: JSON.stringify({ ...(reasonCode && { reason_code: reasonCode }), ...(reasonMessage && { reason_message: reasonMessage }) })
    });
    return response.data;
  },

  async resumeCampaign(id: string) {
    const response = await apiRequest<ApiResponse<any>>(`/admin/newsletter/campaigns/${id}/resume`, { method: 'POST', body: JSON.stringify({}) });
    return response.data;
  },

  async deleteCampaign(id: string, reason?: string) {
    const response = await apiRequest<ApiResponse<any>>(`/admin/newsletter/campaigns/${id}`, {
      method: 'DELETE', body: JSON.stringify({ ...(reason && { reason }) })
    });
    return response.data;
  },

  async retryFailed(id: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/campaigns/${id}/retry-failed`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return response.data;
  },

  async cancelCampaign(id: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/campaigns/${id}/cancel`,
      { method: 'POST', body: JSON.stringify({}) }
    );
    return response.data;
  },

  async getFeedbackSummary(blogId: string, versionId?: string) {
    const params = new URLSearchParams({
      ...(versionId && { version: versionId })
    });
    const response = await apiRequest<ApiResponse<FeedbackSummaryResponse>>(
      `/blogs/${blogId}/feedback-summary?${params}`,
      { method: 'GET' }
    );
    return response.data;
  }
};

