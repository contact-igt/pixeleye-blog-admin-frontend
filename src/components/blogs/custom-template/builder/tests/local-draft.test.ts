import { describe, it, expect } from 'vitest';
import { validateLevel1StructuralSafety } from '../local-draft';
import { sampleFrontendCustomTemplateConfig } from '../../custom-template-sample';

describe('Local Draft Level 1 Validation tests', () => {
  it('should accept valid structural layout draft payload', () => {
    const payload = {
      schemaVersion: 1,
      layoutConfig: JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig)),
      updatedAt: new Date().toISOString(),
      localDraftLabel: 'Test Draft'
    };

    const check = validateLevel1StructuralSafety(payload);
    expect(check.valid).toBe(true);
  });

  it('should reject draft containing blog content or HTML identifiers', () => {
    const payload = {
      schemaVersion: 1,
      layoutConfig: JSON.parse(JSON.stringify(sampleFrontendCustomTemplateConfig)),
      updatedAt: new Date().toISOString(),
      localDraftLabel: 'Test Draft',
      content_html: '<p>unsafe content</p>' // Unsafe key match
    };

    const check = validateLevel1StructuralSafety(payload);
    expect(check.valid).toBe(false);
    expect(check.error).toContain('disallowed content identifier');
  });

  it('should reject draft containing unsupported schema version', () => {
    const payload = {
      schemaVersion: 2,
      layoutConfig: {},
      updatedAt: new Date().toISOString(),
      localDraftLabel: 'Test'
    };

    const check = validateLevel1StructuralSafety(payload);
    expect(check.valid).toBe(false);
  });
});
