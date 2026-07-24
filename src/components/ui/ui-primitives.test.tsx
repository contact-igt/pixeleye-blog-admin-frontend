import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { ConfirmationDialog } from './confirmation-dialog';
import { Modal } from './modal';
import { StatusBadge } from './status-badge';

describe('shared UI primitives', () => {
  afterEach(() => { cleanup(); document.body.style.overflow = ''; });

  it('exposes loading and disabled button state', () => {
    render(<Button isLoading disabled>Saving</Button>);
    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled();
  });

  it('communicates status with visible text', () => {
    render(<StatusBadge status="published" />);
    expect(screen.getByText('published')).toBeVisible();
  });

  it('locks page scroll and closes a modal with Escape', async () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Media details"><p>Dialog content</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'Media details' })).toBeInTheDocument();
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires an explicit confirmation action', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmationDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} title="Restore item?" message="Return this item to the active list." confirmText="Restore" variant="info" />);
    await userEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});