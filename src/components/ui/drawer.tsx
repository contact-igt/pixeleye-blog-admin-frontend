'use client';

import React, { useId } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './icon-button';
import { useDialogBehavior } from './use-dialog-behavior';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Drawer({ isOpen, onClose, title, description, children, footer, size = 'md' }: DrawerProps) {
  const titleId = useId();
  const descriptionId = useId();
  const drawerRef = useDialogBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const sizeClasses = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <button type="button" className="fixed inset-0 cursor-default bg-slate-950/45" onClick={onClose} aria-label="Close drawer" tabIndex={-1} />
      <div className="fixed inset-y-0 right-0 flex w-full justify-end sm:pl-10">
        <div ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={`relative flex h-full w-full ${sizeClasses} flex-col border-l border-slate-200 bg-white shadow-2xl`}>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0"><div id={titleId} className="text-lg font-bold tracking-tight text-slate-900">{title}</div>{description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}</div>
            <IconButton variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="-mr-1 text-slate-500"><X size={18} aria-hidden="true" /></IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}