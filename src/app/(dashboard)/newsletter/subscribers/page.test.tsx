import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SubscribersPage from './page';

const mocks = vi.hoisted(() => ({ getSubscribers: vi.fn(), getSubscriberStats: vi.fn(), sendSubscriberResubscription: vi.fn(), resendSubscriberVerification: vi.fn(), deleteSubscriber: vi.fn() }));
vi.mock('@/services/newsletter.service', () => ({ newsletterService: {
  getSubscribers: mocks.getSubscribers, getSubscriberStats: mocks.getSubscriberStats,
  sendSubscriberResubscription: mocks.sendSubscriberResubscription,
  resendSubscriberVerification: mocks.resendSubscriberVerification,
  deleteSubscriber: mocks.deleteSubscriber,
  getSubscriber: vi.fn(), createSubscriber: vi.fn(), exportSubscribers: vi.fn()
} }));

const base = { source: 'website', consentVersion: 'v1', consentAt: '2026-07-30T10:00:00Z', verificationSentAt: null, verifiedAt: null, unsubscribedAt: null, createdAt: '2026-07-30T10:00:00Z' };

describe('Subscriber action matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSubscribers.mockResolvedValue({ items: [
      { ...base, id: '1', email: 'pending@example.com', status: 'pending' },
      { ...base, id: '2', email: 'former@example.com', status: 'unsubscribed', unsubscribedAt: '2026-07-29T10:00:00Z' }
    ], pagination: { page: 1, limit: 20, total_items: 2, total_pages: 1, has_next_page: false, has_previous_page: false } });
    mocks.getSubscriberStats.mockResolvedValue({ total_subscribers: 2, pending: 1, subscribed: 0, unsubscribed: 1 });
    mocks.sendSubscriberResubscription.mockResolvedValue({ email_sent: true });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it('shows verification resend only for pending and resubscription only for unsubscribed', async () => {
    render(<SubscribersPage />);
    expect(await screen.findByRole('button', { name: 'Resend Verification' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Resubscription Request' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(2);
  });
  it('shows the required resubscription consent warning before sending', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SubscribersPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Send Resubscription Request' }));
    expect(confirm).toHaveBeenCalledWith('This person previously unsubscribed. They will remain unsubscribed unless they personally confirm the new subscription request.');
    await waitFor(() => expect(mocks.sendSubscriberResubscription).toHaveBeenCalledWith('2'));
  });
});
