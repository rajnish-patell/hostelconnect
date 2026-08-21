const crypto = require('crypto');
const prisma = require('./prisma');
const { sendResendOtpEmail } = require('./resendEmail');

/**
 * Generate a cryptographically secure 6-digit numeric OTP code
 */
function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

/**
 * Hash plaintext OTP using SHA-256 for secure database storage
 */
function hashOtp(otpCode) {
  return crypto.createHash('sha256').update(otpCode.trim()).digest('hex');
}

/**
 * Clean & normalize destination string (email or 10-digit mobile number)
 */
function normalizeDestination(destination) {
  if (!destination || typeof destination !== 'string') return { type: 'unknown', value: '' };
  const str = destination.trim();
  if (str.includes('@')) {
    return { type: 'email', value: str.toLowerCase() };
  }
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 10) {
    return { type: 'sms', value: digits.slice(-10) };
  }
  return { type: 'unknown', value: str };
}

/**
 * Rate limit check: max 5 requests per 15 mins & 60-second cooldown
 */
async function checkOtpLimits(destination, channel) {
  const now = new Date();
  const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const sixtySecsAgo = new Date(now.getTime() - 60 * 1000);

  // 1. Check 60-second cooldown
  const recentSent = await prisma.parentOtp.findFirst({
    where: {
      destination,
      channel,
      lastOtpSentAt: { gte: sixtySecsAgo },
    },
    orderBy: { lastOtpSentAt: 'desc' },
  });

  if (recentSent) {
    const elapsed = Math.floor((now.getTime() - new Date(recentSent.lastOtpSentAt).getTime()) / 1000);
    const cooldownRemaining = Math.max(1, 60 - elapsed);
    return {
      allowed: false,
      statusCode: 429,
      error: `Please wait ${cooldownRemaining} second(s) before requesting a new verification code.`,
    };
  }

  // 2. Check 15-minute rate limit (max 5 OTP requests per 15 minutes)
  const countInWindow = await prisma.parentOtp.count({
    where: {
      destination,
      channel,
      createdAt: { gte: fifteenMinsAgo },
    },
  });

  if (countInWindow >= 5) {
    return {
      allowed: false,
      statusCode: 429,
      error: 'Too many requests. Please wait 15 minutes before requesting again.',
    };
  }

  return { allowed: true };
}

/**
 * Deliver Mobile SMS OTP via Twilio / Fast2SMS
 */
async function deliverSmsOtp(mobile, otpCode) {
  const provider = (process.env.SMS_PROVIDER || 'none').toLowerCase();
  let smsSent = false;

  if (provider === 'twilio' || process.env.TWILIO_ACCOUNT_SID) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (accountSid && authToken && fromNumber) {
        const client = require('twilio')(accountSid, authToken);
        await client.messages.create({
          body: `Your Hostel Connect verification code is ${otpCode}. Valid for 5 minutes.`,
          from: fromNumber,
          to: mobile.startsWith('+') ? mobile : `+91${mobile}`,
        });
        smsSent = true;
      }
    } catch (twilioErr) {
      console.error('SMS delivery issue encountered.');
    }
  }

  if (!smsSent && (provider === 'fast2sms' || process.env.FAST2SMS_API_KEY)) {
    try {
      const apiKey = process.env.FAST2SMS_API_KEY;
      if (apiKey) {
        const https = require('https');
        const postData = JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: mobile,
        });

        await new Promise((resolve, reject) => {
          const req = https.request({
            hostname: 'www.fast2sms.com',
            path: '/dev/bulkV2',
            method: 'POST',
            headers: {
              'authorization': apiKey,
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
            },
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
          });
          req.on('error', reject);
          req.write(postData);
          req.end();
        });
        smsSent = true;
      }
    } catch (fastErr) {
      console.error('SMS delivery issue encountered.');
    }
  }

  return { smsSent };
}

/**
 * Generate, hash, store, and dispatch OTP to registered parent
 */
async function sendOtp({ destination, parentId, parentName = 'Parent' }) {
  const norm = normalizeDestination(destination);
  if (norm.type === 'unknown' || !norm.value) {
    throw new Error('Invalid email address or mobile number.');
  }

  // 1. Check Rate Limits & Cooldowns
  const limitCheck = await checkOtpLimits(norm.value, norm.type);
  if (!limitCheck.allowed) {
    const err = new Error(limitCheck.error);
    err.statusCode = limitCheck.statusCode || 429;
    throw err;
  }

  // 2. Generate 6-digit OTP code & hash it (5-minute expiration)
  const otpCode = generateOtpCode();
  const otpHash = hashOtp(otpCode);
  const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

  // 3. Invalidate any previously unverified OTPs for this destination
  await prisma.parentOtp.deleteMany({
    where: {
      destination: norm.value,
      channel: norm.type,
      verifiedAt: null,
    },
  });

  // 4. Create new hashed OTP record in Prisma database
  await prisma.parentOtp.create({
    data: {
      parentId,
      channel: norm.type,
      destination: norm.value,
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      lastOtpSentAt: new Date(),
    },
  });

  // 5. Dispatch real OTP via Email or SMS
  if (norm.type === 'email') {
    await sendResendOtpEmail({
      toEmail: norm.value,
      otpCode,
      parentName,
    });
  } else {
    await deliverSmsOtp(norm.value, otpCode);
  }

  // NEVER return raw OTP or preview URLs to caller
  return {
    success: true,
    type: norm.type,
  };
}

/**
 * Verify OTP code against stored SHA-256 hash in database
 */
async function verifyOtp({ destination, inputOtp }) {
  const norm = normalizeDestination(destination);
  if (!norm.value || !inputOtp || typeof inputOtp !== 'string') {
    return { valid: false, statusCode: 400, error: 'Invalid or expired verification code.' };
  }

  const cleanOtp = inputOtp.trim();
  if (cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
    return { valid: false, statusCode: 400, error: 'Invalid or expired verification code.' };
  }

  // Retrieve active unverified OTP record from Prisma database
  const record = await prisma.parentOtp.findFirst({
    where: {
      destination: norm.value,
      channel: norm.type,
      verifiedAt: null,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return { valid: false, statusCode: 400, error: 'Invalid or expired verification code.' };
  }

  // 1. Check 5-minute expiration
  if (new Date() > new Date(record.otpExpiresAt)) {
    await prisma.parentOtp.delete({ where: { id: record.id } }).catch(() => {});
    return { valid: false, statusCode: 400, error: 'Invalid or expired verification code.' };
  }

  // 2. Check maximum 5 attempts limit
  if (record.otpAttempts >= 5) {
    await prisma.parentOtp.delete({ where: { id: record.id } }).catch(() => {});
    return { valid: false, statusCode: 400, error: 'Invalid or expired verification code.' };
  }

  // 3. Timing-safe comparison of SHA-256 hash
  const inputHash = hashOtp(cleanOtp);
  const storedBuf = Buffer.from(record.otpHash, 'hex');
  const inputBuf = Buffer.from(inputHash, 'hex');
  const matches = storedBuf.length === inputBuf.length && crypto.timingSafeEqual(storedBuf, inputBuf);

  if (!matches) {
    const updated = await prisma.parentOtp.update({
      where: { id: record.id },
      data: { otpAttempts: record.otpAttempts + 1 },
    });

    if (updated.otpAttempts >= 5) {
      await prisma.parentOtp.delete({ where: { id: record.id } }).catch(() => {});
    }

    return { valid: false, statusCode: 400, error: 'Invalid or expired verification code.' };
  }

  // 4. Verification successful! Invalidate OTP immediately by marking verifiedAt timestamp to prevent reuse
  await prisma.parentOtp.update({
    where: { id: record.id },
    data: { verifiedAt: new Date() },
  });

  return { valid: true, parentId: record.parentId };
}

/**
 * Resend OTP code with cooldown protection
 */
async function resendOtp(params) {
  return sendOtp(params);
}

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
  generateOtpCode,
  hashOtp,
  normalizeDestination,
};

