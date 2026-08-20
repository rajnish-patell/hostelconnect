const nodemailer = require('nodemailer');
const crypto = require('crypto');

// In-memory OTP store (email -> { code, expiresAt, attempts })
const otpStore = new Map();
// Rate limit store (email -> { requests: [], blockedUntil })
const rateLimitStore = new Map();

/**
 * Get nodemailer transporter configured via SMTP environment variables
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    ...(process.env.SMTP_SERVICE ? { service: process.env.SMTP_SERVICE } : {}),
  });
}

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 */
function generateOtpCode() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Check rate limit for OTP requests (max 5 requests per 15 minutes)
 */
function checkRateLimit(email) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(email) || { requests: [], blockedUntil: 0 };

  if (userLimit.blockedUntil > now) {
    const waitMins = Math.ceil((userLimit.blockedUntil - now) / 60000);
    return { allowed: false, error: `Too many OTP requests. Please wait ${waitMins} minute(s).` };
  }

  const recentRequests = userLimit.requests.filter(t => now - t < 15 * 60 * 1000);

  if (recentRequests.length >= 5) {
    userLimit.blockedUntil = now + 15 * 60 * 1000;
    rateLimitStore.set(email, userLimit);
    return { allowed: false, error: 'Too many OTP requests. Blocked for 15 minutes.' };
  }

  recentRequests.push(now);
  rateLimitStore.set(email, { requests: recentRequests, blockedUntil: 0 });
  return { allowed: true };
}

/**
 * Send real Email OTP to the parent's email address
 */
async function sendEmailOtp(email) {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check Rate Limiting
  const rateLimit = checkRateLimit(normalizedEmail);
  if (!rateLimit.allowed) {
    throw new Error(rateLimit.error);
  }

  // 2. Generate cryptographically random 6-digit OTP
  const otpCode = generateOtpCode();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

  // 3. Store in OTP memory store
  otpStore.set(normalizedEmail, {
    code: otpCode,
    expiresAt,
    attempts: 0,
  });

  const transporter = getTransporter();

  if (transporter) {
    const fromAddress = process.env.SMTP_FROM || `"Hostel Video Call" <${process.env.SMTP_USER}>`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #00a76f; margin: 0;">Hostel Video Call Portal</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Parent Verification Code</p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 10px; margin-bottom: 20px;">
          <p style="font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Your 6-Digit Verification Code</p>
          <h1 style="font-size: 36px; font-family: monospace; color: #0f172a; letter-spacing: 6px; margin: 0;">${otpCode}</h1>
          <p style="font-size: 12px; color: #ef4444; margin-top: 10px; font-weight: bold;">Valid for 10 minutes</p>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          Use this verification code to complete your login to the Hostel Video Calling portal. Do not share this OTP with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
          If you did not request this OTP, please ignore this email.
        </p>
      </div>
    `;

    try {
      await transporter.sendMail({
        from: fromAddress,
        to: normalizedEmail,
        subject: `${otpCode} is your Hostel Video Call Login OTP`,
        html: htmlContent,
      });
      console.log(`📧 Real SMTP Email OTP sent to ${normalizedEmail}`);
    } catch (smtpErr) {
      console.error('⚠️ SMTP Email send error:', smtpErr.message);
      console.log(`🔑 Real Generated OTP for ${normalizedEmail}: [${otpCode}]`);
    }
  } else {
    console.log(`🔑 Real Generated OTP for ${normalizedEmail}: [${otpCode}]`);
  }

  return {
    success: true,
    email: normalizedEmail,
    expiresInSeconds: 600,
    // Include otpCode in response if SMTP is not configured or DEMO_MODE is true for seamless experience
    ...(process.env.DEMO_MODE === 'true' || !transporter ? { otpCode } : {}),
  };
}

/**
 * Verify Email OTP for parent
 */
function verifyEmailOtp(email, inputOtp) {
  const normalizedEmail = email.trim().toLowerCase();
  const record = otpStore.get(normalizedEmail);

  // Demo shortcut fallback if DEMO_MODE=true
  if (process.env.DEMO_MODE === 'true' && (inputOtp === '123456' || inputOtp === '000000')) {
    otpStore.delete(normalizedEmail);
    return { valid: true };
  }

  if (!record) {
    return { valid: false, error: 'OTP expired or not requested. Please request a new OTP.' };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'OTP has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    otpStore.delete(normalizedEmail);
    return { valid: false, error: 'Too many invalid attempts. Please request a new OTP.' };
  }

  if (record.code !== inputOtp.trim()) {
    record.attempts += 1;
    otpStore.set(normalizedEmail, record);
    const remaining = 5 - record.attempts;
    return { valid: false, error: `Invalid OTP code. ${remaining} attempt(s) remaining.` };
  }

  // OTP is valid! Remove from store
  otpStore.delete(normalizedEmail);
  return { valid: true };
}

module.exports = { sendEmailOtp, verifyEmailOtp, generateOtpCode };
