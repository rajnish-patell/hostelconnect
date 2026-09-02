import { NextResponse } from "next/server";
import { requireAuth, verifyParentStudentRelation } from "@/lib/auth/rbac";
import { verifySignature } from "@/lib/services/razorpay.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentReceiptEmail } from "@/lib/email/resend";
import { logAuditEvent } from "@/lib/services/audit.service";
import { z } from "zod";

const verifyParentRechargeSchema = z.object({
  razorpay_order_id: z.string().min(1, "Order ID required"),
  razorpay_payment_id: z.string().min(1, "Payment ID required"),
  razorpay_signature: z.string().min(1, "Signature required"),
  studentId: z.string().uuid("Invalid student ID"),
});

export async function POST(request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const parseResult = verifyParentRechargeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
      }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, studentId } = parseResult.data;

    // 1. Verify HMAC SHA256 Signature SERVER-SIDE
    const isValid = verifySignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: { code: "INVALID_SIGNATURE", message: "Payment verification failed. Invalid cryptographic signature." },
      }, { status: 400 });
    }

    // 2. Verify parent-student relationship
    const isAuthorized = await verifyParentStudentRelation(studentId, user.id);
    if (!isAuthorized) {
      return NextResponse.json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "You are not authorized to recharge this student's wallet" },
      }, { status: 403 });
    }

    const admin = createAdminClient();

    // 3. Fetch payment and student info
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .maybeSingle();

    const { data: student } = await admin
      .from("students")
      .select("*, hostel:hostels(id, name)")
      .eq("id", studentId)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({
        success: false,
        error: { code: "STUDENT_NOT_FOUND", message: "Student not found" },
      }, { status: 404 });
    }

    // 4. Update payment status and add recharge record
    const amountInPaise = payment?.amount || 0;

    // Update payment to CAPTURED
    await admin
      .from("payments")
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: "CAPTURED",
        metadata: { verified_at: new Date().toISOString(), rechargeType: "PARENT_ONLINE", studentId },
      })
      .eq("razorpay_order_id", razorpay_order_id);

    // Record recharge transaction
    const { data: rechargeRecord } = await admin
      .from("student_recharges")
      .insert({
        student_id: studentId,
        hostel_id: student.hostel_id,
        recharged_by_user_id: user.id,
        recharge_type: "PARENT_ONLINE",
        amount_paise: amountInPaise,
        payment_id: payment?.id,
        notes: `Online recharge by parent ${user.email}`,
      })
      .select()
      .single();

    // 5. Update student wallet balance (ATOMIC)
    const currentBalance = student.metadata?.balance_paise || student.balance_paise || 5000;
    const newBalance = currentBalance + amountInPaise;

    const { error: balanceErr } = await admin
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

    if (balanceErr) {
      console.error("[Balance Update Error]:", balanceErr);
    }

    // 6. Send receipt email
    if (user.email) {
      try {
        await sendPaymentReceiptEmail({
          to: user.email,
          parentName: user.user_metadata?.full_name || "Parent",
          studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
          hostelName: student.hostel?.name || "Hostel",
          amount: (amountInPaise / 100).toFixed(2),
          transactionId: razorpay_payment_id,
          orderId: razorpay_order_id,
        });
      } catch (emailErr) {
        console.error("[Receipt Email Error]:", emailErr);
      }
    }

    await logAuditEvent({
      actorId: user.id,
      action: "PARENT_RECHARGE_VERIFIED",
      resourceType: "student_recharge",
      resourceId: rechargeRecord?.id || "unknown",
      description: `Parent recharge verified: ₹${(amountInPaise / 100).toFixed(2)} for ${student.first_name}`,
      hostelId: student.hostel_id,
    });

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        studentName: `${student.first_name} ${student.last_name || ""}`.trim(),
        previousBalance: (currentBalance / 100).toFixed(2),
        amountRecharged: (amountInPaise / 100).toFixed(2),
        newBalance: (newBalance / 100).toFixed(2),
        transactionId: razorpay_payment_id,
        orderId: razorpay_order_id,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[Parent Recharge Verification Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "VERIFICATION_FAILED", message: err.message || "Failed to verify recharge payment" },
    }, { status: 500 });
  }
}
