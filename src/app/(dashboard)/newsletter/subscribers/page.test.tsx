import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/contexts/toast-context';
import SubscribersPage from './page';

const mocks = vi.hoisted(() => ({
  getSubscribers: vi.fn(),
  getSubscriberStats: vi.fn(),
  getSubscriber: vi.fn(),
  createSubscriber: vi.fn(),
  exportSubscribers: vi.fn(),
  sendSubscriberResubscription: vi.fn(),
  resendSubscriberVerification: vi.fn(),
  deleteSubscriber: vi.fn()
}));

vi.mock('@/services/newsletter.service', () => ({
  newsletterService: mocks
}));

const csvResult = {
  blob: new Blob(['Email\r\nreader@example.com'], { type: 'text/csv' }),
  contentType: 'text/csv; charset=utf-8',
  contentDisposition: 'attachment; filename="server-subscribers.csv"'
};

function renderPage() {
  return render(
    <ToastProvider>
      <SubscribersPage />
    </ToastProvider>
  );
}

async function getExportButton() {
  return screen.findByRole('button', { name: 'Export CSV' });
}

describe('subscriber CSV export', () => {
  let clickedAnchor: HTMLAnchorElement | null;

  beforeEach(() => {
    vi.clearAllMocks();
    clickedAnchor = null;

    mocks.getSubscribers.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        limit: 20,
        total_items: 0,
        total_pages: 0,
        has_next_page: false,
        has_previous_page: false
      }
    });
    mocks.getSubscriberStats.mockResolvedValue({
      total_subscribers: 0,
      pending: 0,
      subscribed: 0,
      unsubscribed: 0
    });
    mocks.exportSubscribers.mockResolvedValue(csvResult);

    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:subscriber-export'),
      revokeObjectURL: vi.fn()
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clickedAnchor = this;
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders successfully with the required ToastProvider', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Newsletter Subscribers' })).toBeInTheDocument();
  });

  it('exports the trimmed current search without pagination fields', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText('Search by email...'), '  retina  ');
    await user.click(await getExportButton());

    expect(mocks.exportSubscribers).toHaveBeenCalledWith({ search: 'retina' });
    expect(mocks.exportSubscribers.mock.calls[0][0]).not.toHaveProperty('page');
    expect(mocks.exportSubscribers.mock.calls[0][0]).not.toHaveProperty('limit');
  });

  it('exports the selected status and omits the all-status sentinel', async () => {
    renderPage();
    const user = userEvent.setup();
    const statusSelect = screen.getByRole('combobox');

    await user.selectOptions(statusSelect, 'pending');
    await user.click(await getExportButton());
    expect(mocks.exportSubscribers).toHaveBeenLastCalledWith({ status: 'pending' });

    await user.selectOptions(statusSelect, 'all');
    await user.click(await getExportButton());
    expect(mocks.exportSubscribers).toHaveBeenLastCalledWith({});
  });

  it('disables export while pending and suppresses duplicate clicks', async () => {
    let resolveExport!: (value: typeof csvResult) => void;
    mocks.exportSubscribers.mockReturnValue(new Promise((resolve) => {
      resolveExport = resolve;
    }));

    renderPage();
    const button = await getExportButton();
    fireEvent.click(button);
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Exporting...' })).toBeDisabled();
    expect(mocks.exportSubscribers).toHaveBeenCalledTimes(1);

    resolveExport(csvResult);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Export CSV' })).toBeEnabled());
  });

  it('downloads a CSV blob using the sanitized server filename', async () => {
    mocks.exportSubscribers.mockResolvedValue({
      ...csvResult,
      contentDisposition: 'attachment; filename="../server report.csv"'
    });

    renderPage();
    await userEvent.click(await getExportButton());

    await waitFor(() => expect(clickedAnchor).not.toBeNull());
    expect(URL.createObjectURL).toHaveBeenCalledWith(csvResult.blob);
    expect(clickedAnchor?.download).toBe('server report.csv');
    expect(clickedAnchor?.href).toContain('blob:subscriber-export');
    expect(await screen.findByText('Export successful.')).toBeInTheDocument();
  });

  it('uses a dated fallback filename and revokes the object URL', async () => {
    mocks.exportSubscribers.mockResolvedValue({
      ...csvResult,
      contentDisposition: null
    });

    renderPage();
    await userEvent.click(await getExportButton());

    await waitFor(() => expect(clickedAnchor).not.toBeNull());
    expect(clickedAnchor?.download).toMatch(/^subscribers_\d{4}-\d{2}-\d{2}\.csv$/);
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:subscriber-export'));
  });

  it('does not download a non-CSV success response and shows a safe error', async () => {
    mocks.exportSubscribers.mockResolvedValue({
      blob: new Blob(['<html>sign in</html>'], { type: 'text/html' }),
      contentType: 'text/html',
      contentDisposition: null
    });

    renderPage();
    await userEvent.click(await getExportButton());

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(clickedAnchor).toBeNull();
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('shows a safe error when the export request fails', async () => {
    mocks.exportSubscribers.mockRejectedValue(new Error('database token leaked'));

    renderPage();
    await userEvent.click(await getExportButton());

    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});
