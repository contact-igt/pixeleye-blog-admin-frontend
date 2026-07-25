'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

interface FeedbackWidgetProps {
  slug: string;
  onSubmit?: (response: 'yes' | 'no') => void;
}

export function FeedbackWidget({ slug, onSubmit }: FeedbackWidgetProps) {
  const [response, setResponse] = useState<'yes' | 'no' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (value: 'yes' | 'no') => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/v1/public/blogs/${encodeURIComponent(slug)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: value }),
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to submit feedback');
      }

      setResponse(value);
      setSubmitted(true);
      onSubmit?.(value);

      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-green-900 font-medium">Thank you for your feedback!</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-900 text-sm mb-4">{error}</p>
        <button
          onClick={() => setError(null)}
          className="text-red-700 underline text-sm hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
      <p className="text-gray-700 font-medium mb-4">Was this article helpful?</p>
      <div className="flex gap-4">
        <button
          onClick={() => handleSubmit('yes')}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            response === 'yes'
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-green-500 hover:text-green-600'
          }`}
          aria-label="Mark as helpful"
        >
          <ThumbsUp size={18} />
          Yes
        </button>
        <button
          onClick={() => handleSubmit('no')}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            response === 'no'
              ? 'bg-red-600 text-white'
              : 'bg-white border border-gray-300 text-gray-700 hover:border-red-500 hover:text-red-600'
          }`}
          aria-label="Mark as not helpful"
        >
          <ThumbsDown size={18} />
          No
        </button>
      </div>
    </div>
  );
}
