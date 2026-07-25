/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Edit, RefreshCcw, Trash2, ArchiveRestore, Plus, Globe, FileEdit, Calendar, User, Search, SlidersHorizontal, Eye, LoaderCircle } from 'lucide-react';
import { PreviewDialog } from '@/components/blogs/blog-dialogs';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { Tabs } from '@/components/ui/tabs';
import { Select } from '@/components/ui/select';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, Skeleton } from '@/components/ui/empty-state';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Drawer } from '@/components/ui/drawer';
import { useAuth } from '@/components/auth/auth-provider';
import { getBlog, listBlogs, listTrashedBlogs, moveBlogToTrash, publishBlog, restoreBlog, unpublishBlog } from '@/services/blog.service';
import type { BlogDetail, BlogListItem, BlogListParams, BlogStatus } from '@/types/blog';

function canCreate(role?: string) {
  return role === 'super_admin' || role === 'editor' || role === 'author';
}
function canPublish(role?: string) {
  return role === 'super_admin' || role === 'editor';
}
function canTrash(blog: BlogListItem, adminId?: string, role?: string) {
  if (role === 'super_admin' || role === 'editor') return true;
  return role === 'author' && String(blog.author?.id) === String(adminId) && blog.status !== 'published';
}

function extractParams(searchParams: URLSearchParams, isTrash: boolean): BlogListParams {
  return {
    page: Number(searchParams.get('page') || '1'),
    limit: 20,
    search: searchParams.get('search') || undefined,
    status: isTrash ? undefined : ((searchParams.get('status') || '') as BlogStatus | ''),
    sort_by: (searchParams.get('sort_by') || (isTrash ? 'trashed_at' : 'updated_at')) as BlogListParams['sort_by'],
    sort_order: (searchParams.get('sort_order') || 'desc') as BlogListParams['sort_order'],
  };
}

export default function BlogsPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isTrash = searchParams.get('tab') === 'trash';

  const currentParams = useMemo(() => extractParams(searchParams, isTrash), [searchParams, isTrash]);
  const [items, setItems] = useState<BlogListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total_items: 0,
    total_pages: 0,
    has_next_page: false,
    has_previous_page: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchText, setSearchText] = useState(currentParams.search ?? '');
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  // Dialog states
  const [blogToTrash, setBlogToTrash] = useState<BlogListItem | null>(null);
  const [blogToUnpublish, setBlogToUnpublish] = useState<BlogListItem | null>(null);
  const [blogToRestore, setBlogToRestore] = useState<BlogListItem | null>(null);
  const [previewBlog, setPreviewBlog] = useState<BlogDetail | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftStatus, setDraftStatus] = useState<BlogStatus | ''>('');
  const [draftSortOrder, setDraftSortOrder] = useState<'asc' | 'desc'>('desc');

  async function load() {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const result = isTrash ? await listTrashedBlogs(currentParams) : await listBlogs(currentParams);
      if (id !== requestId.current) return;
      setItems(result.items);
      setPagination(result.pagination);
    } catch (caught) {
      if (id === requestId.current) setError(caught instanceof Error ? caught.message : 'Blogs request failed.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [isTrash, currentParams.page, currentParams.search, currentParams.status, currentParams.sort_by, currentParams.sort_order]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (searchText.trim()) next.set('search', searchText.trim());
      else next.delete('search');
      next.set('page', '1');
      if (next.toString() !== searchParams.toString()) {
        startTransition(() => router.replace(`${pathname}?${next.toString()}`));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, searchParams]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.set('page', '1');
    router.replace(`${pathname}?${next.toString()}`);
  }

  function openFilters() { setDraftStatus(currentParams.status ?? ''); setDraftSortOrder(currentParams.sort_order ?? 'desc'); setFilterOpen(true); }
  function applyFilters() { const next = new URLSearchParams(searchParams.toString()); if (!isTrash && draftStatus) next.set('status', draftStatus); else next.delete('status'); if (draftSortOrder === 'asc') next.set('sort_order', 'asc'); else next.delete('sort_order'); next.set('page', '1'); router.replace(pathname + '?' + next.toString()); setFilterOpen(false); }
  function clearFilters() { setDraftStatus(''); setDraftSortOrder('desc'); const next = new URLSearchParams(searchParams.toString()); next.delete('status'); next.delete('sort_order'); next.set('page', '1'); router.replace(pathname + '?' + next.toString()); setFilterOpen(false); }

  async function openPreview(blog: BlogListItem) {
    setError('');
    setPreviewLoadingId(blog.id);
    try {
      setPreviewBlog(await getBlog(blog.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Article preview could not be loaded.');
    } finally {
      setPreviewLoadingId(null);
    }
  }
  function setTab(tabId: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (tabId === 'trash') next.set('tab', 'trash');
    else next.delete('tab');
    next.delete('status');
    next.set('page', '1');
    router.replace(`${pathname}?${next.toString()}`);
  }

  async function executeAction(noticeMessage: string, actionFn: () => Promise<unknown>) {
    setError('');
    setActionLoading(true);
    try {
      await actionFn();
      setNotice(noticeMessage);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Blog action failed.');
    } finally {
      setActionLoading(false);
      setBlogToTrash(null);
      setBlogToUnpublish(null);
      setBlogToRestore(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blogs"
        description="Manage clinical articles, editorial drafts, search content, and monitor publishing status."
        action={
          canCreate(admin?.role) && !isTrash ? (
            <Link href="/blogs/create">
              <Button variant="primary" size="md" className="shadow-md shadow-sky-500/10">
                <Plus size={16} />
                <span>Create Blog</span>
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'active', label: 'Active Blogs' },
          { id: 'trash', label: 'Trash' },
        ]}
        activeTab={isTrash ? 'trash' : 'active'}
        onTabChange={setTab}
      />

      {/* Action alerts */}
      {notice && <Alert variant="success" onDismiss={() => setNotice('')}>{notice}</Alert>}

      {error && <Alert variant="error" onDismiss={() => setError('')} action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}

      {/* Blog tools */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[240px] flex-1">
            <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search blogs"
              aria-label="Search blogs"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-800 shadow-xs outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
            />
          </label>
          <Button variant="outline" size="sm" onClick={openFilters} className="h-10 rounded-xl px-3.5">
            <SlidersHorizontal size={16} />
            <span>Filters</span>
            {(Boolean(currentParams.status) || currentParams.sort_order === 'asc') && <span className="ml-0.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{Number(Boolean(currentParams.status)) + Number(currentParams.sort_order === 'asc')}</span>}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading || pending} aria-label="Refresh blogs" title="Refresh blogs" className="h-10 w-10 rounded-xl px-0">
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
        {(currentParams.status || currentParams.sort_order === 'asc') && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400">Active:</span>
{currentParams.status && <button type="button" onClick={() => setFilter('status', '')} className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100">Status: {currentParams.status} x</button>}
{currentParams.sort_order === 'asc' && <button type="button" onClick={() => setFilter('sort_order', '')} className="rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700 hover:bg-sky-100">Oldest first x</button>}
            <button type="button" onClick={clearFilters} className="px-1 font-semibold text-slate-500 hover:text-slate-800">Clear all</button>
          </div>
        )}
      </div>

      <Drawer
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter blogs"
        description="Narrow the blog list by status or last update."
        size="sm"
        footer={<><Button variant="ghost" onClick={() => setFilterOpen(false)}>Cancel</Button><Button variant="primary" onClick={applyFilters}>Apply filters</Button></>}
      >
        <div className="space-y-5">
          {!isTrash && (
            <Select
              label="Status"
              aria-label="Status filter"
              value={draftStatus}
              onChange={(event) => setDraftStatus(event.target.value as BlogStatus | '')}
              options={[{ label: 'All statuses', value: '' }, { label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }, { label: 'Unpublished', value: 'unpublished' }]}
            />
          )}
          <Select
            label="Sort by"
            aria-label="Sort blogs"
            value={draftSortOrder}
            onChange={(event) => setDraftSortOrder(event.target.value as 'asc' | 'desc')}
            options={[{ label: 'Newest updated', value: 'desc' }, { label: 'Oldest updated', value: 'asc' }]}
          />
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-sky-700 hover:text-sky-900">Clear filters</button>
        </div>
      </Drawer>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {/* Empty States */}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          type={searchText ? 'search' : 'empty'}
          title={isTrash ? 'Trash is Empty' : searchText ? 'No Matching Blogs Found' : 'No Blogs Created Yet'}
          description={
            isTrash
              ? 'No blog articles have been moved to trash.'
              : searchText
              ? `No articles matched "${searchText}". Try clearing search filters.`
              : 'Get started by creating your first blog article.'
          }
          action={
            !isTrash && canCreate(admin?.role) && !searchText
              ? {
                  label: 'Create First Blog',
                  onClick: () => router.push('/blogs/create'),
                }
              : undefined
          }
        />
      )}

      {/* Blog Cards List */}
      {!loading && items.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((blog) => (
            <Card key={blog.id} interactive className="p-0">
              <div className="relative h-36 overflow-hidden border-b border-slate-100 bg-slate-50">
                <button
                  type="button"
                  className="group relative block h-full w-full overflow-hidden text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-500"
                  onClick={() => void openPreview(blog)}
                  disabled={previewLoadingId === blog.id}
                  aria-label={`Preview ${blog.title}`}
                >
                  {blog.featured_media?.original_url ? (
                    <Image src={blog.featured_media.original_url} alt={blog.featured_media.alt_text ?? ''} fill sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105" unoptimized />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300 transition-transform duration-300 group-hover:scale-105 group-focus-visible:scale-105">
                      <FileEdit size={30} strokeWidth={1.5} />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center gap-2 bg-slate-950/45 text-sm font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    {previewLoadingId === blog.id ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                    {previewLoadingId === blog.id ? 'Loading preview' : 'Preview Article'}
                  </span>
                </button>
                <div className="pointer-events-none absolute right-3 top-3 z-10"><StatusBadge status={blog.status} size="sm" className="shadow-sm" /></div>
                {blog.has_unpublished_changes && <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-sky-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">Unpublished changes</span>}
              </div>
              <div className="space-y-3 p-5">
                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-sky-700">/{blog.slug}</p>
                <h3 className="min-h-12 text-base font-semibold leading-6 text-slate-900 line-clamp-2" title={blog.title}>{blog.title}</h3>
                <p className="min-h-10 text-sm leading-5 text-slate-500 line-clamp-2">{blog.excerpt || 'No article summary has been provided.'}</p>
                <div className="flex min-w-0 items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <User size={13} className="shrink-0 text-slate-400" />
                  <span className="truncate font-semibold text-slate-700">{blog.author?.name ?? 'Unknown'}</span>
                  <span className="text-slate-300" aria-hidden="true">|</span>
                  <Calendar size={13} className="shrink-0 text-slate-400" />
                  <time className="shrink-0" dateTime={blog.updated_at}>Updated {new Date(blog.updated_at).toLocaleDateString()}</time>
                </div>
                {blog.published_at && <p className="text-[11px] text-slate-500"><time dateTime={blog.published_at}>Published {new Date(blog.published_at).toLocaleDateString()}</time></p>}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-4">
                {!isTrash ? (
                  <div className="grid grid-cols-3 gap-2">
                    <Link href={'/blogs/' + blog.id + '/edit'} className="min-w-0">
                      <Button variant="outline" size="sm" className="h-10 w-full px-2">
                        <Edit size={14} aria-hidden="true" />
                        <span>Edit</span>
                      </Button>
                    </Link>

                    {canTrash(blog, admin?.id, admin?.role) ? (
                      <Button variant="outline" size="sm" className="h-10 w-full border-rose-200 px-2 text-rose-700 hover:border-rose-300 hover:bg-rose-50" onClick={() => setBlogToTrash(blog)} disabled={actionLoading}>
                        <Trash2 size={14} aria-hidden="true" />
                        <span>Delete</span>
                      </Button>
                    ) : <span aria-hidden="true" />}

                    {blog.status !== 'published' && canPublish(admin?.role) ? (
                      <Button variant="primary" size="sm" className="h-10 w-full px-2" onClick={() => void executeAction('Blog article published.', () => publishBlog(blog.id))} disabled={actionLoading}>
                        <Globe size={14} aria-hidden="true" />
                        <span>Publish</span>
                      </Button>
                    ) : blog.status === 'published' && canPublish(admin?.role) ? (
                      <Button variant="outline" size="sm" className="h-10 w-full px-2" onClick={() => setBlogToUnpublish(blog)} disabled={actionLoading}>
                        <Globe size={14} aria-hidden="true" />
                        <span>Unpublish</span>
                      </Button>
                    ) : <span aria-hidden="true" />}
                  </div>
                ) : (
                  <Button variant="primary" size="sm" className="h-10 w-full" onClick={() => setBlogToRestore(blog)} disabled={actionLoading}>
                    <ArchiveRestore size={14} aria-hidden="true" /><span>Restore article</span>
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination && items.length > 0 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.total_pages}
          totalItems={pagination.total_items}
          itemsPerPage={pagination.limit}
          onPageChange={(p) => setFilter('page', String(p))}
        />
      )}

      {/* Side-Slide Confirmations (replaces popups) */}
      <ConfirmationDialog
        isOpen={Boolean(blogToTrash)}
        onClose={() => setBlogToTrash(null)}
        onConfirm={() => {
          if (blogToTrash) {
            void executeAction('Blog moved to Trash.', () => moveBlogToTrash(blogToTrash.id));
          }
        }}
        title="Move Blog to Trash"
        message={
          <p>
            Are you sure you want to move <strong>&quot;{blogToTrash?.title}&quot;</strong> to trash? The article will be unlisted from active views, but its data and history remain safely restorable.
          </p>
        }
        confirmText="Move to Trash"
        variant="destructive"
        isLoading={actionLoading}
      />

      <ConfirmationDialog
        isOpen={Boolean(blogToUnpublish)}
        onClose={() => setBlogToUnpublish(null)}
        onConfirm={() => {
          if (blogToUnpublish) {
            void executeAction('Blog unpublished.', () => unpublishBlog(blogToUnpublish.id));
          }
        }}
        title="Unpublish Blog"
        message={
          <p>
            Are you sure you want to unpublish <strong>&quot;{blogToUnpublish?.title}&quot;</strong>? It will revert to draft status and no longer be publicly accessible.
          </p>
        }
        confirmText="Unpublish Article"
        variant="warning"
        isLoading={actionLoading}
      />

      <ConfirmationDialog
        isOpen={Boolean(blogToRestore)}
        onClose={() => setBlogToRestore(null)}
        onConfirm={() => {
          if (blogToRestore) void executeAction('Blog article restored.', () => restoreBlog(blogToRestore.id));
        }}
        title="Restore blog article?"
        message={<p><strong>&quot;{blogToRestore?.title}&quot;</strong> will return to the active blog list with its previous workflow status.</p>}
        confirmText="Restore article"
        variant="info"
        isLoading={actionLoading}
      />

      {previewBlog && (() => {
        const version = previewBlog.draft_version ?? previewBlog.published_version;
        return (
          <PreviewDialog
            open
            onClose={() => setPreviewBlog(null)}
            image={previewBlog.featured_media?.original_url}
            imageAlt={previewBlog.featured_media?.alt_text}
            title={version?.title ?? previewBlog.title}
            excerpt={version?.excerpt ?? previewBlog.excerpt ?? ''}
            html={version?.content_html ?? ''}
            seoTitle={version?.seo_title ?? ''}
            seoDescription={version?.seo_description ?? ''}
            slug={previewBlog.slug}
            templateKey={version?.template_key ?? 'template_1'}
            templateVersion={version?.template_version ?? 1}
            customTemplateConfig={version?.template_config_json}
            blocks={version?.blocks_json as import('@/types/blog-blocks').BlogBlocksDocument | undefined}
            content={version?.content_json as import('@/types/blog').TipTapDocument | undefined}
            author={previewBlog.author?.name}
            updatedAt={previewBlog.updated_at}
          />
        );
      })()}    </div>
  );
}
