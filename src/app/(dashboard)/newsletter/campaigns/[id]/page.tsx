'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { newsletterService, type WorkerHealthResponse, type DeliveryDiagnosticsResponse } from '@/services/newsletter.service';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { getSafeApiErrorMessage } from '@/utils/api-error';

interface Campaign {
  id: string;
  blog_id: string;
  blog_version_id: string;
  subject: string;
  preview_text: string | null;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  cancelled_count: number;
  queued_count: number;
  created_by: string | null;
  created_at: string;
  queued_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  paused_at: string | null;
  paused_by: string | null;
  pause_reason_code: string | null;
  pause_reason_message: string | null;
  auto_paused: boolean;
  resume_at: string | null;
  blog?: { title: string; slug: string };
  blogVersion?: { title: string; versionNumber: number; excerpt: string };
}

const TERMINAL_STATUSES = ['completed', 'partially_failed', 'failed', 'cancelled'];
// Polling must run for both 'queued' (nothing claimed yet) and 'sending'
// (a batch is actively being processed) — a campaign only stops needing
// fresh data once it reaches a terminal status above.
const POLLING_STATUSES = ['queued', 'sending', 'paused'];

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';
interface StatusNotice {
  tone: NoticeTone;
  message: string;
}

function buildStatusNotice(campaign: Campaign, workerHealth: WorkerHealthResponse | null, healthRequestFailed: boolean): StatusNotice | null {
  const smtpStatus = workerHealth?.smtp_status ?? 'unknown';
  const smtpBlocked = smtpStatus === 'auth_failed' || smtpStatus === 'unavailable' || smtpStatus === 'not_configured';

  if (campaign.status === 'queued') {
    if (healthRequestFailed) {
      return { tone: 'info', message: 'Worker health check failed temporarily. Campaign delivery status will be retried automatically.' };
    }
    if (!workerHealth) {
      return { tone: 'info', message: 'Campaign is queued. Checking Newsletter Worker and SMTP readiness.' };
    }
    if (workerHealth.worker_status === 'stale') {
      return { tone: 'warning', message: 'Newsletter Worker has stopped reporting. Pending emails will remain queued until the Worker recovers.' };
    }
    if (workerHealth.worker_status === 'offline') {
      return { tone: 'warning', message: 'No Newsletter Worker heartbeat is available. Pending emails will remain queued until a Worker starts.' };
    }
    if (workerHealth.worker_status === 'failed') {
      return { tone: 'danger', message: 'Newsletter Worker startup failed. Pending emails will remain queued until the configuration is corrected.' };
    }
    // SMTP is checked first: when SMTP verification fails at Worker startup
    // the Worker process exits (see backend index-newsletter-worker.ts), so
    // it will *also* read as offline below — but "SMTP verification failed"
    // is the more specific, more actionable diagnosis of the two.
    if (smtpBlocked) {
      return { tone: smtpStatus === 'unavailable' ? 'warning' : 'danger', message: 'Email delivery is blocked until SMTP becomes ready. The Worker will keep checking automatically.' };
    }
    if (workerHealth.claim_status === 'claim_failed') {
      return { tone: 'warning', message: 'Newsletter Worker is running, but its latest delivery claim failed. The next poll will retry automatically.' };
    }
    if (workerHealth.worker_status === 'starting') {
      return { tone: 'info', message: 'Newsletter Worker is starting and verifying its dependencies.' };
    }
    return { tone: 'info', message: 'Newsletter Worker is active and waiting to process eligible deliveries.' };
  }

  if (campaign.status === 'sending') {
    return { tone: 'info', message: 'Newsletter delivery is in progress.' };
  }

  if (campaign.status === 'completed') {
    return { tone: 'success', message: 'All campaign emails were processed successfully.' };
  }

  if (campaign.status === 'failed') {
    return { tone: 'danger', message: 'Email delivery failed. Review the delivery errors.' };
  }

  if (campaign.status === 'partially_failed') {
    return { tone: 'warning', message: 'Some campaign emails failed to send. Review the delivery errors.' };
  }

  if (campaign.status === 'cancelled') {
    return { tone: 'warning', message: 'Campaign was cancelled before all emails were sent.' };
  }

  return null;
}

const NOTICE_STYLES: Record<NoticeTone, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  danger: 'bg-red-50 border-red-200 text-red-800'
};

function HealthBadge({ label, tone }: { label: string; tone: NoticeTone | 'neutral' }) {
  const styles: Record<string, string> = {
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${styles[tone]}`}>
      {label}
    </span>
  );
}

function workerBadge(workerHealth: WorkerHealthResponse | null, healthRequestFailed: boolean): { label: string; tone: NoticeTone | 'neutral' } {
  if (healthRequestFailed) return { label: 'Health check failed', tone: 'neutral' };
  if (!workerHealth) return { label: 'Unknown', tone: 'neutral' };
  if (workerHealth.worker_status === 'active') return { label: 'Active', tone: 'success' };
  if (workerHealth.worker_status === 'degraded') return { label: 'Degraded', tone: 'warning' };
  if (workerHealth.worker_status === 'starting') return { label: 'Starting', tone: 'info' };
  if (workerHealth.worker_status === 'stale') return { label: 'Stale', tone: 'warning' };
  if (workerHealth.worker_status === 'failed') return { label: 'Failed', tone: 'danger' };
  if (workerHealth.worker_status === 'stopping' || workerHealth.worker_status === 'stopped') return { label: 'Stopped', tone: 'warning' };
  return { label: 'Offline', tone: 'danger' };
}

function smtpBadge(workerHealth: WorkerHealthResponse | null): { label: string; tone: NoticeTone | 'neutral' } {
  const status = workerHealth?.smtp_status ?? 'unknown';
  if (status === 'ready') return { label: 'Ready', tone: 'success' };
  if (status === 'auth_failed') return { label: 'Authentication Failed', tone: 'danger' };
  if (status === 'unavailable') return { label: 'Temporarily Unavailable', tone: 'warning' };
  if (status === 'not_configured') return { label: 'Not Configured', tone: 'warning' };
  return { label: 'Unknown', tone: 'neutral' };
}

function claimBadge(workerHealth: WorkerHealthResponse | null): { label: string; tone: NoticeTone | 'neutral' } {
  const status = workerHealth?.claim_status ?? 'unknown';
  if (status === 'healthy') return { label: 'Healthy', tone: 'success' };
  if (status === 'idle') return { label: 'Idle', tone: 'info' };
  if (status === 'processing') return { label: 'Processing', tone: 'info' };
  if (status === 'claim_failed') return { label: 'Claim Failed', tone: 'danger' };
  if (status === 'blocked') return { label: 'Blocked', tone: 'warning' };
  return { label: 'Unknown', tone: 'neutral' };
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workerHealth, setWorkerHealth] = useState<WorkerHealthResponse | null>(null);
  const [healthRequestFailures, setHealthRequestFailures] = useState(0);
  const [diagnostics, setDiagnostics] = useState<DeliveryDiagnosticsResponse | null>(null);

  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pauseReasonCode, setPauseReasonCode] = useState('manual_review');
  const [pauseReasonMessage, setPauseReasonMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState<string | undefined>();
  const [testError, setTestError] = useState<string | undefined>();

  const { showToast } = useToast();

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const campaignId = campaign?.id;
  const campaignStatus = campaign?.status;

  const loadCampaign = useCallback(async (silent = false) => {
    try {
      const data = await newsletterService.getCampaign(String(params.id));
      setCampaign(data);
      return data;
    } catch (err) {
      // Keep the last successful response on screen for a silent (polling)
      // failure — only a foreground load surfaces the error banner.
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load campaign');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [params.id]);

  const loadSupplementaryData = useCallback(async (campaignId: string) => {
    // Best-effort: worker health and delivery diagnostics are informational
    // (status notices/badges), so a failure here must never blank out the
    // campaign data that already loaded successfully.
    const [health, diag] = await Promise.allSettled([
      newsletterService.getWorkerHealth(),
      newsletterService.getDeliveryDiagnostics(campaignId)
    ]);
    if (health.status === 'fulfilled') {
      setWorkerHealth(health.value);
      setHealthRequestFailures(0);
    } else {
      setHealthRequestFailures((count) => count + 1);
    }
    if (diag.status === 'fulfilled') setDiagnostics(diag.value);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadCampaign());
  }, [loadCampaign]);

  useEffect(() => {
    if (campaignId && campaignStatus !== 'draft') {
      void Promise.resolve().then(() => loadSupplementaryData(campaignId));
    }
  }, [campaignId, campaignStatus, loadSupplementaryData]);

  // Single polling timer, guarded against overlap: each tick refreshes the
  // campaign plus its worker/SMTP health and delivery diagnostics together,
  // so there is exactly one in-flight request group at a time rather than
  // three independently-scheduled ones.
  useEffect(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (!campaignId || !campaignStatus || !POLLING_STATUSES.includes(campaignStatus)) {
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const freshData = await loadCampaign(true);
        if (freshData) {
          await loadSupplementaryData(freshData.id);
          if (TERMINAL_STATUSES.includes(freshData.status) && pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } finally {
        isPollingRef.current = false;
      }
    }, 3000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [campaignId, campaignStatus, loadCampaign, loadSupplementaryData]);

  const handleSendTest = async () => {
    if (!testEmail.trim() || !/^\S+@\S+\.\S+$/.test(testEmail)) {
      return;
    }
    try {
      setTestLoading(true);
      setTestError(undefined);
      setTestSuccess(false);
      await newsletterService.sendTestEmail(String(params.id), testEmail);
      setTestSuccess(true);
      showToast({ type: 'success', message: 'Test email sent successfully.' });
      setTimeout(() => {
        setShowTestDialog(false);
        setTestSuccess(false);
        setTestEmail('');
      }, 2000);
    } catch (err) {
      setTestError(getSafeApiErrorMessage(err));
    } finally {
      setTestLoading(false);
    }
  };

  const handleQueue = async () => {
    try {
      setActionLoading(true);
      setModalError(undefined);
      await newsletterService.queueCampaign(String(params.id));
      await loadCampaign();
      setShowQueueDialog(false);
      showToast({ type: 'success', message: 'Campaign queued successfully.' });
    } catch (err) {
      setModalError(getSafeApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      setActionLoading(true);
      setModalError(undefined);
      await newsletterService.retryFailed(String(params.id));
      await loadCampaign();
      setShowRetryDialog(false);
      showToast({ type: 'success', message: 'Campaign retried.' });
    } catch (err) {
      setModalError(getSafeApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      setModalError(undefined);
      await newsletterService.cancelCampaign(String(params.id));
      await loadCampaign();
      setShowCancelDialog(false);
      showToast({ type: 'success', message: 'Campaign cancelled.' });
    } catch (err) {
      setModalError(getSafeApiErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      setModalError(undefined);
      const updated = await newsletterService.pauseCampaign(String(params.id), pauseReasonCode, pauseReasonMessage || undefined);
      setCampaign(updated);
      setShowPauseDialog(false);
      showToast({ type: 'success', message: 'Campaign paused.' });
    } catch (err) { 
      setModalError(getSafeApiErrorMessage(err));
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleResume = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      setModalError(undefined);
      const updated = await newsletterService.resumeCampaign(String(params.id));
      setCampaign(updated);
      setShowResumeDialog(false);
      showToast({ type: 'success', message: 'Campaign resumed.' });
    } catch (err) { 
      setModalError(getSafeApiErrorMessage(err));
      const freshCampaign = await loadCampaign(true);
      if (freshCampaign) {
        await loadSupplementaryData(freshCampaign.id);
      }
    } finally { 
      setActionLoading(false); 
    }
  };

  const handleDelete = async () => {
    if (actionLoading) return;
    try {
      setActionLoading(true);
      setModalError(undefined);
      await newsletterService.deleteCampaign(String(params.id));
      setShowDeleteDialog(false);
      showToast({ type: 'success', message: 'Campaign deleted.' });
      router.push('/newsletter/campaigns');
    } catch (err) { 
      setModalError(getSafeApiErrorMessage(err));
    } finally { 
      setActionLoading(false); 
    }
  };

  if (loading && !campaign) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-200 rounded animate-pulse w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-24 bg-slate-200 rounded animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-600 mb-4">Campaign not found.</p>
        <Button onClick={() => router.push('/newsletter/campaigns')}>
          Back to Campaigns
        </Button>
      </Card>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(campaign.status);
  const healthRequestFailed = healthRequestFailures > 0;
  const notice = buildStatusNotice(campaign, workerHealth, healthRequestFailed);
  const worker = workerBadge(workerHealth, healthRequestFailed);
  const smtp = smtpBadge(workerHealth);
  const claim = claimBadge(workerHealth);

  // Completion/success are computed from the live per-status delivery counts
  // (diagnostics) when available, since those are queried directly off the
  // delivery rows rather than the campaign's own counters — which only
  // reflect whatever the most recent reconciliation pass wrote. Falls back
  // to the campaign's own counters (failed_count already folds in
  // 'uncertain' deliveries — see reconcileCampaignState) while diagnostics
  // is still loading.
  const terminalCount = diagnostics
    ? diagnostics.counts.sent + diagnostics.counts.failed + diagnostics.counts.cancelled + diagnostics.counts.uncertain
    : campaign.sent_count + campaign.failed_count + campaign.cancelled_count;
  const sentCount = diagnostics ? diagnostics.counts.sent : campaign.sent_count;
  const pendingCount = Math.max(0, campaign.total_recipients - terminalCount);
  const completionPercentage = campaign.total_recipients > 0
    ? Math.round((terminalCount / campaign.total_recipients) * 100)
    : 0;
  const successPercentage = campaign.total_recipients > 0
    ? Math.round((sentCount / campaign.total_recipients) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <PageHeader title={campaign.subject} description={`Campaign ID: ${campaign.id}`} />
          <div className="mt-2">
            <StatusBadge status={campaign.status} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push('/newsletter/campaigns')}>
            Back
          </Button>
          {!isTerminal && campaign.status !== 'draft' && (
            <Button variant="outline" onClick={() => void loadCampaign(false)}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </Card>
      )}

      {notice && (
        <Card className={`p-4 border ${NOTICE_STYLES[notice.tone]}`}>
          <p className="text-sm font-medium">{notice.message}</p>
        </Card>
      )}

      {/* Worker / SMTP health */}
      {campaign.status !== 'draft' && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Worker</span>
              <HealthBadge label={worker.label} tone={worker.tone} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">SMTP</span>
              <HealthBadge label={smtp.label} tone={smtp.tone} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-slate-500 font-medium">Claim processing</span>
              <HealthBadge label={claim.label} tone={claim.tone} />
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Recipients</p>
          <p className="text-2xl font-bold">{campaign.total_recipients}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending</p>
          <p className="text-2xl font-bold text-slate-700">{pendingCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Sent</p>
          <p className="text-2xl font-bold text-green-600">{sentCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Failed</p>
          <p className="text-2xl font-bold text-red-600">{campaign.failed_count}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-slate-500">{campaign.cancelled_count}</p>
        </Card>
      </div>

      {/* Progress */}
      <Card className="p-6">
        <h3 className="font-semibold text-sm mb-4 text-slate-700">Delivery Progress</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden relative">
            <div
              className={`h-4 transition-all duration-500 rounded-full ${campaign.status === 'failed' ? 'bg-red-500' : 'bg-blue-600'}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="font-bold text-slate-700">{completionPercentage}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {terminalCount} completed out of {campaign.total_recipients} total recipients; {sentCount} sent successfully ({successPercentage}% success rate).
        </p>
      </Card>

      {/* Delivery Diagnostics */}
      {campaign.status !== 'draft' && diagnostics && (
        <Card className="p-6">
          <h3 className="font-semibold text-sm mb-4 text-slate-700">Delivery Diagnostics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            {[
              { label: 'Pending', value: diagnostics.counts.pending },
              { label: 'Processing', value: diagnostics.counts.processing },
              { label: 'Retry Pending', value: diagnostics.counts.retry_pending },
              { label: 'Sent', value: diagnostics.counts.sent },
              { label: 'Failed', value: diagnostics.counts.failed },
              { label: 'Cancelled', value: diagnostics.counts.cancelled },
              { label: 'Needs Review', value: diagnostics.counts.uncertain }
            ].map((tile) => (
              <div key={tile.label} className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">{tile.label}</p>
                <p className="text-lg font-bold text-slate-800">{tile.value}</p>
              </div>
            ))}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
            <dt className="text-slate-500 font-medium">Last Worker Heartbeat</dt>
            <dd className="text-slate-900">{diagnostics.last_worker_heartbeat ? new Date(diagnostics.last_worker_heartbeat).toLocaleString() : '-'}</dd>

            <dt className="text-slate-500 font-medium">Last Processing Attempt</dt>
            <dd className="text-slate-900">{diagnostics.last_processing_attempt ? new Date(diagnostics.last_processing_attempt).toLocaleString() : '-'}</dd>

            <dt className="text-slate-500 font-medium">Next Retry</dt>
            <dd className="text-slate-900">{diagnostics.next_retry_at ? new Date(diagnostics.next_retry_at).toLocaleString() : '-'}</dd>

            <dt className="text-slate-500 font-medium">Latest Error</dt>
            <dd className="text-slate-900">{diagnostics.latest_error ? `${diagnostics.latest_error.code}: ${diagnostics.latest_error.message}` : '-'}</dd>
          </dl>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campaign Info */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold border-b pb-2 text-slate-800">Campaign Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
            <dt className="text-slate-500 font-medium">Subject</dt>
            <dd className="sm:col-span-2 text-slate-900 font-medium">{campaign.subject}</dd>

            <dt className="text-slate-500 font-medium">Preview Text</dt>
            <dd className="sm:col-span-2 text-slate-900">{campaign.preview_text || '-'}</dd>

            <dt className="text-slate-500 font-medium">Blog Article</dt>
            <dd className="sm:col-span-2 text-blue-600">
              {campaign.blogVersion?.title || campaign.blog?.title || `Blog ${campaign.blog_id}`}
            </dd>

            <dt className="text-slate-500 font-medium">Version</dt>
            <dd className="sm:col-span-2 text-slate-900">v{campaign.blogVersion?.versionNumber || campaign.blog_version_id}</dd>
          </dl>
        </Card>

        {/* Timeline */}
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold border-b pb-2 text-slate-800">Timeline</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-4 gap-x-4 text-sm">
            <dt className="text-slate-500 font-medium">Created</dt>
            <dd className="sm:col-span-2 text-slate-900">{new Date(campaign.created_at).toLocaleString()}</dd>

            <dt className="text-slate-500 font-medium">Queued</dt>
            <dd className="sm:col-span-2 text-slate-900">{campaign.queued_at ? new Date(campaign.queued_at).toLocaleString() : '-'}</dd>

            <dt className="text-slate-500 font-medium">Started</dt>
            <dd className="sm:col-span-2 text-slate-900">{campaign.started_at ? new Date(campaign.started_at).toLocaleString() : '-'}</dd>

            <dt className="text-slate-500 font-medium">Completed</dt>
            <dd className="sm:col-span-2 text-slate-900">{campaign.completed_at ? new Date(campaign.completed_at).toLocaleString() : '-'}</dd>
          </dl>
        </Card>
      </div>

      {campaign.status === 'paused' && (
        <Card className="p-5 border-amber-200 bg-amber-50">
          <h3 className="font-semibold text-amber-900">{campaign.auto_paused ? 'Paused automatically' : 'Paused manually'}</h3>
          <p className="text-sm text-amber-800 mt-1">Reason: {campaign.pause_reason_message || campaign.pause_reason_code || 'Manual review'}</p>
          <p className="text-xs text-amber-700 mt-2">Paused: {campaign.paused_at ? new Date(campaign.paused_at).toLocaleString() : 'Unknown'}{campaign.resume_at ? ` · Resume after ${new Date(campaign.resume_at).toLocaleString()}` : ''}{!campaign.auto_paused && campaign.paused_by ? ` · Admin ${campaign.paused_by}` : ''}</p>
        </Card>
      )}

      {/* Actions Card */}
      <Card className="p-6 bg-slate-50">
        <div className="flex gap-3 flex-wrap">
          {campaign.status === 'draft' && (
            <>
              <Button onClick={() => router.push(`/newsletter/campaigns/new?edit=${campaign.id}`)} variant="outline">Edit Campaign</Button>
              <Button onClick={() => setShowTestDialog(true)} variant="outline">Send Test Email</Button>
              <Button onClick={() => setShowQueueDialog(true)}>Queue Campaign</Button>
              <Button onClick={() => setShowDeleteDialog(true)} variant="destructive">Delete Campaign</Button>
            </>
          )}

          {['queued', 'sending'].includes(campaign.status) && <Button onClick={() => setShowPauseDialog(true)} disabled={actionLoading}>{actionLoading ? 'Pausing…' : 'Pause Campaign'}</Button>}
          {campaign.status === 'queued' && <Button onClick={() => setShowCancelDialog(true)} variant="destructive">Cancel Campaign</Button>}
          {campaign.status === 'paused' && <>
            <Button onClick={() => setShowResumeDialog(true)} disabled={actionLoading}>{actionLoading ? 'Resuming…' : 'Resume Campaign'}</Button>
            <Button onClick={() => setShowCancelDialog(true)} variant="destructive">Cancel Campaign</Button>
          </>}

          {(campaign.status === 'failed' || campaign.status === 'partially_failed') && (
            <Button onClick={() => setShowRetryDialog(true)} variant="outline">
              Retry Failed Deliveries
            </Button>
          )}
          {['completed', 'partially_failed', 'failed', 'cancelled'].includes(campaign.status) && (
            <Button onClick={() => setShowDeleteDialog(true)} variant="destructive">Delete Campaign</Button>
          )}
        </div>
      </Card>

      {/* Dialogs */}
      <Modal isOpen={showPauseDialog} onClose={() => !actionLoading && setShowPauseDialog(false)} title="Pause Campaign?">
        <div className="space-y-4">
          <p className="text-sm text-slate-700">New email deliveries will stop. Emails already processing may still be sent.</p>
          <select value={pauseReasonCode} onChange={(event) => setPauseReasonCode(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="manual_review">Manual review</option><option value="high_failure_rate">High failure rate</option><option value="provider_rate_limited">Provider rate limit</option><option value="other">Other</option>
          </select>
          <Input value={pauseReasonMessage} onChange={(event) => setPauseReasonMessage(event.target.value)} placeholder="Optional reason" />
          {modalError && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
              {modalError}
            </div>
          )}
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowPauseDialog(false)} disabled={actionLoading}>Cancel</Button><Button onClick={handlePause} disabled={actionLoading}>{actionLoading ? 'Pausing…' : 'Pause Campaign'}</Button></div>
        </div>
      </Modal>
      <Modal isOpen={showTestDialog} onClose={() => !testLoading && setShowTestDialog(false)} title="Send Test Email">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border rounded-lg text-sm text-slate-600 space-y-1">
            <p><span className="font-semibold">Subject:</span> {campaign.subject}</p>
            <p className="text-amber-700 mt-2 text-xs">Note: This is a test email and will not affect subscriber counts or campaign status.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="test-email">Test Recipient Email *</label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>

          {testError && (
            <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
              {testError}
            </div>
          )}

          {testSuccess && (
            <div className="p-2 bg-green-50 text-green-700 text-sm rounded border border-green-200">
              Test email sent successfully.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowTestDialog(false)} disabled={testLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail) || testLoading}
            >
              {testLoading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={showQueueDialog}
        title="Queue Campaign?"
        variant="default"
        message={`This Campaign will be sent to ${campaign.total_recipients} eligible subscribers. Emails already sent cannot be recalled.`}
        confirmText="Queue Campaign"
        loadingText="Queuing..."
        onConfirm={handleQueue}
        isLoading={actionLoading}
        errorMessage={modalError}
        onClose={() => !actionLoading && setShowQueueDialog(false)}
      />

      <ConfirmationDialog
        isOpen={showRetryDialog}
        title="Retry Failed Deliveries?"
        message={`Are you sure you want to retry ${campaign.failed_count} failed deliveries?`}
        confirmText="Retry Deliveries"
        loadingText="Retrying..."
        onConfirm={handleRetry}
        isLoading={actionLoading}
        errorMessage={modalError}
        onClose={() => !actionLoading && setShowRetryDialog(false)}
      />

      <ConfirmationDialog
        isOpen={showCancelDialog}
        title="Cancel Campaign?"
        message="Emails already sent cannot be recalled. This action cannot be undone."
        confirmText="Cancel Campaign"
        loadingText="Canceling..."
        onConfirm={handleCancel}
        isLoading={actionLoading}
        errorMessage={modalError}
        onClose={() => !actionLoading && setShowCancelDialog(false)}
      />
      <ConfirmationDialog 
        isOpen={showResumeDialog} 
        title="Resume Campaign?" 
        message="Pending and retryable deliveries will continue." 
        confirmText="Resume Campaign"
        loadingText="Resuming..."
        onConfirm={handleResume} 
        isLoading={actionLoading} 
        errorMessage={modalError}
        onClose={() => !actionLoading && setShowResumeDialog(false)} 
      />
      <ConfirmationDialog 
        isOpen={showDeleteDialog} 
        title="Delete Campaign?" 
        variant="destructive"
        message="Historical delivery records may be preserved. This action cannot be undone." 
        confirmText="Delete Campaign"
        loadingText="Deleting..."
        onConfirm={handleDelete} 
        isLoading={actionLoading} 
        errorMessage={modalError}
        onClose={() => !actionLoading && setShowDeleteDialog(false)} 
      />
    </div>
  );
}
