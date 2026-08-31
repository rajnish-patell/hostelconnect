"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building,
  Shield,
  CreditCard,
  Server,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Users,
  Tablet,
  MoreVertical,
  Globe,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, iconBg, iconColor, label, value, trend, trendUp }) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] space-y-4 transition-all hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
            style={{ backgroundColor: trendUp ? "rgba(0,167,111,0.08)" : "rgba(255,171,0,0.08)", color: trendUp ? "#00A76F" : "#FFAB00" }}>
            {trendUp && <TrendingUp className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[#919EAB] mb-1">{label}</p>
        <p className="text-[28px] font-extrabold text-[#1C252E] dark:text-white leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  const [telemetry] = useState({
    totalHostels: 28,
    activeKiosks: 84,
    totalMinutesMonth: "48,250",
    monthlyRevenue: "₹2,84,000",
    videoBridgeHealth: "99.98%",
    apiLatencyMs: "42ms",
  });

  return (
    <div className="space-y-6">

      {/* ─── Welcome Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#004B34] via-[#007856] to-[#00A76F] p-8 text-white">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-24 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight">
              Platform Governance ⚡
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              Multi-tenant infrastructure telemetry, Jitsi cluster status, and security audit trails.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/super-admin/hostels">
              <Button className="bg-white text-[#007856] hover:bg-white/90 font-bold text-xs rounded-xl shadow-md gap-1.5 h-10 px-4">
                <Building className="w-4 h-4" /> Manage Campuses
              </Button>
            </Link>
            <Link href="/super-admin/audit-logs">
              <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs rounded-xl gap-1.5 h-10 px-4 backdrop-blur-sm">
                <Shield className="w-4 h-4" /> Audit Logs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 4 Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building} iconBg="rgba(0,167,111,0.12)" iconColor="#00A76F" label="Total Campuses" value={telemetry.totalHostels} trend="+4 this month" trendUp={true} />
        <StatCard icon={Tablet} iconBg="rgba(142,51,255,0.12)" iconColor="#8E33FF" label="Connected Tablets" value={telemetry.activeKiosks} trend="Online" />
        <StatCard icon={CreditCard} iconBg="rgba(255,171,0,0.12)" iconColor="#FFAB00" label="Monthly Revenue" value={telemetry.monthlyRevenue} trend="MRR" />
        <StatCard icon={Activity} iconBg="rgba(0,184,217,0.12)" iconColor="#00B8D9" label="Video Bridge Uptime" value={telemetry.videoBridgeHealth} trend={telemetry.apiLatencyMs} />
      </div>

      {/* ─── Two Column Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hostel Summary Table */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F3F5] dark:border-[#2E3844]">
            <div>
              <h3 className="text-base font-bold text-[#1C252E] dark:text-white">Active Campuses</h3>
              <p className="text-xs text-[#919EAB] mt-0.5">All registered hostels and boarding schools</p>
            </div>
            <Link href="/super-admin/hostels">
              <Button variant="ghost" size="sm" className="text-xs font-bold text-[#00A76F] hover:text-[#007856] hover:bg-[#00A76F]/8 gap-1 rounded-lg">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#2E3844]">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Campus</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Students</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Kiosks</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Plan</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {[
                  { name: "Greenwood Academy", students: 124, kiosks: 3, plan: "Growth", status: "Active" },
                  { name: "Delhi Public School", students: 350, kiosks: 8, plan: "Enterprise", status: "Active" },
                  { name: "Sunrise Boarding", students: 85, kiosks: 2, plan: "Starter", status: "Active" },
                  { name: "Oakridge International", students: 210, kiosks: 5, plan: "Growth", status: "Active" },
                  { name: "Mount Carmel School", students: 45, kiosks: 1, plan: "Starter", status: "Trial" },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {row.name.charAt(0)}
                        </div>
                        <span className="text-sm font-semibold text-[#1C252E] dark:text-white">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#637381]">{row.students}</td>
                    <td className="px-6 py-4 text-sm text-[#637381]">{row.kiosks}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                        row.plan === "Enterprise" ? "bg-[#8E33FF]/10 text-[#8E33FF]" :
                        row.plan === "Growth" ? "bg-[#00A76F]/10 text-[#00A76F]" :
                        "bg-[#919EAB]/10 text-[#637381]"
                      }`}>
                        {row.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                        row.status === "Active" ? "text-[#00A76F]" : "text-[#FFAB00]"
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${row.status === "Active" ? "bg-[#00A76F]" : "bg-[#FFAB00]"}`} />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health */}
        <div className="rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1C252E] dark:text-white">System Health</h3>
            <button type="button" className="p-1.5 rounded-lg hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] text-[#919EAB]">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {[
              { label: "Jitsi Video Bridge", status: "Healthy", color: "#00A76F", value: "99.98%" },
              { label: "Supabase Database", status: "Healthy", color: "#00A76F", value: "99.99%" },
              { label: "Razorpay Webhooks", status: "Healthy", color: "#00A76F", value: "100%" },
              { label: "API Response Time", status: "Normal", color: "#00B8D9", value: "42ms" },
              { label: "Auth Service", status: "Healthy", color: "#00A76F", value: "99.95%" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-[#1C252E] dark:text-white font-medium">{item.label}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-dashed border-[#E5E8EB] dark:border-[#2E3844]">
            <div className="flex items-center gap-2 text-xs text-[#919EAB]">
              <Clock className="w-3.5 h-3.5" />
              <span>Last checked 30 seconds ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
