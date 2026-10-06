'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { listBlogs } from '@/services/blog.service';
import type { BlogListItem } from '@/types/blog';

function formatDate(value: string | null) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.valueOf())
    ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
    : '';
}

/**
 * Lets the author hand-pick published blogs for the "Related" list of the Recent & Related Blogs component.
 * Selection order is kept (the website lists them in this order), the blog being edited is never offered,
 * and the number of picks is capped by the template component's "Maximum blogs" setting.
 */
export function RelatedBlogsPicker({ value, onChange, max, currentBlogId }: {
  value: string[];
  onChange: (ids: string[]) => void;
  max: number;
  currentBlogId?: string;
}) {
  const [blogs, setBlogs] = useState<BlogListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await listBlogs({ status: 'published', limit: 100, sort_by: 'published_at', sort_order: 'desc' });
      setBlogs(response.items);
    } catch {
      setLoadError('Published blogs could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const candidates = useMemo(() => blogs.filter((blog) => String(blog.id) !== String(currentBlogId ?? '')), [blogs, currentBlogId]);
  const byId = useMemo(() => new Map(candidates.map((blog) => [String(blog.id), blog])), [candidates]);
  const selected = value.map((id) => ({ id, blog: byId.get(id) }));
  const atLimit = value.length >= max;
  const query = search.trim().toLowerCase();
  const visible = candidates.filter((blog) => !query || blog.title.toLowerCase().includes(query));

  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else if (!atLimit) onChange([...value, id]);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs leading-5 text-slate-500">
        Pick the published blogs to show in the <strong>Related</strong> tab for this article. If you pick none, the website falls back to blogs in the same category.
      </p>

      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-600">
        <span>Selected</span>
        <span className="text-slate-400">{value.length}/{max}</span>
      </div>

      {selected.length > 0 ? (
        <ul className="space-y-2" aria-label="Selected related blogs">
          {selected.map(({ id, blog }, index) => (
            <li key={id} className="flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2 text-sm">
              <span className="min-w-0 break-words font-semibold text-slate-800">{index + 1}. {blog?.title ?? `Blog #${id} (not available)`}</span>
              <button type="button" aria-label={`Remove ${blog?.title ?? `blog ${id}`}`} onClick={() => toggle(id)} className="shrink-0 rounded p-1 text-rose-600 hover:bg-rose-50">
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">No blogs selected yet.</p>
      )}

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          aria-label="Search published blogs"
          placeholder="Search published blogs..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-sky-500 focus:outline-hidden focus:ring-4 focus:ring-sky-100"
        />
      </div>

      {loading ? <p className="text-xs text-slate-500" role="status">Loading published blogs...</p> : null}
      {loadError ? (
        <Alert variant="error" action={<Button type="button" size="sm" variant="outline" onClick={() => void load()}>Retry</Button>}>{loadError}</Alert>
      ) : null}
      {!loading && !loadError && candidates.length === 0 ? <p className="text-xs text-slate-500">There are no other published blogs to choose from yet.</p> : null}

      {visible.length > 0 ? (
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2" aria-label="Published blogs">
          {visible.map((blog) => {
            const id = String(blog.id);
            const checked = value.includes(id);
            const disabled = !checked && atLimit;
            return (
              <li key={id}>
                <label className={`flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-slate-50'}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(id)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                  <span className="min-w-0">
                    <span className="block break-words font-semibold text-slate-800">{blog.title}</span>
                    <span className="block text-xs text-slate-500">{formatDate(blog.published_at)}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
      {!loading && candidates.length > 0 && visible.length === 0 ? <p className="text-xs text-slate-500">No published blog matches &ldquo;{search}&rdquo;.</p> : null}
      {atLimit ? <p className="text-xs font-semibold text-amber-700">Maximum of {max} related blogs reached. Remove one to pick another.</p> : null}
    </div>
  );
}
