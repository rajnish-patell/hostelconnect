import { createAdminClient } from "@/lib/supabase/admin";

export async function logAuditEvent({
  actorId = null,
  action,
  resourceType,
  resourceId = null,
  description = "",
  metadata = {},
  hostelId = null,
  organizationId = null,
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const admin = createAdminClient();

    // Sanitize metadata to never include passwords, keys, secrets, tokens
    const sanitizedMeta = { ...metadata };
    const sensitiveKeys = ["password", "secret", "token", "apiKey", "key_secret", "signature", "otp", "authorization"];
    for (const key of Object.keys(sanitizedMeta)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitizedMeta[key] = "[REDACTED]";
      }
    }

    await admin.from("audit_logs").insert({
      actor_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : null,
      description,
      metadata: sanitizedMeta,
      hostel_id: hostelId,
      organization_id: organizationId,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  } catch (err) {
    console.error("[Audit Log Failure]:", err);
  }
}

export async function logSecurityEvent({
  userId = null,
  eventType,
  severity = "INFO", // INFO | WARNING | CRITICAL
  description,
  ipAddress = null,
  userAgent = null,
  metadata = {},
}) {
  try {
    const admin = createAdminClient();

    await admin.from("security_events").insert({
      user_id: userId,
      event_type: eventType,
      severity,
      description,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata,
    });
  } catch (err) {
    console.error("[Security Event Failure]:", err);
  }
}
