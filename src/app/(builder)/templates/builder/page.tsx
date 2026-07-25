'use client';

import React from 'react';
import CustomTemplateBuilder from '@/components/blogs/custom-template/builder/custom-template-builder';
import { initialLayout } from '@/components/blogs/custom-template/builder/builder-state';

export default function BuilderPage() {
  return (
    <CustomTemplateBuilder 
      mode="create"
      metadata={{ name: 'Sandbox Builder', description: '' }}
      initialLayout={initialLayout}
      saveLabel="Save Draft"
      onSave={() => {}}
      onBack={() => {}}
    />
  );
}
