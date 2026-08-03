import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardOverview } from './dashboard-overview';

const mockStats = {
  blogs: { total: 10, published: 7, draft: 2, trashed: 1 },
  media: { total_active: 25, tracked_storage_bytes: 5242880, tracked_storage_formatted: '5.0 MB', missing_alt_text_count: 3, trashed_count: 2 },
  templates: { system_count: 2, custom_active: 4, custom_draft: 1, custom_archived: 0 },
  insights: {
    editorial: { unpublished: 1, published_last_30_days: 4, created_last_7_days: 2 },
    media_quality: { failed_deletion_count: 0, uploaded_last_7_days: 3 },
    newsletter: {
      subscribers: { total: 40, subscribed: 32, pending: 4, unsubscribed: 4 },
      campaigns: { total: 6, draft: 1, active: 1, paused: 0, completed: 3, failed: 1 },
      deliveries: { pending: 0, processing: 0, retry_pending: 1, failed: 2, uncertain: 0 },
      worker: { worker_status: 'active', claim_status: 'idle', database_status: 'ready', smtp_status: 'ready', active_worker_count: 1, stale_worker_count: 0, latest_heartbeat_at: '2026-07-25T10:00:00Z', heartbeat_age_seconds: 5 }
    },
    feedback: { yes_count: 12, no_count: 3, total_count: 15, helpful_percentage: 80 },
    recent_campaigns: [{ id: '1', subject: 'Eye health update', status: 'completed', total_recipients: 32, sent_count: 32, failed_count: 0, updated_at: '2026-07-25T10:00:00Z' }],
    recent_activity: [{ id: '1', action: 'BLOG_PUBLISHED', entity_type: 'blog', entity_id: '1', created_at: '2026-07-25T10:00:00Z' }]
  },
  recent_blogs: [
    { id: '1', title: 'Eye Care Essentials', slug: 'eye-care-essentials', status: 'published', created_at: '2026-07-25T10:00:00Z', updated_at: '2026-07-25T10:00:00Z', author: { id: '1', name: 'Dr Smith' } }
  ],
  recent_media: [
    { id: '1', original_file_name: 'hero.jpg', purpose: 'hero', alt_text: 'Eye image', original_url: 'https://example.com/hero.jpg', variants: {}, file_size: 1024, created_at: '2026-07-25T10:00:00Z' }
  ]
};

const mockHealth = {
  status: 'ok',
  timestamp: '2026-07-25T10:00:00Z',
  environment: 'test',
  uptime_seconds: 3600,
  database: 'connected',
  response_time_ms: 12
};

describe('DashboardOverview Component', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders stats metrics, recent articles, recent media, and health status after fetching', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/dashboard/stats')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: 'Stats', data: mockStats })
        });
      }
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: 'Health', data: mockHealth })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }));

    render(<DashboardOverview />);

    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('7 Published')).toBeInTheDocument();
      expect(screen.getByText('5.0 MB')).toBeInTheDocument();
      expect(screen.getByText('3 Alt Text Needed')).toBeInTheDocument();
      expect(screen.getByText('Eye Care Essentials')).toBeInTheDocument();
      expect(screen.getByText('hero.jpg')).toBeInTheDocument();
      expect(screen.getByText('Newsletter Audience')).toBeInTheDocument();
      expect(screen.getByText('Campaign Delivery')).toBeInTheDocument();
      expect(screen.getByText('Needs attention')).toBeInTheDocument();
      expect(screen.getByText('Recent Campaigns')).toBeInTheDocument();
    });
  });

  it('handles stats error and health error independently using Promise.allSettled', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if (url.includes('/dashboard/stats')) {
        return Promise.reject(new Error('Failed to load stats'));
      }
      if (url.includes('/health')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, message: 'Health', data: mockHealth })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    }));

    render(<DashboardOverview />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load dashboard metrics/i)).toBeInTheDocument();
      expect(screen.getByText('API Service')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });
});
