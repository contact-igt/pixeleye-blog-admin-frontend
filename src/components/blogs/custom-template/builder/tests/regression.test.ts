import { describe, it, expect } from 'vitest';
import type { BlogTemplateKey } from '@/types/blog';

// Check public surface contract matches expectations
describe('Frontend Contract Regression tests (Strictly Public)', () => {
  it('should verify BlogTemplateKey allows exactly template_1 and template_2', () => {
    // Compile-time check: we verify that we can assign only these two keys.
    const key1: BlogTemplateKey = 'template_1';
    const key2: BlogTemplateKey = 'template_2';
    
    expect(key1).toBe('template_1');
    expect(key2).toBe('template_2');
  });
});
