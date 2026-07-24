'use client';

import React, { useId } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './icon-button';
import { useDialogBehavior } from './use-dialog-behavior';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export function Modal({ isOpen, onClose, title, description, children, footer, maxWidth = 'lg' }: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const modalRef = useDialogBehavior(isOpen, onClose);
  if (!isOpen) return null;

  const maxWidthClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '4xl': 'max-w-4xl' }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <button type="button" className="fixed inset-0 cursor-default bg-slate-950/45" onClick={onClose} aria-label="Close dialog" tabIndex={-1} />
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} tabIndex={-1} className={`relative z-10 flex max-h-[92vh] w-full ${maxWidthClasses} flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0"><h2 id={titleId} className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-500">{description}</p>}</div>
          <IconButton variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="-mr-1 text-slate-500"><X size={18} aria-hidden="true" /></IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}