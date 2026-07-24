import React, { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'; size?: 'sm' | 'md' | 'lg'; isLoading?: boolean; 'aria-label': string; }

export function IconButton({ variant = 'ghost', size = 'md', isLoading = false, className = '', disabled, children, type = 'button', ...props }: IconButtonProps) {
  const variants = { primary: 'bg-sky-600 text-white hover:bg-sky-700', secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200', outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50', ghost: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-950', destructive: 'bg-rose-50 text-rose-700 hover:bg-rose-100' };
  const sizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-11 w-11' };
  return <button type={type} className={`focus-ring inline-flex shrink-0 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : children}</button>;
}