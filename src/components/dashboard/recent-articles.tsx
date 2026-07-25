'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Edit3, FileText } from 'lucide-react';
import type { RecentBlogSummary } from '@/types/dashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState, Skeleton } from '@/components/ui/empty-state';
import { Alert } from '@/components/ui/alert';

interface RecentArticlesProps {
  blogs: RecentBlogSummary[];
  loading: boolean;
  error: string | null;
  onRetry(): void;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function RecentArticles({ blogs, loading, error, onRetry }: RecentArticlesProps) {
  return (
    <Card className="flex flex-col h-full p-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText size={17} className="text-sky-600" />
            Recent Articles
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Latest updated drafts and published posts</p>
        </div>
        <Link href="/blogs">
          <Button variant="outline" size="sm">
            View all
            <ArrowRight size={13} />
          </Button>
        </Link>
      </div>

      <div className="flex-1 mt-4">
        {error && (
          <Alert variant="error" action={<Button size="sm" variant="outline" onClick={onRetry}>Retry</Button>}>
            Failed to load recent articles.
          </Alert>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <EmptyState
            title="No articles found"
            description="Create your first article draft to begin."
            action={{ label: 'Create Article', onClick: () => { window.location.href = '/blogs/create'; } }}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {blogs.map((blog) => (
              <div key={blog.id} className="flex items-center justify-between py-3 gap-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900" title={blog.title}>
                    {blog.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{blog.author?.name || 'Author'}</span>
                    <span>•</span>
                    <span>{formatDate(blog.updated_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={blog.status} size="sm" />
                  <Link href={`/blogs/${blog.id}/edit`}>
                    <Button variant="outline" size="sm" className="h-7 w-7 flex items-center justify-center" style={{ padding: 0 }} title="Edit Article" aria-label={`Edit ${blog.title}`}>
                      <Edit3 size={13} />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
