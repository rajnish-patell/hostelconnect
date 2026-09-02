import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/rbac";
import { formatErrorResponse } from "@/lib/utils/errors";
import { logger } from "@/lib/utils/logger";

export async function GET(request) {
  try {
    const { user, profile } = await requireAuth();
    const { searchParams } = new URL(request.url);

    const studentId = searchParams.get("studentId");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const admin = createAdminClient();

    let allowedStudentIds = [];
    let hostelIdFilter = null;

    if (profile.role === "PARENT") {
      // Find parent record
      const { data: parent } = await admin
        .from("parents")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!parent) {
        return NextResponse.json({
          success: true,
          data: { transactions: [], summary: { totalCallsBilled: 0, totalAmountRupees: 0 }, pagination: { page, limit, total: 0, totalPages: 0 } },
        });
      }

      // Find linked students
      const { data: links } = await admin
        .from("student_guardians")
        .select("student_id")
        .eq("parent_id", parent.id);

      const linkedIds = (links || []).map((l) => l.student_id);

      if (studentId) {
        if (!linkedIds.includes(studentId)) {
          return NextResponse.json(
            { success: false, error: { code: "FORBIDDEN", message: "You are not authorized to view this student's billing history." } },
            { status: 403 }
          );
        }
        allowedStudentIds = [studentId];
      } else {
        allowedStudentIds = linkedIds;
      }

      if (allowedStudentIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: { transactions: [], summary: { totalCallsBilled: 0, totalAmountRupees: 0 }, pagination: { page, limit, total: 0, totalPages: 0 } },
        });
      }
    } else if (["HOSTEL_ADMIN", "WARDEN", "STAFF"].includes(profile.role)) {
      const { data: member } = await admin
        .from("hostel_members")
        .select("hostel_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!member) {
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "No active hostel assignment found." } },
          { status: 403 }
        );
      }
      hostelIdFilter = member.hostel_id;
      if (studentId) allowedStudentIds = [studentId];
    } else if (profile.role === "SUPER_ADMIN") {
      if (studentId) allowedStudentIds = [studentId];
    }

    // Query Call Billing Sessions
    let query = admin
      .from("call_sessions")
      .select("id, status, started_at, ended_at, duration_seconds, charge_paise, billing_status, created_at, student:students(id, first_name, last_name, admission_number, metadata), parent:parents(first_name, last_name, phone), hostel:hostels(name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (allowedStudentIds.length > 0) {
      query = query.in("student_id", allowedStudentIds);
    }
    if (hostelIdFilter) {
      query = query.eq("hostel_id", hostelIdFilter);
    }

    const { data: callSessions, count, error: queryErr } = await query.range(offset, offset + limit - 1);

    if (queryErr) {
      logger.error("Failed to query billing history", queryErr);
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: "Failed to retrieve billing records." } },
        { status: 500 }
      );
    }

    const transactions = (callSessions || []).map((cs) => {
      const chargePaise = cs.charge_paise || 0;
      return {
        id: cs.id,
        type: "CALL_CHARGE",
        status: cs.billing_status || "CHARGED",
        callDurationSeconds: cs.duration_seconds || 0,
        callDurationMinutes: Math.ceil((cs.duration_seconds || 0) / 60),
        amountPaise: chargePaise,
        amountRupees: chargePaise / 100,
        createdAt: cs.created_at,
        startedAt: cs.started_at,
        endedAt: cs.ended_at,
        student: cs.student
          ? {
              id: cs.student.id,
              name: `${cs.student.first_name} ${cs.student.last_name || ""}`.trim(),
              admissionNumber: cs.student.admission_number,
              balancePaise: cs.student.metadata?.balance_paise ?? 5000,
              balanceRupees: (cs.student.metadata?.balance_paise ?? 5000) / 100,
            }
          : null,
        parent: cs.parent ? `${cs.parent.first_name} ${cs.parent.last_name || ""}`.trim() : null,
        hostelName: cs.hostel?.name || "Campus Hostel",
      };
    });

    const totalAmountPaise = transactions.reduce((acc, t) => acc + t.amountPaise, 0);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        summary: {
          totalCallsBilled: count || 0,
          totalAmountPaise,
          totalAmountRupees: totalAmountPaise / 100,
        },
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      },
    });
  } catch (err) {
    logger.error("Billing history endpoint failed", err);
    const { response, status } = formatErrorResponse(err);
    return NextResponse.json(response, { status });
  }
}
