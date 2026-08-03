'use client';

import Link from 'next/link';
import { Activity, AlertTriangle, BarChart3, CheckCircle2, Clock3, Send, Users } from 'lucide-react';
import type { DashboardInsights } from '@/types/dashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';

interface DashboardInsightsPanelsProps {
  insights: DashboardInsights;
  missingAltTextCount: number;
}

function formatDate(value: string | null) {
  if (!value) return 'No heartbeat recorded';
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function activityLabel(action: string) {
  return action.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardInsightsPanels({ insights, missingAltTextCount }: DashboardInsightsPanelsProps) {
  const { editorial, media_quality: mediaQuality, newsletter, feedback, recent_campaigns: recentCampaigns, recent_activity: recentActivity } = insights;
  const attentionItems = [
    editorial.unpublished > 0 && { count: editorial.unpublished, label: 'unpublished article', href: '/blogs', tone: 'amber' },
    mediaQuality.failed_deletion_count > 0 && { count: mediaQuality.failed_deletion_count, label: 'media deletion failure', href: '/media', tone: 'rose' },
    missingAltTextCount > 0 && { count: missingAltTextCount, label: 'media asset missing alt text', href: '/media', tone: 'amber' },
    newsletter.subscribers.pending > 0 && { count: newsletter.subscribers.pending, label: 'subscriber awaiting verification', href: '/newsletter/subscribers', tone: 'amber' },
    newsletter.campaigns.failed > 0 && { count: newsletter.campaigns.failed, label: 'failed newsletter campaign', href: '/newsletter/campaigns', tone: 'rose' },
    newsletter.deliveries.failed + newsletter.deliveries.uncertain > 0 && { count: newsletter.deliveries.failed + newsletter.deliveries.uncertain, label: 'delivery requiring review', href: '/newsletter/campaigns', tone: 'rose' },
    newsletter.campaigns.paused > 0 && { count: newsletter.campaigns.paused, label: 'paused newsletter campaign', href: '/newsletter/campaigns', tone: 'amber' },
    newsletter.worker.worker_status !== 'active' && { count: 1, label: `newsletter worker is ${newsletter.worker.worker_status}`, href: '/newsletter/campaigns', tone: 'amber' }
  ].filter(Boolean) as Array<{ count: number; label: string; href: string; tone: 'amber' | 'rose' }>;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Publishing and newsletter insights">
        <InsightCard icon={Users} title="Newsletter Audience" value={newsletter.subscribers.subscribed} detail={`${newsletter.subscribers.pending} pending | ${newsletter.subscribers.unsubscribed} unsubscribed`} href="/newsletter/subscribers" action="Manage subscribers" tone="sky" />
        <InsightCard icon={Send} title="Campaign Delivery" value={newsletter.campaigns.active} detail={`${newsletter.campaigns.paused} paused | ${newsletter.campaigns.failed} failed | ${newsletter.deliveries.retry_pending} retrying`} href="/newsletter/campaigns" action="View campaigns" tone="violet" />
        <InsightCard icon={BarChart3} title="Reader Feedback" value={`${feedback.helpful_percentage}%`} detail={feedback.total_count ? `${feedback.total_count} votes | ${feedback.yes_count} helpful` : 'No reader votes yet'} href="/blogs" action="View articles" tone="emerald" />
        <InsightCard icon={Activity} title="Content Activity" value={editorial.published_last_30_days} detail={`${editorial.created_last_7_days} created | ${mediaQuality.uploaded_last_7_days} media uploaded this week`} href="/blogs" action="View articles" tone="amber" />
      </section>

      <section aria-labelledby="attention-title">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="attention-title" className="flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle size={17} className="text-amber-600" />Needs attention</h2>
              <p className="mt-1 text-xs text-slate-500">Items that may need an administrator review.</p>
            </div>
            {attentionItems.length === 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={14} />All clear</span>}
          </div>
          {attentionItems.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {attentionItems.map((item) => <Link key={item.label} href={item.href} className={`focus-ring flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm ${item.tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <span><strong>{item.count}</strong> {item.label}{item.count === 1 ? '' : 's'}</span><span aria-hidden="true">?</span>
            </Link>)}
          </div>}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_1fr_1fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3"><div><h2 className="font-semibold text-slate-900">Recent Campaigns</h2><p className="mt-1 text-xs text-slate-500">Latest newsletter delivery activity.</p></div><Link href="/newsletter/campaigns"><Button variant="outline" size="sm">View all</Button></Link></div>
          <div className="mt-3 divide-y divide-slate-100">
            {recentCampaigns.length ? recentCampaigns.map((campaign) => <Link key={campaign.id} href={`/newsletter/campaigns/${campaign.id}`} className="focus-ring block py-3 first:pt-0 last:pb-0"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-slate-900">{campaign.subject}</p><StatusBadge status={campaign.status} size="sm" /></div><p className="mt-1 text-xs text-slate-500">{campaign.sent_count}/{campaign.total_recipients} sent{campaign.failed_count ? ` | ${campaign.failed_count} failed` : ''}</p></Link>) : <p className="py-6 text-center text-sm text-slate-500">No newsletter campaigns yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="border-b border-slate-100 pb-3"><h2 className="font-semibold text-slate-900">Newsletter Operations</h2><p className="mt-1 text-xs text-slate-500">Worker and SMTP readiness.</p></div>
          <div className="mt-4 space-y-3 text-sm">
            <OperationRow label="Worker" value={newsletter.worker.worker_status} healthy={newsletter.worker.worker_status === 'active'} />
            <OperationRow label="SMTP" value={newsletter.worker.smtp_status} healthy={newsletter.worker.smtp_status === 'ready'} />
            <OperationRow label="Queue" value={`${newsletter.deliveries.pending + newsletter.deliveries.processing} active`} healthy={newsletter.deliveries.failed + newsletter.deliveries.uncertain === 0} />
            <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-500"><Clock3 size={13} />Last heartbeat: {formatDate(newsletter.worker.latest_heartbeat_at)}</p>
          </div>
        </Card>

        <Card className="p-5">
          <div className="border-b border-slate-100 pb-3"><h2 className="font-semibold text-slate-900">Recent Admin Activity</h2><p className="mt-1 text-xs text-slate-500">Latest recorded administrator actions.</p></div>
          <div className="mt-3 divide-y divide-slate-100">
            {recentActivity.length ? recentActivity.map((activity) => <div key={activity.id} className="py-3 first:pt-0 last:pb-0"><p className="text-sm font-medium text-slate-900">{activityLabel(activity.action)}</p><p className="mt-1 text-xs text-slate-500">{activity.actor_name ? `By ${activity.actor_name} ? ` : ''}{formatDate(activity.created_at)}</p></div>) : <p className="py-6 text-center text-sm text-slate-500">No recent activity.</p>}
          </div>
        </Card>
      </section>
    </>
  );
}

function InsightCard({ icon: Icon, title, value, detail, href, action, tone }: { icon: typeof Users; title: string; value: string | number; detail: string; href: string; action: string; tone: 'sky' | 'violet' | 'emerald' | 'amber' }) {
  const classes = { sky: 'bg-sky-50 text-sky-700', violet: 'bg-violet-50 text-violet-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700' };
  return <Card className="p-5"><span className={`grid h-10 w-10 place-items-center rounded-xl ${classes[tone]}`}><Icon size={19} /></span><p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p><Link href={href} className="focus-ring mt-3 inline-block text-xs font-semibold text-sky-700 hover:text-sky-900">{action} ?</Link></Card>;
}

function OperationRow({ label, value, healthy }: { label: string; value: string; healthy: boolean }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{value.replaceAll('_', ' ')}</span></div>;
}

