"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Tablet,
  PhoneCall,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Building,
  CheckCircle2,
  Calendar,
  Sparkles,
  MoreVertical,
  Download,
  Filter,
  BarChart3,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import { formatDuration, formatTimeSafe, formatDateSafe } from "@/lib/utils";

/* ─── Minimals Stat Card ─── */
function StatCard({ icon: Icon, iconBg, iconColor, label, value, trend, trendLabel, trendUp }) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="p-6 rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] space-y-4 hover:shadow-[var(--shadow-card-hover)] transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
            style={{
              backgroundColor: trendUp ? "rgba(0, 167, 111, 0.08)" : "rgba(255, 86, 48, 0.08)",
              color: trendUp ? "#00A76F" : "#FF5630",
            }}
          >
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
        {trendLabel && !trend && (
          <span
            className="text-[11px] font-bold px-2 py-1 rounded-lg"
            style={{ backgroundColor: `${iconColor}12`, color: iconColor }}
          >
            {trendLabel}
          </span>
        )}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[#919EAB] mb-1">{label}</p>
        <p className="text-[28px] font-extrabold text-[#1C252E] dark:text-white leading-none">{value}</p>
      </div>
    </motion.div>
  );
}

/* ─── Mini Bar Chart (Decorative) ─── */
function MiniBarChart() {
  const bars = [45, 70, 55, 85, 60, 90, 40, 75, 65, 80, 50, 95];
  return (
    <div className="flex items-end gap-[3px] h-16">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all hover:opacity-80"
          style={{
            height: `${h}%`,
            backgroundColor: i === bars.length - 1 ? "#00A76F" : "rgba(0, 167, 111, 0.16)",
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   ADMIN DASHBOARD PAGE
   ═══════════════════════════════════════ */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeDevices: 0,
    callsToday: 0,
    minutesUsed: 0,
  });

  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [callsRes, studentsRes, devicesRes] = await Promise.allSettled([
          fetch("/api/calls?limit=10"),
          fetch("/api/students"),
          fetch("/api/devices"),
        ]);

        let calls = [];
        let students = [];
        let devices = [];

        if (callsRes.status === "fulfilled" && callsRes.value.ok) {
          const json = await callsRes.value.json();
          if (json.success && Array.isArray(json.data)) calls = json.data;
        }

        if (studentsRes.status === "fulfilled" && studentsRes.value.ok) {
          const json = await studentsRes.value.json();
          if (json.success && Array.isArray(json.data)) students = json.data;
        }

        if (devicesRes.status === "fulfilled" && devicesRes.value.ok) {
          const json = await devicesRes.value.json();
          if (json.success && Array.isArray(json.data)) devices = json.data;
        }

        setRecentCalls(calls);

        const totalSecs = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
        const mins = Math.ceil(totalSecs / 60);

        setStats({
          totalStudents: students.length,
          activeDevices: devices.length > 0 ? devices.length : 1,
          callsToday: calls.length,
          minutesUsed: mins,
        });
      } catch (e) {
        console.error("Dashboard load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">

      {/* ─── Welcome Banner (Minimals Gradient) ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#004B34] via-[#007856] to-[#00A76F] p-8 text-white">
        {/* Background Decorative Circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-24 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute top-4 right-48 w-16 h-16 rounded-full bg-white/10" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight">
              Welcome back 👋
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              Your calling kiosk stations are active. All scheduled sessions are monitored with server-enforced quotas and complete audit logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link href="/admin/students">
              <Button className="bg-white text-[#007856] hover:bg-white/90 font-bold text-xs rounded-xl shadow-md gap-1.5 h-10 px-4">
                <Plus className="w-4 h-4" /> Add Student
              </Button>
            </Link>
            <Link href="/admin/devices">
              <Button className="bg-white/15 hover:bg-white/25 text-white border border-white/20 font-bold text-xs rounded-xl gap-1.5 h-10 px-4 backdrop-blur-sm">
                <Tablet className="w-4 h-4" /> Kiosk Codes
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 4 Stat Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          iconBg="rgba(0, 167, 111, 0.12)"
          iconColor="#00A76F"
          label="Total Residents"
          value={stats.totalStudents}
          trend="+8.4%"
          trendUp={true}
        />
        <StatCard
          icon={Tablet}
          iconBg="rgba(142, 51, 255, 0.12)"
          iconColor="#8E33FF"
          label="Active Kiosks"
          value={stats.activeDevices}
          trendLabel="Online"
        />
        <StatCard
          icon={PhoneCall}
          iconBg="rgba(255, 171, 0, 0.12)"
          iconColor="#FFAB00"
          label="Calls Today"
          value={stats.callsToday}
          trend="+12%"
          trendUp={true}
        />
        <StatCard
          icon={Clock}
          iconBg="rgba(0, 184, 217, 0.12)"
          iconColor="#00B8D9"
          label="Minutes Used"
          value={`${stats.minutesUsed}`}
          trend="45%"
          trendLabel="of quota"
        />
      </div>

      {/* ─── Two Column: Chart + Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Volume Chart Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[#1C252E] dark:text-white">Call Volume</h3>
              <p className="text-xs text-[#919EAB] mt-0.5">(+43%) than last week</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#919EAB]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#00A76F]" /> Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FFAB00]" /> Missed
              </span>
            </div>
          </div>

          {/* Chart Placeholder */}
          <div className="space-y-3">
            <div className="flex items-end gap-2 h-40">
              {[
                { completed: 65, missed: 10 },
                { completed: 40, missed: 15 },
                { completed: 80, missed: 5 },
                { completed: 55, missed: 20 },
                { completed: 90, missed: 8 },
                { completed: 45, missed: 12 },
                { completed: 70, missed: 6 },
                { completed: 85, missed: 10 },
                { completed: 60, missed: 15 },
                { completed: 75, missed: 5 },
                { completed: 50, missed: 18 },
                { completed: 95, missed: 3 },
              ].map((bar, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end gap-1">
                  <div
                    className="w-full rounded-t-md bg-[#00A76F]"
                    style={{ height: `${bar.completed}%` }}
                  />
                  <div
                    className="w-full rounded-t-md bg-[#FFAB00]/40"
                    style={{ height: `${bar.missed}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-[#919EAB] font-medium px-1">
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map(m => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Activity Feed */}
        <div className="rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1C252E] dark:text-white">Activity</h3>
            <button type="button" className="p-1.5 rounded-lg hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] text-[#919EAB]">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {[
              { time: "2 min ago", text: "Kiosk Tablet 1 activated", icon: Tablet, color: "#00A76F" },
              { time: "15 min ago", text: "Arjun → Mrs. Sharma call completed", icon: PhoneCall, color: "#8E33FF" },
              { time: "1 hr ago", text: "3 new parents verified", icon: CheckCircle2, color: "#00B8D9" },
              { time: "2 hr ago", text: "Daily quota at 45%", icon: Activity, color: "#FFAB00" },
              { time: "5 hr ago", text: "New student Priya enrolled", icon: Users, color: "#FF6C40" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                  style={{ backgroundColor: `${item.color}12`, color: item.color }}
                >
                  <item.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1C252E] dark:text-white font-medium truncate">{item.text}</p>
                  <p className="text-xs text-[#919EAB]">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Recent Calls Table ─── */}
      <div className="rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F3F5] dark:border-[#2E3844]">
          <div>
            <h3 className="text-base font-bold text-[#1C252E] dark:text-white">Recent Supervised Calls</h3>
            <p className="text-xs text-[#919EAB] mt-0.5">Live call sessions and historical durations</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="p-2 rounded-lg hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] text-[#919EAB] transition-colors">
              <Filter className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 rounded-lg hover:bg-[#F4F6F8] dark:hover:bg-[#2E3844] text-[#919EAB] transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <Link href="/admin/calls">
              <Button variant="ghost" size="sm" className="text-xs font-bold text-[#00A76F] hover:text-[#007856] hover:bg-[#00A76F]/8 gap-1 rounded-lg">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="p-8">
            <LoadingState message="Loading live call data..." />
          </div>
        ) : recentCalls.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F4F6F8] dark:bg-[#2E3844] mx-auto mb-4 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-[#919EAB]" />
            </div>
            <p className="text-sm font-semibold text-[#1C252E] dark:text-white mb-1">No calls recorded yet</p>
            <p className="text-xs text-[#919EAB]">
              Launch the tablet kiosk at{" "}
              <Link href="/device" className="text-[#00A76F] font-bold hover:underline">/device</Link>{" "}
              to initiate the first video session.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#2E3844]">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Student</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Verified Parent</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Time</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {recentCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {call.student?.first_name?.charAt(0) || "S"}
                        </div>
                        <span className="text-sm font-semibold text-[#1C252E] dark:text-white">
                          {call.student?.first_name} {call.student?.last_name || ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#637381] dark:text-[#919EAB]">
                      {call.parent?.first_name} {call.parent?.last_name || ""}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={call.status} />
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-[#1C252E] dark:text-white">
                      {formatDuration(call.duration_seconds)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#919EAB]" suppressHydrationWarning>
                      {formatTimeSafe(call.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/call/${call.id}`}>
                        <Button size="sm" className="bg-[#00A76F] hover:bg-[#007856] text-white text-xs font-bold rounded-lg h-8 px-3 shadow-[0_8px_16px_rgba(0,167,111,0.24)]">
                          Supervise
                        </Button>
                      </Link>
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
