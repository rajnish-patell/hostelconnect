/**
 * Reusable input validation and sanitization utilities
 */

// Basic email regex matching standard RFC format
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 10-digit mobile number regex
export const PHONE_REGEX = /^[6-9]\d{9}$/;

// 6-digit numeric OTP regex
export const OTP_REGEX = /^\d{6}$/;

/**
 * Validate email address format
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return 'Email address is required';
  const trimmed = email.trim();
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address (e.g. user@example.com)';
  }
  if (trimmed.length > 255) {
    return 'Email address cannot exceed 255 characters';
  }
  return null;
}

/**
 * Validate optional email address (valid only if provided)
 */
export function validateOptionalEmail(email) {
  if (!email || typeof email !== 'string' || !email.trim()) return null;
  return validateEmail(email);
}

/**
 * Validate mobile phone number (10 digits)
 */
export function validatePhone(phone, fieldLabel = 'Mobile number') {
  if (!phone || typeof phone !== 'string') return `${fieldLabel} is required`;
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 0) return `${fieldLabel} is required`;
  if (clean.length !== 10) {
    return `${fieldLabel} must be exactly 10 digits`;
  }
  if (!/^[6-9]/.test(clean)) {
    return `${fieldLabel} must start with 6, 7, 8, or 9`;
  }
  return null;
}

/**
 * Validate optional phone number
 */
export function validateOptionalPhone(phone, fieldLabel = 'Contact phone') {
  if (!phone || typeof phone !== 'string' || !phone.trim()) return null;
  return validatePhone(phone, fieldLabel);
}

/**
 * Validate password
 */
export function validatePassword(password, minLength = 4, fieldLabel = 'Password') {
  if (!password || typeof password !== 'string') return `${fieldLabel} is required`;
  if (password.length < minLength) {
    return `${fieldLabel} must be at least ${minLength} characters`;
  }
  if (password.length > 128) {
    return `${fieldLabel} cannot exceed 128 characters`;
  }
  return null;
}

/**
 * Validate standard text input with min and max bounds
 */
export function validateText(value, fieldLabel, minLength = 1, maxLength = 100) {
  if (!value || typeof value !== 'string') return `${fieldLabel} is required`;
  const trimmed = value.trim();
  if (trimmed.length < minLength) {
    return `${fieldLabel} must be at least ${minLength} character${minLength > 1 ? 's' : ''}`;
  }
  if (trimmed.length > maxLength) {
    return `${fieldLabel} cannot exceed ${maxLength} characters`;
  }
  return null;
}

/**
 * Validate numeric bounds (min, max, step)
 */
export function validateNumber(value, min, max, fieldLabel, allowDecimals = false) {
  if (value === undefined || value === null || value === '') {
    return `${fieldLabel} is required`;
  }
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldLabel} must be a valid number`;
  }
  if (!allowDecimals && !Number.isInteger(num)) {
    return `${fieldLabel} must be a whole number`;
  }
  if (min !== undefined && num < min) {
    return `${fieldLabel} must be at least ${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldLabel} cannot exceed ${max}`;
  }
  return null;
}

/**
 * Validate 6-digit OTP
 */
export function validateOtp(otp) {
  if (!otp || typeof otp !== 'string') return 'OTP is required';
  const clean = otp.replace(/\D/g, '');
  if (!OTP_REGEX.test(clean)) {
    return 'Please enter the complete 6-digit verification code';
  }
  return null;
}
