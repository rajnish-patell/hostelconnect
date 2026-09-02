import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/rbac";
import { createCallSession } from "@/lib/services/call.service";
import { logAuditEvent, logSecurityEvent } from "@/lib/services/audit.service";
import { createNotification } from "@/lib/services/notification.service";
import { emergencyOverrideSchema } from "@/lib/validators";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function POST(request) {
  try {
    const { user, profile } = await requireAuth();

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_JSON", message: "Invalid JSON in request body." } },
        { status: 400 }
      );
    }

    const validation = emergencyOverrideSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid emergency override parameters.",
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { studentId, reason, notes } = validation.data;
    const admin = createAdminClient();

    // 1. Fetch student
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("*, hostel:hostels(*)")
      .eq("id", studentId)
      .single();

    if (studentErr || !student) {
      return NextResponse.json(
        { success: false, error: { code: "STUDENT_NOT_FOUND", message: "Student record not found." } },
        { status: 404 }
      );
    }

    let parentId = null;

    if (profile.role === "PARENT") {
      const { data: parent } = await admin
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!parent) {
        return NextResponse.json(
          { success: false, error: { code: "PARENT_NOT_FOUND", message: "Parent profile not found." } },
          { status: 404 }
        );
      }

      // Verify guardian link
      const { data: guardianLink } = await admin
        .from("student_guardians")
        .select("id")
        .eq("student_id", student.id)
        .eq("parent_id", parent.id)
        .maybeSingle();

      if (!guardianLink) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "You are not registered as a guardian for this student." } },
          { status: 403 }
        );
      }

      parentId = parent.id;
    } else {
      // Admin / Staff initiated - pick primary guardian
      const { data: primaryLink } = await admin
        .from("student_guardians")
        .select("parent_id, is_primary")
        .eq("student_id", student.id)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!primaryLink) {
        return NextResponse.json(
          { success: false, error: { code: "NO_GUARDIAN_LINKED", message: "No guardian linked to this student to receive emergency call." } },
          { status: 400 }
        );
      }
      parentId = primaryLink.parent_id;
    }

    // 2. Create emergency call session (bypasses regular limits)
    const session = await createCallSession({
      studentId: student.id,
      parentId,
      initiatedByUserId: user.id,
      isEmergency: true,
      notes: `🚨 EMERGENCY OVERRIDE: ${reason}${notes ? ` | Notes: ${notes}` : ""}`,
    });

    // 3. Log critical security event
    await logSecurityEvent({
      userId: user.id,
      eventType: "EMERGENCY_OVERRIDE_ACTIVATED",
      severity: "CRITICAL",
      description: `Emergency call override triggered for student ${student.id}. Reason: ${reason}`,
      metadata: {
        studentId: student.id,
        parentId,
        reason,
        sessionId: session.id,
      },
    });

    // 4. Log audit event
    await logAuditEvent({
      hostelId: student.hostel?.id,
      actorId: user.id,
      action: "EMERGENCY_OVERRIDE_ACTIVATED",
      resourceType: "call_session",
      resourceId: session.id,
      description: `Emergency call priority override activated. Reason: ${reason}`,
      metadata: {
        studentId: student.id,
        parentId,
        reason,
      },
    });

    // 5. Notify
    const { data: parentRecord } = await admin.from("parents").select("user_id").eq("id", parentId).maybeSingle();
    if (parentRecord?.user_id) {
      createNotification({
        userId: parentRecord.user_id,
        type: "EMERGENCY_ALERT",
        title: "🚨 URGENT: Emergency Call Initiated",
        message: `An emergency video call has been opened for ${student.first_name}. Reason: ${reason}`,
        metadata: { callSessionId: session.id },
      }).catch(() => {});
    }

    logger.critical("Emergency override activated", null, {
      studentId: student.id,
      sessionId: session.id,
      userId: user.id,
      reason,
    });

    return NextResponse.json({
      success: true,
      data: session,
      message: "Emergency call override activated immediately with priority routing.",
    });
  } catch (err) {
    logger.error("Emergency override endpoint failed", err);
    const { response, status } = formatErrorResponse(err);
    return NextResponse.json(response, { status });
  }
}
