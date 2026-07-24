import React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Drawer } from './drawer';
import { Button } from './button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'info' | 'warning' | 'destructive';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'warning',
  isLoading = false,
}: ConfirmationDialogProps) {
  const iconConfig = {
    info: { icon: Info, color: 'text-sky-600 bg-sky-50 border-sky-200', btnVariant: 'primary' as const },
    warning: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200', btnVariant: 'primary' as const },
    destructive: { icon: Trash2, color: 'text-rose-600 bg-rose-50 border-rose-200', btnVariant: 'destructive' as const },
  }[variant];

  const Icon = iconConfig.icon;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      title={
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border ${iconConfig.color}`}>
            <Icon size={20} aria-hidden="true" />
          </div>
          <span>{title}</span>
        </div>
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={iconConfig.btnVariant} onClick={onConfirm} isLoading={isLoading}>
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-sm text-slate-600 leading-relaxed font-semibold">{message}</div>
    </Drawer>
  );
}
