'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import type { ToastMessage } from '../../contexts/toast-context';

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  const isError = toast.type === 'error';
  
  const styles = {
    info: { icon: Info, shell: 'border-sky-200 bg-sky-50 text-sky-900', iconColor: 'text-sky-600' },
    success: { icon: CheckCircle2, shell: 'border-emerald-200 bg-emerald-50 text-emerald-900', iconColor: 'text-emerald-600' },
    warning: { icon: TriangleAlert, shell: 'border-amber-200 bg-amber-50 text-amber-950', iconColor: 'text-amber-600' },
    error: { icon: AlertCircle, shell: 'border-rose-200 bg-rose-50 text-rose-900', iconColor: 'text-rose-600' },
  }[toast.type];

  const Icon = styles.icon;

  return (
    <div 
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 text-sm shadow-lg transition-all duration-300 ${styles.shell}`}
    >
      <Icon size={18} className={`mt-0.5 shrink-0 ${styles.iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium leading-5">{toast.message}</div>
      </div>
      <button 
        type="button" 
        onClick={onClose} 
        aria-label="Close notification" 
        className="focus-ring -m-1 rounded-lg p-1 opacity-70 hover:bg-white/60 hover:opacity-100"
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
