'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/input';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { newsletterService, type SubscriberStatsResponse } from '@/services/newsletter.service';
import { listBlogs, getBlog } from '@/services/blog.service';
import type { BlogDetail } from '@/types/blog';
import { Modal } from '@/components/ui/modal';

interface PublishedBlog {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_version: any; // We'll pull from currentPublishedVersion
  excerpt: string;
  featured_image: any;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams?.get('edit');

  const [blogs, setBlogs] = useState<PublishedBlog[]>([]);
  const [selectedBlogId, setSelectedBlogId] = useState('');
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [subscriberStats, setSubscriberStats] = useState<SubscriberStatsResponse | null>(null);

  // Modals
  const [showQueueConfirm, setShowQueueConfirm] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  // Track draft campaign ID if we saved it
  const [campaignId, setCampaignId] = useState<string | null>(editId || null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [blogsRes, statsRes] = await Promise.all([
          listBlogs({ status: 'published', limit: 100 }),
          newsletterService.getSubscriberStats()
        ]);
        
        setSubscriberStats(statsRes);
        
        const mappedBlogs = blogsRes.items
          .filter((b: any) => b.status === 'published')
          .map((b: any) => ({
            id: b.id,
            title: b.title,
            slug: b.slug,
            status: b.status,
            published_version: null,
            excerpt: b.excerpt || '',
            featured_image: b.featured_media?.url || null
          }));
        
        setBlogs(mappedBlogs);

        if (editId) {
          const campaign = await newsletterService.getCampaign(editId);
          setSubject(campaign.subject || '');
          setPreviewText(campaign.preview_text || '');
          setSelectedBlogId(campaign.blog_id || '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, [editId]);

  const selectedBlog = useMemo(() => blogs.find((b) => b.id === selectedBlogId), [blogs, selectedBlogId]);
  
  const isValid = selectedBlogId && subject.trim().length > 0;
  const canQueue = isValid && (subscriberStats?.subscribed ?? 0) > 0;

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError('');
      if (campaignId) {
        await newsletterService.updateCampaign(campaignId, subject, previewText);
      } else {
        const campaign = await newsletterService.createCampaign(selectedBlogId, subject, previewText);
        setCampaignId(campaign.id);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftClick = async () => {
    const success = await handleSaveDraft();
    if (success) {
      router.push(`/newsletter/campaigns/${campaignId || ''}`);
    }
  };

  const handleSendTest = async () => {
    try {
      setTestLoading(true);
      setError('');
      setTestSuccess(false);
      
      let id = campaignId;
      if (!id) {
        // save draft first
        const campaign = await newsletterService.createCampaign(selectedBlogId, subject, previewText);
        setCampaignId(campaign.id);
        id = campaign.id;
      }
      
      if (!id) throw new Error('Could not get campaign ID');
      
      await newsletterService.sendTestEmail(id, testEmail);
      setTestSuccess(true);
      setTimeout(() => {
        setShowTestModal(false);
        setTestSuccess(false);
        setTestEmail('');
      }, 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send test email');
    } finally {
      setTestLoading(false);
    }
  };

  const handleQueue = async () => {
    try {
      setSaving(true);
      setError('');
      
      let id = campaignId;
      if (!id) {
        const campaign = await newsletterService.createCampaign(selectedBlogId, subject, previewText);
        setCampaignId(campaign.id);
        id = campaign.id;
      } else {
        await newsletterService.updateCampaign(id, subject, previewText);
      }
      
      if (!id) throw new Error('Could not get campaign ID');
      
      await newsletterService.queueCampaign(id);
      router.push(`/newsletter/campaigns/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue campaign');
    } finally {
      setSaving(false);
      setShowQueueConfirm(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader title={editId ? "Edit Campaign" : "Create Campaign"} description="Configure and preview your newsletter campaign" />

      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-800">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          <Card className="p-6 space-y-6">
            <h3 className="font-semibold text-lg border-b pb-2">Campaign Configuration</h3>
            
            <div>
              <label className="block text-sm font-semibold mb-2" htmlFor="blog-selector">Published Blog</label>
              {loading ? (
                <div className="h-10 bg-gray-200 rounded animate-pulse" />
              ) : (
                <select
                  id="blog-selector"
                  value={selectedBlogId}
                  onChange={(e) => setSelectedBlogId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm"
                  disabled={!!editId} // Cannot change blog once campaign is created
                >
                  <option value="">Select a published blog...</option>
                  {blogs.map((blog) => (
                    <option key={blog.id} value={blog.id}>
                      {blog.title} (v{blog.published_version?.versionNumber || 1})
                    </option>
                  ))}
                </select>
              )}
              {editId && <p className="text-xs text-slate-500 mt-1">Blog selection cannot be changed after creation.</p>}
              {!editId && <p className="text-xs text-slate-500 mt-1">Only published blogs are available</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" htmlFor="campaign-subject">Subject Line *</label>
              <Input
                id="campaign-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject line..."
                type="text"
                maxLength={255}
                required
              />
              <p className="text-xs text-slate-500 mt-1">{subject.length}/255</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" htmlFor="campaign-preview">Preview Text (Optional)</label>
              <Input
                id="campaign-preview"
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Short preview shown in email clients..."
                type="text"
                maxLength={255}
              />
              <p className="text-xs text-slate-500 mt-1">{previewText.length}/255</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Recipients</h3>
            
            {subscriberStats ? (
              <div>
                <p className="text-sm font-medium text-slate-800">
                  <span className="text-lg font-bold text-blue-600">{subscriberStats.subscribed}</span> subscribed readers will receive this campaign.
                </p>
                {subscriberStats.subscribed === 0 && (
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                    No subscribed readers are available. Queue Campaign is disabled.
                  </p>
                )}
              </div>
            ) : (
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
            )}
          </Card>
          
          <div className="flex gap-3 justify-end flex-wrap">
            <Button onClick={() => router.back()} variant="ghost" disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveDraftClick} variant="outline" disabled={!isValid || saving}>
              Save Draft
            </Button>
            <Button onClick={() => setShowTestModal(true)} variant="outline" disabled={!isValid || saving}>
              Send Test Email
            </Button>
            <Button onClick={() => setShowQueueConfirm(true)} disabled={!canQueue || saving}>
              Queue Campaign
            </Button>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-slate-700 hidden lg:block">Email Preview</h3>
          <Card className="p-0 overflow-hidden bg-slate-50 border-slate-300 shadow-inner min-h-[600px] flex flex-col">
            <div className="bg-white border-b px-4 py-3 flex flex-col gap-1 text-sm">
              <div className="flex text-slate-600">
                <span className="w-16 font-semibold">From:</span>
                <span className="font-medium text-slate-900">Pixel Eye &lt;newsletter@pixeleye.com&gt;</span>
              </div>
              <div className="flex text-slate-600">
                <span className="w-16 font-semibold">To:</span>
                <span>Subscribed Reader</span>
              </div>
              <div className="flex text-slate-600 mt-2">
                <span className="w-16 font-semibold">Subject:</span>
                <span className="font-medium text-slate-900">{subject || 'No subject yet'}</span>
              </div>
            </div>
            
            <div className="flex-1 p-8 flex justify-center bg-[#f3f4f6]">
              <div className="w-full max-w-[600px] bg-white border border-slate-200 shadow-sm rounded-md overflow-hidden flex flex-col">
                <div className="p-6 space-y-6">
                  {previewText && (
                    <div className="hidden text-[0px]">{previewText}</div> // Pre-header hack
                  )}
                  
                  <div className="text-center pb-4 border-b">
                    <h1 className="text-xl font-bold tracking-widest uppercase text-slate-800">Pixel Eye</h1>
                  </div>

                  {selectedBlog ? (
                    <div className="space-y-4">
                      {selectedBlog.featured_image && (
                        <div className="w-full h-48 bg-slate-200 rounded-md overflow-hidden relative">
                           {/* Using a placeholder for preview purposes if image URL is complex, but prefer real URL */}
                           <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                             [Featured Image]
                           </div>
                        </div>
                      )}
                      <h2 className="text-2xl font-bold text-slate-900">{selectedBlog.title}</h2>
                      <p className="text-slate-600 leading-relaxed">{selectedBlog.excerpt || 'No excerpt available.'}</p>
                      <div className="pt-4">
                        <span className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md text-sm cursor-pointer">
                          Read Full Article
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-md">
                      Select a blog to preview content
                    </div>
                  )}
                </div>
                
                <div className="mt-auto bg-slate-50 p-6 text-center text-xs text-slate-500 border-t">
                  <p>You are receiving this email because you subscribed to updates from Pixel Eye.</p>
                  <p className="mt-2"><span className="underline cursor-pointer text-blue-600">Unsubscribe</span> from these emails.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ConfirmationDialog
        isOpen={showQueueConfirm}
        title="Queue Newsletter Campaign?"
        message={
          <div className="space-y-4 text-sm text-slate-600">
            <p>You are about to queue the campaign <strong>"{subject}"</strong> for the blog article <strong>"{selectedBlog?.title}"</strong>.</p>
            <p className="p-3 bg-blue-50 text-blue-900 rounded-lg">
              <strong>{subscriberStats?.subscribed || 0}</strong> subscribed readers will receive this campaign.
            </p>
            <p className="text-red-600 font-medium">Warning: Emails already sent cannot be recalled.</p>
          </div>
        }
        confirmText={saving ? "Queuing..." : "Queue Campaign"}
        onConfirm={handleQueue}
        onClose={() => !saving && setShowQueueConfirm(false)}
      />

      <Modal isOpen={showTestModal} onClose={() => !testLoading && setShowTestModal(false)} title="Send Test Email">
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 border rounded-lg text-sm text-slate-600 space-y-1">
            <p><span className="font-semibold">Subject:</span> {subject}</p>
            <p><span className="font-semibold">Blog:</span> {selectedBlog?.title} (v{selectedBlog?.published_version?.versionNumber || 1})</p>
            <p className="text-amber-700 mt-2 text-xs">Note: This is a test email and will not affect subscriber counts or campaign status.</p>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2" htmlFor="test-email">Test Recipient Email *</label>
            <Input
              id="test-email"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </div>
          
          {testSuccess && (
            <div className="p-2 bg-green-50 text-green-700 text-sm rounded border border-green-200">
              Test email sent successfully.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowTestModal(false)} disabled={testLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendTest} 
              disabled={!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail) || testLoading}
            >
              {testLoading ? 'Sending...' : 'Send Test Email'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
