import React, { type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
  interactive?: boolean;
}

export function Card({ children, className = '', as: Component = 'section', interactive = false, ...props }: CardProps) {
  return (
    <Component
      className={`crm-card rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.04)] ${interactive ? 'crm-card-interactive' : ''} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export interface SectionCardProps extends Omit<CardProps, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}

export function SectionCard({ title, subtitle, action, children, className = '', ...props }: SectionCardProps) {
  return (
    <Card className={className} {...props}>
      {(title || subtitle || action) && (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="min-w-0">
            {title && <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}
