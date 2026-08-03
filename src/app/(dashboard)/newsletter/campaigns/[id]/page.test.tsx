import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CampaignDetailPage from './page';
import { ToastProvider } from '@/contexts/toast-context';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getCampaign: vi.fn(),
  getWorkerHealth: vi.fn(),
  getDeliveryDiagnostics: vi.fn(),
  queueCampaign: vi.fn(),
  retryFailed: vi.fn(),
  cancelCampaign: vi.fn(),
  sendTestEmail: vi.fn()
  ,pauseCampaign: vi.fn(), resumeCampaign: vi.fn(), deleteCampaign: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '42' }),
  useRouter: () => ({ push: mocks.push })
}));

vi.mock('@/services/newsletter.service', () => ({
  newsletterService: {
    getCampaign: mocks.getCampaign,
    getWorkerHealth: mocks.getWorkerHealth,
    getDeliveryDiagnostics: mocks.getDeliveryDiagnostics,
    queueCampaign: mocks.queueCampaign,
    retryFailed: mocks.retryFailed,
    cancelCampaign: mocks.cancelCampaign,
    sendTestEmail: mocks.sendTestEmail
    ,pauseCampaign: mocks.pauseCampaign, resumeCampaign: mocks.resumeCampaign, deleteCampaign: mocks.deleteCampaign
  }
}));

function renderPage() {
  return render(
    <ToastProvider>
      <CampaignDetailPage />
    </ToastProvider>
  );
}

function campaign(status: string, overrides: Record<string, unknown> = {}) {
  return {
    id: '42',
    blog_id: '7',
    blog_version_id: '9',
    subject: 'Monthly Eye Care',
    preview_text: 'Latest patient guidance',
    status,
    total_recipients: 10,
    queued_count: status === 'queued' ? 10 : 0,
    sent_count: status === 'completed' ? 10 : 0,
    failed_count: 0,
    cancelled_count: 0,
    created_by: '1',
    created_at: '2026-07-29T10:00:00.000Z',
    queued_at: status === 'draft' ? null : '2026-07-29T10:01:00.000Z',
    started_at: status === 'draft' || status === 'queued' ? null : '2026-07-29T10:02:00.000Z',
    completed_at: status === 'completed' ? '2026-07-29T10:03:00.000Z' : null,
    paused_at: status === 'paused' ? '2026-07-29T10:02:30.000Z' : null,
    paused_by: status === 'paused' ? '1' : null,
    pause_reason_code: status === 'paused' ? 'manual_review' : null,
    pause_reason_message: null,
    auto_paused: false,
    resume_at: null,
    blog: { title: 'Eye care', slug: 'eye-care' },
    blogVersion: { title: 'Eye care', versionNumber: 3, excerpt: 'Excerpt' },
    ...overrides
  };
}

function workerHealth(
  status: 'starting' | 'active' | 'degraded' | 'offline' | 'stale' | 'failed' = 'active',
  smtpStatus: 'ready' | 'auth_failed' | 'unavailable' | 'not_configured' | 'unknown' = 'ready',
  claimStatus: 'healthy' | 'idle' | 'processing' | 'claim_failed' | 'blocked' | 'unknown' = 'idle'
) {
  return {
    worker_status: status,
    claim_status: claimStatus,
    database_status: 'ready',
    smtp_status: smtpStatus,
    active_worker_count: status === 'active' ? 1 : 0,
    stale_worker_count: status === 'stale' ? 1 : 0,
    latest_heartbeat_at: '2026-07-29T10:02:00.000Z',
    heartbeat_age_seconds: 5,
    latest_worker: {
      worker_instance_id: 'worker-1',
      process_id: 123,
      hostname: 'worker-host',
      status: status === 'offline' || status === 'stale' ? 'stopped' : status,
      claim_status: claimStatus,
      started_at: '2026-07-29T10:00:00.000Z',
      last_heartbeat_at: '2026-07-29T10:02:00.000Z',
      heartbeat_age_seconds: 5,
      last_successful_poll_at: null,
      last_successful_claim_at: null,
      last_successful_send_at: null,
      database_ready: true,
      smtp_ready: smtpStatus === 'ready',
      last_error_code: null,
      last_error_message: null,
      consecutive_poll_failures: 0,
      consecutive_claim_failures: claimStatus === 'claim_failed' ? 1 : 0,
      last_claim_error_at: null,
      last_heartbeat_error_at: null,
      last_recovery_at: null,
      stopped_at: null
    },
    thresholds: { heartbeat_interval_seconds: 10, stale_after_seconds: 45 }
  };
}

function diagnostics(overrides: Record<string, number> = {}) {
  return {
    counts: {
      pending: 0,
      processing: 0,
      retry_pending: 0,
      sent: 10,
      failed: 0,
      cancelled: 0,
      uncertain: 0,
      ...overrides
    },
    last_worker_heartbeat: '2026-07-29T10:02:00.000Z',
    last_processing_attempt: null,
    next_retry_at: null,
    latest_error: null
  };
}

describe('CampaignDetailPage delivery polling and health', () => {
  let intervalCallback: (() => Promise<void>) | undefined;
  const nativeSetInterval = globalThis.setInterval;
  const nativeClearInterval = globalThis.clearInterval;

  beforeEach(() => {
    vi.clearAllMocks();
    intervalCallback = undefined;
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
      if (delay === 3000) {
        intervalCallback = callback as () => Promise<void>;
        return 123 as unknown as NodeJS.Timeout;
      }
      return nativeSetInterval(callback, delay, ...args);
    }) as typeof setInterval);
    vi.spyOn(globalThis, 'clearInterval').mockImplementation(((intervalId?: NodeJS.Timeout | number) => {
      if (intervalId !== 123) nativeClearInterval(intervalId);
    }) as typeof clearInterval);
    mocks.getWorkerHealth.mockResolvedValue(workerHealth());
    mocks.getDeliveryDiagnostics.mockResolvedValue(diagnostics());
    mocks.queueCampaign.mockResolvedValue(campaign('queued'));
    mocks.pauseCampaign.mockResolvedValue(campaign('paused'));
    mocks.resumeCampaign.mockResolvedValue(campaign('sending'));
    mocks.deleteCampaign.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('polls queued campaigns, refreshes diagnostics, and stops after a terminal response', async () => {
    mocks.getCampaign
      .mockResolvedValueOnce(campaign('queued'))
      .mockResolvedValueOnce(campaign('completed'));

    renderPage();

    expect(await screen.findByText(/Worker is active and waiting/)).toBeInTheDocument();
    await waitFor(() => expect(intervalCallback).toBeTypeOf('function'));

    await act(async () => {
      await intervalCallback?.();
    });

    expect(await screen.findByText('All campaign emails were processed successfully.')).toBeInTheDocument();
    expect(mocks.getCampaign).toHaveBeenCalledTimes(2);
    expect(mocks.getDeliveryDiagnostics).toHaveBeenCalledWith('42');
    expect(clearInterval).toHaveBeenCalled();
  });

  it('shows Worker Offline independently from SMTP Ready', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    mocks.getWorkerHealth.mockResolvedValue(workerHealth('offline', 'ready'));

    renderPage();

    expect(await screen.findByText(/No Newsletter Worker heartbeat/)).toBeInTheDocument();
    expect(await screen.findByText('Offline')).toBeInTheDocument();
    expect(await screen.findByText('Ready')).toBeInTheDocument();
  });

  it('displays Worker Active when the fresh health API response is active', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    mocks.getWorkerHealth.mockResolvedValue(workerHealth('active', 'ready'));

    renderPage();

    expect(await screen.findByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('displays a stale heartbeat without conflating it with claim failure', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    mocks.getWorkerHealth.mockResolvedValue(workerHealth('stale', 'ready', 'idle'));
    renderPage();
    expect(await screen.findByText('Stale')).toBeInTheDocument();
    expect(screen.getByText(/has stopped reporting/)).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('does not display Offline after one temporary health request failure', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    mocks.getWorkerHealth.mockRejectedValueOnce(new Error('temporary health failure'));
    renderPage();
    expect(await screen.findByText('Health check failed')).toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  it('shows claim failure separately from a degraded Worker', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    mocks.getWorkerHealth.mockResolvedValue(workerHealth('degraded', 'ready', 'claim_failed'));
    renderPage();
    expect(await screen.findByText('Degraded')).toBeInTheDocument();
    expect(screen.getByText('Claim Failed')).toBeInTheDocument();
    expect(screen.getByText(/latest delivery claim failed/)).toBeInTheDocument();
  });

  it('displays SMTP authentication failure independently', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    mocks.getWorkerHealth.mockResolvedValue(workerHealth('offline', 'auth_failed'));

    renderPage();

    expect(await screen.findByText('Authentication Failed')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('does not re-queue during polling after the explicit queue action', async () => {
    const user = userEvent.setup();
    mocks.getCampaign
      .mockResolvedValueOnce(campaign('draft'))
      .mockResolvedValueOnce(campaign('queued'))
      .mockResolvedValueOnce(campaign('queued'));

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Queue Campaign' }));
    await user.click(screen.getAllByRole('button', { name: 'Queue Campaign' }).at(-1)!);

    await waitFor(() => expect(mocks.queueCampaign).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(intervalCallback).toBeTypeOf('function'));
    await act(async () => {
      await intervalCallback?.();
    });

    expect(mocks.queueCampaign).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Queue Campaign' })).not.toBeInTheDocument();
  });

  it('continues health polling while a campaign is sending', async () => {
    mocks.getCampaign
      .mockResolvedValueOnce(campaign('sending'))
      .mockResolvedValueOnce(campaign('sending'));
    renderPage();
    await waitFor(() => expect(intervalCallback).toBeTypeOf('function'));
    await act(async () => { await intervalCallback?.(); });
    expect(mocks.getWorkerHealth).toHaveBeenCalledTimes(2);
    expect(mocks.getDeliveryDiagnostics).toHaveBeenCalledTimes(2);
  });

  it('does not start polling for a terminal campaign', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('completed'));
    renderPage();
    expect(await screen.findByText(/processed successfully/)).toBeInTheDocument();
    expect(intervalCallback).toBeUndefined();
  });

  it('shows Pause for queued and sending Campaigns, and Resume for paused Campaigns', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    const view = renderPage();
    expect(await screen.findByRole('button', { name: 'Pause Campaign' })).toBeInTheDocument();
    view.unmount();
    mocks.getCampaign.mockResolvedValue(campaign('paused'));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Resume Campaign' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause Campaign' })).not.toBeInTheDocument();
  });

  it('shows Delete but no Pause or Resume for completed Campaigns', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('completed'));
    renderPage();
    expect(await screen.findByRole('button', { name: 'Delete Campaign' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause Campaign' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume Campaign' })).not.toBeInTheDocument();
  });

  it('blocks duplicate Pause submissions while the action is active', async () => {
    const user = userEvent.setup();
    mocks.getCampaign.mockResolvedValue(campaign('queued'));
    let finish!: (value: unknown) => void;
    mocks.pauseCampaign.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Pause Campaign' }));
    const confirmButton = screen.getAllByRole('button', { name: 'Pause Campaign' }).at(-1)!;
    await user.click(confirmButton);
    await user.click(confirmButton);
    expect(mocks.pauseCampaign).toHaveBeenCalledTimes(1);
    finish(campaign('paused'));
  });

  it('refreshes stale campaign state after a resume conflict', async () => {
    const user = userEvent.setup();
    mocks.getCampaign
      .mockResolvedValueOnce(campaign('paused'))
      .mockResolvedValueOnce(campaign('completed'));
    mocks.resumeCampaign.mockRejectedValue({
      name: 'ApiClientError',
      status: 409,
      message: 'Only paused Campaigns can be resumed.',
      data: { code: 'CAMPAIGN_INVALID_RESUME_STATUS' }
    });

    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Resume Campaign' }));
    await user.click(screen.getAllByRole('button', { name: 'Resume Campaign' }).at(-1)!);

    expect(await screen.findByText('Only paused Campaigns can be resumed.')).toBeInTheDocument();
    await waitFor(() => expect(mocks.getCampaign).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('button', { name: 'Delete Campaign' })).toBeInTheDocument();
  });

  it('includes uncertain deliveries in completion while excluding them from success', async () => {
    mocks.getCampaign.mockResolvedValue(campaign('partially_failed', {
      sent_count: 6,
      failed_count: 2,
      cancelled_count: 1
    }));
    mocks.getDeliveryDiagnostics.mockResolvedValue(diagnostics({
      sent: 6,
      failed: 1,
      cancelled: 1,
      uncertain: 2
    }));

    renderPage();

    expect(await screen.findByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/10 completed out of 10 total recipients; 6 sent successfully \(60% success rate\)/)).toBeInTheDocument();
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });
});
