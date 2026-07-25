'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BlogForm } from '@/components/blogs/blog-form';
import { FeedbackAnalytics } from '@/components/blogs/feedback-analytics';
import { getBlog } from '@/services/blog.service';
import type { BlogDetail } from '@/types/blog';
import { Card } from '@/components/ui/card';

export default function EditBlogPage() {
  const params = useParams<{ id: string }>();
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void getBlog(String(params.id)).then(setBlog).catch((caught) => setError(caught instanceof Error ? caught.message : 'Blog load failed.')); }, [params.id]);
  if (error) return <Card className="p-6 text-sm font-semibold text-[var(--danger)]" role="alert">{error}</Card>;
  if (!blog) return <div className="h-64 animate-pulse rounded-2xl bg-white" />;
  return (
    <div className="space-y-6">
      <BlogForm blog={blog} />
      {blog.status === 'published' && (
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-lg font-semibold mb-4">Feedback Analytics</h2>
          <FeedbackAnalytics blogId={String(params.id)} />
        </div>
      )}
    </div>
  );
}
