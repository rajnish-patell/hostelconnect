const stores = new Map();

export function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function createRateLimiter({ limit, windowMs, name }) {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError("Rate-limit limit must be a positive integer");
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new TypeError("Rate-limit window must be positive");
  }

  return function checkRateLimit(key, now = Date.now()) {
    const storeKey = `${name}:${key}`;
    const current = stores.get(storeKey);

    if (!current || now >= current.resetAt) {
      const next = { count: 1, resetAt: now + windowMs };
      stores.set(storeKey, next);
      return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
    }

    current.count += 1;
    const allowed = current.count <= limit;
    return {
      allowed,
      remaining: Math.max(0, limit - current.count),
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  };
}

export function clearRateLimitStore() {
  stores.clear();
}
