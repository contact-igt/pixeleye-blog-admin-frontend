import React, { useId, type SelectHTMLAttributes } from 'react';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; helperText?: string; error?: string; options: { label: string; value: string | number }[]; }

export function Select({ label, helperText, error, options, className = '', id, disabled, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId}`;
  const messageId = error || helperText ? `${selectId}-message` : undefined;
  return <div className="w-full space-y-1.5">
    {label && <label htmlFor={selectId} className="block text-xs font-bold uppercase tracking-[0.1em] text-slate-700">{label}</label>}
    <select id={selectId} disabled={disabled} {...props} aria-invalid={error ? true : undefined} aria-describedby={messageId} className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-950 shadow-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300'} ${className}`}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {error ? <p id={messageId} className="text-xs font-semibold text-rose-600">{error}</p> : helperText ? <p id={messageId} className="text-xs leading-5 text-slate-500">{helperText}</p> : null}
  </div>;
}