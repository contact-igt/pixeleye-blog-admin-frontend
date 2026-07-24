import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthDashboard } from './health-dashboard';

describe('HealthDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders backend health data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, message: 'ready', data: { service: 'pixel-eye-blog-backend', database: 'connected', environment: 'test', version: '0.1.0', response_time_ms: 4.2, timestamp: new Date().toISOString() } })
    }));
    render(<HealthDashboard />);
    expect(screen.getByText('System dashboard')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Online')).toBeInTheDocument());
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('renders a controlled backend error state', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<HealthDashboard />);
    await waitFor(() => expect(screen.getByTestId('error-state')).toBeInTheDocument());
    expect(screen.getByText('Backend unavailable')).toBeInTheDocument();
  });

  it('retries successfully after the backend becomes available', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'ready', data: { service: 'pixel-eye-blog-backend', database: 'connected', environment: 'test', version: '0.1.0', response_time_ms: 3.1, timestamp: new Date().toISOString() } })
      });
    vi.stubGlobal('fetch', fetchMock);
    render(<HealthDashboard />);
    await screen.findByText('Backend unavailable');
    await user.click(screen.getByRole('button', { name: 'Retry connection' }));
    await screen.findByText('Online');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
