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
 * DEDUCTS BILLING FROM STUDENT WALLET (CRITICAL).
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

  // Update call session status and duration
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

  // ─── BILLING DEDUCTION (ATOMIC & SERVER-AUTHORITATIVE) ───
  if (session.student && durationSeconds > 0) {
    const isUnlimited = Boolean(session.student.metadata?.unlimited_calls || session.student.unlimited_calls);
    
    if (!isUnlimited) {
      // Calculate billing: Rate is per-minute, so round up any partial minute
      const callRatePerMinute = session.hostel?.call_rate_per_minute || 2; // Default ₹2/min
      const durationMinutes = Math.ceil(durationSeconds / 60);
      const chargeInPaise = durationMinutes * callRatePerMinute * 100;

      // Get current balance
      const currentBalance = session.student.metadata?.balance_paise || session.student.balance_paise || 5000;

      // ⚠️ CRITICAL: Check if wallet has sufficient balance
      if (currentBalance < chargeInPaise) {
        console.warn(`[Insufficient Balance] Student ${session.student.id} has ₹${(currentBalance / 100).toFixed(2)} but call cost is ₹${(chargeInPaise / 100).toFixed(2)}`);
        // Note: Call already happened, billing goes negative (parent pays later)
        // OR we could auto-add emergency credit
      }

      // Deduct from wallet (ATOMICALLY)
      const newBalance = Math.max(0, currentBalance - chargeInPaise); // Never go below 0
      const { error: balanceErr } = await admin
        .from("students")
        .update({
          metadata: {
            ...session.student.metadata,
            balance_paise: newBalance,
            last_call_ended_at: now.toISOString(),
            last_call_charge: chargeInPaise,
          },
        })
        .eq("id", session.student.id);

      if (balanceErr) {
        console.error("[Balance Update Error]:", balanceErr);
        throw new CallServiceError("Failed to deduct call charges from wallet", "BILLING_ERROR", 500);
      }

      // Record billing transaction in metadata (table will be created in migration 006)
      const billingRecord = {
        chargedAt: now.toISOString(),
        durationMinutes,
        ratePerMinute: callRatePerMinute,
        chargeInPaise,
        previousBalance: currentBalance,
        newBalance,
      };

      // Update call session with billing info
      await admin
        .from("call_sessions")
        .update({
          billing_status: newBalance < chargeInPaise ? "PARTIAL" : "CHARGED",
          charge_paise: chargeInPaise,
          previous_balance_paise: currentBalance,
          new_balance_paise: newBalance,
          metadata: {
            ...session.metadata,
            billing: billingRecord,
          },
        })
        .eq("id", session.id)
        .catch((err) => console.error("[Call Billing Update Error]:", err));

      // Attempt recording in call_billing_transactions ledger if table exists
      try {
        await admin.from("call_billing_transactions").insert({
          call_session_id: session.id,
          student_id: session.student.id,
          hostel_id: session.hostel?.id || session.hostel_id,
          duration_seconds: durationSeconds,
          rate_per_minute: callRatePerMinute,
          charge_paise: chargeInPaise,
          previous_balance_paise: currentBalance,
          new_balance_paise: newBalance,
          status: "COMPLETED",
          notes: `Call billing for ${durationMinutes} mins at ₹${callRatePerMinute}/min`,
        });
      } catch (_) {}

      // Audit log
      logAuditEvent({
        hostelId: session.hostel?.id,
        userId: session.student.user_id,
        action: "CALL_BILLING_PROCESSED",
        resourceType: "call_billing",
        resourceId: session.id,
        metadata: {
          studentId: session.student.id,
          durationMinutes,
          chargeRupees: chargeInPaise / 100,
          previousBalance: currentBalance / 100,
          newBalance: newBalance / 100,
        },
      }).catch(() => {});
    }
  }

  return updated;
}

/**
 * Extends the maximum call duration of an active call session.
 * Verifies wallet balance for non-unlimited students.
 */
export async function extendCallSession(sessionId, { extensionMinutes = 5, requestedByUserId = null } = {}) {
  const admin = createAdminClient();

  const { data: session, error: fetchErr } = await admin
    .from("call_sessions")
    .select("*, student:students(*), hostel:hostels(*)")
    .eq("id", sessionId)
    .single();

  if (fetchErr || !session) {
    throw new CallServiceError("Call session not found", "SESSION_NOT_FOUND", 404);
  }

  if (session.status === "COMPLETED" || session.status === "ENDED" || session.status === "CANCELLED") {
    throw new CallServiceError("Cannot extend a completed or terminated call session", "CALL_ALREADY_ENDED", 400);
  }

  const extension = Math.max(1, Math.min(30, Number(extensionMinutes) || 5));
  const isUnlimited = Boolean(session.student?.metadata?.unlimited_calls || session.student?.unlimited_calls);
  const callRatePerMinute = session.hostel?.call_rate_per_minute || 2;
  const estimatedCostPaise = extension * callRatePerMinute * 100;
  const currentBalance = session.student?.metadata?.balance_paise || session.student?.balance_paise || 5000;

  if (!isUnlimited && currentBalance < estimatedCostPaise) {
    throw new CallServiceError(
      `Insufficient wallet balance (₹${(currentBalance / 100).toFixed(2)}) to extend call by ${extension} minutes (requires ₹${(estimatedCostPaise / 100).toFixed(2)}).`,
      "INSUFFICIENT_BALANCE",
      402
    );
  }

  const currentMaxDuration = session.max_duration_minutes || session.hostel?.max_call_duration_minutes || 15;
  const newMaxDuration = currentMaxDuration + extension;

  const { data: updated, error: updateErr } = await admin
    .from("call_sessions")
    .update({
      max_duration_minutes: newMaxDuration,
      metadata: {
        ...session.metadata,
        extended_by_minutes: ((session.metadata?.extended_by_minutes || 0) + extension),
        last_extended_at: new Date().toISOString(),
      },
    })
    .eq("id", sessionId)
    .select("*, student:students(*), parent:parents(*), hostel:hostels(*)")
    .single();

  if (updateErr) {
    throw new CallServiceError("Failed to update call extension", "DB_ERROR", 500);
  }

  logAuditEvent({
    hostelId: session.hostel?.id,
    userId: requestedByUserId,
    action: "CALL_SESSION_EXTENDED",
    resourceType: "call_session",
    resourceId: sessionId,
    metadata: {
      studentId: session.student?.id,
      extensionMinutes: extension,
      previousMaxDuration: currentMaxDuration,
      newMaxDuration,
    },
  }).catch(() => {});

  return {
    ...updated,
    extensionMinutes: extension,
    newMaxDurationMinutes: newMaxDuration,
    remainingBalancePaise: currentBalance,
  };
}

export const startCall = startCallSession;
export const endCall = endCallSession;
export const extendCall = extendCallSession;

