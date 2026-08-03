'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { FileText, HardDrive, LayoutGrid, RefreshCw } from 'lucide-react';
import { getDashboardStats } from '@/services/dashboard.service';
import { getHealth } from '@/services/health.service';
import type { DashboardStats } from '@/types/dashboard';
import type { HealthData } from '@/types/health';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { DashboardMetricCard } from './dashboard-metric-card';
import { SystemHealthCard } from './system-health-card';
import { RecentArticles } from './recent-articles';
import { RecentMedia } from './recent-media';
import { DashboardQuickActions } from './dashboard-quick-actions';
import { DashboardSkeleton } from './dashboard-skeleton';
import { Alert } from '@/components/ui/alert';
import { DashboardDetailReport } from './dashboard-detail-report';

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch {
      setStatsError('Failed to load dashboard metrics');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const response = await getHealth();
      setHealth(response.data);
    } catch {
      setHealthError('Backend service unavailable');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadAll = useCallback(() => {
    void Promise.allSettled([fetchStats(), fetchHealth()]);
  }, [fetchStats, fetchHealth]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Overview"
        description="Monitor eye-care article publications, tracked media storage, template configurations, and infrastructure health."
        action={
          <Button variant="outline" size="sm" onClick={loadAll} isLoading={statsLoading || healthLoading}>
            <RefreshCw size={14} aria-hidden="true" />
            <span>Refresh All</span>
          </Button>
        }
      />

      {/* Top KPI Metrics Grid */}
      {statsLoading ? (
        <DashboardSkeleton />
      ) : statsError ? (
        <Alert variant="error" action={<Button size="sm" variant="outline" onClick={fetchStats}>Retry Metrics</Button>}>
          {statsError}
        </Alert>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardMetricCard
            icon={FileText}
            label="Articles Overview"
            value={`${stats.blogs.published} Published`}
            subcaption={`${stats.blogs.draft} Drafts | ${stats.insights?.editorial.unpublished ?? 0} Unpublished | ${stats.blogs.trashed} Trashed`}
            tone="sky"
          />

          <DashboardMetricCard
            icon={HardDrive}
            label="Tracked Storage"
            value={stats.media.tracked_storage_formatted}
            subcaption={`${stats.media.total_active} active media assets | ${stats.media.trashed_count} in trash`}
            warning={stats.media.missing_alt_text_count > 0 ? `${stats.media.missing_alt_text_count} Alt Text Needed` : null}
            tone="emerald"
          />

          <DashboardMetricCard
            icon={LayoutGrid}
            label="Template Systems"
            value={`${stats.templates.custom_active} Custom Active`}
            subcaption={`${stats.templates.system_count} Built-in | ${stats.templates.custom_draft} Drafts | ${stats.templates.custom_archived} Archived`}
            tone="indigo"
          />
        </div>
      ) : null}


      {stats && <DashboardDetailReport stats={stats} />}
      {/* Quick Action Shortcuts */}
      <DashboardQuickActions />

      {/* System Infrastructure Health Card */}
      <SystemHealthCard
        health={health}
        loading={healthLoading}
        error={healthError}
        onRetry={fetchHealth}
      />

      {/* Recent Articles & Recent Media Grids */}
      <div className="grid gap-6 md:grid-cols-2">
        <RecentArticles
          blogs={stats?.recent_blogs ?? []}
          loading={statsLoading}
          error={statsError}
          onRetry={fetchStats}
        />

        <RecentMedia
          media={stats?.recent_media ?? []}
          loading={statsLoading}
          error={statsError}
          onRetry={fetchStats}
        />
      </div>
    </div>
  );
}
