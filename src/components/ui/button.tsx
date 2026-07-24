import React, { type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'; size?: 'sm' | 'md' | 'lg'; isLoading?: boolean; }

export function Button({ children, variant = 'primary', size = 'md', isLoading = false, className = '', disabled, type = 'button', ...props }: ButtonProps) {
  const variants = {
    primary: 'border border-sky-600 bg-sky-600 text-white hover:border-sky-700 hover:bg-sky-700 active:bg-sky-800',
    secondary: 'border border-slate-200 bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100',
    ghost: 'border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950',
    destructive: 'border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
  };
  const sizes = { sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs', md: 'h-10 gap-2 rounded-xl px-4 text-sm', lg: 'h-11 gap-2 rounded-xl px-5 text-sm' };
  return <button type={type} className={`focus-ring inline-flex items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>{isLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />}{children}</button>;
}