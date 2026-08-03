import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createDefaultBlogBlocks, template2SidebarFieldErrors, type BlogBlocksDocument } from '@/types/blog-blocks';
import { TemplatePreviewRenderer } from '../templates/template-preview-renderer';
import { TemplateTwoSidebarEditor } from './template-two-sidebar-editor';

function EditorHarness({ initial = createDefaultBlogBlocks() }: { initial?: BlogBlocksDocument }) {
  const [value, setValue] = useState(initial);
  return <><TemplateTwoSidebarEditor value={value} onChange={setValue} /><output>{JSON.stringify(value.sidebar)}</output></>;
}

describe('TemplateTwoSidebarEditor', () => {
  afterEach(cleanup);

  it('edits required Appointment and Newsletter state and generates the call URL', () => {
    render(<EditorHarness />);
    fireEvent.change(screen.getByLabelText('Appointment Heading'), { target: { value: 'Talk to our specialist' } });
    fireEvent.change(screen.getByLabelText('Phone Number'), { target: { value: '+91 98765 43210' } });
    fireEvent.change(screen.getByLabelText('Newsletter Heading'), { target: { value: 'Weekly eye health' } });
    expect(screen.getByRole('status')).toHaveTextContent('Talk to our specialist');
    expect(screen.getByRole('status')).toHaveTextContent('tel:+919876543210');
    expect(screen.getByRole('status')).toHaveTextContent('Weekly eye health');
  });

  it('returns field errors for missing required text, URL, and phone', () => {
    const document = createDefaultBlogBlocks();
    document.sidebar!.appointment_cta.heading = '   ';
    document.sidebar!.appointment_cta.book_appointment.url = '';
    document.sidebar!.appointment_cta.call_now.phone = '';
    document.sidebar!.appointment_cta.call_now.url = '';
    document.sidebar!.newsletter.description = '';
    const errors = template2SidebarFieldErrors(document);
    expect(errors).toHaveProperty('blocks_json.sidebar.appointment_cta.heading');
    expect(errors).toHaveProperty('blocks_json.sidebar.appointment_cta.book_appointment.url');
    expect(errors).toHaveProperty('blocks_json.sidebar.appointment_cta.call_now.phone');
    expect(errors).toHaveProperty('blocks_json.sidebar.newsletter.description');
  });

  it('restores saved values and previews the exact configured sidebar content inertly', () => {
    const blocks = createDefaultBlogBlocks();
    blocks.sidebar!.appointment_cta.heading = 'Saved consultation heading';
    blocks.sidebar!.appointment_cta.book_appointment.label = 'Visit clinic';
    blocks.sidebar!.newsletter.heading = 'Saved newsletter heading';
    blocks.sidebar!.newsletter.email_placeholder = 'name@example.com';
    blocks.sidebar!.newsletter.button_label = 'Join updates';
    const { rerender } = render(<EditorHarness initial={blocks} />);
    expect(screen.getByLabelText('Appointment Heading')).toHaveValue('Saved consultation heading');
    rerender(<TemplatePreviewRenderer templateKey="template_2" templateVersion={1} title="Article" excerpt="Summary" html="" blocks={blocks} />);
    expect(screen.getByText('Saved consultation heading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visit clinic' })).toBeDisabled();
    expect(screen.getByText('Saved newsletter heading')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Join updates' })).toBeDisabled();
  });
});
