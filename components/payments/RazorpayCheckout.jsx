"use client";

import React, { useState } from "react";
import { CreditCard, Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RazorpayCheckout({
  planId,
  planName,
  organizationId,
  billingCycle = "monthly",
  amountFormatted,
  userEmail,
  userName,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Load Razorpay JS SDK
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load Razorpay payment gateway. Please check your internet connection.");
      }

      // 2. Create Order on Server
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          organizationId,
          billingCycle,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error?.message || "Failed to initialize payment order");
      }

      const { orderId, amount, currency, keyId } = orderData.data;

      // 3. Open Razorpay Modal
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: "HostelConnect",
        description: `Subscription for ${planName} (${billingCycle})`,
        order_id: orderId,
        prefill: {
          name: userName || "",
          email: userEmail || "",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async function (response) {
          setLoading(true);
          try {
            // 4. Verify Signature Server-Side
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                organizationId,
                planId,
                billingCycle,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error?.message || "Payment verification failed");
            }

            setSuccessMsg("Payment verified! Subscription activated successfully.");
            if (onSuccess) onSuccess(verifyData.data);
          } catch (err) {
            setErrorMsg(err.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      console.error("[Checkout Exception]:", err);
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 w-full">
      {errorMsg && (
        <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <Button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" /> Upgrade to {planName} ({amountFormatted})
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Secure 256-bit encrypted payment via Razorpay</span>
      </div>
    </div>
  );
}
