'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { newsletterService, type CampaignStatsResponse } from '@/services/newsletter.service';
import { Search } from 'lucide-react';

interface Campaign {
  id: string;
  blog_id: string;
  blog_version_id: string;
  subject: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
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

  const handleAction = async (action: string, id: string) => {
    try {
      if (action === 'queue') {
        if (!confirm('Are you sure you want to queue this campaign?')) return;
        await newsletterService.queueCampaign(id);
      } else if (action === 'cancel') {
        if (!confirm('Are you sure you want to cancel this campaign?')) return;
        await newsletterService.cancelCampaign(id);
      } else if (action === 'retry') {
        if (!confirm('Are you sure you want to retry failed deliveries?')) return;
        await newsletterService.retryFailed(id);
      }
      void loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0;
    return Math.round((campaign.sent_count / campaign.total_recipients) * 100);
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
                          <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => void handleAction('queue', campaign.id)}>
                            Queue
                          </Button>
                        </>
                      )}

                      {(campaign.status === 'queued' || campaign.status === 'sending') && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => void handleAction('cancel', campaign.id)}>
                          Cancel
                        </Button>
                      )}

                      {(campaign.status === 'failed' || campaign.status === 'partially_failed') && (
                        <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => void handleAction('retry', campaign.id)}>
                          Retry
                        </Button>
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
    </div>
  );
}
