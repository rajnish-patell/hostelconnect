import React from 'react';

const variants = {
  primary: 'bg-[#00A76F] hover:bg-[#007849] text-white shadow-[0_8px_16px_0_rgba(0,167,111,0.24)] active:scale-[0.98] border border-transparent font-bold focus:ring-2 focus:ring-[#00A76F]/40',
  secondary: 'bg-[#919EAB]/8 hover:bg-[#919EAB]/16 text-[#1C252E] font-bold active:scale-[0.98] focus:ring-2 focus:ring-slate-300',
  outline: 'bg-transparent hover:bg-[#919EAB]/8 text-[#1C252E] border border-[rgba(145,158,171,0.32)] font-semibold active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-[#919EAB]/8 text-[#637381] hover:text-[#1C252E] font-semibold active:scale-[0.98]',
  destructive: 'bg-[#FF5630] hover:bg-[#B71D18] text-white shadow-[0_8px_16px_0_rgba(255,86,48,0.24)] font-bold active:scale-[0.98]',
  success: 'bg-[#00A76F] hover:bg-[#007849] text-white shadow-[0_8px_16px_0_rgba(0,167,111,0.24)] font-bold active:scale-[0.98]',
  soft: 'bg-[#00A76F]/12 text-[#007849] hover:bg-[#00A76F]/20 font-bold active:scale-[0.98]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-lg gap-1.5 min-h-[36px] sm:min-h-[32px]',
  md: 'px-4 py-2 text-sm font-bold rounded-xl gap-2 min-h-[44px] sm:min-h-[38px]',
  lg: 'px-5 py-2.5 text-base font-bold rounded-xl gap-2.5 min-h-[48px] sm:min-h-[44px]',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  icon: Icon,
  type = 'button',
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none touch-manipulation ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} className="shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
