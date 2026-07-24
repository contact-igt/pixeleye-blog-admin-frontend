/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listMediaAssets } from '@/services/media.service';
import type { MediaAsset } from '@/types/media';

export function FeaturedMediaPicker({ value, initial, onChange, error }: { value: string | null; initial?: Partial<MediaAsset> | null; onChange: (id: string | null, media: MediaAsset | null) => void; error?: string }) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<Partial<MediaAsset> | null>(initial ?? null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void listMediaAssets({ search, page, limit: 8, status: 'active' })
        .then((result) => {
          setItems(result.items.filter((item) => item.status === 'active'));
          setPages(result.pagination.total_pages || 1);
        })
        .catch(() => undefined);
    }, 200);
    return () => clearTimeout(timer);
  }, [open, search, page]);

  const choose = (item: MediaAsset) => {
    setSelected(item);
    onChange(item.id, item);
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      {selected?.original_url ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <img src={selected.original_url} alt={selected.alt_text ?? 'Selected featured media'} className="h-40 w-full object-cover" />
          <div className="flex items-center justify-between gap-2 p-3">
            <p className="min-w-0 truncate text-xs font-semibold text-slate-700">{selected.original_file_name}</p>
            <Button type="button" variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => setOpen(true)}>Change</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="grid h-28 w-full place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-sky-400 hover:bg-sky-50/40">
          <span><ImageIcon size={20} className="mx-auto mb-2 text-slate-400" /><span className="text-sm font-semibold text-slate-600">Choose featured image</span><span className="mt-1 block text-xs text-slate-400">Used in article listings and previews</span></span>
        </button>
      )}

      {value && <button type="button" className="text-xs font-semibold text-rose-600 hover:text-rose-700" onClick={() => { setSelected(null); onChange(null, null); }}>Remove image</button>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {open && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold text-slate-800">Choose featured image</p><button type="button" aria-label="Close media picker" onClick={() => setOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"><X size={16} /></button></div>
          <label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search active media" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search media" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-400" /></label>
          <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-auto">{items.map((item) => <button key={item.id} type="button" aria-label={item.original_file_name ?? 'Select media'} onClick={() => choose(item)} className={`rounded-lg border bg-white p-2 text-left ${String(value) === String(item.id) ? 'border-sky-500 ring-1 ring-sky-200' : 'border-slate-200 hover:border-sky-300'}`}><img src={item.variants.thumbnail?.url ?? item.original_url ?? ''} alt={item.alt_text ?? ''} className="h-20 w-full rounded-md object-cover" /><span className="mt-1 block truncate text-xs font-semibold text-slate-700">{item.original_file_name}</span></button>)}</div>
          <div className="mt-3 flex items-center justify-between text-xs"><Button type="button" variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="text-slate-500">{page} / {pages}</span><Button type="button" variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>Next</Button></div>
        </div>
      )}
    </div>
  );
}
