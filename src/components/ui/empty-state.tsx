import React from 'react';
import { FolderOpen, SearchX, AlertCircle } from 'lucide-react';
import { Button } from './button';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  type?: 'empty' | 'search' | 'error';
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action, type = 'empty', icon }: EmptyStateProps) {
  const defaultIcon = {
    empty: <FolderOpen className="h-10 w-10 text-slate-400" />,
    search: <SearchX className="h-10 w-10 text-slate-400" />,
    error: <AlertCircle className="h-10 w-10 text-rose-500" />,
  }[type];

  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
      <div className="mb-4 rounded-2xl bg-white p-3.5 shadow-xs border border-slate-100">
        {icon || defaultIcon}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-xs text-slate-500 leading-relaxed">{description}</p>
      {action && (
        <div className="mt-6">
          <Button variant="primary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />;
}
