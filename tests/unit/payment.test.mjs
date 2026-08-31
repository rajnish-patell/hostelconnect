import test from "node:test";
import assert from "node:assert";
import crypto from "crypto";

// Test Razorpay HMAC signature logic
function verifySignature({ orderId, paymentId, signature, secret }) {
  const generatedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return generatedSignature === signature;
}

test("Razorpay Signature Verification - Valid signature passes", () => {
  const secret = "test_secret_key_12345";
  const orderId = "order_N123456789";
  const paymentId = "pay_P987654321";

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const isValid = verifySignature({
    orderId,
    paymentId,
    signature: expectedSignature,
    secret,
  });

  assert.strictEqual(isValid, true, "Valid cryptographic HMAC signature must be accepted");
});

test("Razorpay Signature Verification - Tampered payment ID fails securely", () => {
  const secret = "test_secret_key_12345";
  const orderId = "order_N123456789";
  const paymentId = "pay_P987654321";

  const originalSignature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const isTamperedValid = verifySignature({
    orderId,
    paymentId: "pay_TAMPERED_ID",
    signature: originalSignature,
    secret,
  });

  assert.strictEqual(isTamperedValid, false, "Tampered payload must fail signature verification");
});
