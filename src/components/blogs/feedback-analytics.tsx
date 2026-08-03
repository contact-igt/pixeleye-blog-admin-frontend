'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { newsletterService, type FeedbackSummaryResponse } from '@/services/newsletter.service';
import { ThumbsUp, ThumbsDown, MessageSquare, Percent, AlertTriangle } from 'lucide-react';

interface FeedbackAnalyticsProps {
  blogId: string;
}

export function FeedbackAnalytics({ blogId }: FeedbackAnalyticsProps) {
  const [summary, setSummary] = useState<FeedbackSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFeedback = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await newsletterService.getFeedbackSummary(blogId);
      setSummary(data);
    } catch (err) {
      console.error('Feedback analytics failed:', err);
      setSummary(null);
      setError(err instanceof Error ? err.message : 'Failed to load feedback analytics.');
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  if (loading) {
    return (
      <Card className="p-6 space-y-4">
        <div className="h-6 bg-slate-200 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-8 text-center bg-red-50 border-red-100">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-400 mb-3" />
        <p className="text-sm text-red-700 font-medium">Could not load feedback analytics</p>
        <p className="text-xs text-red-500 mt-1">{error}</p>
        <button
          type="button"
          onClick={() => void loadFeedback()}
          className="mt-4 text-sm font-medium text-red-700 underline underline-offset-2"
        >
          Retry
        </button>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-8 text-center bg-slate-50 border-dashed">
        <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-3" />
        <p className="text-sm text-slate-600 font-medium">Feedback data is not available</p>
        <p className="text-xs text-slate-400 mt-1">Try refreshing this page.</p>
      </Card>
    );
  }

  const hasResponses = summary.total_count > 0;

  return (
    <div className="space-y-6">
      <Card className="p-6 border-slate-200 shadow-sm">
        <h3 className="font-semibold text-lg mb-6 text-slate-800 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Feedback Insights
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
            <ThumbsUp className="mx-auto h-6 w-6 text-green-500 mb-2 opacity-80" />
            <div className="text-3xl font-bold text-green-700">
              {summary.yes_count}
            </div>
            <p className="text-xs font-semibold text-green-600/80 uppercase tracking-wider mt-2">Yes</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
            <ThumbsDown className="mx-auto h-6 w-6 text-red-500 mb-2 opacity-80" />
            <div className="text-3xl font-bold text-red-700">
              {summary.no_count}
            </div>
            <p className="text-xs font-semibold text-red-600/80 uppercase tracking-wider mt-2">No</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <MessageSquare className="mx-auto h-6 w-6 text-blue-500 mb-2 opacity-80" />
            <div className="text-3xl font-bold text-blue-700">
              {summary.total_count}
            </div>
            <p className="text-xs font-semibold text-blue-600/80 uppercase tracking-wider mt-2">Total Votes</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100">
            <Percent className="mx-auto h-6 w-6 text-purple-500 mb-2 opacity-80" />
            <div className="text-3xl font-bold text-purple-700">
              {summary.helpful_percentage.toFixed(0)}%
            </div>
            <p className="text-xs font-semibold text-purple-600/80 uppercase tracking-wider mt-2">Helpful Rate</p>
          </div>
        </div>
        {!hasResponses && (
          <p className="mt-5 text-center text-xs text-slate-500">
            No reader responses yet. The counts above will update after a reader votes.
          </p>
        )}
      </Card>

      {summary.versions && summary.versions.length > 1 && (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h4 className="font-semibold text-sm text-slate-800">Version Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white border-b border-slate-100">
                <tr>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Version</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium">Helpful</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium">Not Helpful</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-slate-500 font-medium">Helpful Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {summary.versions.map((v: any) => (
                  <tr key={v.blog_version_id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-700">v{v.blog_version_id}</td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">{v.yes_count}</td>
                    <td className="text-right py-3 px-4 text-red-600 font-medium">{v.no_count}</td>
                    <td className="text-right py-3 px-4 text-slate-700 font-medium">{v.total_count}</td>
                    <td className="text-right py-3 px-4 text-purple-600 font-medium">
                      {v.helpful_percentage.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
