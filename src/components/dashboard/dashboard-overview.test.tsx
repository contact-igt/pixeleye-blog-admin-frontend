import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DashboardOverview } from './dashboard-overview';

const mockStats = {
  blogs: { total: 10, published: 7, draft: 2, trashed: 1 },
  media: { total_active: 25, tracked_storage_bytes: 5242880, tracked_storage_formatted: '5.0 MB', missing_alt_text_count: 3, trashed_count: 2 },
  templates: { system_count: 2, custom_active: 4, custom_draft: 1, custom_archived: 0 },
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
