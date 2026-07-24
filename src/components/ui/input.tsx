import React, { useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, helperText, error, leftIcon, rightIcon, className = '', id, disabled, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? `field-${generatedId}`;
  const messageId = error || helperText ? `${inputId}-message` : undefined;
  return <div className="w-full space-y-1.5">
    {label && <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-700">{label}</label>}
    <div className={`relative flex items-center rounded-xl border bg-white shadow-sm transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100 ${error ? 'border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-100' : 'border-slate-300'} ${disabled ? 'bg-slate-100 opacity-70' : ''}`}>
      {leftIcon && <div className="shrink-0 pl-3 text-slate-400" aria-hidden="true">{leftIcon}</div>}
      <input id={inputId} disabled={disabled} {...props} aria-invalid={error ? true : undefined} aria-describedby={messageId} className={`min-w-0 w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed ${leftIcon ? 'pl-2' : ''} ${rightIcon ? 'pr-2' : ''} ${className}`} />
      {rightIcon && <div className="shrink-0 pr-3">{rightIcon}</div>}
    </div>
    {error ? <p id={messageId} className="text-xs font-semibold text-rose-600">{error}</p> : helperText ? <p id={messageId} className="text-xs leading-5 text-slate-500">{helperText}</p> : null}
  </div>;
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; helperText?: string; error?: string; }

export function Textarea({ label, helperText, error, className = '', id, disabled, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? `field-${generatedId}`;
  const messageId = error || helperText ? `${textareaId}-message` : undefined;
  return <div className="w-full space-y-1.5">
    {label && <label htmlFor={textareaId} className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-700">{label}</label>}
    <textarea id={textareaId} disabled={disabled} {...props} aria-invalid={error ? true : undefined} aria-describedby={messageId} className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-950 placeholder:text-slate-400 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300'} ${className}`} />
    {error ? <p id={messageId} className="text-xs font-semibold text-rose-600">{error}</p> : helperText ? <p id={messageId} className="text-xs leading-5 text-slate-500">{helperText}</p> : null}
  </div>;
}