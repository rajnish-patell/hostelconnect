import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { verifySignature } from "@/lib/services/razorpay.service";
import { verifyPaymentSchema } from "@/lib/validators";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentReceiptEmail } from "@/lib/email/resend";
import { formatCurrency } from "@/lib/utils";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function POST(request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const parseResult = verifyPaymentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
      }, { status: 400 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, organizationId, planId, billingCycle } = parseResult.data;

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

    const admin = createAdminClient();

    // 2. Fetch plan
    const { data: plan } = await admin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (!plan) {
      return NextResponse.json({ success: false, error: { code: "PLAN_NOT_FOUND", message: "Plan not found" } }, { status: 404 });
    }

    // 3. Calculate period end
    const periodEnd = new Date();
    if (billingCycle === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    // 4. Update or Insert Subscription
    const { data: subscription, error: subErr } = await admin
      .from("subscriptions")
      .upsert({
        organization_id: organizationId,
        plan_id: planId,
        status: "ACTIVE",
        billing_cycle: billingCycle,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (subErr) {
      console.error("[Subscription Update Error]:", subErr);
    }

    // 5. Update payment status to CAPTURED
    await admin
      .from("payments")
      .update({
        razorpay_payment_id,
        razorpay_signature,
        status: "CAPTURED",
        subscription_id: subscription?.id || null,
        metadata: { verified_at: new Date().toISOString(), billingCycle },
      })
      .eq("razorpay_order_id", razorpay_order_id);

    // 6. Send Receipt Email
    const { data: org } = await admin
      .from("organizations")
      .select("name, email")
      .eq("id", organizationId)
      .single();

    if (user.email) {
      const amountPaid = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
      await sendPaymentReceiptEmail({
        to: user.email,
        orgName: org?.name || "HostelConnect Organization",
        planName: plan.name,
        amountFormatted: formatCurrency(amountPaid, plan.currency),
        invoiceId: razorpay_payment_id,
      });
    }

    await logAuditEvent({
      actorId: user.id,
      action: "PAYMENT_SUCCESS",
      resourceType: "subscription",
      resourceId: subscription?.id,
      description: `Payment captured successfully: ${razorpay_payment_id} for plan ${plan.name}`,
      organizationId,
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified and subscription activated successfully.",
      data: {
        subscription,
        paymentId: razorpay_payment_id,
      },
    });
  } catch (err) {
    console.error("[Payment Verification Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "VERIFICATION_FAILED", message: err.message },
    }, { status: 500 });
  }
}
