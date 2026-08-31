import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/services/razorpay.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/services/audit.service";

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // 1. Verify Webhook HMAC Signature
    const isValid = verifyWebhookSignature({ rawBody, signature });
    if (!isValid) {
      console.error("[Razorpay Webhook]: Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const eventId = payload.event_id || `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const eventType = payload.event;
    const admin = createAdminClient();

    // 2. Idempotency check
    const { data: existingEvent } = await admin
      .from("payment_events")
      .select("id, processed")
      .eq("event_id", eventId)
      .single();

    if (existingEvent && existingEvent.processed) {
      return NextResponse.json({ status: "already_processed" }, { status: 200 });
    }

    // Record incoming webhook event
    if (!existingEvent) {
      await admin.from("payment_events").insert({
        event_id: eventId,
        event_type: eventType,
        razorpay_payment_id: payload.payload?.payment?.entity?.id || null,
        razorpay_order_id: payload.payload?.payment?.entity?.order_id || null,
        payload,
        processed: false,
      });
    }

    // 3. Process events
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      if (orderId) {
        await admin
          .from("payments")
          .update({
            razorpay_payment_id: paymentId,
            status: "CAPTURED",
            metadata: { webhook_event: eventType, captured_at: new Date().toISOString() },
          })
          .eq("razorpay_order_id", orderId);
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      if (orderId) {
        await admin
          .from("payments")
          .update({
            status: "FAILED",
            metadata: { error: paymentEntity.error_description || "Payment failed at gateway" },
          })
          .eq("razorpay_order_id", orderId);
      }
    }

    // Mark event as processed
    await admin
      .from("payment_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("event_id", eventId);

    await logAuditEvent({
      action: `RAZORPAY_WEBHOOK_${eventType.toUpperCase()}`,
      resourceType: "payment_webhook",
      resourceId: eventId,
      description: `Webhook processed: ${eventType}`,
    });

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    console.error("[Razorpay Webhook Error]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
