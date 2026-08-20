const Razorpay = require('razorpay');
const config = require('../config');

let razorpayInstance = null;

/**
 * Get or create the Razorpay SDK instance.
 * Returns null if API keys are not configured.
 */
function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;

  const keyId = config.razorpay.keyId;
  const keySecret = config.razorpay.keySecret;

  if (!keyId || !keySecret) {
    console.warn('⚠️  Razorpay API keys not configured. Payment gateway is disabled.');
    console.warn('   Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.');
    return null;
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  console.log(`✅ Razorpay initialized (key: ${keyId.substring(0, 12)}...)`);
  return razorpayInstance;
}

/**
 * Check if Razorpay is properly configured with valid API keys.
 */
function isConfigured() {
  return !!(config.razorpay.keyId && config.razorpay.keySecret);
}

module.exports = { getRazorpay, isConfigured };
