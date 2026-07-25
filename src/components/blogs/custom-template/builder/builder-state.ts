import type {
  CustomTemplateLayoutConfigV1,
  CustomTemplatePageSettings
} from '../custom-template.types';
import type { FrontendValidationError } from '../custom-template-validation';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

export type SelectedElement =
  | null
  | { type: 'section'; sectionId: string }
  | { type: 'slot'; sectionId: string; slotId: string }
  | { type: 'component'; sectionId: string; slotId: string; componentId: string };

export interface PendingLayoutReduction {
  sectionId: string;
  newLayout: any;
  currentSlotCount: number;
  newSlotCount: number;
}

export interface BuilderState {
  layout: CustomTemplateLayoutConfigV1;
  selectedElement: SelectedElement;
  previewDevice: PreviewDevice;
  isDirty: boolean;
  validationResult: {
    valid: boolean;
    errors: FrontendValidationError[];
  };
  pendingLayoutReduction: PendingLayoutReduction | null;
  history: CustomTemplateLayoutConfigV1[];
  future: CustomTemplateLayoutConfigV1[];
  validationMessage: string | null;
}

export const initialPageSettings: CustomTemplatePageSettings = {
  contentWidth: 'standard',
  background: 'white',
  spacing: 'normal',
  typography: 'editorial'
};

export const initialLayout: CustomTemplateLayoutConfigV1 = {
  schemaVersion: 1,
  layoutId: 'custom_layout_new',
  metadata: {
    name: 'New Custom Template',
    description: 'A custom reusable article layout structure.'
  },
  page: initialPageSettings,
  sections: []
};

export const initialState: BuilderState = {
  layout: initialLayout,
  selectedElement: null,
  previewDevice: 'desktop',
  isDirty: false,
  validationResult: { valid: true, errors: [] },
  pendingLayoutReduction: null,
  history: [],
  future: [],
  validationMessage: null
};
