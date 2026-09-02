"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tablet,
  User,
  Phone,
  Video,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  LogOut,
  IndianRupee,
  Clock,
  Sparkles,
  ArrowLeft,
  Power,
  Users,
  X,
  Loader2,
  Lock,
  Unlock,
  Delete,
  HelpCircle,
  Building,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import JitsiMeetingWrapper from "@/components/video/JitsiMeeting";
import { BRAND } from "@/lib/constants/brand";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function DeviceKioskPage() {
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedParent, setSelectedParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  // Fast direct Student ID + PIN authentication
  const [quickStudentId, setQuickStudentId] = useState("");
  const [quickPin, setQuickPin] = useState("");
  const [quickLoggingIn, setQuickLoggingIn] = useState(false);

  // Child-Friendly PIN Authentication State (Directory Click)
  const [pinModalStudent, setPinModalStudent] = useState(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Active call state
  const [activeCallSession, setActiveCallSession] = useState(null);
  const [callCompletedMessage, setCallCompletedMessage] = useState(null);

  // Load Kiosk Directory for selected school/tenant
  const fetchDirectory = async (forceHostelId = null) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const activeHId = forceHostelId || selectedHostelId || localStorage.getItem("hc_selected_hostel_id") || "";
      const url = activeHId ? `/api/devices/directory?hostelId=${activeHId}` : "/api/devices/directory";
      const res = await fetch(url);
      const json = await res.json();

      if (json?.success) {
        setStudents(json.data || []);
        setTenants(json.tenants || []);
        if (json.currentHostelId) {
          setSelectedHostelId(json.currentHostelId);
          localStorage.setItem("hc_selected_hostel_id", json.currentHostelId);
        }
        setDeviceInfo(json.device || { name: "Campus Video Terminal" });
      } else {
        throw new Error(json?.error?.message || "Failed to load student directory");
      }
    } catch (err) {
      console.error("[Kiosk Directory Load Error]:", err);
      setErrorMsg(err.message || "Failed to connect to student directory.");
    } finally {
      setLoading(false);
    }
  };

  const handleTenantChange = (hId) => {
    setSelectedHostelId(hId);
    localStorage.setItem("hc_selected_hostel_id", hId);
    fetchDirectory(hId);
  };

  // Quick Direct Student ID + PIN Login
  const handleQuickStudentLogin = async (e) => {
    e?.preventDefault();
    if (!quickStudentId.trim()) return;
    setQuickLoggingIn(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/verify-student-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: quickStudentId.trim().toUpperCase(),
          pin: quickPin.trim() || undefined,
          hostelId: selectedHostelId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Student ID or PIN verification failed.");
      }

      const sData = json.data;
      const matched = {
        id: sData.id,
        first_name: sData.firstName,
        last_name: sData.lastName,
        admission_number: sData.studentId,
        is_active: true,
        hostel_id: sData.hostelId,
        metadata: {
          balance_paise: sData.balancePaise,
          unlimited_calls: sData.unlimitedCalls,
        },
        guardians: sData.guardians.map((g) => ({
          id: g.id,
          relationship: g.relationship,
          is_primary: g.is_primary,
          parent: {
            id: g.id,
            first_name: g.first_name,
            phone: g.phone,
            email: g.email,
            photo_url: g.photo_url,
          },
        })),
      };

      setSelectedStudent(matched);
      if (matched.guardians?.length > 0) {
        const primary = matched.guardians[0].parent || matched.guardians[0];
        setSelectedParent({
          id: primary.id,
          first_name: primary.first_name,
          relationship: matched.guardians[0].relationship || "Guardian",
          phone: primary.phone,
        });
      }

      setQuickStudentId("");
      setQuickPin("");
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setQuickLoggingIn(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const savedHId = localStorage.getItem("hc_selected_hostel_id") || "";
        const url = savedHId ? `/api/devices/directory?hostelId=${savedHId}` : "/api/devices/directory";
        const res = await fetch(url);
        const json = await res.json();

        if (json?.success && !ignore) {
          setStudents(json.data || []);
          setTenants(json.tenants || []);
          const chosenHostelId = json.currentHostelId || savedHId || json.tenants?.[0]?.id;
          if (chosenHostelId) {
            setSelectedHostelId(chosenHostelId);
          }
          setDeviceInfo(json.device || { name: "Campus Video Terminal" });

          // Auto-select pre-authenticated student arriving from /login
          const preAuthStudentId = localStorage.getItem("hc_active_student_id");
          if (preAuthStudentId) {
            const found = (json.data || []).find(
              (s) => s.admission_number?.toUpperCase() === preAuthStudentId.toUpperCase()
            );
            if (found) {
              setPinModalStudent(found);
            }
            localStorage.removeItem("hc_active_student_id");
          }
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(err.message || "Failed to load student directory.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // When student taps their profile card -> Trigger Child PIN Keypad Modal
  const handleStudentSelect = (s) => {
    if (!s.is_active) {
      setErrorMsg(`Calling is currently turned OFF for ${s.first_name} by the school admin.`);
      return;
    }
    setPinModalStudent(s);
    setEnteredPin("");
    setPinError(null);
    setPinSuccess(false);
  };

  // Handle number pad tap (0-9)
  const handlePinDigit = (digit) => {
    if (enteredPin.length >= 4 || pinSuccess) return;

    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setPinError(null);

    // If 4 digits entered, automatically verify PIN
    if (nextPin.length === 4) {
      verifyChildPin(nextPin, pinModalStudent);
    }
  };

  // Backspace / Delete last digit
  const handlePinBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  // Verify PIN (matches student's set PIN, or default '1234', or Warden Master Override '9999')
  const verifyChildPin = (pinToVerify, student) => {
    if (!student) return;
    const correctPin = String(student.metadata?.kiosk_pin || "1234").trim();
    const isWardenOverride = pinToVerify === "9999";

    if (pinToVerify === correctPin || isWardenOverride) {
      setPinSuccess(true);
      setTimeout(() => {
        setSelectedStudent(student);
        setPinModalStudent(null);
        setPinSuccess(false);
        setEnteredPin("");

        // Auto-select primary guardian
        if (Array.isArray(student?.guardians) && student.guardians.length > 0) {
          const primary = student.guardians[0];
          if (primary?.parent) {
            setSelectedParent({
              id: primary.parent.id,
              first_name: `${primary.parent.first_name || ""} ${primary.parent.last_name || ""}`.trim(),
              relationship: primary.relationship || "GUARDIAN",
              phone: primary.parent.phone,
            });
          }
        }
      }, 400);
    } else {
      setPinError("Wrong PIN! Try again or ask Warden for help.");
      setTimeout(() => {
        setEnteredPin("");
      }, 700);
    }
  };

  const handleStartCall = async () => {
    if (!selectedStudent || !selectedParent) return;

    if (!selectedStudent.is_active) {
      setErrorMsg("Calling is currently disabled for this student account by the school warden.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // Optional device session token if available
      const deviceSessionToken = localStorage.getItem("hc_device_session_token");
      const headers = { "Content-Type": "application/json" };
      if (deviceSessionToken) {
        headers["Authorization"] = `Bearer ${deviceSessionToken}`;
      }

      const res = await fetch("/api/calls/device", {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentId: selectedStudent.id,
          parentId: selectedParent.id,
          notes: `Student Kiosk Call to ${selectedParent.first_name} (${selectedParent.relationship || "Parent"})`,
        }),
      });

      let data = null;
      if (res.headers.get("content-type")?.includes("application/json")) {
        data = await res.json();
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || "Unable to start call session");
      }

      setActiveCallSession(data.data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCallFinished = () => {
    setActiveCallSession(null);
    setSelectedParent(null);
    setSelectedStudent(null);
    setCallCompletedMessage("Call ended safely. Supervised call duration and logs recorded.");

    setTimeout(() => {
      setCallCompletedMessage(null);
    }, 5000);
  };

  // Resilient multi-term filter: Student Name, Roll/ID, Grade, Section, Parent Phone & Parent Name
  const cleanQ = searchQuery.toLowerCase().trim();
  const cleanNumQ = cleanQ.replace(/[^a-z0-9]/g, "");

  const filteredStudents = students.filter((s) => {
    if (!cleanQ) return true;

    const fullName = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
    const adm = (s.admission_number || "").toLowerCase();
    const cleanAdm = adm.replace(/[^a-z0-9]/g, "");
    const grade = (s.class_grade || "").toLowerCase();
    const section = (s.section || "").toLowerCase();

    // Check all linked parent phones and names
    const parentMatches = s.guardians?.some((g) => {
      const p = g.parent;
      if (!p) return false;
      const pName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      const pPhone = (p.phone || "").replace(/\D/g, "");
      const pEmail = (p.email || "").toLowerCase();
      const rel = (g.relationship || "").toLowerCase();

      return (
        pName.includes(cleanQ) ||
        (cleanNumQ && pPhone.includes(cleanNumQ)) ||
        pEmail.includes(cleanQ) ||
        rel.includes(cleanQ)
      );
    });

    return (
      fullName.includes(cleanQ) ||
      adm.includes(cleanQ) ||
      (cleanNumQ && cleanAdm.includes(cleanNumQ)) ||
      grade.includes(cleanQ) ||
      section.includes(cleanQ) ||
      Boolean(parentMatches)
    );
  });

  // SCREEN 1: Active In-Call Video Session
  if (activeCallSession) {
    const isUnlimited = selectedStudent?.metadata?.unlimited_calls || selectedStudent?.unlimited_calls;
    const maxMins = isUnlimited ? 60 : (selectedStudent?.metadata?.max_call_duration_minutes || selectedStudent?.max_call_duration_minutes || 15);

    return (
      <div className="fixed inset-0 z-50 bg-[#0B0F15] flex flex-col">
        <JitsiMeetingWrapper
          sessionId={activeCallSession.id}
          meetingId={activeCallSession.meeting_id}
          studentName={`${selectedStudent?.first_name} ${selectedStudent?.last_name || ""}`.trim()}
          parentName={selectedParent?.first_name || "Parent"}
          isStudent={true}
          maxDurationMinutes={maxMins}
          onCallEnded={handleCallFinished}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#141A21] text-[#1C252E] dark:text-white flex flex-col font-sans">
      {/* ─── Kiosk Top App Bar with Exit / Back Button ─── */}
      <header className="h-18 bg-white dark:bg-[#212B36] border-b border-[#E5E8EB] dark:border-[#2E3844] px-4 sm:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00A76F] text-white flex items-center justify-center shadow-md shadow-[#00A76F]/25 shrink-0">
            <Tablet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
              {BRAND.name} Student Calling Kiosk 🏫
            </h1>
            <p className="text-[11px] text-[#919EAB]">
              {deviceInfo?.name || "Campus Video Terminal"} • Safe Supervised Calling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Prominent Back / Exit Kiosk Button */}
          <Link href="/admin">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3.5 rounded-xl font-bold text-xs gap-1.5 border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] hover:bg-[#F4F6F8] dark:hover:bg-[#2A3542] text-[#1C252E] dark:text-white shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#00A76F]" />
              <span>Exit Kiosk / Back</span>
            </Button>
          </Link>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => fetchDirectory(true)}
            className="p-2 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] text-[#637381] hover:text-[#00A76F] shadow-xs cursor-pointer"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* ─── Main Kiosk Interface ─── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Success Alert */}
        {callCompletedMessage && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-3 font-semibold animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{callCompletedMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-xs flex items-center gap-3 font-semibold animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Select Student or Search */}
        {!selectedStudent ? (
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B] text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Multi-Tenant Student Calling Terminal
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
                Enter Student ID & PIN or Tap Photo 📸
              </h2>
              <p className="text-xs text-[#919EAB]">
                Separate tenanted system: Enter your Student ID and secret 4-digit PIN to directly video call your verified parents.
              </p>
            </div>

            {/* ─── Tenant / School Selector ─── */}
            {tenants.length > 0 && (
              <div className="p-3 bg-white dark:bg-[#212B36] rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#637381] dark:text-[#919EAB]">
                  <Building className="w-4 h-4 text-[#00A76F]" />
                  <span>Select School / Hostel:</span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleTenantChange(t.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 ${
                        selectedHostelId === t.id
                          ? "bg-[#00A76F] text-white shadow-sm shadow-[#00A76F]/25"
                          : "bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844] text-[#637381] hover:text-[#1C252E] dark:hover:text-white"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Fast Student ID + 4-digit PIN Direct Calling Form ─── */}
            <form
              onSubmit={handleQuickStudentLogin}
              className="p-4 bg-gradient-to-br from-white to-[#F9FAFB] dark:from-[#212B36] dark:to-[#1C252E] rounded-2xl border-2 border-[#00A76F]/20 dark:border-[#00A76F]/30 shadow-sm flex flex-col sm:flex-row items-center gap-3"
            >
              <div className="flex-1 w-full relative">
                <GraduationCap className="w-4 h-4 text-[#00A76F] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={quickStudentId}
                  onChange={(e) => setQuickStudentId(e.target.value.toUpperCase())}
                  placeholder="Student ID (e.g. STU-001, GRK-001)"
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#141A21] text-xs sm:text-sm font-bold text-[#1C252E] dark:text-white placeholder:font-normal placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20"
                />
              </div>
              <div className="w-full sm:w-36 relative">
                <Lock className="w-4 h-4 text-[#00A76F] absolute left-3.5 top-3" />
                <input
                  type="password"
                  maxLength={4}
                  value={quickPin}
                  onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="PIN (1234)"
                  className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#141A21] text-xs sm:text-sm font-mono font-bold tracking-widest text-[#1C252E] dark:text-white placeholder:font-normal placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20"
                />
              </div>
              <Button
                type="submit"
                disabled={quickLoggingIn}
                className="w-full sm:w-auto h-10 px-5 bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-xs rounded-xl shadow-md shadow-[#00A76F]/25 shrink-0 cursor-pointer gap-2"
              >
                {quickLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Phone className="w-4 h-4" />
                )}
                <span>Call Parent</span>
              </Button>
            </form>

            {/* Quick Student ID / Name / Parent Phone Search Bar */}
            <div className="p-2 bg-white dark:bg-[#212B36] rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs flex items-center gap-3">
              <Search className="w-5 h-5 text-[#00A76F] ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name (Aarav, Rajnish), Student ID (STU-001), or parent phone..."
                className="flex-1 bg-transparent text-sm sm:text-base text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none font-bold py-2"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="p-1.5 mr-2 rounded-xl text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white hover:bg-[#F4F6F8] dark:hover:bg-[#1C252E] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Student Directory Grid */}
            {loading ? (
              <div className="p-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-[#00A76F] animate-spin mx-auto" />
                <p className="text-sm font-bold text-[#919EAB]">Loading student directory...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs space-y-3">
                <Users className="w-12 h-12 text-[#919EAB] mx-auto" />
                <h3 className="text-base font-bold text-[#1C252E] dark:text-white">
                  No students found matching &quot;{searchQuery}&quot;
                </h3>
                <p className="text-xs text-[#919EAB] max-w-sm mx-auto">
                  Try searching with the student&apos;s first name, roll number, or guardian mobile number.
                </p>
                <Button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs font-bold mt-2"
                >
                  Clear Search
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {filteredStudents.map((s) => {
                  const balancePaise = s.metadata?.balance_paise || s.balance_paise || 5000;
                  const isUnlimited = s.metadata?.unlimited_calls || s.unlimited_calls;

                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleStudentSelect(s)}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all text-center space-y-3 cursor-pointer flex flex-col items-center justify-between group relative ${
                        s.is_active
                          ? "bg-white dark:bg-[#212B36] border-[#E5E8EB] dark:border-[#2E3844] shadow-xs hover:shadow-xl hover:border-[#00A76F]"
                          : "bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60"
                      }`}
                    >
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl shadow-lg shadow-[#00A76F]/25 ring-4 ring-white dark:ring-[#1C252E] group-hover:scale-105 transition-transform">
                        {s.first_name.charAt(0)}
                      </div>

                      <div>
                        <p className="font-extrabold text-sm sm:text-base text-[#1C252E] dark:text-white group-hover:text-[#00A76F] transition-colors line-clamp-1">
                          {s.first_name} {s.last_name || ""}
                        </p>
                        <p className="text-xs font-mono font-bold text-[#00A76F] mt-0.5">
                          {s.admission_number || "STU-ID"}
                        </p>
                        <p className="text-[11px] text-[#919EAB]">
                          {s.class_grade ? `Class ${s.class_grade} • Sec ${s.section || "A"}` : "Student"}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#F1F3F5] dark:border-[#2E3844] w-full flex items-center justify-between text-[11px]">
                        <span className="font-extrabold text-[#00A76F]">₹{(balancePaise / 100).toFixed(0)}</span>
                        <span className="text-[10px] font-bold text-[#919EAB] flex items-center gap-1">
                          <Lock className="w-3 h-3 text-[#00A76F]" /> PIN Protected
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Step 2: Selected Student -> Pick Guardian & 1-Click Call */
          <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xl p-6 sm:p-8 space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-6 border-b border-[#F1F3F5] dark:border-[#2E3844]">
              <button
                type="button"
                onClick={() => { setSelectedStudent(null); setSelectedParent(null); }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#637381] hover:text-[#00A76F] cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Change Student
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#919EAB]">Student ID:</span>
                <span className="text-xs font-mono font-bold text-[#00A76F] px-2 py-0.5 rounded-md bg-[#EAFBF1] dark:bg-[#00A76F]/20">
                  {selectedStudent.admission_number}
                </span>
              </div>
            </div>

            {/* Student Profile Card */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-extrabold text-3xl shadow-lg shadow-[#00A76F]/25 ring-4 ring-white dark:ring-[#212B36]">
                {selectedStudent.first_name.charAt(0)}
              </div>
              <div className="space-y-1 text-center sm:text-left flex-1">
                <h3 className="text-2xl font-extrabold text-[#1C252E] dark:text-white">
                  {selectedStudent.first_name} {selectedStudent.last_name || ""}
                </h3>
                <p className="text-xs text-[#919EAB]">
                  {selectedStudent.class_grade ? `Class ${selectedStudent.class_grade} • Section ${selectedStudent.section || "A"}` : "Residential Student"}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                  <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#00A76F] bg-[#EAFBF1] dark:bg-[#00A76F]/20 px-2.5 py-1 rounded-lg">
                    <IndianRupee className="w-3 h-3" /> Calling Wallet: ₹{((selectedStudent.metadata?.balance_paise || 5000) / 100).toFixed(0)}
                  </span>
                  {selectedStudent.metadata?.unlimited_calls ? (
                    <span className="text-xs font-bold text-[#8E33FF] bg-[#8E33FF]/10 px-2.5 py-1 rounded-lg">
                      Unlimited Calling Active
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#1C252E] dark:text-white bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844] px-2.5 py-1 rounded-lg">
                      ⏱️ Max Duration: 15 Mins
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Select Parent to Call */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#1C252E] dark:text-white">
                Select Parent / Guardian to Video Call:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(selectedStudent.guardians && selectedStudent.guardians.length > 0) ? (
                  selectedStudent.guardians.map((g) => {
                    const p = g.parent;
                    if (!p) return null;
                    const isSelected = selectedParent?.id === p.id;
                    const rel = g.relationship || "GUARDIAN";

                    return (
                      <button
                        key={g.id || p.id}
                        type="button"
                        onClick={() => setSelectedParent({
                          id: p.id,
                          first_name: `${p.first_name} ${p.last_name || ""}`.trim(),
                          relationship: rel,
                          phone: p.phone,
                        })}
                        className={`p-5 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "border-2 border-[#00A76F] bg-[#EAFBF1]/60 dark:bg-[#00A76F]/10 shadow-md scale-[1.01]"
                            : "border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] hover:bg-[#F4F6F8]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center font-bold">
                            <User className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-sm text-[#1C252E] dark:text-white">
                                {p.first_name} {p.last_name || ""}
                              </p>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#00A76F]">
                                {rel}
                              </span>
                            </div>
                            <p className="text-xs text-[#919EAB] mt-0.5">{p.phone} • Verified</p>
                          </div>
                        </div>
                        <span className="w-4 h-4 rounded-full border-2 border-[#00A76F] flex items-center justify-center">
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#00A76F]" />}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-semibold col-span-2">
                    No verified guardian linked to this student yet. Please link in School Admin roster.
                  </div>
                )}
              </div>
            </div>

            {/* 1-Click Start Call Button */}
            <div className="pt-4">
              <Button
                onClick={handleStartCall}
                disabled={loading || !selectedParent}
                className="w-full h-14 bg-[#00A76F] hover:bg-[#007856] text-white font-extrabold text-base rounded-2xl shadow-xl shadow-[#00A76F]/30 flex items-center justify-center gap-3 cursor-pointer transition-all active:scale-[0.98]"
              >
                <Video className="w-6 h-6" />
                <span>Start Video Call with {selectedParent?.relationship || "Parent"}</span>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ─── CHILD-FRIENDLY 4-DIGIT PIN AUTHENTICATION MODAL ─── */}
      <AnimatePresence>
        {pinModalStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setPinModalStudent(null); setEnteredPin(""); setPinError(null); }}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs cursor-pointer"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative z-10 w-full max-w-sm bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl p-6 sm:p-8 space-y-6 text-center"
            >
              {/* Close / Cancel Button */}
              <button
                type="button"
                onClick={() => { setPinModalStudent(null); setEnteredPin(""); setPinError(null); }}
                className="absolute top-4 right-4 p-2 rounded-full text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white hover:bg-[#F4F6F8] dark:hover:bg-[#1C252E] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Student Avatar & Greeting */}
              <div className="space-y-2">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-extrabold text-3xl mx-auto shadow-xl shadow-[#00A76F]/25 ring-4 ring-white dark:ring-[#212B36]">
                  {pinModalStudent.first_name.charAt(0)}
                </div>
                <h3 className="text-xl font-extrabold text-[#1C252E] dark:text-white">
                  Hi {pinModalStudent.first_name}! 👦
                </h3>
                <p className="text-xs text-[#919EAB]">
                  Tap your 4-digit secret PIN to start video calling Mom & Dad
                </p>
              </div>

              {/* 4 Glowing PIN Indicator Dots */}
              <div className="flex items-center justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = enteredPin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-5 h-5 rounded-full transition-all duration-200 ${
                        pinSuccess
                          ? "bg-[#00A76F] scale-125 shadow-lg shadow-[#00A76F]/50 ring-4 ring-[#00A76F]/30"
                          : isFilled
                          ? "bg-[#00A76F] scale-110 shadow-md shadow-[#00A76F]/40"
                          : "bg-[#E5E8EB] dark:bg-[#2E3844]"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Error or Success Alert */}
              {pinError && (
                <p className="text-xs font-bold text-red-500 animate-in shake duration-200">
                  {pinError}
                </p>
              )}
              {pinSuccess && (
                <p className="text-xs font-bold text-[#00A76F] animate-in zoom-in-90 duration-200">
                  🎉 PIN Verified! Opening video room...
                </p>
              )}

              {/* Tactile Big Number Keypad (1-9, 0, Backspace) */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <motion.button
                    key={num}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handlePinDigit(String(num))}
                    className="h-14 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-[#EAFBF1] dark:hover:bg-[#00A76F]/20 text-[#1C252E] dark:text-white font-extrabold text-xl shadow-xs border border-[#E5E8EB] dark:border-[#2E3844] hover:border-[#00A76F]/50 transition-colors cursor-pointer flex items-center justify-center"
                  >
                    {num}
                  </motion.button>
                ))}

                {/* Clear */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => { setEnteredPin(""); setPinError(null); }}
                  className="h-14 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-slate-200 dark:hover:bg-slate-800 text-[#919EAB] font-bold text-xs shadow-xs border border-[#E5E8EB] dark:border-[#2E3844] transition-colors cursor-pointer flex items-center justify-center"
                >
                  Clear
                </motion.button>

                {/* Digit 0 */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handlePinDigit("0")}
                  className="h-14 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-[#EAFBF1] dark:hover:bg-[#00A76F]/20 text-[#1C252E] dark:text-white font-extrabold text-xl shadow-xs border border-[#E5E8EB] dark:border-[#2E3844] hover:border-[#00A76F]/50 transition-colors cursor-pointer flex items-center justify-center"
                >
                  0
                </motion.button>

                {/* Backspace */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handlePinBackspace}
                  className="h-14 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 font-bold text-sm shadow-xs border border-[#E5E8EB] dark:border-[#2E3844] transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Delete className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Helper / Warden Override Tip */}
              <div className="pt-2 border-t border-[#F1F3F5] dark:border-[#2E3844] text-[11px] text-[#919EAB] flex items-center justify-between">
                <span>Default PIN: <strong className="text-[#00A76F]">1234</strong></span>
                <span className="text-[10px]">Warden Help: <strong className="text-[#8E33FF]">9999</strong></span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
