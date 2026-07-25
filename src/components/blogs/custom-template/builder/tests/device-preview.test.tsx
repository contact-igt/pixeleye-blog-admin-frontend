import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DevicePreview from '../device-preview';
import { builderReducer } from '../builder-reducer';
import { initialState } from '../builder-state';
import { sampleFrontendCustomTemplateConfig } from '../../custom-template-sample';

describe('Device Preview component tests', () => {
  it('should render edit canvas as default mode', () => {
    render(
      <DevicePreview
        device="desktop"
        layout={sampleFrontendCustomTemplateConfig}
        dispatch={() => {}}
        selectedElement={null}
      />
    );

    // Canvas view renders the section panels
    expect(screen.getAllByRole('button', { name: /^Live Preview$/i })[0]).toBeInTheDocument();
    expect(screen.getByText(/Full Width/i)).toBeInTheDocument();
  });

  it('should render Live Preview without a validation error for the sample layout', () => {
    render(
      <DevicePreview
        device="desktop"
        layout={sampleFrontendCustomTemplateConfig}
        dispatch={() => {}}
        selectedElement={null}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^Live Preview$/i })[0]);
    expect(screen.queryByText(/Custom Template Layout Validation Error/i)).not.toBeInTheDocument();
  });

  it('should render Live Preview without a validation error for a freshly added block (regression for the sampleFrontendBlocksDoc bug)', () => {
    let state = builderReducer(initialState, { type: 'add_section', layoutType: 'full_width' });
    const sectionId = state.layout.sections[0].id;
    const slotId = state.layout.sections[0].slots[0].id;
    state = builderReducer(state, { type: 'select_element', element: { type: 'slot', sectionId, slotId } });
    state = builderReducer(state, { type: 'add_component', componentKey: 'key_takeaways' });

    render(
      <DevicePreview
        device="desktop"
        layout={state.layout}
        dispatch={() => {}}
        selectedElement={null}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: /^Live Preview$/i })[0]);
    expect(screen.queryByText(/Custom Template Layout Validation Error/i)).not.toBeInTheDocument();
  });
});
