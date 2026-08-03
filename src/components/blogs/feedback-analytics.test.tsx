import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedbackAnalytics } from './feedback-analytics';

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? 200, headers: { 'Content-Type': 'application/json' } });
}

const summary = {
  yes_count: 8,
  no_count: 2,
  total_count: 10,
  helpful_percentage: 80,
  versions: [
    { blog_version_id: '100', version_number: 1, yes_count: 8, no_count: 2, total_count: 10, helpful_percentage: 80 },
    { blog_version_id: '99', version_number: 2, yes_count: 1, no_count: 0, total_count: 1, helpful_percentage: 100 }
  ]
};

describe('FeedbackAnalytics', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('calls the canonical /blogs/:blogId/feedback-summary path, not /admin/blogs/...', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: summary }));
    vi.stubGlobal('fetch', fetchMock);

    render(<FeedbackAnalytics blogId="7" />);

    await waitFor(() => expect(screen.getByText('Feedback Insights')).toBeInTheDocument());

    const calledUrl = String(fetchMock.mock.calls[0]![0]);
    expect(calledUrl).toContain('/blogs/7/feedback-summary');
    expect(calledUrl).not.toContain('/admin/blogs/');
  });

  it('renders Yes/No/Total/Percentage and the version breakdown', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: summary })));

    render(<FeedbackAnalytics blogId="7" />);

    await waitFor(() => expect(screen.getByText('Feedback Insights')).toBeInTheDocument());
    expect(screen.getAllByText('Helpful').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Not Helpful').length).toBeGreaterThan(0);
    expect(screen.getByText('Total Votes')).toBeInTheDocument();
    expect(screen.getAllByText('80%').length).toBeGreaterThan(0);
    expect(screen.getByText('Version Breakdown')).toBeInTheDocument();
  });

  it('shows a controlled error state with Retry when the request fails', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'Insufficient permissions' }, { status: 403 }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: summary }));
    vi.stubGlobal('fetch', fetchMock);

    render(<FeedbackAnalytics blogId="7" />);

    await screen.findByText('Could not load feedback analytics');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Feedback Insights');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
