import test from "node:test";
import assert from "node:assert/strict";
import {
  clearRateLimitStore,
  createRateLimiter,
} from "../../lib/security/rate-limit.mjs";

test.beforeEach(() => {
  clearRateLimitStore();
});

test("rate limiter allows the configured number of requests", () => {
  const limiter = createRateLimiter({ name: "test", limit: 2, windowMs: 1000 });

  assert.equal(limiter("client", 0).allowed, true);
  assert.equal(limiter("client", 1).allowed, true);
  assert.equal(limiter("client", 2).allowed, false);
});

test("rate limiter resets after its window", () => {
  const limiter = createRateLimiter({ name: "test", limit: 1, windowMs: 1000 });

  assert.equal(limiter("client", 0).allowed, true);
  assert.equal(limiter("client", 500).allowed, false);
  assert.equal(limiter("client", 1000).allowed, true);
});
