'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Input } from '@/components/ui/input';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { newsletterService, type SubscriberStatsResponse } from '@/services/newsletter.service';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/contexts/toast-context';
import { getSafeApiErrorMessage } from '@/utils/api-error';

interface Subscriber {
  id: string;
  email: string;
  status: 'pending' | 'subscribed' | 'unsubscribed';
  source: string;
  consentVersion: string;
  consentAt: string;
  verificationSentAt: string | null;
  verifiedAt: string | null;
  unsubscribedAt: string | null;
  resubscriptionRequestedAt?: string | null;
  createdAt: string;
}

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<SubscriberStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [exporting, setExporting] = useState(false);

  // Modal state
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Create subscriber modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createConsentNote, setCreateConsentNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Resend verification
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resubscriptionId, setResubscriptionId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();

  // Resubscribe confirmation
  const [resubscribeConfirmOpen, setResubscribeConfirmOpen] = useState(false);
  const [resubscribeTargetId, setResubscribeTargetId] = useState<string | null>(null);
  const [resubscribeError, setResubscribeError] = useState<string | undefined>();

  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [response, statsResponse] = await Promise.all([
        newsletterService.getSubscribers(page, limit, search, status),
        newsletterService.getSubscriberStats()
      ]);
      setSubscribers(response.items);
      setTotalItems(response.pagination.total_items);
      setTotalPages(response.pagination.total_pages);
      setStats(statsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await newsletterService.exportSubscribers() as any;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscribers_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast({ type: 'success', message: 'Export successful.' });
    } catch (err) {
      showToast({ type: 'error', message: getSafeApiErrorMessage(err) });
    } finally {
      setExporting(false);
    }
  };

  const handleViewSubscriber = async (id: string) => {
    try {
      setLoadingDetail(true);
      setIsDetailModalOpen(true);
      const data = await newsletterService.getSubscriber(id);
      setSelectedSubscriber(data);
    } catch (err) {
      showToast({ type: 'error', message: getSafeApiErrorMessage(err) });
      setIsDetailModalOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCreateSubscriber = async () => {
    if (!createEmail.trim()) {
      setCreateError('Email is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail)) {
      setCreateError('Invalid email format');
      return;
    }

    try {
      setIsCreating(true);
      setCreateError('');
      const created = await newsletterService.createSubscriber({
        email: createEmail,
        consent_note: createConsentNote || undefined
      });

      // Success: close modal and refresh
      setIsCreateModalOpen(false);
      setCreateEmail('');
      setCreateConsentNote('');
      void loadData();

      if (created.email_sent === false) {
        showToast({ type: 'warning', message: 'Subscriber saved as pending, but the verification email could not be sent. Check SMTP configuration and use Resend Verification.' });
      } else {
        showToast({ type: 'success', message: 'Subscriber added successfully.' });
      }
    } catch (err: any) {
      // On error, show message but keep modal open so user can retry
      setCreateError(getSafeApiErrorMessage(err));

      // Still refresh in case subscriber was partially created
      void loadData();
    } finally {
      setIsCreating(false);
    }
  };

  const handleResendVerification = async (id: string) => {
    try {
      setResendingId(id);
      const resent = await newsletterService.resendSubscriberVerification(id);
      void loadData();
      if (resent.email_sent === false) {
        showToast({ type: 'warning', message: 'Subscriber saved as pending, but the verification email could not be sent. Check SMTP configuration and use Resend Verification.' });
      } else {
        showToast({ type: 'success', message: 'Verification email resent.' });
      }
    } catch (err: any) {
      showToast({ type: 'error', message: getSafeApiErrorMessage(err) });
      // Refresh in case token was updated but email failed
      void loadData();
    } finally {
      setResendingId(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setDeleteReason('');
    setDeleteError(undefined);
    setDeleteConfirmOpen(true);
  };

  const handleResubscriptionClick = (id: string) => {
    setResubscribeTargetId(id);
    setResubscribeError(undefined);
    setResubscribeConfirmOpen(true);
  };

  const handleConfirmResubscription = async () => {
    if (!resubscribeTargetId) return;
    try {
      setResubscriptionId(resubscribeTargetId);
      setResubscribeError(undefined);
      await newsletterService.sendSubscriberResubscription(resubscribeTargetId);
      await loadData();
      setResubscribeConfirmOpen(false);
      setResubscribeTargetId(null);
      showToast({ type: 'success', message: 'Resubscription request sent.' });
    } catch (err) { 
      setResubscribeError(getSafeApiErrorMessage(err));
    } finally { 
      setResubscriptionId(null); 
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setIsDeleting(true);
      setDeleteError(undefined);
      await newsletterService.deleteSubscriber(deleteTargetId, deleteReason || undefined);
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);
      void loadData();
      showToast({ type: 'success', message: 'Subscriber deleted.' });
    } catch (err: any) {
      setDeleteError(getSafeApiErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Newsletter Subscribers"
          description="Manage email subscribers and view consent history."
        />
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Add Subscriber
          </Button>
          <Button onClick={handleExport} disabled={exporting} variant="outline">
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Subscribers</p>
            <p className="text-2xl font-bold">{stats.total_subscribers}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Subscribed</p>
            <p className="text-2xl font-bold text-green-600">{stats.subscribed}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unsubscribed</p>
            <p className="text-2xl font-bold text-slate-500">{stats.unsubscribed}</p>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              placeholder="Search by email..."
              value={search}
              onChange={(v) => { setSearch(v); setPage(1); }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          {(search || status) && (
            <Button onClick={() => { setSearch(''); setStatus(''); setPage(1); }} variant="ghost" className="text-sm">
              Clear filters
            </Button>
          )}
          <Button onClick={() => void loadData()} variant="ghost" className="ml-auto">
            Refresh
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      ) : subscribers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-slate-600">No subscribers found matching the current criteria.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Source</th>
                <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Subscribed Date</th>
                <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Consent Date</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-900 font-medium truncate max-w-[200px]" title={sub.email}>
                    {sub.email}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sub.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{sub.source || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs hidden md:table-cell">
                    {sub.verifiedAt ? new Date(sub.verifiedAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs hidden lg:table-cell">
                    {sub.consentAt ? new Date(sub.consentAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewSubscriber(sub.id)}>
                        View
                      </Button>
                      {sub.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleResendVerification(sub.id)}
                          disabled={resendingId === sub.id}
                        >
                          {resendingId === sub.id ? 'Resending…' : 'Resend Verification'}
                        </Button>
                      )}
                      {sub.status === 'unsubscribed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResubscriptionClick(sub.id)}
                          disabled={resubscriptionId === sub.id}
                        >
                          {resubscriptionId === sub.id ? 'Sending…' : 'Send Resubscription Request'}
                        </Button>
                      )}
                      {['pending', 'subscribed', 'unsubscribed'].includes(sub.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteClick(sub.id)}
                          disabled={isDeleting}
                        >
                          Delete
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

      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          // Small delay before clearing to prevent UI flash
          setTimeout(() => setSelectedSubscriber(null), 300);
        }}
        title="Subscriber Details"
      >
        <div className="space-y-6">
          {loadingDetail ? (
            <div className="space-y-4">
              <div className="h-8 bg-slate-200 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-slate-200 rounded animate-pulse w-1/4" />
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="h-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-16 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ) : selectedSubscriber ? (
            <>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedSubscriber.email}</h3>
                <div className="mt-2">
                  <StatusBadge status={selectedSubscriber.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Source</p>
                  <p className="text-sm font-medium">{selectedSubscriber.source || 'Unknown'}</p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Created At</p>
                  <p className="text-sm font-medium">{new Date(selectedSubscriber.createdAt).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Consent Date</p>
                  <p className="text-sm font-medium">{selectedSubscriber.consentAt ? new Date(selectedSubscriber.consentAt).toLocaleString() : '—'}</p>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Consent Version</p>
                  <p className="text-sm font-medium">{selectedSubscriber.consentVersion || '—'}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-slate-800">Verification Timeline</h4>
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-4 text-sm">
                  <div>
                    <span className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1"></span>
                    <p className="font-medium text-slate-800">Verification Sent</p>
                    <p className="text-slate-500 text-xs">
                      {selectedSubscriber.verificationSentAt 
                        ? new Date(selectedSubscriber.verificationSentAt).toLocaleString() 
                        : 'Not sent'}
                    </p>
                  </div>
                  <div>
                    <span className={`absolute w-3 h-3 rounded-full -left-[7px] top-1 ${selectedSubscriber.verifiedAt ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                    <p className="font-medium text-slate-800">Verified</p>
                    <p className="text-slate-500 text-xs">
                      {selectedSubscriber.verifiedAt 
                        ? new Date(selectedSubscriber.verifiedAt).toLocaleString() 
                        : 'Pending'}
                    </p>
                  </div>
                  {selectedSubscriber.unsubscribedAt && (
                    <div>
                      <span className="absolute w-3 h-3 bg-red-500 rounded-full -left-[7px] top-1"></span>
                      <p className="font-medium text-slate-800">Unsubscribed</p>
                      <p className="text-slate-500 text-xs">
                        {new Date(selectedSubscriber.unsubscribedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedSubscriber.resubscriptionRequestedAt && (
                    <div><p className="font-medium text-slate-800">Last Resubscription Request</p><p className="text-slate-500 text-xs">{new Date(selectedSubscriber.resubscriptionRequestedAt).toLocaleString()}</p></div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-500">Failed to load details.</div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isCreating && setIsCreateModalOpen(false)}
        title="Add Newsletter Subscriber"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-900 rounded-lg text-sm">
            <p>The subscriber will receive a verification email. They will not be subscribed until they confirm.</p>
          </div>

          {createError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {createError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="new-email">
              Email Address *
            </label>
            <Input
              id="new-email"
              type="email"
              value={createEmail}
              onChange={(e) => {
                setCreateEmail(e.target.value);
                if (createError) setCreateError('');
              }}
              placeholder="reader@example.com"
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="consent-note">
              Request/Consent Note
            </label>
            <Input
              id="consent-note"
              value={createConsentNote}
              onChange={(e) => setCreateConsentNote(e.target.value)}
              placeholder="e.g., Customer requested newsletter signup"
              maxLength={255}
              disabled={isCreating}
            />
            <p className="text-xs text-slate-500 mt-1">{createConsentNote.length}/255</p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubscriber}
              disabled={!createEmail.trim() || isCreating}
            >
              {isCreating ? 'Sending...' : 'Send Verification Email'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        title="Delete Subscriber?"
        variant="destructive"
        message={
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-slate-700 font-medium">
                {subscribers.find(s => s.id === deleteTargetId)?.email}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Status: <span className="font-medium">{subscribers.find(s => s.id === deleteTargetId)?.status}</span>
              </p>
            </div>
            <p className="text-slate-600">
              Deleting this subscriber will prevent future Campaign emails. Existing delivery history will be preserved where required.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">
                Deletion Reason (Optional)
              </label>
              <Input
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g., User requested removal"
                maxLength={255}
                disabled={isDeleting}
              />
            </div>
          </div>
        }
        confirmText="Delete Subscriber"
        loadingText="Deleting..."
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        errorMessage={deleteError}
        onClose={() => !isDeleting && setDeleteConfirmOpen(false)}
      />

      <ConfirmationDialog
        isOpen={resubscribeConfirmOpen}
        title="Send Resubscription Request?"
        message="This person previously unsubscribed. They will remain unsubscribed unless they personally confirm the new subscription request."
        confirmText="Send Request"
        loadingText="Sending..."
        onConfirm={handleConfirmResubscription}
        isLoading={!!resubscriptionId}
        errorMessage={resubscribeError}
        onClose={() => !resubscriptionId && setResubscribeConfirmOpen(false)}
      />
    </div>
  );
}
