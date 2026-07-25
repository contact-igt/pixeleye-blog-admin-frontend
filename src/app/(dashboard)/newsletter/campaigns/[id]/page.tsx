'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { newsletterService } from '@/services/newsletter.service';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';

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
  blog?: { title: string; slug: string };
  blogVersion?: { title: string; versionNumber: number; excerpt: string };
}

const TERMINAL_STATUSES = ['completed', 'partially_failed', 'failed', 'cancelled'];

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  const [showQueueDialog, setShowQueueDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  const loadCampaign = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await newsletterService.getCampaign(String(params.id));
      setCampaign(data);
      return data;
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : 'Failed to load campaign');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    if (!campaign || TERMINAL_STATUSES.includes(campaign.status)) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    if (campaign.status === 'queued' || campaign.status === 'sending') {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        if (isPollingRef.current) return;
        isPollingRef.current = true;
        const freshData = await loadCampaign(true);
        if (freshData && TERMINAL_STATUSES.includes(freshData.status)) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        isPollingRef.current = false;
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [campaign?.status, loadCampaign]);

  const handleSendTest = async () => {
    if (!testEmail.trim() || !/^\S+@\S+\.\S+$/.test(testEmail)) {
      return;
    }
    try {
      setTestLoading(true);
      setTestSuccess(false);
      await newsletterService.sendTestEmail(String(params.id), testEmail);
      setTestSuccess(true);
      setTimeout(() => {
        setShowTestDialog(false);
        setTestSuccess(false);
        setTestEmail('');
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestLoading(false);
    }
  };

  const handleQueue = async () => {
    try {
      setActionLoading(true);
      await newsletterService.queueCampaign(String(params.id));
      await loadCampaign();
      setShowQueueDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to queue campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    try {
      setActionLoading(true);
      await newsletterService.retryFailed(String(params.id));
      await loadCampaign();
      setShowRetryDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await newsletterService.cancelCampaign(String(params.id));
      await loadCampaign();
      setShowCancelDialog(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
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
  const queuedCount = campaign.sent_count + campaign.failed_count + campaign.cancelled_count;
  const pendingCount = Math.max(0, campaign.total_recipients - queuedCount);
  const successPercentage = campaign.total_recipients > 0
    ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
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
          <p className="text-2xl font-bold text-green-600">{campaign.sent_count}</p>
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
              style={{ width: `${successPercentage}%` }}
            />
          </div>
          <span className="font-bold text-slate-700">{successPercentage}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {campaign.sent_count} sent out of {campaign.total_recipients} total recipients.
        </p>
      </Card>

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

      {/* Actions Card */}
      <Card className="p-6 bg-slate-50">
        <div className="flex gap-3 flex-wrap">
          {campaign.status === 'draft' && (
            <>
              <Button onClick={() => router.push(`/newsletter/campaigns/new?edit=${campaign.id}`)} variant="outline">Edit Campaign</Button>
              <Button onClick={() => setShowTestDialog(true)} variant="outline">Send Test Email</Button>
              <Button onClick={() => setShowQueueDialog(true)}>Queue Campaign</Button>
            </>
          )}
          
          {(campaign.status === 'queued' || campaign.status === 'sending') && (
            <Button onClick={() => setShowCancelDialog(true)} variant="destructive">
              Cancel Campaign
            </Button>
          )}

          {(campaign.status === 'failed' || campaign.status === 'partially_failed') && (
            <Button onClick={() => setShowRetryDialog(true)} variant="outline">
              Retry Failed Deliveries
            </Button>
          )}
        </div>
      </Card>

      {/* Dialogs */}
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
        title="Queue Newsletter Campaign?"
        message={`Are you sure you want to queue this campaign to ${campaign.total_recipients} subscribed readers? Emails already sent cannot be recalled.`}
        confirmText={actionLoading ? "Queuing..." : "Queue Campaign"}
        onConfirm={handleQueue}
        onClose={() => !actionLoading && setShowQueueDialog(false)}
      />

      <ConfirmationDialog
        isOpen={showRetryDialog}
        title="Retry Failed Deliveries?"
        message={`Are you sure you want to retry ${campaign.failed_count} failed deliveries?`}
        confirmText={actionLoading ? "Retrying..." : "Retry Failed"}
        onConfirm={handleRetry}
        onClose={() => !actionLoading && setShowRetryDialog(false)}
      />

      <ConfirmationDialog
        isOpen={showCancelDialog}
        title="Cancel Campaign?"
        message="Are you sure you want to cancel this campaign? Pending deliveries will not be sent."
        confirmText={actionLoading ? "Canceling..." : "Cancel Campaign"}
        onConfirm={handleCancel}
        onClose={() => !actionLoading && setShowCancelDialog(false)}
      />
    </div>
  );
}
