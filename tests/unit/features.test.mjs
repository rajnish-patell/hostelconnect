import test from "node:test";
import assert from "node:assert/strict";

import { extendCallSchema, emergencyOverrideSchema } from "../../lib/validators/index.js";
import { logger } from "../../lib/utils/logger.js";
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PaymentRequiredError,
  formatErrorResponse,
  isRetryableError,
} from "../../lib/utils/errors.js";
import nextConfig from "../../next.config.mjs";

test("Validation - extendCallSchema validates extension range", () => {
  const validDefault = extendCallSchema.safeParse({});
  assert.equal(validDefault.success, true);
  assert.equal(validDefault.data.extensionMinutes, 5);

  const validCustom = extendCallSchema.safeParse({ extensionMinutes: 15 });
  assert.equal(validCustom.success, true);
  assert.equal(validCustom.data.extensionMinutes, 15);

  const zeroFails = extendCallSchema.safeParse({ extensionMinutes: 0 });
  assert.equal(zeroFails.success, false);

  const tooLongFails = extendCallSchema.safeParse({ extensionMinutes: 60 });
  assert.equal(tooLongFails.success, false);
});

test("Validation - emergencyOverrideSchema requires valid reason and studentId", () => {
  const valid = emergencyOverrideSchema.safeParse({
    studentId: "123e4567-e89b-12d3-a456-426614174000",
    reason: "Medical urgency reported by school nurse",
  });
  assert.equal(valid.success, true);

  const emptyReason = emergencyOverrideSchema.safeParse({
    studentId: "123e4567-e89b-12d3-a456-426614174000",
    reason: "",
  });
  assert.equal(emptyReason.success, false);

  const missingStudent = emergencyOverrideSchema.safeParse({
    reason: "Medical urgency",
  });
  assert.equal(missingStudent.success, false);
});

test("Logger Utility - formats levels and child contexts safely", () => {
  assert.equal(typeof logger.debug, "function");
  assert.equal(typeof logger.info, "function");
  assert.equal(typeof logger.warn, "function");
  assert.equal(typeof logger.error, "function");
  assert.equal(typeof logger.critical, "function");

  // Verify child logger
  const childLogger = logger.child({ service: "test_service" });
  assert.equal(typeof childLogger.info, "function");
  assert.equal(typeof childLogger.error, "function");

  // Should not throw when called with metadata
  assert.doesNotThrow(() => {
    logger.info("Unit test message", { requestId: "req-123", secretToken: "my_secret_token" });
  });
});

test("Error Utilities - standardized error classes and response formatting", () => {
  const valErr = new ValidationError("Missing field", { field: "email" });
  assert.equal(valErr.statusCode, 400);
  assert.equal(valErr.code, "VALIDATION_ERROR");

  const unauthErr = new UnauthorizedError();
  assert.equal(unauthErr.statusCode, 401);
  assert.equal(unauthErr.code, "UNAUTHORIZED");

  const forbErr = new ForbiddenError();
  assert.equal(forbErr.statusCode, 403);
  assert.equal(forbErr.code, "FORBIDDEN");

  const notFoundErr = new NotFoundError("Student");
  assert.equal(notFoundErr.statusCode, 404);
  assert.equal(notFoundErr.code, "NOT_FOUND");
  assert.equal(notFoundErr.message, "Student not found");

  const payErr = new PaymentRequiredError("Wallet empty");
  assert.equal(payErr.statusCode, 402);
  assert.equal(payErr.code, "PAYMENT_REQUIRED");

  const conflictErr = new ConflictError("Line busy");
  assert.equal(conflictErr.statusCode, 409);

  // Response formatting
  const formatted = formatErrorResponse(valErr);
  assert.equal(formatted.status, 400);
  assert.equal(formatted.response.success, false);
  assert.equal(formatted.response.error.code, "VALIDATION_ERROR");
  assert.deepEqual(formatted.response.error.details, { field: "email" });

  // Retryable checks
  assert.equal(isRetryableError({ statusCode: 503 }), true);
  assert.equal(isRetryableError({ statusCode: 429 }), true);
  assert.equal(isRetryableError(new Error("ETIMEDOUT connection failed")), true);
  assert.equal(isRetryableError({ statusCode: 400 }), false);
});

test("Security Headers - Next.js config defines comprehensive security headers", async () => {
  assert.equal(typeof nextConfig.headers, "function");
  const headerRules = await nextConfig.headers();
  assert.equal(Array.isArray(headerRules), true);
  assert.equal(headerRules.length > 0, true);

  const globalRule = headerRules.find((r) => r.source === "/(.*)");
  assert.ok(globalRule, "Expected global route header rule");

  const headerKeys = globalRule.headers.map((h) => h.key);
  assert.ok(headerKeys.includes("Content-Security-Policy"), "Missing CSP header");
  assert.ok(headerKeys.includes("X-Content-Type-Options"), "Missing nosniff header");
  assert.ok(headerKeys.includes("X-Frame-Options"), "Missing X-Frame-Options header");
  assert.ok(headerKeys.includes("Referrer-Policy"), "Missing Referrer-Policy header");
  assert.ok(headerKeys.includes("Permissions-Policy"), "Missing Permissions-Policy header");
});
