import React from 'react';
import { AlertTriangle, Info, Trash2 } from 'lucide-react';
import { Drawer } from './drawer';
import { Button } from './button';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: React.ReactNode;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  loadingText?: string;
  variant?: 'default' | 'info' | 'warning' | 'destructive';
  isLoading?: boolean;
  isConfirmDisabled?: boolean;
  errorMessage?: string;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loadingText,
  variant = 'warning',
  isLoading = false,
  isConfirmDisabled = false,
  errorMessage,
}: ConfirmationDialogProps) {
  const iconConfig = {
    default: { icon: Info, color: 'text-slate-600 bg-slate-50 border-slate-200', btnVariant: 'primary' as const },
    info: { icon: Info, color: 'text-sky-600 bg-sky-50 border-sky-200', btnVariant: 'primary' as const },
    warning: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200', btnVariant: 'primary' as const },
    destructive: { icon: Trash2, color: 'text-rose-600 bg-rose-50 border-rose-200', btnVariant: 'destructive' as const },
  }[variant];

  const Icon = iconConfig.icon;

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
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
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={iconConfig.btnVariant} 
            onClick={onConfirm} 
            isLoading={isLoading}
            disabled={isLoading || isConfirmDisabled}
          >
            {isLoading && loadingText ? loadingText : confirmText}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {message && <div className="text-sm text-slate-600 leading-relaxed font-semibold">{message}</div>}
        {children}
        {errorMessage && (
          <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-200">
            {errorMessage}
          </div>
        )}
      </div>
    </Drawer>
  );
}
