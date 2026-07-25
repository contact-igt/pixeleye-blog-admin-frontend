'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DashboardMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subcaption?: string;
  warning?: string | null;
  tone?: 'sky' | 'emerald' | 'amber' | 'indigo' | 'purple';
}

const toneMap = {
  sky: 'bg-sky-50 text-sky-700 border-sky-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  purple: 'bg-purple-50 text-purple-700 border-purple-100'
};

export function DashboardMetricCard({
  icon: Icon,
  label,
  value,
  subcaption,
  warning,
  tone = 'sky'
}: DashboardMetricCardProps) {
  return (
    <Card className="flex flex-col justify-between p-5 shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-xl border ${toneMap[tone]}`}>
            <Icon size={19} aria-hidden="true" />
          </span>
          {warning && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              {warning}
            </span>
          )}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold text-slate-900">{value}</p>
      </div>

      {subcaption && (
        <p className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-500 font-medium">
          {subcaption}
        </p>
      )}
    </Card>
  );
}
