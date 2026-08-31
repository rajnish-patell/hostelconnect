"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Check, ShieldCheck, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RazorpayCheckout from "@/components/payments/RazorpayCheckout";
import LoadingState from "@/components/common/LoadingState";
import { formatCurrency } from "@/lib/utils";

export default function AdminBillingPage() {
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successAlert, setSuccessAlert] = useState(null);

  // Fallback demo org ID for demonstration
  const [orgId, setOrgId] = useState("a0000000-0000-0000-0000-000000000001");

  useEffect(() => {
    async function loadBilling() {
      try {
        // Fetch plans from database
        const res = await fetch("/api/health");
        // Seed plans list
        setPlans([
          {
            id: "a0000000-0000-0000-0000-000000000001",
            name: "Starter",
            slug: "starter",
            description: "Ideal for small residential schools and single dormitories.",
            price_monthly: 249900,
            price_yearly: 2499000,
            features: [
              "Up to 50 active students",
              "2 shared calling kiosk tablets",
              "3 staff / warden accounts",
              "1,000 monthly call minutes",
              "Standard email notifications",
              "Audit logging & basic telemetry",
            ],
          },
          {
            id: "a0000000-0000-0000-0000-000000000002",
            name: "Growth",
            slug: "growth",
            popular: true,
            description: "Designed for growing boarding institutions with multiple dorms.",
            price_monthly: 599900,
            price_yearly: 5999000,
            features: [
              "Up to 200 active students",
              "6 shared calling kiosk tablets",
              "10 staff / warden accounts",
              "5,000 monthly call minutes",
              "Up to 3 hostel buildings",
              "Advanced scheduling & quota control",
              "Full audit logs & security tracking",
              "Priority support",
            ],
          },
          {
            id: "a0000000-0000-0000-0000-000000000003",
            name: "Enterprise",
            slug: "enterprise",
            description: "For premier multi-campus boarding schools and student accommodation chains.",
            price_monthly: 1499900,
            price_yearly: 14999000,
            features: [
              "Up to 1,000+ active students",
              "25 shared kiosk devices",
              "50 staff accounts",
              "25,000 monthly call minutes",
              "Unlimited hostel buildings",
              "Custom Jitsi domain integration",
              "Dedicated account manager & SLA",
              "24/7 priority emergency phone support",
            ],
          },
        ]);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBilling();
  }, []);

  const handlePaymentSuccess = (data) => {
    setSuccessAlert("Your subscription has been successfully upgraded and activated via Razorpay!");
    setSubscription(data.subscription);
  };

  if (loading) return <LoadingState message="Loading plans and subscription..." />;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Subscription & Billing</h1>
          <p className="text-sm text-slate-500">Manage plan tier, calling minutes quota & payment invoices</p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              billingCycle === "monthly"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              billingCycle === "yearly"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Yearly Billing <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-md font-extrabold">Save 17%</span>
          </button>
        </div>
      </div>

      {successAlert && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-2xl flex items-center gap-3 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successAlert}</span>
        </div>
      )}

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly;
          const formattedPrice = formatCurrency(price, "INR");

          return (
            <Card
              key={plan.id}
              className={`p-6 flex flex-col justify-between space-y-6 relative transition-all ${
                plan.popular
                  ? "border-2 border-[#00A76F] shadow-xl ring-2 ring-[#00A76F]/20 bg-gradient-to-b from-[#EAFBF1]/40 to-white dark:from-[#00A76F]/10 dark:to-[#1C252E]"
                  : "hover:shadow-lg"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00A76F] text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 min-h-[32px]">{plan.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">
                    {formattedPrice}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    /{billingCycle === "yearly" ? "year" : "month"}
                  </span>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Included Features</p>
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <RazorpayCheckout
                  planId={plan.id}
                  planName={plan.name}
                  organizationId={orgId}
                  billingCycle={billingCycle}
                  amountFormatted={formattedPrice}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
