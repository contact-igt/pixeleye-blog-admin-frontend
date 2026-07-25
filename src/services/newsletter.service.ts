import { apiRequest, type ApiRequestOptions } from './api-client';
import type { ApiResponse } from '@/types/auth';

export interface SubscriberListResponse {
  items: Array<{
    id: string;
    email: string;
    status: 'pending' | 'subscribed' | 'unsubscribed';
    source: string;
    consentVersion: string;
    consentAt: string;
    verificationSentAt: string | null;
    verifiedAt: string | null;
    unsubscribedAt: string | null;
    createdAt: string;
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

export const newsletterService = {
  // Subscribers
  async getSubscribers(page = 1, limit = 20, search = '', status = '') {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(status && { status })
    });
    const response = await apiRequest<ApiResponse<SubscriberListResponse>>(
      `/admin/newsletter/subscribers?${params}`,
      { method: 'GET' }
    );
    return response.data;
  },

  async getSubscriber(id: string) {
    const response = await apiRequest<ApiResponse<any>>(`/admin/newsletter/subscribers/${id}`, {
      method: 'GET'
    });
    return response.data;
  },

  async getSubscriberStats() {
    const response = await apiRequest<ApiResponse<SubscriberStatsResponse>>('/admin/newsletter/subscribers/stats', {
      method: 'GET'
    });
    return response.data;
  },

  async exportSubscribers() {
    return apiRequest('/admin/newsletter/subscribers/export', {
      method: 'GET'
    });
  },

  async createSubscriber(payload: { email: string; source?: string; consent_note?: string }) {
    const response = await apiRequest<ApiResponse<any>>('/admin/newsletter/subscribers', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        source: payload.source || 'admin_manual',
        ...(payload.consent_note && { consent_note: payload.consent_note })
      })
    });
    return response.data;
  },

  async resendSubscriberVerification(subscriberId: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/subscribers/${subscriberId}/resend-verification`,
      { method: 'POST', body: JSON.stringify({}) }
    );
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

  // Campaigns
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
      method: 'GET'
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

  async queueCampaign(id: string) {
    const response = await apiRequest<ApiResponse<any>>(
      `/admin/newsletter/campaigns/${id}/queue`,
      { method: 'POST', body: JSON.stringify({}) }
    );
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

  // Feedback
  async getFeedbackSummary(blogId: string, versionId?: string) {
    const params = new URLSearchParams({
      ...(versionId && { version: versionId })
    });
    const response = await apiRequest<ApiResponse<FeedbackSummaryResponse>>(
      `/admin/blogs/${blogId}/feedback-summary?${params}`,
      { method: 'GET' }
    );
    return response.data;
  }
};
