import { useRef, useEffect } from 'react';

/**
 * 6-Digit Auto-Advancing OTP Input Component
 * @param {object} props
 * @param {string} props.value - 6-digit OTP string
 * @param {function} props.onChange - callback when OTP changes (receives new 6-digit string)
 * @param {boolean} props.disabled - disabled state
 * @param {boolean} props.hasError - error state for border highlighting
 */
export default function OtpInput({ value = '', onChange, disabled = false, hasError = false }) {
  const inputRefs = useRef([]);
  const length = 6;

  // Convert current OTP value into an array of 6 characters
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first input box on mount if value is empty
    if (!value && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index, e) => {
    const rawVal = e.target.value;
    const char = rawVal.replace(/\D/g, '').slice(-1); // Only take last typed digit

    const newDigits = [...digits];
    newDigits[index] = char;
    const newOtp = newDigits.join('');

    onChange(newOtp);

    // Auto advance to next input if digit was entered
    if (char && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Backspace on empty input -> focus previous box
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const numericData = pastedData.replace(/\D/g, '').slice(0, length);
    if (!numericData) return;

    onChange(numericData);

    // Focus box after last pasted digit
    const nextIdx = Math.min(numericData.length, length - 1);
    if (inputRefs.current[nextIdx]) {
      inputRefs.current[nextIdx].focus();
    }
  };

  return (
    <div className="w-full space-y-2">
      <label className="block text-xs font-semibold text-slate-700 text-center">
        Enter 6-Digit Verification Code
      </label>
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-sm mx-auto">
        {Array.from({ length }).map((_, index) => {
          const digit = digits[index] || '';
          return (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={digit}
              disabled={disabled}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              aria-label={`Digit ${index + 1} of 6`}
              className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 ${
                disabled
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : hasError
                  ? 'bg-red-50/50 border-red-300 text-red-700 focus:border-red-500 focus:ring-red-500/20'
                  : digit
                  ? 'bg-brand-50/40 border-brand-500 text-brand-900 focus:border-brand-600 focus:ring-brand-500/20'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-brand-600 focus:ring-brand-500/20 hover:border-slate-400'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
