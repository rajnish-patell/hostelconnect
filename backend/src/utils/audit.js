const prisma = require('./prisma');

/**
 * Log an audit event to the database.
 *
 * @param {Object} params
 * @param {number|null} params.userId - ID of the acting user
 * @param {string|null} params.userRole - Role of the acting user
 * @param {string} params.action - Action performed (e.g. 'login', 'payment_created')
 * @param {string|null} params.entity - Entity type (e.g. 'recharge', 'student')
 * @param {string|null} params.entityId - ID of the affected entity
 * @param {Object|string|null} params.details - Additional context
 * @param {string|null} params.ipAddress - Client IP address
 * @param {string|null} params.userAgent - Client user agent
 */
async function logAudit({ userId, userRole, action, entity, entityId, details, ipAddress, userAgent }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userRole: userRole || null,
        action,
        entity: entity || null,
        entityId: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : (details || null),
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  } catch (err) {
    // Audit logging should never crash the application
    console.error('Audit log write error:', err.message);
  }
}

/**
 * Extract client IP from Express request, handling proxies.
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || null;
}

/**
 * Express middleware helper — creates an audit logger bound to the request.
 */
function auditFromReq(req) {
  return (action, entity, entityId, details) =>
    logAudit({
      userId: req.user?.id || null,
      userRole: req.user?.role || null,
      action,
      entity,
      entityId,
      details,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || null,
    });
}

module.exports = { logAudit, auditFromReq, getClientIp };
