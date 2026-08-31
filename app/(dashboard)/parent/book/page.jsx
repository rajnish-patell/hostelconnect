"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
  IndianRupee,
  PhoneCall,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/common/LoadingState";

export default function ParentBookCallPage() {
  const router = useRouter();

  // Mode: "instant" | "schedule"
  const [callMode, setCallMode] = useState("instant");

  const [parentData, setParentData] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("17:00 - 17:15");
  const [callDate, setCallDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/parents");
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          const json = await res.json();
          if (json.success) {
            const parentObj = Array.isArray(json.data) ? json.data[0] : json.data;
            setParentData(parentObj);
            const firstStudent = parentObj?.student_guardians?.[0]?.student?.id;
            if (firstStudent) setSelectedStudentId(firstStudent);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStartInstantCall = async () => {
    if (!selectedStudentId) {
      setErrorMsg("Please select a child to call.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          parentId: parentData?.id,
          notes: "Instant Parent-Initiated Call",
        }),
      });

      let json = null;
      if (res.headers.get("content-type")?.includes("application/json")) {
        json = await res.json();
      }
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Failed to start instant call session");
      }

      // Route directly to video room
      router.push(`/call/${json.data.id}`);
    } catch (err) {
      setErrorMsg(err.message);
      setSubmitting(false);
    }
  };

  const handleScheduleCall = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setErrorMsg("Please select a child for the scheduled call.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          parentId: parentData?.id,
          notes: `Scheduled Slot: ${callDate} at ${selectedSlot}`,
        }),
      });

      let json = null;
      if (res.headers.get("content-type")?.includes("application/json")) {
        json = await res.json();
      }
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Failed to book call slot");
      }

      setSuccessMsg(`Call scheduled successfully for ${callDate} (${selectedSlot})! You can join when the time arrives.`);
      setTimeout(() => {
        router.push("/parent");
      }, 2000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Loading your calling dashboard..." />;

  const linkedGuardians = (Array.isArray(parentData) ? parentData[0]?.student_guardians : parentData?.student_guardians) || [];
  const selectedStudent = linkedGuardians.find(g => g?.student?.id === selectedStudentId)?.student;

  const slots = [
    "16:30 - 16:45",
    "17:00 - 17:15",
    "17:30 - 17:45",
    "18:00 - 18:15",
    "18:30 - 18:45",
    "19:00 - 19:15",
    "19:30 - 19:45",
    "20:00 - 20:15",
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* ─── Header ─── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
          Parent Video Calling 📞
        </h1>
        <p className="text-xs text-[#919EAB]">
          Start an instant video call now or book a reserved slot for your child at the hostel kiosk.
        </p>
      </div>

      {/* ─── Mode Switcher: Instant Call vs Schedule Slot ─── */}
      <div className="flex p-1.5 bg-[#F4F6F8] dark:bg-[#1C252E] rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs">
        <button
          type="button"
          onClick={() => { setCallMode("instant"); setErrorMsg(null); }}
          className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            callMode === "instant"
              ? "bg-[#00A76F] text-white shadow-md shadow-[#00A76F]/25"
              : "text-[#637381] dark:text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>⚡ Instant Call (Call Now)</span>
        </button>

        <button
          type="button"
          onClick={() => { setCallMode("schedule"); setErrorMsg(null); }}
          className={`flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            callMode === "schedule"
              ? "bg-[#00A76F] text-white shadow-md shadow-[#00A76F]/25"
              : "text-[#637381] dark:text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>📅 Schedule Video Call</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {linkedGuardians.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] p-12 text-center text-[#919EAB] shadow-xs">
          No verified children linked to your mobile account yet. Please ask your hostel administration to link your phone number.
        </div>
      ) : (
        <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xl p-6 sm:p-8 space-y-6">
          {/* Child Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#1C252E] dark:text-white block">
              Select Your Child to Call:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedGuardians.map((g) => {
                const c = g.student;
                if (!c) return null;
                const isSelected = selectedStudentId === c.id;
                const balancePaise = c.metadata?.balance_paise || 5000;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedStudentId(c.id)}
                    className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "border-2 border-[#00A76F] bg-[#EAFBF1]/60 dark:bg-[#00A76F]/10 shadow-md scale-[1.01]"
                        : "border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] hover:bg-[#F4F6F8] dark:hover:bg-[#2A3542]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {c.first_name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1C252E] dark:text-white">
                          {c.first_name} {c.last_name || ""}
                        </p>
                        <p className="text-xs font-mono text-[#00A76F] font-semibold">
                          ID: {c.admission_number}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-extrabold text-[#00A76F] bg-[#EAFBF1] dark:bg-[#00A76F]/20 px-2 py-0.5 rounded-md">
                        ₹{(balancePaise / 100).toFixed(0)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════ MODE 1: INSTANT CALL NOW ══════════ */}
          {callMode === "instant" ? (
            <div className="space-y-6 pt-2">
              <div className="p-4 rounded-2xl bg-[#EAFBF1] dark:bg-[#00A76F]/10 border border-[#C8FACD] dark:border-[#00A76F]/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00A76F] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#00A76F]/25">
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#007856] dark:text-[#5BE49B]">
                    Instant Live Call Room Ready
                  </h4>
                  <p className="text-xs text-[#637381] dark:text-[#919EAB]">
                    Clicking below will start a direct video call session immediately.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleStartInstantCall}
                disabled={submitting || !selectedStudentId}
                className="w-full h-14 bg-[#00A76F] hover:bg-[#007856] text-white font-extrabold text-base rounded-2xl shadow-xl shadow-[#00A76F]/30 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Connecting Video Call Room...</span>
                  </>
                ) : (
                  <>
                    <Video className="w-6 h-6" />
                    <span>Start Instant Call with {selectedStudent?.first_name || "Child"}</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* ══════════ MODE 2: SCHEDULE VIDEO CALL ══════════ */
            <form onSubmit={handleScheduleCall} className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C252E] dark:text-white block">
                  Select Calling Date *
                </label>
                <input
                  type="date"
                  required
                  value={callDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setCallDate(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1C252E] dark:text-white block">
                  Select Available 15-Min Slot *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`p-3 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                        selectedSlot === s
                          ? "bg-[#00A76F] text-white border-[#00A76F] shadow-md shadow-[#00A76F]/25 scale-[1.02]"
                          : "border-[#E5E8EB] dark:border-[#2E3844] bg-[#F4F6F8] dark:bg-[#1C252E] text-[#637381] dark:text-[#919EAB] hover:border-[#00A76F]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#F1F3F5] dark:border-[#2E3844]">
                <Button
                  type="submit"
                  disabled={submitting || !selectedStudentId}
                  className="w-full h-13 bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#00A76F]/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Reserving Slot...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Confirm Scheduled Call for {callDate}</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
