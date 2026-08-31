import test from "node:test";
import assert from "node:assert";
import { z } from "zod";

const deviceActivationSchema = z.object({
  code: z.string().min(6, "Activation code must be at least 6 characters").max(12),
});

const initiateCallSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  parentId: z.string().uuid("Invalid parent ID"),
});

test("Validation - Valid device activation code passes", () => {
  const result = deviceActivationSchema.safeParse({ code: "9B3A1C" });
  assert.strictEqual(result.success, true);
});

test("Validation - Short activation code fails securely", () => {
  const result = deviceActivationSchema.safeParse({ code: "123" });
  assert.strictEqual(result.success, false);
});

test("Validation - Malformed UUID in call initiation fails", () => {
  const result = initiateCallSchema.safeParse({
    studentId: "invalid-id-123",
    parentId: "12345",
  });
  assert.strictEqual(result.success, false);
});
