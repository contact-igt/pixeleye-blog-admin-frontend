'use client';

import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  Image as ImageIcon,
  Mail,
  Megaphone,
  Users
} from 'lucide-react';
import type { DashboardStats } from '@/types/dashboard';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

interface DashboardDetailReportProps {
  stats: DashboardStats;
}

function formatDate(value: string | null) {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function activityLabel(action: string) {
  return action.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function DashboardDetailReport({ stats }: DashboardDetailReportProps) {
  const detailedDataUnavailable = !stats.insights;
  const insights = stats.insights ?? {
    editorial: {
      unpublished: 0,
      published_last_7_days: 0,
      published_last_30_days: 0,
      created_last_7_days: 0,
      created_last_30_days: 0
    },
    media_quality: {
      failed_deletion_count: 0,
      uploaded_last_7_days: 0,
      missing_alt_assets: []
    },
    newsletter: {
      subscribers: { total: 0, subscribed: 0, pending: 0, unsubscribed: 0 },
      campaigns: { total: 0, draft: 0, active: 0, paused: 0, completed: 0, failed: 0 },
      deliveries: { pending: 0, processing: 0, sent: 0, retry_pending: 0, failed: 0, uncertain: 0 },
      worker: {
        worker_status: 'unavailable',
        claim_status: 'unknown',
        database_status: 'unknown',
        smtp_status: 'unknown',
        active_worker_count: 0,
        stale_worker_count: 0,
        latest_heartbeat_at: null,
        heartbeat_age_seconds: null,
        latest_worker: null
      }
    },
    feedback: { yes_count: 0, no_count: 0, total_count: 0, helpful_percentage: 0 },
    recent_campaigns: [],
    recent_activity: []
  };

  const { editorial, media_quality: mediaQuality, newsletter, feedback } = insights;
  const workerError = newsletter.worker.latest_worker?.last_error_message ?? null;
  const attentionItems = [
    editorial.unpublished > 0 && { count: editorial.unpublished, label: 'Unpublished articles', href: '/blogs', tone: 'amber' },
    stats.media.missing_alt_text_count > 0 && { count: stats.media.missing_alt_text_count, label: 'Media missing alt text', href: '/media', tone: 'amber' },
    mediaQuality.failed_deletion_count > 0 && { count: mediaQuality.failed_deletion_count, label: 'Media deletion failures', href: '/media', tone: 'rose' },
    newsletter.subscribers.pending > 0 && { count: newsletter.subscribers.pending, label: 'Pending subscriber verifications', href: '/newsletter/subscribers', tone: 'amber' },
    newsletter.campaigns.paused > 0 && { count: newsletter.campaigns.paused, label: 'Paused campaigns', href: '/newsletter/campaigns', tone: 'amber' },
    newsletter.campaigns.failed > 0 && { count: newsletter.campaigns.failed, label: 'Failed campaigns', href: '/newsletter/campaigns', tone: 'rose' },
    newsletter.deliveries.failed + newsletter.deliveries.uncertain > 0 && {
      count: newsletter.deliveries.failed + newsletter.deliveries.uncertain,
      label: 'Deliveries requiring review',
      href: '/newsletter/campaigns',
      tone: 'rose'
    },
    newsletter.worker.worker_status !== 'active' && {
      count: 1,
      label: `Newsletter worker: ${newsletter.worker.worker_status.replaceAll('_', ' ')}`,
      href: '/newsletter/campaigns',
      tone: 'amber'
    }
  ].filter(Boolean) as Array<{ count: number; label: string; href: string; tone: 'amber' | 'rose' }>;

  return (
    <div className="space-y-6">
      {detailedDataUnavailable && (
        <Alert variant="warning" title="Live detailed data is unavailable">
          The report layout is ready, but the connected API is using an older dashboard response. Localhost now automatically uses the local API.
        </Alert>
      )}

      <section aria-labelledby="detailed-reporting-title">
        <div className="mb-3">
          <h2 id="detailed-reporting-title" className="text-base font-semibold text-slate-950">Detailed Reporting</h2>
          <p className="mt-1 text-sm text-slate-500">Editorial, newsletter, media-quality, and reader-engagement data.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <BreakdownCard
            icon={Users}
            title="Newsletter Audience"
            primaryLabel="Total subscribers"
            primaryValue={newsletter.subscribers.total}
            rows={[
              ['Subscribed', newsletter.subscribers.subscribed],
              ['Pending verification', newsletter.subscribers.pending],
              ['Unsubscribed', newsletter.subscribers.unsubscribed]
            ]}
            href="/newsletter/subscribers"
            action="Manage subscribers"
            tone="sky"
          />

          <BreakdownCard
            icon={Megaphone}
            title="Campaign Status"
            primaryLabel="Total campaigns"
            primaryValue={newsletter.campaigns.total}
            rows={[
              ['Drafts', newsletter.campaigns.draft],
              ['Active / sending', newsletter.campaigns.active],
              ['Paused', newsletter.campaigns.paused],
              ['Completed', newsletter.campaigns.completed],
              ['Failed', newsletter.campaigns.failed]
            ]}
            href="/newsletter/campaigns"
            action="Review campaigns"
            tone="violet"
          />

          <BreakdownCard
            icon={Mail}
            title="Campaign Delivery"
            primaryLabel="Active queue"
            primaryValue={newsletter.deliveries.pending + newsletter.deliveries.processing}
            rows={[
              ['Sent', newsletter.deliveries.sent ?? 0],
              ['Queued / pending', newsletter.deliveries.pending],
              ['Processing', newsletter.deliveries.processing],
              ['Retrying', newsletter.deliveries.retry_pending],
              ['Failed', newsletter.deliveries.failed],
              ['Uncertain', newsletter.deliveries.uncertain]
            ]}
            href="/newsletter/campaigns"
            action="Open delivery reports"
            tone="indigo"
          />

          <BreakdownCard
            icon={FileText}
            title="Publishing Activity"
            primaryLabel="Published in 30 days"
            primaryValue={editorial.published_last_30_days}
            rows={[
              ['Published in 7 days', editorial.published_last_7_days ?? 0],
              ['Created in 7 days', editorial.created_last_7_days],
              ['Created in 30 days', editorial.created_last_30_days ?? 0],
              ['Unpublished', editorial.unpublished],
              ['Current drafts', stats.blogs.draft],
              ['Published total', stats.blogs.published]
            ]}
            href="/blogs"
            action="Manage articles"
            tone="amber"
          />

          <BreakdownCard
            icon={ImageIcon}
            title="Media Quality"
            primaryLabel="Active assets"
            primaryValue={stats.media.total_active}
            rows={[
              ['Missing alt text', stats.media.missing_alt_text_count],
              ['Uploaded in 7 days', mediaQuality.uploaded_last_7_days],
              ['Deletion failures', mediaQuality.failed_deletion_count],
              ['In trash', stats.media.trashed_count]
            ]}
            href="/media"
            action="Review media"
            tone="emerald"
          />

          <BreakdownCard
            icon={BarChart3}
            title="Reader Feedback"
            primaryLabel="Helpful rate"
            primaryValue={`${feedback.helpful_percentage}%`}
            rows={[
              ['Total votes', feedback.total_count],
              ['Helpful votes', feedback.yes_count],
              ['Not helpful', feedback.no_count]
            ]}
            href="/blogs"
            action="Review article feedback"
            tone="purple"
          />
        </div>
      </section>

      <section aria-labelledby="attention-title">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="attention-title" className="flex items-center gap-2 font-semibold text-slate-900">
                <AlertTriangle size={17} className="text-amber-600" />
                Needs attention
              </h2>
              <p className="mt-1 text-xs text-slate-500">Direct links to content and delivery issues that need review.</p>
            </div>
            {attentionItems.length === 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <CheckCircle2 size={14} />
                All clear
              </span>
            )}
          </div>

          {attentionItems.length > 0 && (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {attentionItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`focus-ring flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-sm ${
                    item.tone === 'rose'
                      ? 'border-rose-200 bg-rose-50 text-rose-900'
                      : 'border-amber-200 bg-amber-50 text-amber-900'
                  }`}
                >
                  <span><strong>{item.count}</strong> {item.label}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}

          {(mediaQuality.missing_alt_assets?.length ?? 0) > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-semibold text-slate-900">Alt text fixes</h3>
              <p className="mt-1 text-xs text-slate-500">Open each asset in the Media Library and add an accessible description.</p>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {mediaQuality.missing_alt_assets!.map((asset) => (
                  <div key={asset.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{asset.original_file_name}</p>
                      <p className="text-xs capitalize text-slate-500">{asset.purpose}</p>
                    </div>
                    <Link
                      href={`/media?search=${encodeURIComponent(asset.original_file_name)}`}
                      className="focus-ring shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                    >
                      Fix alt text
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3" aria-label="Campaign operations and recent activity">
        <Card className="p-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-slate-900">Newsletter Worker & SMTP</h2>
            <p className="mt-1 text-xs text-slate-500">Delivery infrastructure and heartbeat state.</p>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <OperationRow label="Worker" value={newsletter.worker.worker_status} healthy={newsletter.worker.worker_status === 'active'} />
            <OperationRow label="SMTP" value={newsletter.worker.smtp_status} healthy={newsletter.worker.smtp_status === 'ready'} />
            <OperationRow label="Claim state" value={newsletter.worker.claim_status} healthy={['healthy', 'idle', 'processing'].includes(newsletter.worker.claim_status)} />
            <OperationRow label="Active workers" value={String(newsletter.worker.active_worker_count)} healthy={newsletter.worker.active_worker_count > 0} />
            <OperationRow label="Stale workers" value={String(newsletter.worker.stale_worker_count)} healthy={newsletter.worker.stale_worker_count === 0} />
            <p className="flex items-center gap-1.5 pt-1 text-xs text-slate-500">
              <Clock3 size={13} />
              Last heartbeat: {formatDate(newsletter.worker.latest_heartbeat_at)}
            </p>
            {workerError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <strong>Latest worker error:</strong> {workerError}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="font-semibold text-slate-900">Recent Campaigns</h2>
              <p className="mt-1 text-xs text-slate-500">Queued, sent, failed, and retry activity.</p>
            </div>
            <Link href="/newsletter/campaigns"><Button variant="outline" size="sm">View all</Button></Link>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {insights.recent_campaigns.length ? insights.recent_campaigns.map((campaign) => {
              const sentPercent = campaign.total_recipients > 0
                ? Math.min(100, Math.round((campaign.sent_count / campaign.total_recipients) * 100))
                : 0;
              return (
                <Link key={campaign.id} href={`/newsletter/campaigns/${campaign.id}`} className="focus-ring block py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{campaign.subject}</p>
                    <StatusBadge status={campaign.status} size="sm" />
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-sky-500" style={{ width: `${sentPercent}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {campaign.sent_count}/{campaign.total_recipients} sent | {campaign.failed_count} failed | Updated {formatDate(campaign.updated_at)}
                  </p>
                </Link>
              );
            }) : <p className="py-6 text-center text-sm text-slate-500">No newsletter campaigns yet.</p>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-semibold text-slate-900">Recent Admin Activity</h2>
            <p className="mt-1 text-xs text-slate-500">Who published, uploaded media, and managed campaigns.</p>
          </div>
          <div className="mt-3 divide-y divide-slate-100">
            {insights.recent_activity.length ? insights.recent_activity.map((item) => (
              <div key={item.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                    <Activity size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{activityLabel(item.action)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.actor_name ? `By ${item.actor_name} | ` : ''}{formatDate(item.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )) : <p className="py-6 text-center text-sm text-slate-500">No recent administrator activity.</p>}
          </div>
        </Card>
      </section>
    </div>
  );
}

type BreakdownTone = 'sky' | 'violet' | 'indigo' | 'amber' | 'emerald' | 'purple';

function BreakdownCard({
  icon: Icon,
  title,
  primaryLabel,
  primaryValue,
  rows,
  href,
  action,
  tone
}: {
  icon: typeof Users;
  title: string;
  primaryLabel: string;
  primaryValue: string | number;
  rows: Array<[string, string | number]>;
  href: string;
  action: string;
  tone: BreakdownTone;
}) {
  const toneClasses: Record<BreakdownTone, string> = {
    sky: 'bg-sky-50 text-sky-700',
    violet: 'bg-violet-50 text-violet-700',
    indigo: 'bg-indigo-50 text-indigo-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700'
  };

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${toneClasses[tone]}`}>
          <Icon size={19} aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{primaryLabel}</p>
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-950">{primaryValue}</p>
      <dl className="mt-4 flex-1 divide-y divide-slate-100 border-y border-slate-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 py-2">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      <Link href={href} className="focus-ring mt-4 inline-flex items-center gap-1.5 self-start text-xs font-semibold text-sky-700 hover:text-sky-900">
        {action}
        <ArrowRight size={13} aria-hidden="true" />
      </Link>
    </Card>
  );
}

function OperationRow({ label, value, healthy }: { label: string; value: string; healthy: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${healthy ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
        {value.replaceAll('_', ' ')}
      </span>
    </div>
  );
}

