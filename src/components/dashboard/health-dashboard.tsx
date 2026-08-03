'use client';

import { Activity, ArrowRight, Clock3, Database, FileText, Image as ImageIcon, RefreshCw, Server } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { getHealth } from '@/services/health.service';
import type { HealthData } from '@/types/health';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';

export function HealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await getHealth(); setHealth(response.data); }
    catch { setHealth(null); setError('Backend unavailable'); }
    finally { setLoading(false); }
  }, []);

useEffect(() => {
    let active = true;
    void getHealth()
      .then((response) => { if (active) setHealth(response.data); })
      .catch(() => { if (active) { setHealth(null); setError('Backend unavailable'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-7">
      <PageHeader title="System dashboard" description="Check platform availability and open the content tools you use every day." action={<Button variant="outline" size="sm" onClick={() => void load()} isLoading={loading}><RefreshCw size={14} aria-hidden="true" />Refresh status</Button>} />

      {error && <Alert variant="error" title="Service connection issue" action={<Button variant="outline" size="sm" onClick={() => void load()}>Retry connection</Button>} className="items-center" ><span data-testid="error-state"><strong>{error}</strong><span>. Content tools may be temporarily unavailable.</span></span></Alert>}

      <section aria-labelledby="platform-status-title">
        <div className="mb-3 flex items-center justify-between gap-3"><div><h2 id="platform-status-title" className="text-base font-semibold text-slate-950">Platform status</h2><p className="mt-1 text-sm text-slate-500">Live information returned by the existing health service.</p></div><StatusBadge status={loading ? 'checking' : health ? 'healthy' : 'unavailable'} size="md" /></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
          {loading ? Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />) : <>
            <MetricCard icon={Server} label="API status" value={health ? 'Online' : 'Unavailable'} status={health ? 'healthy' : 'unavailable'} />
            <MetricCard icon={Database} label="Database" value={health?.database ?? 'Unavailable'} status={health?.database === 'connected' ? 'healthy' : 'unavailable'} />
            <MetricCard icon={Activity} label="Environment" value={health?.environment ?? 'Unavailable'} status={health ? 'healthy' : 'unavailable'} />
            <MetricCard icon={Clock3} label="Response time" value={health ? `${health.response_time_ms} ms` : 'Unavailable'} status={!health ? 'unavailable' : health.response_time_ms < 300 ? 'healthy' : 'checking'} />
          </>}
        </div>
      </section>

      <section aria-labelledby="workspace-title">
        <div className="mb-3"><h2 id="workspace-title" className="text-base font-semibold text-slate-950">Content workspace</h2><p className="mt-1 text-sm text-slate-500">Quick access to the modules available in this deployment.</p></div>
        <div className="grid gap-4 md:grid-cols-2">
          <WorkspaceCard icon={FileText} title="Blogs" description="Create drafts, edit article content, manage SEO metadata, and control publication status." href="/blogs" action="Manage blogs" secondaryHref="/blogs/create" secondaryAction="Create article" tone="sky" />
          <WorkspaceCard icon={ImageIcon} title="Media Library" description="Upload eye-care images, maintain alt text, preview variants, and manage retained assets." href="/media" action="Open library" tone="emerald" />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, status }: { icon: typeof Server; label: string; value: string; status: 'healthy' | 'unavailable' | 'checking' }) {
  const tone = status === 'healthy' ? 'bg-emerald-50 text-emerald-700' : status === 'checking' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700';
  return <Card className="p-5"><div className="flex items-start justify-between gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${tone}`}><Icon size={19} aria-hidden="true" /></span><StatusBadge status={status} size="sm" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p><p className="mt-1 truncate text-xl font-semibold capitalize text-slate-950">{value}</p></Card>;
}

function WorkspaceCard({ icon: Icon, title, description, href, action, secondaryHref, secondaryAction, tone }: { icon: typeof FileText; title: string; description: string; href: string; action: string; secondaryHref?: string; secondaryAction?: string; tone: 'sky' | 'emerald' }) {
  const iconTone = tone === 'sky' ? 'bg-sky-50 text-sky-700' : 'bg-emerald-50 text-emerald-700';
  return <Card as="article" className="p-0"><div className="flex gap-4 p-5"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconTone}`}><Icon size={21} aria-hidden="true" /></span><div><h3 className="font-semibold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div></div><div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">{secondaryHref && secondaryAction && <Link href={secondaryHref}><Button size="sm">{secondaryAction}</Button></Link>}<Link href={href}><Button variant={secondaryHref ? 'ghost' : 'outline'} size="sm">{action}<ArrowRight size={14} aria-hidden="true" /></Button></Link></div></Card>;
}