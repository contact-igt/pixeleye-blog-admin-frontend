/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getMediaAsset, listMediaAssets } from '@/services/media.service';
import type { MediaAsset } from '@/types/media';

export function BlockMediaPicker({ value, label, onChange, onResolved, error }: {
  value: string | null;
  label: string;
  onChange: (id: string | null, media: MediaAsset | null) => void;
  onResolved?: (id: string, media: MediaAsset) => void;
  error?: string;
}) {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value) return;
    if (selected?.id === value) return;
    void getMediaAsset(value).then((media) => { setSelected(media); onResolved?.(value, media); }).catch(() => setSelected(null));
  }, [value, selected?.id, onResolved]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void listMediaAssets({ search, page, limit: 8, status: 'active' }).then((result) => {
        setItems(result.items.filter((item) => item.status === 'active'));
        setPages(result.pagination.total_pages || 1);
      }).catch(() => undefined);
    }, 200);
    return () => clearTimeout(timer);
  }, [open, search, page]);

  return <div className="space-y-2">
    <p className="text-xs font-bold text-slate-700">{label}</p>
    {selected?.original_url ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <img src={selected.variants.thumbnail?.url ?? selected.original_url} alt={selected.alt_text ?? ''} className="h-28 w-full object-cover" />
      <div className="flex items-center justify-between gap-2 p-3"><span className="truncate text-xs font-semibold">{selected.original_file_name}</span><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>Replace</Button></div>
    </div> : <button type="button" onClick={() => setOpen(true)} className="grid h-24 w-full place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-600"><span><ImageIcon size={18} className="mx-auto mb-1 text-slate-400" />Choose active media</span></button>}
    {value && <button type="button" className="text-xs font-semibold text-rose-600" onClick={() => { setSelected(null); onChange(null, null); }}>Remove image</button>}
    {error && <p className="text-xs text-rose-600">{error}</p>}
    {open && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">Choose media</p><button type="button" aria-label="Close media picker" onClick={() => setOpen(false)}><X size={16} /></button></div>
      <label className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="Search active media" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm" /></label>
      <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-auto">{items.map((item) => <button key={item.id} type="button" onClick={() => { setSelected(item); onChange(item.id, item); setOpen(false); }} className="rounded-lg border border-slate-200 bg-white p-2 text-left hover:border-sky-300"><img src={item.variants.thumbnail?.url ?? item.original_url ?? ''} alt={item.alt_text ?? ''} className="h-20 w-full rounded object-cover" /><span className="mt-1 block truncate text-xs font-semibold">{item.original_file_name}</span></button>)}</div>
      <div className="mt-3 flex items-center justify-between"><Button type="button" variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((old) => old - 1)}>Previous</Button><span className="text-xs">{page} / {pages}</span><Button type="button" variant="ghost" size="sm" disabled={page >= pages} onClick={() => setPage((old) => old + 1)}>Next</Button></div>
    </div>}
  </div>;
}
