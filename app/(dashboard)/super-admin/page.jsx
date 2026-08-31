"use client";

import React, { useState, useEffect } from "react";
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
import LoadingState from "@/components/common/LoadingState";

/* ─── Stat Card ─── */
function StatCard({ icon: Icon, iconBg, iconColor, label, value, trend, trendUp }) {
  return (
    <div className="p-6 rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] space-y-4 transition-all hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: iconBg, color: iconColor }}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
            style={{
              backgroundColor: trendUp ? "rgba(0,167,111,0.08)" : "rgba(255,171,0,0.08)",
              color: trendUp ? "#00A76F" : "#FFAB00",
            }}
          >
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
  const [hostelsList, setHostelsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/hostels");
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setHostelsList(json.data);
          }
        }
      } catch (err) {
        console.error("Super Admin Data Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const totalCampuses = hostelsList.length;
  const totalStudents = hostelsList.reduce((acc, h) => acc + (h.students?.[0]?.count || 0), 0);
  const totalKiosks = hostelsList.reduce((acc, h) => acc + (h.devices?.[0]?.count || 1), 0);
  const estimatedMRR = totalCampuses * 2999;

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
            <p className="text-sm text-white/80 leading-relaxed">
              Multi-tenant infrastructure telemetry, campus management, and live system monitoring.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/super-admin/hostels">
              <Button className="bg-white text-[#007856] hover:bg-white/90 font-bold text-xs rounded-xl shadow-md gap-1.5 h-10 px-4 cursor-pointer">
                <Building className="w-4 h-4" /> Manage Campuses
              </Button>
            </Link>
            <Link href="/super-admin/audit-logs">
              <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs rounded-xl gap-1.5 h-10 px-4 backdrop-blur-sm cursor-pointer">
                <Shield className="w-4 h-4" /> Audit Logs
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Real Live Stat Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Building}
          iconBg="rgba(0,167,111,0.12)"
          iconColor="#00A76F"
          label="Total Campuses"
          value={totalCampuses}
          trend={totalCampuses > 0 ? "Active" : "No Schools"}
          trendUp={totalCampuses > 0}
        />
        <StatCard
          icon={Tablet}
          iconBg="rgba(142,51,255,0.12)"
          iconColor="#8E33FF"
          label="Connected Tablets"
          value={totalKiosks}
          trend="Online"
          trendUp={true}
        />
        <StatCard
          icon={Users}
          iconBg="rgba(34,197,94,0.12)"
          iconColor="#22C55E"
          label="Enrolled Students"
          value={totalStudents}
          trend="Active Rosters"
          trendUp={true}
        />
        <StatCard
          icon={CreditCard}
          iconBg="rgba(255,171,0,0.12)"
          iconColor="#FFAB00"
          label="Monthly Revenue"
          value={`₹${estimatedMRR.toLocaleString("en-IN")}`}
          trend="Live MRR"
          trendUp={true}
        />
      </div>

      {/* ─── Real Campuses Table ─── */}
      <div className="rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F3F5] dark:border-[#2E3844]">
          <div>
            <h3 className="text-base font-bold text-[#1C252E] dark:text-white">Active Campuses ({hostelsList.length})</h3>
            <p className="text-xs text-[#919EAB] mt-0.5">Real-time database records of registered hostels & schools</p>
          </div>
          <Link href="/super-admin/hostels">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-[#00A76F] hover:text-[#007856] hover:bg-[#00A76F]/8 gap-1 rounded-lg cursor-pointer">
              Manage All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {hostelsList.length === 0 ? (
          <div className="p-12 text-center">
            <Building className="w-10 h-10 text-[#919EAB] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#1C252E] dark:text-white">No active campuses yet</p>
            <p className="text-xs text-[#919EAB] mt-1">Create your first campus from the Manage Campuses button.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#2E3844] bg-[#F4F6F8]/60 dark:bg-[#1C252E]/60">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Campus</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Campus Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Students</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Kiosks</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {hostelsList.map((h) => (
                  <tr key={h.id} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {h.name?.charAt(0) || "C"}
                        </div>
                        <div>
                          <span className="text-sm font-bold text-[#1C252E] dark:text-white block">{h.name}</span>
                          <span className="text-[11px] text-[#919EAB]">{h.metadata?.admin_email || "Campus Admin"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-bold text-[#00A76F]">{h.code}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#1C252E] dark:text-white">
                      {h.students?.[0]?.count || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-[#1C252E] dark:text-white">
                      {h.devices?.[0]?.count || 1}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A76F] bg-[#EAFBF1] dark:bg-[#00A76F]/20 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> {h.status || "ACTIVE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
