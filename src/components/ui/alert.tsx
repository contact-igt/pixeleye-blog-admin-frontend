import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
  action?: ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', title, children, onDismiss, action, className = '' }: AlertProps) {
  const styles = {
    info: { icon: Info, shell: 'border-sky-200 bg-sky-50 text-sky-900', iconColor: 'text-sky-600' },
    success: { icon: CheckCircle2, shell: 'border-emerald-200 bg-emerald-50 text-emerald-900', iconColor: 'text-emerald-600' },
    warning: { icon: TriangleAlert, shell: 'border-amber-200 bg-amber-50 text-amber-950', iconColor: 'text-amber-600' },
    error: { icon: AlertCircle, shell: 'border-rose-200 bg-rose-50 text-rose-900', iconColor: 'text-rose-600' },
  }[variant];
  const Icon = styles.icon;

  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${styles.shell} ${className}`}>
      <Icon size={18} className={`mt-0.5 shrink-0 ${styles.iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? 'mt-0.5 text-xs leading-5' : 'text-xs leading-5'}>{children}</div>
      </div>
      {action}
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="focus-ring -m-1 rounded-lg p-1 opacity-70 hover:bg-white/60 hover:opacity-100"><X size={16} aria-hidden="true" /></button>}
    </div>
  );
}