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
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            <Icon size={17} />
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
          className={`w-full bg-white border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-150 outline-none ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : 'border-slate-300 hover:border-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20'
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 text-slate-400 flex items-center justify-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-rose-500 font-medium">{error}</p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
