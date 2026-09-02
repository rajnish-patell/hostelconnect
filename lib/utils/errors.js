/**
 * Standardized Error Handling Utility for HostelConnect
 */

export class AppError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid input data", details = null) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", message = null) {
    super(message || `${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict occurred") {
    super(message, 409, "CONFLICT");
  }
}

export class PaymentRequiredError extends AppError {
  constructor(message = "Insufficient balance or payment required", details = null) {
    super(message, 402, "PAYMENT_REQUIRED", details);
  }
}

/**
 * Formats an error into a standardized API JSON response payload
 */
export function formatErrorResponse(error) {
  const statusCode = error.statusCode || error.status || 500;
  const code = error.code || "INTERNAL_SERVER_ERROR";
  const message = error.message || "An unexpected error occurred.";
  const details = error.details || null;

  return {
    response: {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    status: statusCode,
  };
}

/**
 * Checks if an error is transient / retryable (network drops, rate limits, 503/504)
 */
export function isRetryableError(error) {
  if (!error) return false;
  const status = error.statusCode || error.status || error.response?.status;
  if ([408, 429, 502, 503, 504].includes(status)) return true;
  const msg = (error.message || "").toLowerCase();
  return msg.includes("timeout") || msg.includes("econnreset") || msg.includes("etimedout") || msg.includes("network");
}
