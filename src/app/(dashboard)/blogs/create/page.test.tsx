import { describe, expect, it } from 'vitest';
import { requestedTemplate } from './page';

describe('Blog Create template query', () => {
  it('preselects template_1', () => expect(requestedTemplate('template_1')).toBe('template_1'));
  it('preselects template_2', () => expect(requestedTemplate('template_2')).toBe('template_2'));
  it('falls back safely for invalid or repeated values', () => {
    expect(requestedTemplate('unsafe')).toBe('template_1');
    expect(requestedTemplate(undefined)).toBe('template_1');
    expect(requestedTemplate(['template_2', 'template_1'])).toBe('template_2');
  });
});

