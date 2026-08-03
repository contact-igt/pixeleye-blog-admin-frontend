/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, @next/next/no-img-element */
'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Copy, Eye, ImagePlus, RefreshCcw, Trash2, CheckCircle2, Search, SlidersHorizontal, Pencil } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { Modal } from '@/components/ui/modal';
import { Drawer } from '@/components/ui/drawer';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { EmptyState, Skeleton } from '@/components/ui/empty-state';
import { ApiClientError } from '@/services/api-client';
import {
  listMediaAssets,
  listTrashedMediaAssets,
  moveMediaAssetToTrash,
  permanentlyDeleteMediaAsset,
  restoreMediaAsset,
  updateMediaAsset,
  uploadMediaAsset,
} from '@/services/media.service';
import type { MediaAsset, MediaListParams, MediaPurpose } from '@/types/media';
import { mediaPurposes } from '@/types/media';

const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const maxHint = 'JPG, PNG, WebP or AVIF. Maximum size depends on image purpose (2 to 5 MB).';
type MediaTab = 'active' | 'trash';
type PendingAction = { kind: 'trash' | 'restore' | 'permanent'; asset: MediaAsset } | null;

function formatBytes(value?: number | null) {
  if (!value) return 'Unknown size';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function safeError(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401) return 'Your session expired. Please sign in again.';
    if (error.status === 403) return 'You do not have permission for this media action.';
    if (error.status === 409) return 'This media asset is not in the right state for that action.';
    if (error.status === 413) return 'This image is too large for the selected purpose.';
    if (error.status === 415) return 'This image type is not supported or the file is corrupt.';
    if (error.status === 502 || error.status === 503) return 'The image could not be stored. Please try again.';
    if (error.message === 'The API request timed out') {
      return 'The upload response was interrupted. Refresh the Media Library before trying again to avoid uploading a duplicate.';
    }
    if (error.message === 'The media upload response was invalid') {
      return 'The server returned an invalid upload response. Refresh the Media Library before trying again.';
    }
  }
  return 'Media request failed. Please try again.';
}

function canUpload(role?: string) {
  return role === 'super_admin' || role === 'editor' || role === 'author';
}

function createUploadClientId(): string {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return `${Date.now()}${String(random[0] % 1_000_000).padStart(6, '0')}`;
}

function canMoveToTrash(asset: MediaAsset, adminId?: string, role?: string) {
  if (role === 'super_admin' || role === 'editor') return true;
  if (role === 'author') return String(asset.uploaded_by?.id ?? '') === String(adminId ?? '');
  return false;
}

function canPermanentDelete(role?: string) {
  return role === 'super_admin' || role === 'editor';
}

function currentTab(searchParams: URLSearchParams): MediaTab {
  return searchParams.get('tab') === 'trash' ? 'trash' : 'active';
}

function paramsFromSearch(searchParams: URLSearchParams, tab: MediaTab): MediaListParams {
  return {
    page: Number(searchParams.get('page') || '1'),
    limit: 24,
    search: searchParams.get('search') || undefined,
    purpose: (searchParams.get('purpose') || '') as MediaPurpose | '',
    sort_by: (searchParams.get('sort_by') || (tab === 'trash' ? 'trashed_at' : 'created_at')) as MediaListParams['sort_by'],
    sort_order: (searchParams.get('sort_order') || 'desc') as MediaListParams['sort_order'],
  };
}

export default function MediaPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = currentTab(searchParams);
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 24,
    total_items: 0,
    total_pages: 0,
    has_next_page: false,
    has_previous_page: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<MediaAsset | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftPurpose, setDraftPurpose] = useState('');
  const [draftSortOrder, setDraftSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);
  const currentParams = useMemo(() => paramsFromSearch(searchParams, tab), [searchParams, tab]);
  const [searchText, setSearchText] = useState(currentParams.search ?? '');
  const [editAsset, setEditAsset] = useState<MediaAsset | null>(null);

  useEffect(() => setSearchText(currentParams.search ?? ''), [currentParams.search]);

  function invalidateInFlightRequests() {
    requestId.current += 1;
  }

  function syncAfterUpload() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('tab');
    next.delete('search');
    next.delete('purpose');
    next.delete('sort_by');
    next.delete('sort_order');
    next.set('page', '1');
    const nextUrl = `${pathname}?${next.toString()}`;
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    const canonicalParams: MediaListParams = { page: 1, limit: 24, sort_by: 'created_at', sort_order: 'desc' };

    if (nextUrl !== currentUrl) {
      startTransition(() => router.replace(nextUrl));
    }

    void load(canonicalParams, 'active', true);
  }

  const load = async (params: MediaListParams = currentParams, nextTab: MediaTab = tab, background = false) => {
    const id = ++requestId.current;
    if (!background) setLoading(true);
    setError(null);
    try {
      const result = nextTab === 'trash' ? await listTrashedMediaAssets(params) : await listMediaAssets(params);
      if (id !== requestId.current) return;
      setItems(result.items);
      setPagination(result.pagination);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(safeError(caught));
    } finally {
      if (id === requestId.current && !background) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tab, currentParams.page, currentParams.purpose, currentParams.search, currentParams.sort_by, currentParams.sort_order]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (searchText.trim()) next.set('search', searchText.trim());
      else next.delete('search');
      next.set('page', '1');
      if (next.toString() !== searchParams.toString()) startTransition(() => router.replace(`${pathname}?${next.toString()}`));
    }, 400);
    return () => clearTimeout(timer);
  }, [pathname, router, searchParams, searchText]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    router.replace(`${pathname}?${next.toString()}`);
  }

  function openFilters() { setDraftPurpose(currentParams.purpose ?? ''); setDraftSortOrder(currentParams.sort_order ?? 'desc'); setFilterOpen(true); }
  function applyFilters() { const next = new URLSearchParams(searchParams.toString()); if (draftPurpose) next.set('purpose', draftPurpose); else next.delete('purpose'); if (draftSortOrder === 'asc') next.set('sort_order', 'asc'); else next.delete('sort_order'); next.set('page', '1'); router.replace(pathname + '?' + next.toString()); setFilterOpen(false); }
  function clearFilters() { setDraftPurpose(''); setDraftSortOrder('desc'); const next = new URLSearchParams(searchParams.toString()); next.delete('purpose'); next.delete('sort_order'); next.set('page', '1'); router.replace(pathname + '?' + next.toString()); setFilterOpen(false); }

  function setTab(nextTab: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (nextTab === 'trash') next.set('tab', 'trash');
    else next.delete('tab');
    next.delete('sort_by');
    next.set('page', '1');
    router.replace(`${pathname}?${next.toString()}`);
  }

  function goPage(page: number) {
    const next = new URLSearchParams(searchParams.toString());
    next.set('page', String(page));
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function handleMoveToTrash(asset: MediaAsset) {
    setBusyId(asset.id);
    setError(null);
    try {
      await moveMediaAssetToTrash(asset.id);
      setItems((current) => current.filter((item) => item.id !== asset.id));
      setPreview(null);
      setPendingAction(null);
      setNotice('Media asset moved to Trash and can be restored.');
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(asset: MediaAsset) {
    setBusyId(asset.id);
    setError(null);
    try {
      await restoreMediaAsset(asset.id);
      setItems((current) => current.filter((item) => item.id !== asset.id));
      setPreview(null);
      setPendingAction(null);
      setNotice('Media asset restored.');
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function handlePermanentDelete(asset: MediaAsset) {
    setBusyId(asset.id);
    setError(null);
    try {
      await permanentlyDeleteMediaAsset(asset.id);
      setItems((current) => current.filter((item) => item.id !== asset.id));
      setPreview(null);
      setPendingAction(null);
      setNotice('Media asset permanently deleted.');
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setBusyId(null);
    }
  }

  const empty = !loading && !error && items.length === 0;

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Media Library"
        description="Upload clinical images, manage alt metadata, preview asset variants, and handle asset retentions."
        action={
          canUpload(admin?.role) && tab === 'active' ? (
            <Button variant="primary" size="md" onClick={() => setUploadOpen(true)}>
              <ImagePlus size={16} />
              <span>Upload Image</span>
            </Button>
          ) : undefined
        }
      />

      <Tabs
        tabs={[
          { id: 'active', label: 'Active Media' },
          { id: 'trash', label: 'Trash' },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {notice && <Alert variant="success" onDismiss={() => setNotice(null)}>{notice}</Alert>}

      {error && <Alert variant="error" action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}

      {/* Media tools */}
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <label className="relative min-w-[240px] flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search media"
              aria-label="Search media"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 shadow-xs outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>
          <Button variant="outline" size="sm" onClick={openFilters} className="h-10 rounded-xl px-3.5">
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {(Boolean(currentParams.purpose) || currentParams.sort_order === 'asc') && <span className="ml-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{Number(Boolean(currentParams.purpose)) + Number(currentParams.sort_order === 'asc')}</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading || isPending} aria-label="Refresh media" title="Refresh media" className="h-10 w-10 rounded-xl px-0">
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
        {(currentParams.purpose || currentParams.sort_order === 'asc') && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400">Active:</span>
{currentParams.purpose && <button type="button" onClick={() => setFilter('purpose', '')} className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100">Purpose: {currentParams.purpose} x</button>}
{currentParams.sort_order === 'asc' && <button type="button" onClick={() => setFilter('sort_order', '')} className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100">Oldest first x</button>}
            <button type="button" onClick={clearFilters} className="px-1 font-semibold text-slate-500 hover:text-slate-800">Clear all</button>
          </div>
        )}
      </div>

      <Drawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter media"
        description="Narrow the media library without leaving this page."
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setFilterOpen(false)}>Cancel</Button><Button variant="primary" onClick={applyFilters}>Apply filters</Button></>}
      >
        <div className="space-y-5">
          <Select
            label="Purpose"
            aria-label="Purpose filter"
            value={draftPurpose}
            onChange={(event) => setDraftPurpose(event.target.value)}
            options={[{ label: 'All purposes', value: '' }, ...mediaPurposes.map((purpose) => ({ label: purpose, value: purpose }))]}
          />
          <Select
            label="Sort by"
            aria-label="Sort media"
            value={draftSortOrder}
            onChange={(event) => setDraftSortOrder(event.target.value as 'asc' | 'desc')}
            options={[{ label: 'Newest first', value: 'desc' }, { label: 'Oldest first', value: 'asc' }]}
          />
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-sky-700 hover:text-sky-900">Clear filters</button>
        </div>
      </Drawer>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {empty && (
        <EmptyState
          type={searchText ? 'search' : 'empty'}
          title="No media assets found"
          description={
            tab === 'trash'
              ? 'Trash is empty.'
              : searchText
              ? `No media items matched "${searchText}".`
              : 'Upload an image or adjust your filters.'
          }
          action={
            tab === 'active' && canUpload(admin?.role) && !searchText
              ? {
                  label: 'Upload Image',
                  onClick: () => setUploadOpen(true),
                }
              : undefined
          }
        />
      )}

      {/* Media Grid */}
      {!loading && items.length > 0 && (
        <div className="grid min-w-0 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((asset) => (
            <MediaCard
              key={asset.id}
              asset={asset}
              tab={tab}
              busy={busyId === asset.id}
              canEdit={canUpload(admin?.role)}
              canTrash={canMoveToTrash(asset, admin?.id, admin?.role)}
              canPermanent={canPermanentDelete(admin?.role)}
              onPreview={() => setPreview(asset)}
              onEdit={() => setEditAsset(asset)}
              onTrash={() => setPendingAction({ kind: 'trash', asset })}
              onRestore={() => setPendingAction({ kind: 'restore', asset })}
              onPermanent={() => setPendingAction({ kind: 'permanent', asset })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && items.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total_items}
          itemsPerPage={pagination.limit}
          onPageChange={goPage}
        />
      )}

      {/* Overlays */}
      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={(asset) => {
            setItems((current) => [asset, ...current.filter((item) => item.id !== asset.id)].slice(0, 24));
            setUploadOpen(false);
            setNotice('Image uploaded successfully.');
            syncAfterUpload();
          }}
        />
      )}

      {preview && (
        <PreviewModal
          asset={preview}
          onClose={() => setPreview(null)}
          onTrash={tab === 'active' && canMoveToTrash(preview, admin?.id, admin?.role) ? () => setPendingAction({ kind: 'trash', asset: preview }) : undefined}
          onRestore={tab === 'trash' && canMoveToTrash(preview, admin?.id, admin?.role) ? () => setPendingAction({ kind: 'restore', asset: preview }) : undefined}
          onPermanent={tab === 'trash' && canPermanentDelete(admin?.role) ? () => setPendingAction({ kind: 'permanent', asset: preview }) : undefined}
        />
      )}

      {editAsset && (
        <EditModal
          asset={editAsset}
          onClose={() => setEditAsset(null)}
          onSaved={(updated) => {
            setItems((curr) => curr.map((item) => (item.id === updated.id ? updated : item)));
            if (preview?.id === updated.id) setPreview(updated);
            setEditAsset(null);
            setNotice('Media asset updated successfully.');
          }}
        />
      )}

      <ConfirmationDialog
        isOpen={pendingAction?.kind === 'trash'}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) void handleMoveToTrash(pendingAction.asset);
        }}
        title="Move media asset to Trash?"
        message={
          <p>
            <strong>{pendingAction?.asset.original_file_name}</strong> will be hidden from active media, but its stored files will be kept until the retention period ends.
          </p>
        }
        confirmText="Move to Trash"
        variant="destructive"
        isLoading={busyId === pendingAction?.asset.id}
      />

      <ConfirmationDialog
        isOpen={pendingAction?.kind === 'restore'}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) void handleRestore(pendingAction.asset);
        }}
        title="Restore media asset?"
        message={<p><strong>{pendingAction?.asset.original_file_name}</strong> will return to the active Media Library.</p>}
        confirmText="Restore media"
        variant="info"
        isLoading={busyId === pendingAction?.asset.id}
      />
      <ConfirmationDialog
        isOpen={pendingAction?.kind === 'permanent'}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction) void handlePermanentDelete(pendingAction.asset);
        }}
        title="Permanently delete media asset?"
        message={
          <p>
            This permanently deletes <strong>{pendingAction?.asset.original_file_name}</strong> and all generated variants. This cannot be undone. The database row will remain only for audit history.
          </p>
        }
        confirmText="Delete"
        variant="destructive"
        isLoading={busyId === pendingAction?.asset.id}
      />
    </div>
  );
}

function MediaCard({
  asset,
  tab,
  busy,
  canEdit,
  canTrash,
  canPermanent,
  onPreview,
  onEdit,
  onTrash,
  onRestore,
  onPermanent,
}: {
  asset: MediaAsset;
  tab: MediaTab;
  busy: boolean;
  canEdit: boolean;
  canTrash: boolean;
  canPermanent: boolean;
  onPreview(): void;
  onEdit?(): void;
  onTrash(): void;
  onRestore(): void;
  onPermanent(): void;
}) {
  const imageUrl = asset.variants.thumbnail?.url ?? asset.original_url ?? '';
  return (
    <Card interactive className="flex h-full flex-col overflow-hidden p-0">
      <div className="relative aspect-video overflow-hidden border-b border-slate-100 bg-slate-100">
        <button
          type="button"
          className="group block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
          onClick={onPreview}
          aria-label={`View ${asset.original_file_name ?? 'media asset'}`}
        >
          <img
            src={imageUrl}
            alt={asset.alt_text || asset.original_file_name || 'Media asset'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105"
            onError={(event) => {
              event.currentTarget.style.opacity = '0.3';
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/45 text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
            <Eye size={17} aria-hidden="true" />
            View Media
          </span>
        </button>
        <span className="pointer-events-none absolute right-3 top-3 z-10 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold capitalize text-sky-700 shadow-sm">
          {asset.purpose}
        </span>
      </div>

      <div className="flex-1 space-y-3 p-5">
        <h3 className="truncate text-sm font-semibold text-slate-900" title={asset.original_file_name ?? undefined}>
          {asset.original_file_name || 'Untitled media'}
        </h3>
        <p className={`text-xs font-semibold ${asset.alt_text ? 'text-emerald-700' : 'text-amber-700'}`}>
          {asset.alt_text ? 'Alt text added' : 'Alt text needed'}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span>{asset.width && asset.height ? `${asset.width} Ã— ${asset.height}` : 'Dimensions unavailable'}</span>
          <span aria-hidden="true" className="text-slate-300">|</span>
          <span>{formatBytes(asset.file_size ?? asset.size_bytes)}</span>
        </div>

        {tab === 'trash' && (
          <div className="space-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
            <p>Trashed {formatDate(asset.trashed_at)}</p>
            {asset.days_remaining != null && <p>{asset.days_remaining} days left before scheduled purge</p>}
            {asset.delete_failure && <p className="font-semibold text-rose-600">Delete failed: {asset.delete_failure}</p>}
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 p-4">
        {tab === 'active' ? (
          <div className={`grid gap-2 ${canEdit || canTrash ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-full px-2"
                onClick={onEdit || onPreview}
                aria-label={`Edit metadata for ${asset.original_file_name}`}
              >
                <Pencil size={14} aria-hidden="true" />
                <span>Edit</span>
              </Button>
            )}
            {canTrash && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-full border-rose-200 px-2 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                onClick={onTrash}
                aria-label={`Move ${asset.original_file_name} to trash`}
                disabled={busy}
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>Delete</span>
              </Button>
            )}
            <Button variant="primary" size="sm" className="h-10 w-full px-2" onClick={onPreview}>
              <Eye size={14} aria-hidden="true" />
              <span>View</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {canTrash ? (
              <Button variant="primary" size="sm" className="h-10 w-full px-2" onClick={onRestore} disabled={busy}>
                Restore
              </Button>
            ) : <span aria-hidden="true" />}
            {canPermanent ? (
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-full border-rose-200 px-2 text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                onClick={onPermanent}
                disabled={busy}
                aria-label={asset.status === 'delete_failed' ? 'Retry delete' : `Delete ${asset.original_file_name ?? 'media asset'}`}
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>{asset.status === 'delete_failed' ? 'Retry' : 'Delete'}</span>
              </Button>
            ) : <span aria-hidden="true" />}
          </div>
        )}
      </div>
    </Card>
  );
}
function UploadModal({ onClose, onUploaded }: { onClose(): void; onUploaded(asset: MediaAsset): void }) {
  const [purpose, setPurpose] = useState<MediaPurpose>('hero');
  const [altText, setAltText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const clientIdRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setError(null);
    if (!next) return;
    if (!imageTypes.includes(next.type)) {
      setFile(null);
      setError('Select a supported image file.');
      return;
    }
    clientIdRef.current = null;
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError('Select a supported image file.');
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('purpose', purpose);
      clientIdRef.current ??= createUploadClientId();
      form.set('client_id', clientIdRef.current);
      if (altText.trim()) form.set('alt_text', altText.trim());
      const uploaded = await uploadMediaAsset(form);
      setFile(null);
      setAltText('');
      setPurpose('hero');
      onUploaded(uploaded);
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upload Media Asset"
      description={maxHint}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} isLoading={busy}>
            {busy ? 'Uploading…' : 'Upload Image'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value as MediaPurpose)}
          options={mediaPurposes.map((item) => ({ label: item, value: item }))}
        />

        <Input
          label="Alt Text (Accessibility)"
          value={altText}
          maxLength={255}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Describe image for screen readers..."
        />

        <div>
          <label htmlFor="media-file-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Image file</label>
          <input
            id="media-file-input"
            className="focus-ring block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:border-sky-400"
            type="file"
            accept={imageTypes.join(',')}
            onChange={chooseFile}
          />
        </div>

        {preview && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col items-center">
            <img src={preview} alt="Selected preview" className="max-h-40 rounded-lg object-contain" />
            <p className="mt-2 text-xs font-medium text-slate-600">
              {file?.name} | {formatBytes(file?.size)}
            </p>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}
      </form>
    </Modal>
  );
}

function EditModal({
  asset,
  onClose,
  onSaved
}: {
  asset: MediaAsset;
  onClose(): void;
  onSaved(updated: MediaAsset): void;
}) {
  const [fileName, setFileName] = useState(asset.original_file_name || '');
  const [altText, setAltText] = useState(asset.alt_text || '');
  const [purpose, setPurpose] = useState<MediaPurpose>(asset.purpose || 'hero');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await updateMediaAsset(asset.id, {
        original_file_name: fileName.trim() || undefined,
        alt_text: altText.trim(),
        purpose
      });
      onSaved(updated);
    } catch (caught) {
      setError(safeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Image Details"
      description="Update image title, alt text for accessibility, or usage purpose."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} isLoading={busy}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Image Title / Name"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          placeholder="Original filename or title..."
        />

        <Input
          label="Alt Text (Accessibility)"
          value={altText}
          maxLength={255}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Describe image for screen readers..."
        />

        <Select
          label="Purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value as MediaPurpose)}
          options={mediaPurposes.map((item) => ({ label: item, value: item }))}
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-3">
          <img src={asset.variants.thumbnail?.url ?? asset.original_url ?? ''} alt={altText || fileName} className="h-16 w-16 rounded-lg object-cover" />
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-slate-800">{fileName || asset.original_file_name}</p>
            <p>{asset.width && asset.height ? `${asset.width} Ã— ${asset.height}` : 'Dimensions unavailable'} | {formatBytes(asset.file_size)}</p>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
      </form>
    </Modal>
  );
}

function PreviewModal({
  asset,
  onClose,
  onTrash,
  onRestore,
  onPermanent,
}: {
  asset: MediaAsset;
  onClose(): void;
  onTrash?: () => void;
  onRestore?: () => void;
  onPermanent?: () => void;
}) {
  const [copied, setCopied] = useState('');
  const variants = Object.entries(asset.variants).filter(([, value]) => value?.url);

  async function copy(url: string, label: string) {
    await navigator.clipboard?.writeText(url);
    setCopied(label);
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      maxWidth="2xl"
      title="Media Asset Details & Variants"
      footer={
        <div className="flex flex-wrap gap-2 w-full justify-between items-center">
          <div className="flex items-center gap-2">
            {asset.original_url && (
              <Button variant="outline" size="sm" onClick={() => void copy(asset.original_url!, 'original')}>
                <Copy size={14} />
                <span>Copy URL</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onTrash && (
              <Button variant="destructive" size="sm" className="col-span-full h-9 w-full whitespace-nowrap px-3" onClick={onTrash}>
                <Trash2 size={14} />
                <span>Trash</span>
              </Button>
            )}
            {onRestore && (
              <Button variant="primary" size="sm" onClick={onRestore}>
                Restore
              </Button>
            )}
            {onPermanent && (
              <Button variant="destructive" size="sm" className="col-span-full h-9 w-full whitespace-nowrap px-3" onClick={onPermanent}>
                Delete
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-900/5 p-4 flex items-center justify-center">
          <img
            src={asset.variants.content?.url ?? asset.original_url ?? ''}
            alt={asset.alt_text || asset.original_file_name || 'Media preview'}
            className="max-h-72 rounded-lg object-contain shadow-xs"
          />
        </div>

        <div className="grid gap-3 text-xs sm:grid-cols-2 border-t border-slate-100 pt-4">
          <div>
            <span className="text-slate-500">Filename:</span> <strong className="text-slate-900 font-semibold">{asset.original_file_name}</strong>
          </div>
          <div>
            <span className="text-slate-500">Purpose:</span> <strong className="text-slate-900 font-semibold capitalize">{asset.purpose}</strong>
          </div>
          <div>
            <span className="text-slate-500">Dimensions:</span> <strong className="text-slate-900 font-semibold">{asset.width ?? '-'} x {asset.height ?? '-'}</strong>
          </div>
          <div>
            <span className="text-slate-500">Size:</span> <strong className="text-slate-900 font-semibold">{formatBytes(asset.file_size)}</strong>
          </div>
          <div>
            <span className="text-slate-500">MIME:</span> <strong className="text-slate-900 font-semibold">{asset.output_mime_type}</strong>
          </div>
                    <div>
            <span className="text-slate-500">Uploaded by:</span> <strong className="text-slate-900 font-semibold">{asset.uploaded_by?.name ?? 'Unknown'}</strong>
          </div>
          <div>
            <span className="text-slate-500">Uploaded:</span> <strong className="text-slate-900 font-semibold">{formatDate(asset.created_at)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Status:</span> <strong className="text-slate-900 font-semibold capitalize">{asset.status.replace('_', ' ')}</strong>
          </div>
          <div className="sm:col-span-2">
            <span className="text-slate-500">Alt Text:</span> <strong className="text-slate-900 font-semibold">{asset.alt_text || 'None provided'}</strong>
          </div>
        </div>

        {/* Variant URLs */}
        {variants.length > 0 && (
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-700">Available image URLs</p>
            <div className="flex flex-wrap gap-2">
              {variants.map(([name, variant]) => (
                <Button key={name} variant="secondary" size="sm" onClick={() => void copy(variant!.url, name)}>
                  <Copy size={13} />
                  <span>Copy {name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {copied && (
          <p role="status" className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 size={14} />
            <span>Copied {copied} URL to clipboard.</span>
          </p>
        )}
      </div>
    </Modal>
  );
}






