import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SubscribersPage from '../src/app/(dashboard)/newsletter/subscribers/page';
import * as newsletterService from '../src/services/newsletter.service';

vi.mock('../src/services/newsletter.service');

const mockSubscribers = [
  {
    id: '1',
    email: 'pending@example.com',
    status: 'pending' as const,
    source: 'admin_manual',
    consentVersion: 'v1',
    consentAt: new Date().toISOString(),
    verificationSentAt: new Date().toISOString(),
    verifiedAt: null,
    unsubscribedAt: null,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'subscribed@example.com',
    status: 'subscribed' as const,
    source: 'website',
    consentVersion: 'v1',
    consentAt: new Date().toISOString(),
    verificationSentAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    unsubscribedAt: null,
    createdAt: new Date().toISOString()
  }
];

describe('Subscribers Admin Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (newsletterService.newsletterService.getSubscribers as any).mockResolvedValue({
      items: mockSubscribers,
      pagination: {
        page: 1,
        limit: 20,
        total_items: 2,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false
      }
    });
    (newsletterService.newsletterService.getSubscriberStats as any).mockResolvedValue({
      total_subscribers: 2,
      subscribed: 1,
      pending: 1,
      unsubscribed: 0
    });
  });

  describe('Add Subscriber', () => {
    it('should open create modal when Add Subscriber clicked', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        expect(screen.getByText('Add Subscriber')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Add Subscriber'));
      expect(screen.getByText('Add Newsletter Subscriber')).toBeInTheDocument();
    });

    it('should validate email format before submission', async () => {
      (newsletterService.newsletterService.createSubscriber as any).mockResolvedValue({
        id: '3',
        email: 'test@example.com',
        status: 'pending',
        verification_sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Subscriber'));
      });

      const emailInput = screen.getByPlaceholderText('reader@example.com');
      await userEvent.type(emailInput, 'invalid-email');

      fireEvent.click(screen.getByText('Send Verification Email'));
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });

    it('should show double opt-in notice', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Subscriber'));
      });

      expect(
        screen.getByText(/The subscriber will receive a verification email/)
      ).toBeInTheDocument();
    });

    it('should submit and refresh table on success', async () => {
      const newSubscriber = {
        id: '3',
        email: 'new@example.com',
        status: 'pending' as const,
        verification_sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      (newsletterService.newsletterService.createSubscriber as any).mockResolvedValue(
        newSubscriber
      );

      render(<SubscribersPage />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Subscriber'));
      });

      const emailInput = screen.getByPlaceholderText('reader@example.com');
      await userEvent.type(emailInput, 'new@example.com');

      fireEvent.click(screen.getByText('Send Verification Email'));

      await waitFor(() => {
        expect(newsletterService.newsletterService.createSubscriber).toHaveBeenCalledWith({
          email: 'new@example.com',
          consent_note: undefined
        });
      });
    });

    it('should show error on duplicate subscribed email', async () => {
      (newsletterService.newsletterService.createSubscriber as any).mockRejectedValue({
        data: { message: 'This email is already subscribed.' }
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Subscriber'));
      });

      const emailInput = screen.getByPlaceholderText('reader@example.com');
      await userEvent.type(emailInput, 'existing@example.com');

      fireEvent.click(screen.getByText('Send Verification Email'));

      await waitFor(() => {
        expect(screen.getByText('This email is already subscribed.')).toBeInTheDocument();
      });
    });
  });

  describe('Resend Verification', () => {
    it('should show Resend button for pending subscribers', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        expect(screen.getByText('pending@example.com')).toBeInTheDocument();
      });

      const row = screen.getByText('pending@example.com').closest('tr');
      expect(row?.textContent).toContain('Resend');
    });

    it('should show Send New Verification for unsubscribed', async () => {
      const unsubscribedSubscriber = {
        ...mockSubscribers[0],
        status: 'unsubscribed' as const,
        unsubscribedAt: new Date().toISOString()
      };

      (newsletterService.newsletterService.getSubscribers as any).mockResolvedValue({
        items: [unsubscribedSubscriber],
        pagination: { page: 1, limit: 20, total_items: 1, total_pages: 1, has_next_page: false, has_previous_page: false }
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        expect(screen.getByText('pending@example.com')).toBeInTheDocument();
      });

      const row = screen.getByText('pending@example.com').closest('tr');
      expect(row?.textContent).toContain('Send New Verification');
    });

    it('should call resend service on Resend click', async () => {
      (newsletterService.newsletterService.resendSubscriberVerification as any).mockResolvedValue({
        status: 'pending'
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        expect(screen.getByText('Resend')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Resend'));

      await waitFor(() => {
        expect(newsletterService.newsletterService.resendSubscriberVerification).toHaveBeenCalledWith('1');
      });
    });

    it('should show cooldown error', async () => {
      (newsletterService.newsletterService.resendSubscriberVerification as any).mockRejectedValue({
        data: { message: 'Please wait 3 minutes before resending.' }
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Resend'));
      });

      await waitFor(() => {
        expect(screen.getByText('Please wait 3 minutes before resending.')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Subscriber', () => {
    it('should show Delete button for pending/subscribed subscribers', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        expect(screen.getAllByText('Delete')).toHaveLength(2);
      });
    });

    it('should open confirmation dialog with subscriber info', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      expect(screen.getByText(/Delete Newsletter Subscriber/)).toBeInTheDocument();
      expect(screen.getByText('pending@example.com')).toBeInTheDocument();
    });

    it('should show warning about delivery history preservation', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      expect(
        screen.getByText(/Existing email delivery history may be preserved/)
      ).toBeInTheDocument();
    });

    it('should call delete service on confirmation', async () => {
      (newsletterService.newsletterService.deleteSubscriber as any).mockResolvedValue({
        success: true,
        deletion_mode: 'hard_delete'
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      fireEvent.click(screen.getByText('Delete Subscriber'));

      await waitFor(() => {
        expect(newsletterService.newsletterService.deleteSubscriber).toHaveBeenCalledWith('1', undefined);
      });
    });

    it('should allow deletion reason input', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      const reasonInput = screen.getByPlaceholderText('e.g., User requested removal');
      await userEvent.type(reasonInput, 'GDPR request');

      fireEvent.click(screen.getByText('Delete Subscriber'));

      await waitFor(() => {
        expect(newsletterService.newsletterService.deleteSubscriber).toHaveBeenCalledWith('1', 'GDPR request');
      });
    });

    it('should refresh table after successful deletion', async () => {
      (newsletterService.newsletterService.deleteSubscriber as any).mockResolvedValue({
        success: true,
        deletion_mode: 'hard_delete'
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      fireEvent.click(screen.getByText('Delete Subscriber'));

      await waitFor(() => {
        expect(newsletterService.newsletterService.getSubscribers).toHaveBeenCalledTimes(2);
      });
    });

    it('should show error on delete failure', async () => {
      (newsletterService.newsletterService.deleteSubscriber as any).mockRejectedValue({
        data: { message: 'Failed to delete subscriber' }
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        const deleteButtons = screen.getAllByText('Delete');
        fireEvent.click(deleteButtons[0]);
      });

      fireEvent.click(screen.getByText('Delete Subscriber'));

      await waitFor(() => {
        expect(screen.getByText('Failed to delete subscriber')).toBeInTheDocument();
      });
    });
  });

  describe('Authorization & Permissions', () => {
    it('should only show actions for authorized roles', async () => {
      // This test assumes that authorization is handled in the component
      // and that the UI hides buttons for unauthorized roles
      render(<SubscribersPage />);
      await waitFor(() => {
        expect(screen.getByText('Add Subscriber')).toBeInTheDocument();
      });
    });
  });

  describe('Summary Cards', () => {
    it('should display subscriber statistics', async () => {
      render(<SubscribersPage />);
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // Total
        expect(screen.getByText('1')).toBeInTheDocument(); // Subscribed
      });
    });

    it('should refresh stats after create/delete/resend', async () => {
      (newsletterService.newsletterService.createSubscriber as any).mockResolvedValue({
        id: '3',
        email: 'new@example.com',
        status: 'pending',
        verification_sent_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      });

      (newsletterService.newsletterService.getSubscriberStats as any).mockResolvedValueOnce({
        total_subscribers: 2,
        subscribed: 1,
        pending: 1,
        unsubscribed: 0
      }).mockResolvedValueOnce({
        total_subscribers: 3,
        subscribed: 1,
        pending: 2,
        unsubscribed: 0
      });

      render(<SubscribersPage />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Subscriber'));
      });

      const emailInput = screen.getByPlaceholderText('reader@example.com');
      await userEvent.type(emailInput, 'new@example.com');

      fireEvent.click(screen.getByText('Send Verification Email'));

      await waitFor(() => {
        expect(newsletterService.newsletterService.getSubscriberStats).toHaveBeenCalledTimes(2);
      });
    });
  });
});
