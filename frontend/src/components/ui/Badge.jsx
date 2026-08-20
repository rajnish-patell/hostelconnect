import React from 'react';

const variants = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/80',
  brand: 'bg-brand-50 text-brand-700 border-brand-200/80',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200/80',
  info: 'bg-sky-50 text-sky-700 border-sky-200/80',
};

const dotColors = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  brand: 'bg-brand-500',
  neutral: 'bg-slate-400',
  info: 'bg-sky-500',
};

export default function Badge({
  children,
  variant = 'neutral',
  withDot = false,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        variants[variant] || variants.neutral
      } ${className}`}
    >
      {withDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[variant] || dotColors.neutral}`} />
      )}
      <span>{children}</span>
    </span>
  );
}
