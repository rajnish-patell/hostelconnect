/**
 * Structured Logging Utility for HostelConnect
 * Formats logs consistently with severity levels, timestamps, and contextual metadata.
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  critical: 4,
};

const CURRENT_LEVEL = process.env.LOG_LEVEL?.toLowerCase() || (process.env.NODE_ENV === "production" ? "info" : "debug");

function shouldLog(level) {
  const currentPriority = LOG_LEVELS[CURRENT_LEVEL] ?? LOG_LEVELS.info;
  const messagePriority = LOG_LEVELS[level] ?? LOG_LEVELS.info;
  return messagePriority >= currentPriority;
}

function formatOutput(level, message, context = {}) {
  const timestamp = new Date().toISOString();
  const isProd = process.env.NODE_ENV === "production";

  // Redact any sensitive tokens, passwords or secrets
  const sanitizedContext = { ...context };
  const sensitiveKeys = ["password", "secret", "token", "key", "authorization", "cookie"];
  for (const key of Object.keys(sanitizedContext)) {
    if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
      sanitizedContext[key] = "[REDACTED]";
    }
  }

  const logPayload = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...sanitizedContext,
  };

  if (isProd) {
    return JSON.stringify(logPayload);
  }

  const colorMap = {
    debug: "\x1b[34m", // Blue
    info: "\x1b[32m",  // Green
    warn: "\x1b[33m",  // Yellow
    error: "\x1b[31m", // Red
    critical: "\x1b[35m", // Magenta
  };
  const resetColor = "\x1b[0m";
  const color = colorMap[level] || resetColor;

  const extra = Object.keys(sanitizedContext).length > 0 ? ` ${JSON.stringify(sanitizedContext)}` : "";
  return `${color}[${level.toUpperCase()}]${resetColor} ${timestamp} - ${message}${extra}`;
}

export const logger = {
  debug(message, context = {}) {
    if (shouldLog("debug")) {
      console.debug(formatOutput("debug", message, context));
    }
  },

  info(message, context = {}) {
    if (shouldLog("info")) {
      console.info(formatOutput("info", message, context));
    }
  },

  warn(message, context = {}) {
    if (shouldLog("warn")) {
      console.warn(formatOutput("warn", message, context));
    }
  },

  error(message, error = null, context = {}) {
    if (shouldLog("error")) {
      const errorDetails = error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : error ? { error } : {};
      console.error(formatOutput("error", message, { ...context, ...errorDetails }));
    }
  },

  critical(message, error = null, context = {}) {
    if (shouldLog("critical")) {
      const errorDetails = error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
        : error ? { error } : {};
      console.error(formatOutput("critical", `🚨 CRITICAL: ${message}`, { ...context, ...errorDetails }));
    }
  },

  child(defaultContext = {}) {
    return {
      debug: (msg, ctx) => logger.debug(msg, { ...defaultContext, ...ctx }),
      info: (msg, ctx) => logger.info(msg, { ...defaultContext, ...ctx }),
      warn: (msg, ctx) => logger.warn(msg, { ...defaultContext, ...ctx }),
      error: (msg, err, ctx) => logger.error(msg, err, { ...defaultContext, ...ctx }),
      critical: (msg, err, ctx) => logger.critical(msg, err, { ...defaultContext, ...ctx }),
    };
  },
};

export default logger;
