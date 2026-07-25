'use client';

import React from 'react';
import { Clock3, Database, RefreshCw, Server } from 'lucide-react';
import type { HealthData } from '@/types/health';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/empty-state';

interface SystemHealthCardProps {
  health: HealthData | null;
  loading: boolean;
  error: string | null;
  onRetry(): void;
}

export function SystemHealthCard({ health, loading, error, onRetry }: SystemHealthCardProps) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Server size={17} className="text-sky-600" />
            System & Infrastructure Health
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Live platform availability and API response latency</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={loading ? 'checking' : health ? 'healthy' : 'unavailable'} size="sm" />
          <Button variant="ghost" size="sm" onClick={onRetry} isLoading={loading} aria-label="Refresh health">
            <RefreshCw size={13} />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="py-2 text-xs">
          <span>{error}. Content tools may be impacted.</span>
        </Alert>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Server size={14} />
              <span className="font-medium">API Service</span>
            </div>
            <p className="mt-1 font-bold text-slate-900 capitalize">{health ? 'Online' : 'Offline'}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Database size={14} />
              <span className="font-medium">Database</span>
            </div>
            <p className="mt-1 font-bold text-slate-900 capitalize">{health?.database ?? 'Disconnected'}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Clock3 size={14} />
              <span className="font-medium">Latency</span>
            </div>
            <p className="mt-1 font-bold text-slate-900">{health ? `${health.response_time_ms} ms` : '-'}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
