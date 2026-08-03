'use client';

import { Input, Textarea } from '@/components/ui/input';
import { createDefaultTemplate2Sidebar, normalizeTemplate2Phone, type BlogBlocksDocument } from '@/types/blog-blocks';
import { Section } from './blog-block-editor';

export function TemplateTwoSidebarEditor({ value, onChange, errors = {} }: {
  value: BlogBlocksDocument;
  onChange: (value: BlogBlocksDocument) => void;
  errors?: Record<string, string>;
}) {
  const sidebar = value.sidebar ?? createDefaultTemplate2Sidebar();
  const appointment = sidebar.appointment_cta;
  const newsletter = sidebar.newsletter;
  const error = (path: string) => errors['blocks_json.sidebar.' + path];
  const setAppointment = (next: typeof appointment) => onChange({ ...value, sidebar: { ...sidebar, appointment_cta: next } });
  const setNewsletter = (next: typeof newsletter) => onChange({ ...value, sidebar: { ...sidebar, newsletter: next } });
  const appointmentComplete = Boolean(appointment.heading.trim() && appointment.book_appointment.label.trim() && appointment.book_appointment.url.trim() && appointment.call_now.label.trim() && appointment.call_now.phone.trim());
  const newsletterComplete = Boolean(newsletter.heading.trim() && newsletter.description.trim() && newsletter.email_placeholder.trim() && newsletter.button_label.trim());

  return <section aria-labelledby="template-two-sidebar-heading" className="space-y-4">
    <div><h2 id="template-two-sidebar-heading" className="text-base font-bold text-slate-900">Template 2 Sidebar</h2><p className="mt-1 text-xs text-slate-500">These sidebar sections are required for Template 2 and will appear on the right side of the published article.</p></div>
    <Section title="Appointment CTA" required complete={appointmentComplete}>
      <Input label="Appointment Heading" value={appointment.heading} maxLength={180} onChange={(event) => setAppointment({ ...appointment, heading: event.target.value })} error={error('appointment_cta.heading')} />
      <Textarea label="Appointment Description" value={appointment.description} maxLength={500} rows={3} onChange={(event) => setAppointment({ ...appointment, description: event.target.value })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Book Appointment Label" value={appointment.book_appointment.label} maxLength={80} onChange={(event) => setAppointment({ ...appointment, book_appointment: { ...appointment.book_appointment, label: event.target.value } })} error={error('appointment_cta.book_appointment.label')} />
        <Input label="Book Appointment URL" value={appointment.book_appointment.url} maxLength={2048} helperText="Use /appointment or an HTTP/HTTPS URL." onChange={(event) => setAppointment({ ...appointment, book_appointment: { ...appointment.book_appointment, url: event.target.value } })} error={error('appointment_cta.book_appointment.url')} />
        <Input label="Call Now Label" value={appointment.call_now.label} maxLength={80} onChange={(event) => setAppointment({ ...appointment, call_now: { ...appointment.call_now, label: event.target.value } })} error={error('appointment_cta.call_now.label')} />
        <Input label="Phone Number" type="tel" value={appointment.call_now.phone} maxLength={40} placeholder="+91 98765 43210" onChange={(event) => { const phone = event.target.value; setAppointment({ ...appointment, call_now: { ...appointment.call_now, phone, url: 'tel:' + normalizeTemplate2Phone(phone) } }); }} error={error('appointment_cta.call_now.phone')} />
      </div>
      <Input label="Call URL Preview" value={appointment.call_now.url} disabled helperText="Generated safely from the phone number." error={error('appointment_cta.call_now.url')} />
    </Section>
    <Section title="Newsletter Subscription" required complete={newsletterComplete}>
      <Input label="Newsletter Heading" value={newsletter.heading} maxLength={180} onChange={(event) => setNewsletter({ ...newsletter, heading: event.target.value })} error={error('newsletter.heading')} />
      <Textarea label="Newsletter Description" value={newsletter.description} maxLength={500} rows={3} onChange={(event) => setNewsletter({ ...newsletter, description: event.target.value })} error={error('newsletter.description')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Email Placeholder" value={newsletter.email_placeholder} maxLength={120} onChange={(event) => setNewsletter({ ...newsletter, email_placeholder: event.target.value })} error={error('newsletter.email_placeholder')} />
        <Input label="Subscribe Button Label" value={newsletter.button_label} maxLength={80} onChange={(event) => setNewsletter({ ...newsletter, button_label: event.target.value })} error={error('newsletter.button_label')} />
      </div>
      <p className="text-xs font-semibold text-slate-500">Subscription consent and API behavior remain controlled by the public Website.</p>
    </Section>
  </section>;
}
