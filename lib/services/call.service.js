import { createAdminClient } from "@/lib/supabase/admin";
import { generateMeetingId } from "@/services/video/jitsi";
import { logAuditEvent } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notification.service";
import { sendCallInvitationEmail } from "@/lib/email/resend";

export class CallServiceError extends Error {
  constructor(message, code = "CALL_ERROR", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Creates and initiates a call session.
 */
export async function createCallSession({
  studentId,
  parentId,
  deviceId = null,
  initiatedByUserId,
  isEmergency = false,
  notes = null,
  ipAddress = null,
  userAgent = null,
}) {
  const admin = createAdminClient();

  // 1. Verify student and hostel
  const { data: student, error: studentErr } = await admin
    .from("students")
    .select("*, hostel:hostels(*)")
    .eq("id", studentId)
    .eq("is_active", true)
    .single();

  if (studentErr || !student) {
    throw new CallServiceError("Student not found or inactive", "STUDENT_NOT_FOUND", 404);
  }

  const hostel = student.hostel;
  if (!hostel || hostel.status !== "ACTIVE") {
    throw new CallServiceError("Hostel is currently inactive or suspended", "HOSTEL_INACTIVE", 400);
  }

  // 2. Verify parent and relationship
  const { data: relationship, error: relErr } = await admin
    .from("student_guardians")
    .select("*, parent:parents(*)")
    .eq("student_id", studentId)
    .eq("parent_id", parentId)
    .single();

  if (relErr || !relationship) {
    // If not directly found with specified parentId, pick primary guardian
    const { data: fallbackRel } = await admin
      .from("student_guardians")
      .select("*, parent:parents(*)")
      .eq("student_id", studentId)
      .limit(1)
      .single();

    if (fallbackRel?.parent) {
      parentId = fallbackRel.parent.id;
    } else {
      throw new CallServiceError("No verified parent/guardian is linked to this student yet.", "PARENT_NOT_LINKED", 403);
    }
  }

  const parent = relationship?.parent || (await admin.from("parents").select("*").eq("id", parentId).single()).data;

  // 3. Quota check: max calls per student per day (skip for emergency or unlimited_calls)
  const isUnlimited = Boolean(student.metadata?.unlimited_calls || student.unlimited_calls);
  if (!isEmergency && !isUnlimited) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { count: studentDailyCalls } = await admin
      .from("call_sessions")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .gte("created_at", todayStart.toISOString())
      .in("status", ["IN_PROGRESS", "COMPLETED", "READY"]);

    const maxAllowedCalls = student.metadata?.max_calls_per_student_per_day || hostel.max_calls_per_student_per_day || 10;

    if (studentDailyCalls >= maxAllowedCalls) {
      throw new CallServiceError(
        `Daily call limit reached for this student (max ${maxAllowedCalls} calls/day)`,
        "DAILY_STUDENT_LIMIT_REACHED",
        429
      );
    }
  }

  // 4. Generate unique meeting ID
  const meetingId = generateMeetingId("hc");
  const maxDuration = hostel.max_call_duration_minutes || 15;
  const isUuid = (val) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const validDeviceId = isUuid(deviceId) ? deviceId : null;

  // 5. Create call session record in DB
  const { data: session, error: createErr } = await admin
    .from("call_sessions")
    .insert({
      hostel_id: hostel.id,
      student_id: student.id,
      parent_id: parent.id,
      device_id: validDeviceId,
      meeting_id: meetingId,
      status: "READY",
      max_duration_minutes: maxDuration,
      initiated_by: initiatedByUserId,
      is_emergency: isEmergency,
      notes,
    })
    .select("*, student:students(*), parent:parents(*), hostel:hostels(*)")
    .single();

  if (createErr || !session) {
    console.error("[Call Session Create Error]:", createErr);
    throw new CallServiceError("Failed to initiate call session in database", "DB_ERROR", 500);
  }

  // 6. Notify Parent via Email and In-App notification if user account is linked
  const studentFullName = `${student.first_name} ${student.last_name || ""}`.trim();
  const parentFullName = `${parent.first_name} ${parent.last_name || ""}`.trim();

  if (parent.user_id) {
    await createNotification({
      userId: parent.user_id,
      type: "CALL_STARTED",
      title: `Call Ready with ${studentFullName}`,
      message: `Your child ${studentFullName} has started a call from ${hostel.name}. Click to join now.`,
      data: { sessionId: session.id, meetingId: session.meeting_id },
      sendEmailNotification: true,
      userEmail: parent.email,
    });
  }

  if (parent.email) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendCallInvitationEmail({
      to: parent.email,
      parentName: parentFullName,
      studentName: studentFullName,
      hostelName: hostel.name,
      callUrl: `${appUrl}/call/${session.id}`,
    });
  }

  // 7. Audit log
  await logAuditEvent({
    actorId: initiatedByUserId,
    action: "CALL_INITIATED",
    resourceType: "call_session",
    resourceId: session.id,
    description: `Video call session created between student ${studentFullName} and parent ${parentFullName}`,
    metadata: { studentId, parentId, meetingId, maxDuration },
    hostelId: hostel.id,
    ipAddress,
    userAgent,
  });

  return session;
}

/**
 * Marks a call session as started (both participants connected).
 */
export async function startCall(sessionId, userId = null) {
  const admin = createAdminClient();

  const { data: session, error } = await admin
    .from("call_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    throw new CallServiceError("Call session not found", "CALL_NOT_FOUND", 404);
  }

  if (session.status === "COMPLETED" || session.status === "CANCELLED") {
    throw new CallServiceError("This call session is already closed", "CALL_CLOSED", 400);
  }

  const { data: updated, error: updateErr } = await admin
    .from("call_sessions")
    .update({
      status: "IN_PROGRESS",
      started_at: session.started_at || new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (updateErr) throw new CallServiceError("Failed to update call status", "DB_ERROR", 500);

  return updated;
}

/**
 * Ends a call session, computes duration server-side, logs audit trail.
 */
export async function endCall(sessionId, endedByUserId = null, endReason = "NORMAL_HANGUP") {
  const admin = createAdminClient();

  const { data: session, error } = await admin
    .from("call_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    throw new CallServiceError("Call session not found", "CALL_NOT_FOUND", 404);
  }

  if (session.status === "COMPLETED") {
    return session;
  }

  const now = new Date();
  const startedAt = session.started_at ? new Date(session.started_at) : now;
  const durationSeconds = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000));

  const { data: updated, error: updateErr } = await admin
    .from("call_sessions")
    .update({
      status: "COMPLETED",
      ended_at: now.toISOString(),
      duration_seconds: durationSeconds,
      ended_by: endedByUserId,
      end_reason: endReason,
    })
    .eq("id", sessionId)
    .select("*, student:students(*), parent:parents(*)")
    .single();

  if (updateErr) throw new CallServiceError("Failed to end call session", "DB_ERROR", 500);

  // Audit log call completion
  await logAuditEvent({
    actorId: endedByUserId,
    action: "CALL_COMPLETED",
    resourceType: "call_session",
    resourceId: sessionId,
    description: `Call ended. Server duration: ${durationSeconds} seconds. Reason: ${endReason}`,
    metadata: { durationSeconds, endReason, meetingId: session.meeting_id },
    hostelId: session.hostel_id,
  });

  return updated;
}
