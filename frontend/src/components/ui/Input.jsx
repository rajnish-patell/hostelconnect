import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  icon: Icon,
  rightElement,
  className = '',
  id,
  name,
  required,
  type = 'text',
  min,
  max,
  step,
  minLength,
  maxLength,
  inputMode,
  autoComplete,
  ...props
}) {
  const inputId = id || name;
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-[#1C252E]">
          {label} {required && <span className="text-[#FF5630]">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-[#919EAB] pointer-events-none flex items-center justify-center">
            <Icon size={18} />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          required={required}
          min={min}
          max={max}
          step={step}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full bg-[#F9FAFB] hover:bg-white focus:bg-white border rounded-xl text-sm text-[#1C252E] font-medium placeholder:text-[#919EAB] transition-all duration-200 outline-none touch-manipulation ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} py-3 sm:py-2.5 ${
            error
              ? 'border-[#FF5630] focus:border-[#FF5630] focus:ring-1 focus:ring-[#FF5630]'
              : 'border-[rgba(145,158,171,0.2)] hover:border-[rgba(145,158,171,0.4)] focus:border-[#1C252E] focus:ring-1 focus:ring-[#1C252E]'
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 text-[#919EAB] flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-[#FF5630] font-semibold">{error}</p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-[#637381]">{helperText}</p>
      ) : null}
    </div>
  );
}
