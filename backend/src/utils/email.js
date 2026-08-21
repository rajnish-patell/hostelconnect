const otpService = require('./otpService');

/**
 * Send real Email / SMS OTP to the parent
 */
async function sendEmailOtp(destination) {
  return otpService.sendOtp(destination);
}

/**
 * Verify Email / SMS OTP for parent
 */
function verifyEmailOtp(destination, inputOtp) {
  return otpService.verifyOtp(destination, inputOtp);
}

/**
 * Resend OTP
 */
async function resendEmailOtp(destination) {
  return otpService.resendOtp(destination);
}

module.exports = {
  sendEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  sendOtp: otpService.sendOtp,
  verifyOtp: otpService.verifyOtp,
  resendOtp: otpService.resendOtp,
  generateOtpCode: otpService.generateOtpCode,
  otpStore: otpService.otpStore,
};
