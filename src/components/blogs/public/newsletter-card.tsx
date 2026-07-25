'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

interface NewsletterCardProps {
  slug?: string;
}

export function NewsletterCard({ slug }: NewsletterCardProps) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setStatus('error');
      setMessage('Please enter your email');
      return;
    }

    if (!consent) {
      setStatus('error');
      setMessage('Please accept the consent checkbox');
      return;
    }

    try {
      setLoading(true);
      setStatus('idle');

      const res = await fetch('/api/v1/public/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          consent: true,
          consent_version: 'v1',
          source: 'blog_detail'
        }),
        credentials: 'include'
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to subscribe');
      }

      setStatus('success');
      setMessage('Check your inbox to confirm your subscription.');
      setEmail('');
      setConsent(false);

      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-8">
      <div className="flex items-start gap-4">
        <Mail className="text-blue-600 flex-shrink-0 mt-1" size={24} />
        <div className="flex-1">
          <h3 className="text-xl font-bold text-blue-900 mb-2">Subscribe to Our Newsletter</h3>
          <p className="text-blue-800 mb-6 text-sm">Get the latest articles and updates delivered to your inbox.</p>

          {status === 'success' && (
            <div className="rounded bg-green-100 border border-green-300 text-green-800 px-4 py-3 mb-4 text-sm">
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="rounded bg-red-100 border border-red-300 text-red-800 px-4 py-3 mb-4 text-sm">
              {message}
            </div>
          )}

          {status !== 'success' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  disabled={loading}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  I agree to receive blog updates by email. I can unsubscribe anytime.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
