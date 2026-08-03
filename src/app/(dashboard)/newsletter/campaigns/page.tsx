'use client';

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/contexts/toast-context';
import { getSafeApiErrorMessage } from '@/utils/api-error';
import { newsletterService, type CampaignStatsResponse } from '@/services/newsletter.service';

interface Campaign {
  id: string;
  blog_id: string;
  blog_version_id: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  cancelled_count: number;
  created_at: string;
  updated_at: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  
  const { showToast } = useToast();
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [actionType, setActionType] = useState<'queue' | 'cancel' | 'retry' | 'pause' | 'resume' | 'delete' | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | undefined>();
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [campaignsRes, statsRes] = await Promise.all([
        newsletterService.getCampaigns(page, status),
        newsletterService.getCampaignStats()
      ]);
      setCampaigns(campaignsRes.items);
      setTotalPages(campaignsRes.pagination.total_pages);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleActionClick = (action: 'queue' | 'cancel' | 'retry' | 'pause' | 'resume' | 'delete', campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setActionType(action);
    setModalError(undefined);
  };

  const closeActionModal = () => {
    if (isModalLoading) return;
    setActionType(null);
    setSelectedCampaign(null);
    setModalError(undefined);
  };

  const handleConfirmAction = async () => {
    if (!selectedCampaign || !actionType) return;
    
    setIsModalLoading(true);
    setModalError(undefined);
    const id = selectedCampaign.id;
    setActionId(id);
    
    try {
      if (actionType === 'queue') {
        await newsletterService.queueCampaign(id);
        showToast({ type: 'success', message: 'Campaign queued successfully.' });
      } else if (actionType === 'cancel') {
        await newsletterService.cancelCampaign(id);
        showToast({ type: 'success', message: 'Campaign cancelled.' });
      } else if (actionType === 'retry') {
        await newsletterService.retryFailed(id);
        showToast({ type: 'success', message: 'Campaign retried.' });
      } else if (actionType === 'pause') {
        await newsletterService.pauseCampaign(id, 'manual_review');
        showToast({ type: 'success', message: 'Campaign paused.' });
      } else if (actionType === 'resume') {
        await newsletterService.resumeCampaign(id);
        showToast({ type: 'success', message: 'Campaign resumed.' });
      } else if (actionType === 'delete') {
        await newsletterService.deleteCampaign(id);
        showToast({ type: 'success', message: 'Campaign deleted.' });
      }
      void loadData();
      closeActionModal();
    } catch (err) {
      setModalError(getSafeApiErrorMessage(err));
      await loadData();
    } finally {
      setIsModalLoading(false);
      setActionId(null);
    }
  };

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0;
    return Math.round(((campaign.sent_count + campaign.failed_count + campaign.cancelled_count) / campaign.total_recipients) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader title="Newsletter Campaigns" description="Create and send email updates from Published Blog articles." />
        <Button onClick={() => router.push('/newsletter/campaigns/new')}>
          Create Campaign
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
          <Button
            onClick={() => void loadData()}
            variant="ghost"
            className="mt-2 text-xs"
          >
            Retry
          </Button>
        </Card>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total_campaigns}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Draft</p>
            <p className="text-2xl font-bold text-gray-700">{stats.draft}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active</p>
            <p className="text-2xl font-bold text-blue-600">{stats.active}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Completed</p>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Failed</p>
            <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="queued">Queued</option>
              <option value="sending">Sending</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="partially_failed">Partially Failed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {status && (
              <Button onClick={() => { setStatus(''); setPage(1); }} variant="ghost" className="text-sm">
                Clear filter
              </Button>
            )}
          </div>
          <Button onClick={() => void loadData()} variant="ghost">
            Refresh
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-4">{status ? 'No campaigns match the selected filters.' : 'No newsletter campaigns yet.'}</p>
          {!status && (
            <Button onClick={() => router.push('/newsletter/campaigns/new')}>
              Create your first campaign
            </Button>
          )}
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Campaign Subject</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Blog Version</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Recipients</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Sent / Failed</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Progress</th>
                <th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Updated</th>
                <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 max-w-[200px] truncate" title={campaign.subject}>
                    {campaign.subject}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    v{campaign.blog_version_id}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                    {campaign.total_recipients}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 whitespace-nowrap">
                    <span className="text-green-600">{campaign.sent_count}</span> / <span className="text-red-600">{campaign.failed_count}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${calculateProgress(campaign)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{calculateProgress(campaign)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(campaign.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => router.push(`/newsletter/campaigns/${campaign.id}`)}>
                        View
                      </Button>
                      
                      {campaign.status === 'draft' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/newsletter/campaigns/new?edit=${campaign.id}`)}>
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="text-blue-600" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('queue', campaign)}>
                            Queue
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('delete', campaign)}>Delete</Button>
                        </>
                      )}

                      {['queued', 'sending'].includes(campaign.status) && (
                        <Button variant="ghost" size="sm" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('pause', campaign)}>{actionId === campaign.id ? 'Pausing…' : 'Pause'}</Button>
                      )}
                      {campaign.status === 'queued' && <Button variant="ghost" size="sm" className="text-red-600" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('cancel', campaign)}>Cancel</Button>}
                      {campaign.status === 'paused' && <>
                        <Button variant="ghost" size="sm" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('resume', campaign)}>{actionId === campaign.id ? 'Resuming…' : 'Resume'}</Button>
                        <Button variant="ghost" size="sm" className="text-red-600" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('cancel', campaign)}>Cancel</Button>
                      </>}

                      {(campaign.status === 'failed' || campaign.status === 'partially_failed') && (
                        <Button variant="ghost" size="sm" className="text-blue-600" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('retry', campaign)}>
                          Retry
                        </Button>
                      )}
                      {['completed', 'partially_failed', 'failed', 'cancelled'].includes(campaign.status) && (
                        <Button variant="ghost" size="sm" className="text-red-600" disabled={actionId === campaign.id || isModalLoading} onClick={() => handleActionClick('delete', campaign)}>Delete</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {selectedCampaign && actionType && (
        <ConfirmationDialog
          isOpen={!!actionType}
          onClose={closeActionModal}
          onConfirm={handleConfirmAction}
          isLoading={isModalLoading}
          errorMessage={modalError}
          title={
            actionType === 'queue' ? 'Queue Campaign?' :
            actionType === 'cancel' ? 'Cancel Campaign?' :
            actionType === 'retry' ? 'Retry Failed Deliveries?' :
            actionType === 'pause' ? 'Pause Campaign?' :
            actionType === 'resume' ? 'Resume Campaign?' :
            actionType === 'delete' ? `Delete Campaign?` : 'Confirm Action'
          }
          variant={actionType === 'delete' ? 'destructive' : actionType === 'queue' ? 'default' : 'warning'}
          message={
            actionType === 'queue' ? `This Campaign will be sent to ${selectedCampaign.total_recipients} eligible subscribers. Emails already sent cannot be recalled.` :
            actionType === 'cancel' ? 'Emails already sent cannot be recalled. This action cannot be undone.' :
            actionType === 'retry' ? 'Failed email deliveries will be retried.' :
            actionType === 'pause' ? 'New email deliveries will stop. Emails already processing may still be sent.' :
            actionType === 'resume' ? 'Pending and retryable deliveries will continue.' :
            actionType === 'delete' ? 'Historical delivery records may be preserved. This action cannot be undone.' : ''
          }
          confirmText={
            actionType === 'queue' ? 'Queue Campaign' :
            actionType === 'cancel' ? 'Cancel Campaign' :
            actionType === 'retry' ? 'Retry Deliveries' :
            actionType === 'pause' ? 'Pause Campaign' :
            actionType === 'resume' ? 'Resume Campaign' :
            actionType === 'delete' ? 'Delete Campaign' : 'Confirm'
          }
          loadingText="Processing..."
        />
      )}
    </div>
  );
}
