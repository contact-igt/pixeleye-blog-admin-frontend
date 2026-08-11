import { afterEach, describe, it, expect, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SettingsPanel from '../settings-panel';
import { initialState } from '../builder-state';
import { sampleFrontendCustomTemplateConfig } from '../../custom-template-sample';

afterEach(cleanup);

describe('Settings Panel view tests', () => {
  it('should display prompt when no element is selected', () => {
    render(
      <SettingsPanel
        state={initialState}
        dispatch={() => {}}
        activeTab="element"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText(/No element selected/i)).toBeInTheDocument();
  });

  it('should display page inputs under page tab', () => {
    render(
      <SettingsPanel
        state={initialState}
        dispatch={() => {}}
        activeTab="page"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText(/Default Page Width/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Background Style/i)).toBeInTheDocument();
  });

  it('dispatches every Page-level selection to the canonical page field', () => {
    const dispatch = vi.fn();
    render(<SettingsPanel state={initialState} dispatch={dispatch} activeTab="page" onTabChange={() => {}} />);

    fireEvent.change(screen.getByLabelText('Default Page Width'), { target: { value: 'narrow' } });
    fireEvent.change(screen.getByLabelText('Page Background Style'), { target: { value: 'brand_tint' } });
    fireEvent.change(screen.getByLabelText('Vertical Section Spacing'), { target: { value: 'spacious' } });
    fireEvent.change(screen.getByLabelText('Typography Variant'), { target: { value: 'clinical' } });

    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: 'update_page_settings', updates: { contentWidth: 'narrow' } },
      { type: 'update_page_settings', updates: { background: 'brand_tint' } },
      { type: 'update_page_settings', updates: { spacing: 'spacious' } },
      { type: 'update_page_settings', updates: { typography: 'clinical' } }
    ]);
  });

  it('dispatches Layout tab selected section width without updating Page width', () => {
    const dispatch = vi.fn();
    const state = {
      ...initialState,
      layout: sampleFrontendCustomTemplateConfig,
      selectedElement: { type: 'section' as const, sectionId: 'sec-body' }
    };
    render(<SettingsPanel state={state} dispatch={dispatch} activeTab="page" onTabChange={() => {}} />);

    fireEvent.change(screen.getByLabelText('Selected Section Width'), { target: { value: 'standard' } });

    expect(dispatch).toHaveBeenCalledWith({
      type: 'update_section_settings',
      sectionId: 'sec-body',
      updates: { width: 'standard' }
    });
    expect(dispatch).not.toHaveBeenCalledWith({
      type: 'update_page_settings',
      updates: { contentWidth: 'standard' }
    });
  });

  it('dispatches Section-level selections only for the selected Section identity', () => {
    const dispatch = vi.fn();
    const state = {
      ...initialState,
      layout: sampleFrontendCustomTemplateConfig,
      selectedElement: { type: 'section' as const, sectionId: 'sec-body' }
    };
    render(<SettingsPanel state={state} dispatch={dispatch} activeTab="element" onTabChange={() => {}} />);

    fireEvent.change(screen.getByLabelText('Section Status'), { target: { value: 'false' } });
    fireEvent.change(screen.getByLabelText('Column Layout'), { target: { value: 'two_column' } });
    fireEvent.change(screen.getByLabelText('Responsive Strategy'), { target: { value: 'equal_columns' } });
    fireEvent.change(screen.getByLabelText('Background Style'), { target: { value: 'sky' } });

    expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
      { type: 'update_section', sectionId: 'sec-body', updates: { enabled: false } },
      { type: 'update_section', sectionId: 'sec-body', updates: { layout: 'two_column' } },
      { type: 'update_section', sectionId: 'sec-body', updates: { responsiveStrategy: 'equal_columns' } },
      { type: 'update_section_settings', sectionId: 'sec-body', updates: { backgroundStyle: 'sky' } }
    ]);
  });
});
