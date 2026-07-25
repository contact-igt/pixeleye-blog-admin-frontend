import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import SettingsPanel from '../settings-panel';
import { initialState } from '../builder-state';

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

    expect(screen.getByText(/Content Column Width/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Background Style/i)).toBeInTheDocument();
  });
});
