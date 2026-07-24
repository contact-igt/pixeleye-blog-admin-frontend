import type { TipTapDocument } from '@/types/blog';
import type { BlogBlocksDocument } from '@/types/blog-blocks';

export const templateTwoSampleContent: TipTapDocument = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Understanding your eye health' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Regular eye examinations can identify changes early and help your care team recommend appropriate next steps.' }] },
    { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'When to arrange a review' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Contact your clinician if you notice sudden vision changes, persistent discomfort, or new flashes and floaters.' }] }
  ]
};

export const templateTwoSampleHtml = '<h2>Understanding your eye health</h2><p>Regular eye examinations can identify changes early and help your care team recommend appropriate next steps.</p><h3>When to arrange a review</h3><p>Contact your clinician if you notice sudden vision changes, persistent discomfort, or new flashes and floaters.</p>';

export const templateTwoSampleBlocks: BlogBlocksDocument = {
  schema_version: 1,
  blocks: {
    hero: { category: 'Eye health', breadcrumb: ['Home', 'Health Library', 'Vision care'], reviewer: { name: 'Dr. Aanya Nair', credentials: 'DNB Ophthalmology' }, reading_time_minutes: 6 },
    key_takeaways: { enabled: true, heading: 'Key Takeaways', items: ['Routine checks help detect changes early.', 'Protective habits reduce strain and irritation.', 'Sudden symptoms should be assessed promptly.'] },
    image_comparison: { enabled: true, heading: 'A visual guide to common changes', items: [
      { media_id: null, title: 'Routine review', description: 'Useful for preventive check-ins and ongoing monitoring.' },
      { media_id: null, title: 'Early changes', description: 'A timely review can help clarify new or changing symptoms.' },
      { media_id: null, title: 'Urgent symptoms', description: 'Sudden vision loss or severe discomfort needs urgent care.' }
    ] },
    numbered_list: { enabled: true, heading: 'Common early symptoms', items: [
      { title: 'Cloudy or blurry vision', description: 'Changing focus, dryness or an underlying condition can affect visual clarity.' },
      { title: 'Difficulty with night vision', description: 'A drop in night comfort can appear before broader symptoms are noticed.' },
      { title: 'Sensitivity to light and glare', description: 'This can accompany inflammation, dryness or changes on the eye surface.' }
    ] },
    expert_quote: { enabled: true, quote: 'The most important step is to notice meaningful changes early, especially when they affect daily routines.', name: 'Dr. Aanya Nair', role: 'Consultant Ophthalmologist', media_id: null, profile_url: '' },
    medical_cta: { enabled: true, heading: 'Need clinical guidance?', description: 'If symptoms are sudden, severe or affecting safety, contact your care team or local emergency support.', primary: { label: 'Book an appointment', url: '' }, secondary: { label: 'Call now', url: '' } },
    faq: { enabled: true, heading: 'Frequently asked questions', items: [
      { question: 'How often should I schedule an eye review?', answer: 'The right timing depends on your age, symptoms and individual risk factors. Your clinician can recommend a schedule.' },
      { question: 'When should I seek urgent help?', answer: 'Seek immediate care for sudden blurred vision, flashes, double vision or severe pain.' }
    ] },
    feedback: { enabled: true, prompt: 'Was this article helpful?' },
    share: { enabled: true },
    disclaimer: { enabled: true, text: 'This preview content is for demonstration only. Medical information should not replace professional advice, diagnosis or treatment.' }
  }
};
