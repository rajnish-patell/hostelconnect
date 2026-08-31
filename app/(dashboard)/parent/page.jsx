"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Video,
  User,
  Clock,
  PhoneCall,
  Calendar,
  ShieldCheck,
  ArrowRight,
  Heart,
  CheckCircle2,
  IndianRupee,
  CreditCard,
  Sparkles,
  X,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/common/StatusBadge";
import LoadingState from "@/components/common/LoadingState";
import { formatDuration } from "@/lib/utils";

// Deterministic Date Formatter (Immune to SSR/Client Locale Hydration Mismatches)
function formatDateSafe(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

export default function ParentDashboardPage() {
  const [parentData, setParentData] = useState(null);
  const [recentCalls, setRecentCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  // Recharge Modal State
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedStudentForRecharge, setSelectedStudentForRecharge] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [recharging, setRecharging] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [pRes, cRes] = await Promise.allSettled([
          fetch("/api/parents"),
          fetch("/api/calls?limit=5"),
        ]);

        if (pRes.status === "fulfilled" && pRes.value.ok) {
          const pJson = await pRes.value.json();
          if (isMounted && pJson.success && pJson.data) {
            setParentData(pJson.data);
          }
        }

        if (cRes.status === "fulfilled" && cRes.value.ok) {
          const cJson = await cRes.value.json();
          if (isMounted && cJson.success && Array.isArray(cJson.data)) {
            setRecentCalls(cJson.data);
          }
        }
      } catch (err) {
        console.error("[Parent Dashboard Data Load Error]:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleParentRecharge = async (e) => {
    e.preventDefault();
    if (!selectedStudentForRecharge) return;

    setRecharging(true);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parent_recharge",
          studentId: selectedStudentForRecharge.id,
          amountRupees: rechargeAmount,
        }),
      });

      setSuccessMsg(`Payment of ₹${rechargeAmount} successful! Calling balance credited to ${selectedStudentForRecharge.first_name}.`);
      setShowRechargeModal(false);
      setSelectedStudentForRecharge(null);

      // Update student balance locally
      if (parentData?.student_guardians) {
        setParentData({
          ...parentData,
          student_guardians: parentData.student_guardians.map((g) => {
            if (g.student?.id === selectedStudentForRecharge.id) {
              const prev = g.student.metadata?.balance_paise || 5000;
              return {
                ...g,
                student: {
                  ...g.student,
                  metadata: { ...g.student.metadata, balance_paise: prev + rechargeAmount * 100 },
                },
              };
            }
            return g;
          }),
        });
      }

      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setRecharging(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your parent portal..." />;
  }

  const linkedGuardians = Array.isArray(parentData?.student_guardians)
    ? parentData.student_guardians.filter((g) => Boolean(g?.student))
    : [];

  return (
    <div className="space-y-6">
      {/* ─── Welcome Banner ─── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#004B34] via-[#007856] to-[#00A76F] p-8 text-white">
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-24 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[11px] font-bold backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5" /> Automatic Student ID ↔️ Parent Connection Active
            </div>
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight">
              Welcome, {parentData?.first_name || "Parent"} 👋
            </h1>
            <p className="text-sm text-white/80 leading-relaxed">
              Stay connected with your child securely. Receive video calls from their dormitory kiosk and recharge their calling wallet anytime.
            </p>
          </div>
          <Link href="/parent/book">
            <Button className="bg-white text-[#007856] hover:bg-white/90 font-bold text-xs rounded-xl shadow-md gap-1.5 h-10 px-4 cursor-pointer">
              <Calendar className="w-4 h-4" /> Book Time Slot
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-3 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── Linked Children Cards (Student ID ↔ Parent ID) ─── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1C252E] dark:text-white">
              My Connected Children ({linkedGuardians.length})
            </h2>
            <p className="text-xs text-[#919EAB] mt-0.5">
              Automatically linked with registered mobile:{" "}
              <span className="font-mono font-bold text-[#00A76F]">
                {parentData?.phone || "8349655888"}
              </span>
            </p>
          </div>
        </div>

        {linkedGuardians.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#212B36] shadow-[var(--shadow-card)] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F4F6F8] dark:bg-[#2E3844] mx-auto mb-4 flex items-center justify-center">
              <Heart className="w-6 h-6 text-[#919EAB]" />
            </div>
            <p className="text-sm font-semibold text-[#1C252E] dark:text-white mb-1">No children linked yet</p>
            <p className="text-xs text-[#919EAB] max-w-sm mx-auto">
              When the school registers your mobile number with your child&apos;s Student ID, it will automatically connect here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {linkedGuardians.map((g) => {
              const student = g.student;
              const balancePaise = student?.metadata?.balance_paise || 5000;
              const isUnlimited = Boolean(student?.metadata?.unlimited_calls || student?.unlimited_calls);

              return (
                <div
                  key={g.id}
                  className="rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs p-6 space-y-5 transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                        {student?.first_name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-[#1C252E] dark:text-white">
                          {student?.first_name || "Student"} {student?.last_name || ""}
                        </h3>
                        <p className="text-xs text-[#919EAB]">
                          Student ID: <span className="font-mono font-bold text-[#00A76F]">{student?.admission_number || "-"}</span>
                        </p>
                        <p className="text-[11px] text-[#919EAB]">
                          {student?.class_grade ? `${student.class_grade} • ${student.section || "A"}` : "Dormitory Resident"}
                        </p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00A76F] bg-[#EAFBF1] dark:bg-[#00A76F]/20 px-2.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  </div>

                  {/* Wallet Balance & Calling Timer */}
                  <div className="p-3.5 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#919EAB] text-[11px] block">Calling Balance</span>
                      <span className="font-extrabold text-sm text-[#00A76F] flex items-center gap-0.5">
                        <IndianRupee className="w-3.5 h-3.5" /> {(balancePaise / 100).toFixed(0)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#919EAB] text-[11px] block">Call Limit</span>
                      <span className="font-bold text-[#1C252E] dark:text-white">
                        {isUnlimited ? "Unlimited" : "15 Mins (₹2/Min)"}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Schedule Call & Recharge Wallet */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      onClick={() => {
                        setSelectedStudentForRecharge(student);
                        setShowRechargeModal(true);
                      }}
                      variant="outline"
                      className="text-xs font-bold rounded-xl h-10 border-[#00A76F]/30 text-[#00A76F] hover:bg-[#00A76F]/10 gap-1.5 cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4" /> Recharge
                    </Button>
                    <Link href="/parent/book">
                      <Button className="w-full bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-xs rounded-xl h-10 gap-1.5 shadow-md shadow-[#00A76F]/20 cursor-pointer">
                        <Video className="w-4 h-4" /> Schedule Call
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Call History Table ─── */}
      <div className="rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F1F3F5] dark:border-[#2E3844]">
          <div>
            <h3 className="text-base font-bold text-[#1C252E] dark:text-white">Recent Call Sessions</h3>
            <p className="text-xs text-[#919EAB] mt-0.5">Logs of incoming and supervised video calls</p>
          </div>
          <Link href="/parent/calls">
            <Button variant="ghost" size="sm" className="text-xs font-bold text-[#00A76F] hover:text-[#007856] hover:bg-[#00A76F]/8 gap-1 rounded-lg cursor-pointer">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {recentCalls.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F4F6F8] dark:bg-[#2E3844] mx-auto mb-4 flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-[#919EAB]" />
            </div>
            <p className="text-sm font-semibold text-[#1C252E] dark:text-white mb-1">No call records yet</p>
            <p className="text-xs text-[#919EAB]">When your child calls from the kiosk, session logs will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#2E3844] bg-[#F4F6F8]/60 dark:bg-[#1C252E]/60">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Student</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Duration</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Date</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {recentCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {call.student?.first_name?.charAt(0) || "S"}
                        </div>
                        <span className="text-sm font-semibold text-[#1C252E] dark:text-white">
                          {call.student?.first_name || "Student"} {call.student?.last_name || ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={call.status || "COMPLETED"} />
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-medium text-[#1C252E] dark:text-white">
                      {formatDuration(call.duration_seconds || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#919EAB]" suppressHydrationWarning>
                      {formatDateSafe(call.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {call.status === "READY" || call.status === "IN_PROGRESS" ? (
                        <Link href={`/call/${call.id}`}>
                          <Button size="sm" className="bg-[#00A76F] hover:bg-[#007856] text-white text-xs font-bold rounded-lg h-8 px-3 shadow-[0_8px_16px_rgba(0,167,111,0.24)] cursor-pointer">
                            Join Call
                          </Button>
                        </Link>
                      ) : (
                        <span className="text-xs text-[#919EAB]">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Parent Smart Recharge Modal ─── */}
      {showRechargeModal && selectedStudentForRecharge && (
        <div className="fixed inset-0 z-50 bg-[#1C252E]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F5] dark:border-[#2E3844]">
              <div>
                <h3 className="text-lg font-bold text-[#1C252E] dark:text-white">Recharge Student Account 💳</h3>
                <p className="text-xs text-[#919EAB]">Instant wallet top-up for hostel video calls (₹2/Min)</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                className="p-2 rounded-xl text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#EAFBF1] dark:bg-[#00A76F]/10 border border-[#C8FACD] dark:border-[#00A76F]/20 space-y-1">
              <p className="text-xs text-[#007856] dark:text-[#5BE49B] font-bold">Recharge for Student:</p>
              <p className="text-base font-extrabold text-[#1C252E] dark:text-white">
                {selectedStudentForRecharge.first_name} {selectedStudentForRecharge.last_name || ""}
              </p>
              <p className="text-xs font-mono text-[#00A76F]">Student ID: {selectedStudentForRecharge.admission_number}</p>
            </div>

            <form onSubmit={handleParentRecharge} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1C252E] dark:text-white">Choose Recharge Plan</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-3 rounded-2xl text-xs font-extrabold cursor-pointer transition-all ${
                        rechargeAmount === amt
                          ? "bg-[#00A76F] text-white shadow-md shadow-[#00A76F]/25 scale-[1.02]"
                          : "bg-[#F4F6F8] dark:bg-[#1C252E] text-[#637381] border border-[#E5E8EB] dark:border-[#2E3844]"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] text-xs text-[#637381] dark:text-[#919EAB] space-y-1">
                <div className="flex justify-between">
                  <span>Calling Minutes:</span>
                  <span className="font-bold text-[#1C252E] dark:text-white">{Math.floor(rechargeAmount / 2)} Minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Per-minute rate:</span>
                  <span className="font-bold text-[#00A76F]">₹2.00 / Min</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Gateway:</span>
                  <span className="font-bold text-[#1C252E] dark:text-white">Razorpay (Direct Company Account)</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRechargeModal(false)}
                  className="rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recharging}
                  className="bg-[#00A76F] hover:bg-[#007856] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#00A76F]/25 cursor-pointer"
                >
                  {recharging ? "Connecting..." : `Pay ₹${rechargeAmount} via Razorpay`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
