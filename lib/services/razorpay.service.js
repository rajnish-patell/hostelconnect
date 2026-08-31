import Razorpay from "razorpay";
import crypto from "crypto";

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

export const razorpayClient = (key_id && key_secret) 
  ? new Razorpay({ key_id, key_secret })
  : null;

/**
 * Creates a real Razorpay Order.
 */
export async function createOrder({ amountInPaise, currency = "INR", receipt, notes = {} }) {
  if (!razorpayClient) {
    throw new Error("Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not configured in server environment.");
  }

  const options = {
    amount: Math.round(amountInPaise),
    currency,
    receipt: receipt || `rcpt_${Date.now().toString().slice(-8)}`,
    notes,
  };

  const order = await razorpayClient.orders.create(options);
  return order;
}

/**
 * Verifies Razorpay HMAC SHA256 payment signature server-side.
 */
export function verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!key_secret) {
    throw new Error("Razorpay key secret not configured.");
  }

  const generatedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  return generatedSignature === razorpay_signature;
}

/**
 * Validates Razorpay Webhook signature using raw request body.
 */
export function verifyWebhookSignature({ rawBody, signature }) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("RAZORPAY_WEBHOOK_SECRET is not configured.");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
}
