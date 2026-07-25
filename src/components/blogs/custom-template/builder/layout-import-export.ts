import type { CustomTemplateLayoutConfigV1 } from '../custom-template.types';
import { validateFrontendCustomTemplateLayout } from '../custom-template-validation';

export function exportLayout(layout: CustomTemplateLayoutConfigV1): { success: boolean; error?: string } {
  // Must satisfy Level 2 validation
  const validation = validateFrontendCustomTemplateLayout(layout);
  if (!validation.valid) {
    return {
      success: false,
      error: 'Cannot export invalid configuration. Please resolve all validation errors first.'
    };
  }

  try {
    const filename = `${layout.layoutId || 'custom-layout'}-v1.json`;
    const jsonStr = JSON.stringify(layout, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Export failed.' };
  }
}

export function importLayout(jsonString: string): { success: boolean; layout?: CustomTemplateLayoutConfigV1; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateFrontendCustomTemplateLayout(parsed);
    if (!validation.valid) {
      const messages = validation.errors.map((e) => `[${e.path}] ${e.message}`).join('\n');
      return {
        success: false,
        error: `Import failed. Layout file contains validation errors:\n${messages}`
      };
    }
    return { success: true, layout: parsed as CustomTemplateLayoutConfigV1 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `Import failed: ${err.message}` : 'Invalid layout JSON file.'
    };
  }
}
