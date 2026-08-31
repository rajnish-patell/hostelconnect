import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { logAuditEvent, logSecurityEvent } from "@/lib/services/audit.service";

/**
 * Generate a random 6-character alphanumeric uppercase code.
 */
function generateActivationCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

/**
 * Register a new device in a hostel and generate a short-lived activation code.
 */
export async function registerDevice({
  hostelId,
  name,
  description = null,
  deviceType = "tablet",
  createdByUserId,
}) {
  const admin = createAdminClient();

  // Create device
  const { data: device, error: devErr } = await admin
    .from("devices")
    .insert({
      hostel_id: hostelId,
      name,
      description,
      device_type: deviceType,
      status: "INACTIVE",
    })
    .select()
    .single();

  if (devErr || !device) {
    throw new Error("Failed to register device in database");
  }

  // Create temporary activation code valid for 24 hours
  const code = generateActivationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await admin.from("device_activation_codes").insert({
    device_id: device.id,
    code,
    expires_at: expiresAt,
    created_by: createdByUserId,
  });

  await logAuditEvent({
    actorId: createdByUserId,
    action: "DEVICE_REGISTERED",
    resourceType: "device",
    resourceId: device.id,
    description: `Registered new kiosk device "${name}". Activation code generated.`,
    hostelId,
  });

  return { device, activationCode: code, expiresAt };
}

/**
 * Activate a device on a tablet/laptop using a valid one-time activation code.
 */
export async function activateDeviceWithCode({
  code,
  ipAddress = null,
  userAgent = null,
}) {
  const admin = createAdminClient();
  const cleanCode = code.trim().toUpperCase();

  // Look for active activation code
  const { data: actRecord, error: actErr } = await admin
    .from("device_activation_codes")
    .select("*, device:devices(*)")
    .eq("code", cleanCode)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (actErr || !actRecord || !actRecord.device) {
    await logSecurityEvent({
      eventType: "INVALID_DEVICE_ACTIVATION_ATTEMPT",
      severity: "WARNING",
      description: `Failed activation attempt with invalid or expired code: ${cleanCode}`,
      ipAddress,
      userAgent,
    });
    throw new Error("Invalid or expired activation code. Please generate a new code in the admin dashboard.");
  }

  const device = actRecord.device;

  // Mark activation code as used
  await admin
    .from("device_activation_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", actRecord.id);

  // Generate high-entropy session token valid for 30 days
  const sessionToken = `dev_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  // Create device session
  const { data: session, error: sessErr } = await admin
    .from("device_sessions")
    .insert({
      device_id: device.id,
      session_token: sessionToken,
      is_active: true,
      ip_address: ipAddress,
      user_agent: userAgent,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (sessErr || !session) {
    throw new Error("Failed to create device session");
  }

  // Mark device ACTIVE
  await admin
    .from("devices")
    .update({
      status: "ACTIVE",
      activated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      last_ip: ipAddress,
      user_agent: userAgent,
    })
    .eq("id", device.id);

  await logAuditEvent({
    actorId: actRecord.created_by,
    action: "DEVICE_ACTIVATED",
    resourceType: "device",
    resourceId: device.id,
    description: `Device "${device.name}" successfully activated on kiosk browser.`,
    hostelId: device.hostel_id,
    ipAddress,
    userAgent,
  });

  return {
    device,
    sessionToken,
    expiresAt,
  };
}

/**
 * Get active student list and linked verified parents for a verified kiosk device.
 */
export async function getDeviceKioskDirectory(deviceId) {
  const admin = createAdminClient();

  const { data: device, error: devErr } = await admin
    .from("devices")
    .select("hostel_id")
    .eq("id", deviceId)
    .eq("status", "ACTIVE")
    .single();

  if (devErr || !device) {
    throw new Error("Device is unauthorized or inactive");
  }

  // Fetch active students in this hostel with their verified guardians
  const { data: students, error: studErr } = await admin
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      admission_number,
      class_grade,
      section,
      photo_url,
      room:rooms(id, name, floor),
      student_guardians!inner (
        id,
        relationship,
        can_video_call,
        verification_status,
        parent:parents (
          id,
          first_name,
          last_name,
          phone,
          email,
          photo_url
        )
      )
    `)
    .eq("hostel_id", device.hostel_id)
    .eq("is_active", true)
    .eq("student_guardians.verification_status", "VERIFIED")
    .eq("student_guardians.can_video_call", true)
    .order("first_name", { ascending: true });

  if (studErr) {
    console.error("[Kiosk Directory Fetch Error]:", studErr);
    return [];
  }

  return students;
}
