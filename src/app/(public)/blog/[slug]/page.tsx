'use client';

import { use, useEffect, useState } from 'react';
import { getPublicBlogBySlug } from '@/services/public-blog.service';
import { TemplatePreviewRenderer } from '@/components/blogs/templates/template-preview-renderer';
import { FeedbackWidget } from '@/components/blogs/public/feedback-widget';
import { NewsletterCard } from '@/components/blogs/public/newsletter-card';
import type { BlogDetail } from '@/types/blog';

export default function PublicBlogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [blog, setBlog] = useState<BlogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlog() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublicBlogBySlug(slug);
        setBlog(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load blog');
        setBlog(null);
      } finally {
        setLoading(false);
      }
    }

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">Loading article...</p>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Article not found</h2>
          <p className="text-red-700">{error || 'The article you are looking for does not exist.'}</p>
        </div>
      </div>
    );
  }

  const publishedVersion = blog.published_version;
  if (!publishedVersion) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">Article not available</h2>
          <p className="text-yellow-700">This article is not currently published.</p>
        </div>
      </div>
    );
  }

  const templateKey = publishedVersion.template_key || 'template_1';
  const templateVersion = publishedVersion.template_version || 1;

  return (
    <article className="max-w-3xl mx-auto">
      <TemplatePreviewRenderer
        templateKey={templateKey}
        templateVersion={templateVersion}
        title={publishedVersion.title}
        excerpt={publishedVersion.excerpt || ''}
        html={publishedVersion.content_html || ''}
        image={blog.featured_media?.original_url || null}
        imageAlt={blog.featured_media?.alt_text || null}
        blocks={publishedVersion.blocks_json as any}
        customTemplateConfig={publishedVersion.template_config_json as any}
        author={blog.author?.name || null}
        updatedAt={blog.updated_at}
      />

      <div className="mt-12 pt-8 border-t border-gray-200">
        <FeedbackWidget slug={slug} />
      </div>

      <div className="mt-8">
        <NewsletterCard slug={slug} />
      </div>
    </article>
  );
}
