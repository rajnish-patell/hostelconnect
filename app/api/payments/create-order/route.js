import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/rbac";
import { createOrder } from "@/lib/services/razorpay.service";
import { createPaymentOrderSchema } from "@/lib/validators";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const parseResult = createPaymentOrderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: parseResult.error?.errors?.[0]?.message || "Validation failed" },
      }, { status: 400 });
    }

    const { planId, organizationId, billingCycle } = parseResult.data;
    const admin = createAdminClient();

    // 1. Fetch plan
    const { data: plan, error: planErr } = await admin
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("is_active", true)
      .single();

    if (planErr || !plan) {
      return NextResponse.json({
        success: false,
        error: { code: "PLAN_NOT_FOUND", message: "Selected plan does not exist or is inactive" },
      }, { status: 404 });
    }

    const amount = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
    const receipt = `ord_${organizationId.slice(0, 8)}_${Date.now().toString().slice(-6)}`;

    // 2. Create Razorpay order
    const razorpayOrder = await createOrder({
      amountInPaise: amount,
      currency: plan.currency || "INR",
      receipt,
      notes: {
        organizationId,
        planId,
        userId: user.id,
        billingCycle,
      },
    });

    // 3. Record pending payment entry in DB
    await admin.from("payments").insert({
      organization_id: organizationId,
      user_id: user.id,
      razorpay_order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: "CREATED",
      description: `Subscription: ${plan.name} (${billingCycle})`,
      receipt,
      metadata: { planId, billingCycle, notes: razorpayOrder.notes },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        planName: plan.name,
      },
    });
  } catch (err) {
    console.error("[Payment Order Error]:", err);
    return NextResponse.json({
      success: false,
      error: { code: "ORDER_CREATION_FAILED", message: err.message },
    }, { status: 500 });
  }
}
