import { NextResponse } from "next/server";
import { requireAuth, verifyParentStudentRelation } from "@/lib/auth/rbac";
import { createOrder } from "@/lib/services/razorpay.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/services/audit.service";
import { z } from "zod";

const parentRechargeSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  amountRupees: z.coerce.number().min(10, "Minimum recharge is ₹10").max(100000, "Maximum recharge is ₹100,000"),
});

export async function POST(request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const parseResult = parentRechargeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
      }, { status: 400 });
    }

    const { studentId, amountRupees } = parseResult.data;
    const admin = createAdminClient();

    // 1. Verify parent-student relationship
    const isAuthorized = await verifyParentStudentRelation(studentId, user.id);
    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "You are not authorized to recharge this student's wallet" },
      }, { status: 403 });
    }

    // 2. Fetch student and hostel info
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

    // 3. Create Razorpay order for recharge
    const amountInPaise = amountRupees * 100;
    const receipt = `recharge_${studentId.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

    const razorpayOrder = await createOrder({
      amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        rechargeType: "PARENT_ONLINE",
        studentId,
        studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
        hostelId: student.hostel_id,
        hostelName: student.hostel?.name || "Unknown Hostel",
        parentUserId: user.id,
      },
    });

    // 4. Record pending payment entry in DB
    const { data: payment, error: paymentErr } = await admin
      .from("payments")
      .insert({
        user_id: user.id,
        razorpay_order_id: razorpayOrder.id,
        amount: amountInPaise,
        currency: "INR",
        status: "CREATED",
        description: `Parent Wallet Recharge: ${student.first_name} ${student.last_name || ""}`,
        receipt,
        metadata: {
          rechargeType: "PARENT_ONLINE",
          studentId,
          studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
          hostelId: student.hostel_id,
          parentUserId: user.id,
        },
      })
      .select()
      .single();

    if (paymentErr) {
      console.error("[Payment Record Error]:", paymentErr);
    }

    await logAuditEvent({
      actorId: user.id,
      action: "PARENT_RECHARGE_INITIATED",
      resourceType: "payment",
      resourceId: payment?.id || razorpayOrder.id,
      description: `Parent initiated ₹${amountRupees} recharge for student ${student.first_name}`,
      hostelId: student.hostel_id,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
        amountRupees,
      },
    });
  } catch (err) {
    console.error("[Parent Recharge Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "ORDER_CREATION_FAILED", message: err.message || "Failed to create recharge order" },
    }, { status: 500 });
  }
}
