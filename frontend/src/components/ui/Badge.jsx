import React from 'react';

const variants = {
  success: 'bg-[#00A76F]/12 text-[#007849] border-transparent font-bold',
  warning: 'bg-[#FFAB00]/16 text-[#B76E00] border-transparent font-bold',
  danger: 'bg-[#FF5630]/12 text-[#B71D18] border-transparent font-bold',
  brand: 'bg-[#00A76F]/12 text-[#007849] border-transparent font-bold',
  neutral: 'bg-[#919EAB]/12 text-[#637381] border-transparent font-semibold',
  info: 'bg-[#078DEE]/12 text-[#078DEE] border-transparent font-bold',
};

const dotColors = {
  success: 'bg-[#00A76F]',
  warning: 'bg-[#FFAB00]',
  danger: 'bg-[#FF5630]',
  brand: 'bg-[#00A76F]',
  neutral: 'bg-[#919EAB]',
  info: 'bg-[#078DEE]',
};

export default function Badge({
  children,
  variant = 'neutral',
  withDot = false,
  className = '',
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border ${
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
