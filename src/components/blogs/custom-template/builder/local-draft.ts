import type { CustomTemplateLayoutConfigV1 } from '../custom-template.types';

export const LOCAL_DRAFT_KEY = 'pixel-eye-custom-template-builder-draft-v1';
export const NEW_CUSTOM_TEMPLATE_DRAFT_KEY = 'pixel-eye-custom-template-builder-new-v1';
export function persistedCustomTemplateDraftKey(templateId: string): string {
  return `pixel-eye-custom-template-builder-${templateId}-v1`;
}

export interface LocalDraftPayload {
  schemaVersion: 1;
  layoutConfig: CustomTemplateLayoutConfigV1;
  updatedAt: string;
  localDraftLabel: string;
}

export interface NewCustomTemplateDraftPayload extends LocalDraftPayload {
  templateName: string;
  description: string;
  selectedStarter: string;
}

export function isSafePlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function validateLevel1StructuralSafety(payload: unknown): { valid: boolean; error?: string } {
  if (!isSafePlainObject(payload)) {
    return { valid: false, error: 'Draft payload is not a plain object.' };
  }

  // Reject potential PII, Blog content, executable values, or tokens
  const keysStr = JSON.stringify(payload).toLowerCase();
  const unsafeKeywords = [
    'content_html',
    'patient_',
    'ssn',
    'social_security',
    'medical_record',
    'token',
    'auth',
    'secret',
    'password',
    'function',
    'eval',
    'javascript:'
  ];
  for (const keyword of unsafeKeywords) {
    if (keysStr.includes(keyword)) {
      return { valid: false, error: `Draft payload contains disallowed content identifier: ${keyword}` };
    }
  }

  const p = payload as Partial<LocalDraftPayload & NewCustomTemplateDraftPayload>;
  if (p.schemaVersion !== 1) {
    return { valid: false, error: `Unsupported schema version: ${String(p.schemaVersion)}` };
  }

  if (!isSafePlainObject(p.layoutConfig)) {
    return { valid: false, error: 'Draft layout configuration is missing or invalid.' };
  }

  const config = p.layoutConfig as Partial<CustomTemplateLayoutConfigV1>;
  if (config.schemaVersion !== 1) {
    return { valid: false, error: 'Unsupported layout configuration schema version.' };
  }

  if (!Array.isArray(config.sections)) {
    return { valid: false, error: 'Layout must contain a sections array.' };
  }

  if (config.sections.length > 20) {
    return { valid: false, error: 'Layout exceeds maximum limit of 20 sections.' };
  }

  for (const section of config.sections) {
    if (!isSafePlainObject(section)) {
      return { valid: false, error: 'Section is not a valid object.' };
    }
    if (typeof section.id !== 'string') {
      return { valid: false, error: 'Section missing unique string ID.' };
    }
    if (!Array.isArray(section.slots)) {
      return { valid: false, error: `Section ${section.id} missing slots array.` };
    }
    if (section.slots.length > 3) {
      return { valid: false, error: `Section ${section.id} exceeds maximum limit of 3 slots.` };
    }

    for (const slot of section.slots) {
      if (!isSafePlainObject(slot)) {
        return { valid: false, error: 'Slot is not a valid object.' };
      }
      if (typeof slot.id !== 'string') {
        return { valid: false, error: 'Slot missing unique string ID.' };
      }
      if (!Array.isArray(slot.components)) {
        return { valid: false, error: `Slot ${slot.id} missing components array.` };
      }
      if (slot.components.length > 10) {
        return { valid: false, error: `Slot ${slot.id} exceeds maximum limit of 10 components.` };
      }

      for (const component of slot.components) {
        if (!isSafePlainObject(component)) {
          return { valid: false, error: 'Component is not a valid object.' };
        }
        if (typeof component.id !== 'string') {
          return { valid: false, error: 'Component missing unique string ID.' };
        }
        if (typeof component.componentKey !== 'string') {
          return { valid: false, error: 'Component missing componentKey identifier.' };
        }
        // settings verification (must be plain object if present)
        if (component.settings !== undefined && !isSafePlainObject(component.settings)) {
          return { valid: false, error: `Component ${component.id} has invalid settings configuration.` };
        }
      }
    }
  }

  return { valid: true };
}

export function saveLocalDraft(layoutConfig: CustomTemplateLayoutConfigV1, key: string = LOCAL_DRAFT_KEY): void {
  try {
    const payload: LocalDraftPayload = {
      schemaVersion: 1,
      layoutConfig,
      updatedAt: new Date().toISOString(),
      localDraftLabel: `Auto-saved at ${new Date().toLocaleTimeString()}`
    };

    // Safety check before saving
    const check = validateLevel1StructuralSafety(payload);
    if (!check.valid) {
      console.warn('Skipped draft save: ' + (check.error || 'unknown'));
      return;
    }

    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save draft to storage:', err);
  }
}

export function loadLocalDraft(key: string = LOCAL_DRAFT_KEY): LocalDraftPayload | null {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const check = validateLevel1StructuralSafety(parsed);
    if (!check.valid) {
      console.warn('Rejected corrupt or unsafe local draft: ' + (check.error || 'unknown'));
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed as LocalDraftPayload;
  } catch {
    return null;
  }
}

export function saveNewCustomTemplateDraft(payload: Omit<NewCustomTemplateDraftPayload, 'schemaVersion' | 'updatedAt' | 'localDraftLabel'>, key: string = NEW_CUSTOM_TEMPLATE_DRAFT_KEY): void {
  try {
    const fullPayload: NewCustomTemplateDraftPayload = {
      schemaVersion: 1,
      ...payload,
      updatedAt: new Date().toISOString(),
      localDraftLabel: `Auto-saved at ${new Date().toLocaleTimeString()}`
    };

    const check = validateLevel1StructuralSafety(fullPayload);
    if (!check.valid) {
      console.warn('Skipped new draft save: ' + (check.error || 'unknown'));
      return;
    }

    sessionStorage.setItem(key, JSON.stringify(fullPayload));
  } catch (err) {
    console.error('Failed to save new draft to storage:', err);
  }
}

export function loadNewCustomTemplateDraft(key: string = NEW_CUSTOM_TEMPLATE_DRAFT_KEY): NewCustomTemplateDraftPayload | null {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const check = validateLevel1StructuralSafety(parsed);
    if (!check.valid) {
      console.warn('Rejected corrupt or unsafe local new draft: ' + (check.error || 'unknown'));
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed as NewCustomTemplateDraftPayload;
  } catch {
    return null;
  }
}

export function clearLocalDraft(key: string = LOCAL_DRAFT_KEY): void {
  try {
    sessionStorage.removeItem(key);
  } catch (err) {
    console.error('Failed to clear local draft:', err);
  }
}
