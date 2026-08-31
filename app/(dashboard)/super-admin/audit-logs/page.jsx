"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, Filter, Search, Clock, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminAuditLogsPage() {
  const [logs] = useState([
    {
      id: "log_1",
      action: "CALL_INITIATED",
      resource: "call_session",
      actor: "Student Kiosk (Block A Tablet)",
      ip: "103.21.244.12",
      description: "Video call session created for student Aarav Sharma with parent Rajesh Sharma",
      time: "2 mins ago",
    },
    {
      id: "log_2",
      action: "DEVICE_ACTIVATED",
      resource: "device",
      actor: "Hostel Admin (admin@greenwood.edu)",
      ip: "49.207.198.54",
      description: "Calling kiosk tablet activated with code 9B3A1C",
      time: "24 mins ago",
    },
    {
      id: "log_3",
      action: "PAYMENT_SUCCESS",
      resource: "subscription",
      actor: "Razorpay Webhook",
      ip: "18.156.90.11",
      description: "Captured payment pay_Q83910283 for Greenwood Residential School (Growth Plan)",
      time: "1 hour ago",
    },
    {
      id: "log_4",
      action: "PARENT_LINKED",
      resource: "student_guardian",
      actor: "Warden Desk",
      ip: "49.207.198.54",
      description: "Verified and linked parent Sunita Verma to student Diya Verma",
      time: "3 hours ago",
    },
    {
      id: "log_5",
      action: "USER_LOGIN_SUCCESS",
      resource: "auth",
      actor: "parent@gmail.com",
      ip: "117.211.89.4",
      description: "Supabase Auth 256-bit encrypted session authenticated",
      time: "5 hours ago",
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Security Events & Audit Trail</h1>
          <p className="text-sm text-slate-500">Immutable cross-tenant cryptographic security logs and user actions</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">IP Address</th>
                <th className="px-5 py-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                    {log.action}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-900 dark:text-white">
                    {log.actor}
                  </td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300 max-w-md">
                    {log.description}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {log.ip}
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {log.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
