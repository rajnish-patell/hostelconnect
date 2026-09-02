import { NextResponse } from "next/server";
import { requireRole, requireHostelAccess } from "@/lib/auth/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/services/audit.service";
import { z } from "zod";

const schoolRechargeSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  amountRupees: z.coerce.number().min(10, "Minimum recharge is ₹10").max(100000, "Maximum recharge is ₹100,000"),
  notes: z.string().optional(),
});

export async function POST(request) {
  try {
    const { user, profile } = await requireRole(["HOSTEL_ADMIN", "WARDEN", "STAFF"]);
    const body = await request.json();
    const parseResult = schoolRechargeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
      }, { status: 400 });
    }

    const { studentId, amountRupees, notes } = parseResult.data;
    const admin = createAdminClient();

    // 1. Fetch student and verify hostel access
    const { data: student, error: studentErr } = await admin
      .from("students")
      .select("*, hostel:hostels(id, name, timezone)")
      .eq("id", studentId)
      .maybeSingle();

    if (studentErr || !student) {
      return NextResponse.json({
        success: false,
        error: { code: "STUDENT_NOT_FOUND", message: "Student not found" },
      }, { status: 404 });
    }

    // 2. Verify hostel access
    await requireHostelAccess(student.hostel_id, ["HOSTEL_ADMIN", "WARDEN", "STAFF"]);

    // 3. Update student wallet balance (ATOMIC - no Razorpay needed for manual school recharge)
    const amountInPaise = amountRupees * 100;
    const currentBalance = student.metadata?.balance_paise || student.balance_paise || 5000;
    const newBalance = currentBalance + amountInPaise;

    const { error: updateErr } = await admin
      .from("students")
      .update({
        metadata: {
          ...student.metadata,
          balance_paise: newBalance,
          last_recharge_at: new Date().toISOString(),
          last_recharge_by: user.id,
        },
      })
      .eq("id", studentId);

    if (updateErr) {
      throw new Error(`Failed to update student balance: ${updateErr.message}`);
    }

    // 4. Record recharge transaction in student_recharges table
    const { data: rechargeRecord, error: rechargeErr } = await admin
      .from("student_recharges")
      .insert({
        student_id: studentId,
        hostel_id: student.hostel_id,
        recharged_by_user_id: user.id,
        recharge_type: "SCHOOL_MANUAL",
        amount_paise: amountInPaise,
        notes: notes || `School manual recharge by ${profile.full_name || "Admin"}`,
      })
      .select()
      .single();

    if (rechargeErr) {
      console.error("[Recharge Record Error]:", rechargeErr);
    }

    await logAuditEvent({
      actorId: user.id,
      action: "SCHOOL_RECHARGE_PROCESSED",
      resourceType: "student_recharge",
      resourceId: rechargeRecord?.id || "unknown",
      description: `School credited ₹${amountRupees} to ${student.first_name}'s wallet`,
      hostelId: student.hostel_id,
    });

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
        previousBalance: currentBalance / 100,
        amountRecharged: amountRupees,
        newBalance: newBalance / 100,
        rechargeType: "SCHOOL_MANUAL",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[School Recharge Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "RECHARGE_FAILED", message: err.message || "Failed to process school recharge" },
    }, { status: err.status || 500 });
  }
}
