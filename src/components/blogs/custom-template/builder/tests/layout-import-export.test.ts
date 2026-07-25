import { describe, it, expect } from 'vitest';
import { importLayout } from '../layout-import-export';
import { sampleFrontendCustomTemplateConfig } from '../../custom-template-sample';

describe('Layout JSON Import/Export tests', () => {
  it('should accept valid configuration on import check', () => {
    const layoutStr = JSON.stringify(sampleFrontendCustomTemplateConfig);
    const check = importLayout(layoutStr);
    expect(check.success).toBe(true);
    expect(check.layout?.layoutId).toBe(sampleFrontendCustomTemplateConfig.layoutId);
  });

  it('should reject invalid layouts', () => {
    const badLayout = {
      schemaVersion: 1,
      layoutId: 'bad',
      metadata: { name: 'bad', description: 'bad' },
      page: {},
      sections: [{ id: 'sec-1', slots: [{ id: 'slot-1', components: [{ id: 'comp-1', componentKey: 'invalidKey' }] }] }]
    };

    const check = importLayout(JSON.stringify(badLayout));
    expect(check.success).toBe(false);
    expect(check.error).toContain('validation errors');
  });
});
