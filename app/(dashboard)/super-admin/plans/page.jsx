"use client";

import React, { useState } from "react";
import { CreditCard, Check, Plus, Edit2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminPlansPage() {
  const [plans] = useState([
    {
      name: "Starter",
      slug: "starter",
      priceMonthly: "₹2,499",
      priceYearly: "₹24,990",
      students: 50,
      devices: 2,
      minutes: "1,000 mins",
      activeSubscribers: 8,
    },
    {
      name: "Growth",
      slug: "growth",
      priceMonthly: "₹5,999",
      priceYearly: "₹59,990",
      students: 200,
      devices: 6,
      minutes: "5,000 mins",
      activeSubscribers: 14,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      priceMonthly: "₹14,999",
      priceYearly: "₹1,49,990",
      students: "1,000+",
      devices: 25,
      minutes: "25,000 mins",
      activeSubscribers: 4,
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Platform Subscription Tiers</h1>
          <p className="text-sm text-slate-500">Configure global pricing, quotas, and Razorpay billing limits</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <Card key={i} className="p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <Badge variant="secondary" className="mt-1 font-mono text-[10px]">{plan.slug}</Badge>
                </div>
                <Badge variant="success">{plan.activeSubscribers} Active Hostels</Badge>
              </div>

              <div className="space-y-1">
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {plan.priceMonthly} <span className="text-xs text-slate-400 font-normal">/ month</span>
                </div>
                <p className="text-xs text-slate-400 font-medium">Yearly: {plan.priceYearly} / year</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Student Capacity:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{plan.students}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kiosk Tablets:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{plan.devices}</span>
                </div>
                <div className="flex justify-between">
                  <span>Calling Allowance:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{plan.minutes}</span>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full text-xs font-bold rounded-xl gap-1">
              <Edit2 className="w-3.5 h-3.5" /> Edit Tier Parameters
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
