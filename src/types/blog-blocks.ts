import type { TipTapDocument } from './blog';

export const BLOG_BLOCKS_SCHEMA_VERSION = 1 as const;
export const DEFAULT_MEDICAL_DISCLAIMER =
  'The information is for educational purposes and does not replace professional medical advice, diagnosis or treatment.';

export interface Template2AppointmentCta {
  enabled: true;
  required: true;
  heading: string;
  description: string;
  book_appointment: { enabled: true; label: string; url: string };
  call_now: { enabled: true; label: string; phone: string; url: string };
}

export interface Template2NewsletterConfig {
  enabled: true;
  required: true;
  heading: string;
  description: string;
  email_placeholder: string;
  button_label: string;
}

export interface Template2SidebarConfig {
  appointment_cta: Template2AppointmentCta;
  newsletter: Template2NewsletterConfig;
}

export interface BlogBlocksDocument {
  schema_version: typeof BLOG_BLOCKS_SCHEMA_VERSION;
  blocks: {
    hero: { category: string; breadcrumb: string[]; reviewer: { name: string; credentials: string }; reading_time_minutes: number | null };
    key_takeaways: { enabled: boolean; heading: string; items: string[] };
    image_comparison: { enabled: boolean; heading: string; items: Array<{ media_id: string | null; title: string; description: string }> };
    numbered_list: { enabled: boolean; heading: string; items: Array<{ title: string; description: string }> };
    expert_quote: { enabled: boolean; quote: string; name: string; role: string; media_id: string | null; profile_url: string };
    medical_cta: { enabled: boolean; heading: string; description: string; primary: { label: string; url: string }; secondary: { label: string; url: string } };
    faq: { enabled: boolean; heading: string; items: Array<{ question: string; answer: string }> };
    feedback: { enabled: boolean; prompt: string };
    share: { enabled: boolean };
    disclaimer: { enabled: true; text: string };
  };
  sidebar?: Template2SidebarConfig;
  // Present only for `custom_template` blogs. Each key is a custom template component instance's
  // unique blockId, so repeated placements of the same componentKey hold independent content.
  custom_instances?: Record<string, CustomBlockInstanceContent>;
  // Custom template blogs only: ids of published blogs hand-picked for the "Related" list.
  related_blog_ids?: string[];
}

export function normalizeTemplate2Phone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}

export function createDefaultTemplate2Sidebar(): Template2SidebarConfig {
  const phone = '07075008561';
  return {
    appointment_cta: {
      enabled: true,
      required: true,
      heading: 'Need Expert Eye Care?',
      description: 'Get a precise diagnosis and a treatment plan from our eye care team.',
      book_appointment: { enabled: true, label: 'Book Appointment', url: '/appointment' },
      call_now: { enabled: true, label: 'Call Now', phone, url: `tel:${normalizeTemplate2Phone(phone)}` }
    },
    newsletter: {
      enabled: true,
      required: true,
      heading: 'Get Eye-Care Guidance',
      description: 'Receive expert medical tips and news from our specialists directly in your inbox.',
      email_placeholder: 'Your Email Address',
      button_label: 'Subscribe Now'
    }
  };
}

export type CustomBlockInstanceContent =
  | { componentKey: 'hero'; category: string; breadcrumb: string[]; reviewer: { name: string; credentials: string }; reading_time_minutes: number | null; header_style?: 'standard' | 'article' }
  | { componentKey: 'rich_article_content'; enabled: boolean; content_json: TipTapDocument; html: string }
  | { componentKey: 'key_takeaways'; enabled: boolean; heading: string; items: string[] }
  | { componentKey: 'image_comparison'; enabled: boolean; heading: string; items: Array<{ media_id: string | null; title: string; description: string }> }
  | { componentKey: 'numbered_list'; enabled: boolean; heading: string; items: Array<{ title: string; description: string }> }
  | { componentKey: 'expert_quote'; enabled: boolean; quote: string; name: string; role: string; media_id: string | null; profile_url: string }
  | { componentKey: 'medical_cta'; enabled: boolean; heading: string; description: string; primary: { label: string; url: string }; secondary: { label: string; url: string } }
  | { componentKey: 'faq'; enabled: boolean; heading: string; items: Array<{ question: string; answer: string }> }
  | { componentKey: 'feedback'; enabled: boolean; prompt: string }
  | { componentKey: 'share'; enabled: boolean }
  | { componentKey: 'medical_disclaimer'; enabled: true; text: string }
  | { componentKey: 'table'; enabled: boolean; heading: string; content: string; headers: string[]; rows: string[][] };

export function createDefaultCustomInstanceContent(componentKey: CustomBlockInstanceContent['componentKey']): CustomBlockInstanceContent {
  switch (componentKey) {
    case 'hero': return { componentKey, category: '', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null };
    case 'rich_article_content': return { componentKey, enabled: true, content_json: { type: 'doc', content: [{ type: 'paragraph' }] }, html: '' };
    case 'key_takeaways': return { componentKey, enabled: false, heading: 'Key Takeaways', items: [] };
    case 'image_comparison': return {
      componentKey,
      enabled: true,
      heading: 'Treatment Comparison',
      items: [
        { media_id: null, title: 'Before Treatment', description: '' },
        { media_id: null, title: 'After Treatment', description: '' }
      ]
    };
    case 'numbered_list': return { componentKey, enabled: false, heading: '', items: [] };
    case 'expert_quote': return { componentKey, enabled: false, quote: '', name: '', role: '', media_id: null, profile_url: '' };
    case 'medical_cta': return { componentKey, enabled: false, heading: '', description: '', primary: { label: '', url: '' }, secondary: { label: '', url: '' } };
    case 'faq': return { componentKey, enabled: false, heading: 'Frequently Asked Questions', items: [] };
    case 'feedback': return { componentKey, enabled: true, prompt: 'Was this article helpful?' };
    case 'share': return { componentKey, enabled: true };
    case 'medical_disclaimer': return { componentKey, enabled: true, text: DEFAULT_MEDICAL_DISCLAIMER };
    case 'table': return {
      componentKey,
      enabled: true,
      heading: 'Comparison Table',
      content: '',
      headers: ['Feature', 'Option A', 'Option B'],
      rows: [
        ['Feature 1', 'Value A1', 'Value B1'],
        ['Feature 2', 'Value A2', 'Value B2']
      ]
    };
  }
}

export function createDefaultBlogBlocks(): BlogBlocksDocument {
  return {
    schema_version: BLOG_BLOCKS_SCHEMA_VERSION,
    blocks: {
      hero: { category: '', breadcrumb: [], reviewer: { name: '', credentials: '' }, reading_time_minutes: null },
      key_takeaways: { enabled: false, heading: 'Key Takeaways', items: [] },
      image_comparison: { enabled: false, heading: '', items: [] },
      numbered_list: { enabled: false, heading: '', items: [] },
      expert_quote: { enabled: false, quote: '', name: '', role: '', media_id: null, profile_url: '' },
      medical_cta: { enabled: false, heading: '', description: '', primary: { label: '', url: '' }, secondary: { label: '', url: '' } },
      faq: { enabled: false, heading: 'Frequently Asked Questions', items: [] },
      feedback: { enabled: true, prompt: 'Was this article helpful?' },
      share: { enabled: true },
      disclaimer: { enabled: true, text: DEFAULT_MEDICAL_DISCLAIMER }
    },
    sidebar: createDefaultTemplate2Sidebar()
  };
}

export function normalizeBlogBlocks(value: unknown): BlogBlocksDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return createDefaultBlogBlocks();
  const candidate = value as Partial<BlogBlocksDocument>;
  if (candidate.schema_version !== BLOG_BLOCKS_SCHEMA_VERSION || !candidate.blocks) return createDefaultBlogBlocks();
  const defaults = createDefaultTemplate2Sidebar();
  const rawSidebar = candidate.sidebar;
  const rawAppointment = rawSidebar?.appointment_cta;
  const rawBook = rawAppointment?.book_appointment;
  const rawCall = rawAppointment?.call_now;
  const rawNewsletter = rawSidebar?.newsletter;
  const phone = typeof rawCall?.phone === 'string' ? rawCall.phone : defaults.appointment_cta.call_now.phone;
  const sidebar: Template2SidebarConfig = {
    appointment_cta: {
      enabled: true,
      required: true,
      heading: typeof rawAppointment?.heading === 'string' ? rawAppointment.heading : defaults.appointment_cta.heading,
      description: typeof rawAppointment?.description === 'string' ? rawAppointment.description : defaults.appointment_cta.description,
      book_appointment: {
        enabled: true,
        label: typeof rawBook?.label === 'string' ? rawBook.label : defaults.appointment_cta.book_appointment.label,
        url: typeof rawBook?.url === 'string' ? rawBook.url : defaults.appointment_cta.book_appointment.url
      },
      call_now: {
        enabled: true,
        label: typeof rawCall?.label === 'string' ? rawCall.label : defaults.appointment_cta.call_now.label,
        phone,
        url: typeof rawCall?.url === 'string' ? rawCall.url : `tel:${normalizeTemplate2Phone(phone)}`
      }
    },
    newsletter: {
      enabled: true,
      required: true,
      heading: typeof rawNewsletter?.heading === 'string' ? rawNewsletter.heading : defaults.newsletter.heading,
      description: typeof rawNewsletter?.description === 'string' ? rawNewsletter.description : defaults.newsletter.description,
      email_placeholder: typeof rawNewsletter?.email_placeholder === 'string' ? rawNewsletter.email_placeholder : defaults.newsletter.email_placeholder,
      button_label: typeof rawNewsletter?.button_label === 'string' ? rawNewsletter.button_label : defaults.newsletter.button_label
    }
  };
  return { ...(candidate as BlogBlocksDocument), sidebar };
}

function isSafeAppointmentUrl(value: string): boolean {
  const trimmed = value.trim();
  if (/^\/(?!\/)/.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function template2SidebarFieldErrors(document: BlogBlocksDocument): Record<string, string> {
  const errors: Record<string, string> = {};
  const sidebar = document.sidebar ?? createDefaultTemplate2Sidebar();
  const appointment = sidebar.appointment_cta;
  const newsletter = sidebar.newsletter;
  const addRequired = (path: string, value: string, label: string) => {
    if (!value.trim()) errors[`blocks_json.sidebar.${path}`] = `${label} is required.`;
  };
  addRequired('appointment_cta.heading', appointment.heading, 'Appointment heading');
  addRequired('appointment_cta.book_appointment.label', appointment.book_appointment.label, 'Book Appointment label');
  addRequired('appointment_cta.book_appointment.url', appointment.book_appointment.url, 'Book Appointment URL');
  if (appointment.book_appointment.url.trim() && !isSafeAppointmentUrl(appointment.book_appointment.url)) {
    errors['blocks_json.sidebar.appointment_cta.book_appointment.url'] = 'Use an internal path or an HTTP/HTTPS URL.';
  }
  addRequired('appointment_cta.call_now.label', appointment.call_now.label, 'Call Now label');
  addRequired('appointment_cta.call_now.phone', appointment.call_now.phone, 'Phone number');
  const phone = normalizeTemplate2Phone(appointment.call_now.phone);
  if (appointment.call_now.phone.trim() && !/^\+?\d{7,15}$/.test(phone)) {
    errors['blocks_json.sidebar.appointment_cta.call_now.phone'] = 'Enter a valid phone number with 7 to 15 digits.';
  }
  if (appointment.call_now.url !== `tel:${phone}`) {
    errors['blocks_json.sidebar.appointment_cta.call_now.url'] = 'Call URL must match the phone number.';
  }
  addRequired('newsletter.heading', newsletter.heading, 'Newsletter heading');
  addRequired('newsletter.description', newsletter.description, 'Newsletter description');
  addRequired('newsletter.email_placeholder', newsletter.email_placeholder, 'Email placeholder');
  addRequired('newsletter.button_label', newsletter.button_label, 'Newsletter button label');
  return errors;
}
