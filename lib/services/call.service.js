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
 * Creates and initiates a call session with strict atomic concurrency locking.
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

  // ─── 3. CONCURRENCY & RACE-CONDITION GUARD (Multiple Callers Problem) ───
  // Atomically check if the student is ALREADY engaged in an active call session
  const maxDuration = hostel.max_call_duration_minutes || 15;
  const maxAgeMs = (maxDuration + 5) * 60 * 1000;
  const nowMs = Date.now();

  const { data: activeStudentSessions } = await admin
    .from("call_sessions")
    .select("id, status, created_at, meeting_id, parent:parents(first_name, last_name, phone)")
    .eq("student_id", studentId)
    .in("status", ["READY", "IN_PROGRESS", "CONNECTING"])
    .order("created_at", { ascending: false });

  if (activeStudentSessions && activeStudentSessions.length > 0) {
    for (const activeSess of activeStudentSessions) {
      const sessionAgeMs = nowMs - new Date(activeSess.created_at).getTime();

      if (sessionAgeMs < maxAgeMs) {
        const otherParentName = activeSess.parent?.first_name || "Another Guardian";
        throw new CallServiceError(
          `Student is currently on another call session with ${otherParentName}. Line busy, please try again after they finish.`,
          "STUDENT_LINE_BUSY",
          409
        );
      } else {
        // Auto-reconcile stale/orphaned session older than max call duration
        await admin
          .from("call_sessions")
          .update({ status: "EXPIRED", ended_at: new Date().toISOString() })
          .eq("id", activeSess.id);
      }
    }
  }

  // ─── 4. KIOSK TERMINAL CONCURRENCY GUARD ───
  const isUuid = (val) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const validDeviceId = isUuid(deviceId) ? deviceId : null;

  if (validDeviceId) {
    const { data: activeDeviceSessions } = await admin
      .from("call_sessions")
      .select("id, status, created_at")
      .eq("device_id", validDeviceId)
      .in("status", ["READY", "IN_PROGRESS", "CONNECTING"])
      .order("created_at", { ascending: false });

    if (activeDeviceSessions && activeDeviceSessions.length > 0) {
      for (const devSess of activeDeviceSessions) {
        const sessionAgeMs = nowMs - new Date(devSess.created_at).getTime();
        if (sessionAgeMs < maxAgeMs) {
          throw new CallServiceError(
            "This calling kiosk station is currently in use for another call session.",
            "DEVICE_BUSY",
            409
          );
        } else {
          await admin
            .from("call_sessions")
            .update({ status: "EXPIRED", ended_at: new Date().toISOString() })
            .eq("id", devSess.id);
        }
      }
    }
  }

  // ─── 5. QUOTA & DAILY CALL LIMIT CHECK ───
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

  // 6. Generate unique meeting ID
  const meetingId = generateMeetingId("hc");

  // 7. Create call session record in DB
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
    throw new CallServiceError(`Failed to initialize call session: ${createErr?.message}`, "SESSION_CREATION_FAILED", 500);
  }

  // 8. Create participants
  await admin.from("call_participants").insert([
    {
      call_session_id: session.id,
      user_id: null,
      role: "STUDENT",
      display_name: `${student.first_name} ${student.last_name || ""}`.trim(),
      status: "INVITED",
    },
    {
      call_session_id: session.id,
      user_id: parent.user_id || null,
      role: "PARENT",
      display_name: `${parent.first_name} ${parent.last_name || ""}`.trim(),
      status: "INVITED",
    },
  ]);

  // 9. Send invitation email & in-app notification to parent
  if (parent.email) {
    sendCallInvitationEmail({
      to: parent.email,
      parentName: parent.first_name,
      studentName: student.first_name,
      meetingUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://hostelconnectv-2.vercel.app"}/call/${session.id}`,
      maxDurationMinutes: maxDuration,
    }).catch((err) => console.error("Email send note:", err.message));
  }

  if (parent.user_id) {
    createNotification({
      userId: parent.user_id,
      type: "CALL_INITIATED",
      title: "Incoming Video Call Request",
      message: `${student.first_name} has initiated a video call from the hostel kiosk.`,
      metadata: { callSessionId: session.id, meetingId },
    }).catch(() => {});
  }

  // 10. Audit log
  logAuditEvent({
    hostelId: hostel.id,
    userId: initiatedByUserId,
    action: "CALL_SESSION_CREATED",
    resourceType: "call_session",
    resourceId: session.id,
    metadata: {
      studentId: student.id,
      parentId: parent.id,
      meetingId,
      isEmergency,
    },
    ipAddress,
    userAgent,
  }).catch(() => {});

  return session;
}

/**
 * Starts a call session when either participant enters the room.
 */
export async function startCallSession(sessionId) {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("call_sessions")
    .select("status, started_at")
    .eq("id", sessionId)
    .single();

  if (!session) {
    throw new CallServiceError("Call session not found", "SESSION_NOT_FOUND", 404);
  }

  if (session.status === "COMPLETED" || session.status === "ENDED" || session.status === "EXPIRED") {
    return session;
  }

  const { data: updated, error } = await admin
    .from("call_sessions")
    .update({
      status: "IN_PROGRESS",
      started_at: session.started_at || new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select("*, student:students(*), parent:parents(*), hostel:hostels(*)")
    .single();

  if (error) {
    throw new CallServiceError("Failed to update call status", "DB_ERROR", 500);
  }

  return updated;
}

/**
 * Ends an active call session and logs exact duration.
 */
export async function endCallSession(sessionId, { endReason = "NORMAL_HANGUP" } = {}) {
  const admin = createAdminClient();

  const { data: session } = await admin
    .from("call_sessions")
    .select("*, student:students(*), hostel:hostels(*)")
    .eq("id", sessionId)
    .single();

  if (!session) {
    throw new CallServiceError("Call session not found", "SESSION_NOT_FOUND", 404);
  }

  if (session.status === "COMPLETED" || session.status === "ENDED") {
    return session;
  }

  const now = new Date();
  const startedAt = session.started_at ? new Date(session.started_at) : new Date(session.created_at);
  const durationSeconds = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));

  const { data: updated, error } = await admin
    .from("call_sessions")
    .update({
      status: "COMPLETED",
      ended_at: now.toISOString(),
      duration_seconds: durationSeconds,
      notes: session.notes ? `${session.notes} | ${endReason}` : endReason,
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) {
    throw new CallServiceError("Failed to close call session", "DB_ERROR", 500);
  }

  return updated;
}

export const startCall = startCallSession;
export const endCall = endCallSession;

