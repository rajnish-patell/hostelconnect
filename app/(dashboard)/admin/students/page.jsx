"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  Shield,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
  Link as LinkIcon,
  Power,
  Clock,
  CreditCard,
  IndianRupee,
  Sparkles,
  PhoneCall,
  Lock,
  Eye,
  Key,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/common/LoadingState";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Add student modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [classGrade, setClassGrade] = useState("");
  const [section, setSection] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentPassword, setParentPassword] = useState("Parent@1234");
  const [relationship, setRelationship] = useState("FATHER");
  const [kioskPin, setKioskPin] = useState("1234");
  const [callDuration, setCallDuration] = useState(15);
  const [unlimitedCall, setUnlimitedCall] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // School Recharge Modal
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [selectedStudentForRecharge, setSelectedStudentForRecharge] = useState(null);
  const [rechargeAmount, setRechargeAmount] = useState(100);

  // View Parent Details Modal
  const [viewParentModal, setViewParentModal] = useState(null);
  const [copiedText, setCopiedText] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const json = await res.json();
        if (json.success) {
          setStudents(json.data || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const toggleStudentStatus = async (student) => {
    try {
      const nextActive = !student.is_active;
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          isActive: nextActive,
        }),
      });

      // Update locally
      setStudents(students.map(s => s.id === student.id ? { ...s, is_active: nextActive } : s));
      setSuccessMsg(`Student ${student.first_name} calling access is now ${nextActive ? "ENABLED (ON)" : "DISABLED (OFF)"}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const hostelId = students[0]?.hostel_id || null;

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostelId,
          firstName,
          lastName,
          admissionNumber,
          classGrade,
          section,
          parentMobile,
          parentName,
          parentPassword,
          relationship,
          kioskPin: kioskPin || "1234",
          maxCallDurationMinutes: callDuration,
          unlimitedCalls: unlimitedCall,
        }),
      });

      let json = null;
      if (res.headers.get("content-type")?.includes("application/json")) {
        json = await res.json();
      }
      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || "Failed to add student");
      }

      setSuccessMsg(`Student ${firstName} (ID: ${admissionNumber}) created & Parent login generated (Phone: ${parentMobile} | Password: ${parentPassword})!`);
      setShowAddModal(false);
      setFirstName("");
      setLastName("");
      setAdmissionNumber("");
      setClassGrade("");
      setSection("");
      setParentMobile("");
      setParentName("");
      setParentPassword("Parent@1234");
      fetchStudents();
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSchoolRecharge = async (e) => {
    e.preventDefault();
    if (!selectedStudentForRecharge) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "school_recharge",
          studentId: selectedStudentForRecharge.id,
          amountRupees: rechargeAmount,
        }),
      });

      // Update locally
      setStudents(students.map(s => {
        if (s.id === selectedStudentForRecharge.id) {
          const currentPaise = s.metadata?.balance_paise || s.balance_paise || 5000;
          const newPaise = currentPaise + (rechargeAmount * 100);
          return {
            ...s,
            metadata: { ...s.metadata, balance_paise: newPaise },
            balance_paise: newPaise,
          };
        }
        return s;
      }));

      setSuccessMsg(`₹${rechargeAmount} successfully credited to ${selectedStudentForRecharge.first_name}'s calling wallet!`);
      setShowRechargeModal(false);
      setSelectedStudentForRecharge(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message || "Failed to process recharge");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;

    const term = search.toLowerCase().trim();
    const cleanTerm = term.replace(/[^a-z0-9]/g, "");

    const fullName = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
    const adm = (s.admission_number || "").toLowerCase();
    const cleanAdm = adm.replace(/[^a-z0-9]/g, "");
    const grade = (s.class_grade || "").toLowerCase();
    const section = (s.section || "").toLowerCase();

    // Check all guardians
    const matchesGuardian = s.guardians?.some((g) => {
      const p = g.parent;
      if (!p) return false;
      const pName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      const pPhone = (p.phone || "").replace(/\D/g, "");
      const pEmail = (p.email || "").toLowerCase();
      const rel = (g.relationship || "").toLowerCase();

      return (
        pName.includes(term) ||
        pPhone.includes(cleanTerm) ||
        pEmail.includes(term) ||
        rel.includes(term)
      );
    });

    return (
      fullName.includes(term) ||
      adm.includes(term) ||
      (cleanTerm && cleanAdm.includes(cleanTerm)) ||
      grade.includes(term) ||
      section.includes(term) ||
      Boolean(matchesGuardian)
    );
  });

  return (
    <div className="space-y-6">
      {/* ─── Header & Add Student CTA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
            Student & Parent Roster 👨‍🎓
          </h1>
          <p className="text-xs text-[#919EAB]">
            School Admin Student Management: Student ID, Parent login credentials, Student ON/OFF switch, and Wallet Recharges.
          </p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#00A76F]/25 h-10 px-4 gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Student & Parent
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-3 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-xs flex items-center gap-3 font-semibold">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── Search Bar ─── */}
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#212B36] rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs">
        <Search className="w-4 h-4 text-[#919EAB] ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by student name, Student ID, or parent mobile number..."
          className="flex-1 bg-transparent text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none font-medium"
        />
      </div>

      {/* ─── Students Table ─── */}
      {loading ? (
        <LoadingState message="Loading students & parent directory..." />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844]">
          <Users className="w-12 h-12 text-[#919EAB] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#1C252E] dark:text-white">No students enrolled yet</h3>
          <p className="text-xs text-[#919EAB] mt-1 max-w-sm mx-auto">
            Click &quot;Add Student & Parent&quot; above to register your first resident student and generate the parent login.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#2E3844] bg-[#F4F6F8]/60 dark:bg-[#1C252E]/60">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Student</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Student ID</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Linked Parent / Guardian</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Calling Wallet</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Call Limit</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Calling Access</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {filtered.map((s) => {
                  const balancePaise = s.metadata?.balance_paise || s.balance_paise || 5000;
                  const balanceRupees = (balancePaise / 100).toFixed(0);
                  const isUnlimited = s.metadata?.unlimited_calls || s.unlimited_calls;
                  const duration = s.metadata?.max_call_duration_minutes || s.max_call_duration_minutes || 15;
                  const primaryGuardian = s.guardians?.[0];
                  const parent = primaryGuardian?.parent;

                  return (
                    <tr key={s.id} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {s.first_name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1C252E] dark:text-white">
                              {s.first_name} {s.last_name || ""}
                            </p>
                            <p className="text-[11px] text-[#919EAB]">
                              {s.class_grade ? `${s.class_grade} • Sec ${s.section || "A"}` : "General Resident"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-xs text-[#00A76F]">
                        {s.admission_number || "—"}
                      </td>
                      <td className="px-6 py-4">
                        {parent ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[#1C252E] dark:text-white">
                                {parent.first_name} {parent.last_name || ""}
                              </span>
                              <span className="text-[10px] font-bold text-[#00A76F] bg-[#EAFBF1] dark:bg-[#00A76F]/20 px-1.5 py-0.2 rounded">
                                {primaryGuardian.relationship || "GUARDIAN"}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-[#637381] dark:text-[#919EAB] flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#00A76F]" /> {parent.phone || "—"}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-[#919EAB] italic">No parent linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#00A76F] bg-[#EAFBF1] dark:bg-[#00A76F]/20 px-2.5 py-1 rounded-lg">
                          <IndianRupee className="w-3 h-3" /> ₹{balanceRupees}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isUnlimited ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8E33FF] bg-[#8E33FF]/10 px-2 py-0.5 rounded-md">
                            Unlimited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#1C252E] dark:text-white">
                            <Clock className="w-3.5 h-3.5 text-[#919EAB]" /> {duration} Mins
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(s)}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            s.is_active
                              ? "bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B]"
                              : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {s.is_active ? "STUDENT ON" : "STUDENT OFF"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setSelectedStudentForRecharge(s); setShowRechargeModal(true); }}
                            className="text-xs font-bold rounded-lg h-8 gap-1 text-[#00A76F] border-[#00A76F]/30 hover:bg-[#00A76F]/10 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Recharge
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewParentModal(s)}
                            className="text-xs font-bold rounded-lg h-8 gap-1 cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" /> Parent Info
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Add Student & Parent Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#1C252E]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F5] dark:border-[#2E3844]">
              <div>
                <h3 className="text-lg font-bold text-[#1C252E] dark:text-white">Add Student & Generate Parent Login</h3>
                <p className="text-xs text-[#919EAB]">Creates student profile and parent access credentials automatically</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-xl text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C252E] dark:text-white">Student First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Aarav"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C252E] dark:text-white">Student Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Patel"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1.5">
                  <label className="text-xs font-bold text-[#1C252E] dark:text-white">Student ID *</label>
                  <input
                    type="text"
                    required
                    value={admissionNumber}
                    onChange={(e) => setAdmissionNumber(e.target.value)}
                    placeholder="STU-1004"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C252E] dark:text-white">Class</label>
                  <input
                    type="text"
                    value={classGrade}
                    onChange={(e) => setClassGrade(e.target.value)}
                    placeholder="Class 6"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C252E] dark:text-white">Section</label>
                  <input
                    type="text"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    placeholder="A"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                  />
                </div>
              </div>

              {/* Automatic Parent Connection & Password Box */}
              <div className="p-4 rounded-2xl bg-[#EAFBF1] dark:bg-[#00A76F]/10 border border-[#C8FACD] dark:border-[#00A76F]/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#007856] dark:text-[#5BE49B]">
                    <Sparkles className="w-4 h-4" />
                    <span>Parent / Guardian Login Credentials</span>
                  </div>
                  <span className="text-[10px] font-bold bg-[#00A76F] text-white px-2 py-0.5 rounded-full">
                    Auto-Linked
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#1C252E] dark:text-white">Parent Full Name *</label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full h-10 px-3 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-xs text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#1C252E] dark:text-white">Relationship</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-xs text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F]"
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="GUARDIAN">Guardian</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#1C252E] dark:text-white">Parent Mobile Number *</label>
                    <input
                      type="tel"
                      required
                      value={parentMobile}
                      onChange={(e) => setParentMobile(e.target.value)}
                      placeholder="8349655888"
                      className="w-full h-10 px-3 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-xs text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-[#1C252E] dark:text-white">Parent Login Password *</label>
                    <input
                      type="text"
                      required
                      value={parentPassword}
                      onChange={(e) => setParentPassword(e.target.value)}
                      placeholder="Parent@1234"
                      className="w-full h-10 px-3 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-xs text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#C8FACD] dark:border-[#00A76F]/20 space-y-1">
                  <label className="text-[11px] font-bold text-[#1C252E] dark:text-white flex items-center justify-between">
                    <span>Student Kiosk 4-Digit Calling PIN 🔐 *</span>
                    <span className="text-[10px] text-[#007856] dark:text-[#5BE49B] font-semibold">Child Safety Auth</span>
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    value={kioskPin}
                    onChange={(e) => setKioskPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="1234"
                    className="w-full h-10 px-3 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#00A76F] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-mono font-extrabold tracking-widest"
                  />
                  <p className="text-[10px] text-[#919EAB]">Simple 4-digit PIN the student will tap on the tablet screen to start a call (e.g. 1234).</p>
                </div>
              </div>

              {/* Call Time Config */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844]">
                <div>
                  <p className="text-xs font-bold text-[#1C252E] dark:text-white">Call Duration Limit</p>
                  <p className="text-[11px] text-[#919EAB]">Configured timer for student</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 20].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => { setCallDuration(d); setUnlimitedCall(false); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                        callDuration === d && !unlimitedCall
                          ? "bg-[#00A76F] text-white shadow-xs"
                          : "bg-white dark:bg-[#212B36] text-[#637381] border border-[#E5E8EB] dark:border-[#2E3844]"
                      }`}
                    >
                      {d}m
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setUnlimitedCall(!unlimitedCall)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      unlimitedCall
                        ? "bg-[#8E33FF] text-white shadow-xs"
                        : "bg-white dark:bg-[#212B36] text-[#637381] border border-[#E5E8EB] dark:border-[#2E3844]"
                    }`}
                  >
                    ∞
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#00A76F] hover:bg-[#007856] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#00A76F]/25"
                >
                  {submitting ? "Creating..." : "Add Student & Generate Login"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── View Parent Details Modal ─── */}
      {viewParentModal && (
        <div className="fixed inset-0 z-50 bg-[#1C252E]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F5] dark:border-[#2E3844]">
              <div>
                <h3 className="text-lg font-bold text-[#1C252E] dark:text-white">Parent / Guardian Access</h3>
                <p className="text-xs text-[#919EAB]">Linked with {viewParentModal.first_name} (ID: {viewParentModal.admission_number})</p>
              </div>
              <button
                type="button"
                onClick={() => setViewParentModal(null)}
                className="p-2 rounded-xl text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const primaryGuardian = viewParentModal.guardians?.[0];
              const p = primaryGuardian?.parent;

              if (!p) {
                return (
                  <div className="text-center py-6 text-xs text-[#919EAB]">
                    No parent linked to this student yet.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] space-y-3">
                    <div>
                      <span className="text-[11px] text-[#919EAB] block">Parent Name</span>
                      <span className="text-sm font-bold text-[#1C252E] dark:text-white">
                        {p.first_name} {p.last_name || ""} ({primaryGuardian.relationship || "Guardian"})
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#919EAB] block">Registered Mobile / Login ID</span>
                      <span className="text-sm font-mono font-bold text-[#00A76F]">
                        {p.phone || "Not recorded"}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#919EAB] block">Default Login Password</span>
                      <span className="text-sm font-mono font-bold text-[#1C252E] dark:text-white">
                        {p.metadata?.initial_password || "Parent@1234"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-[#E5E8EB] dark:border-[#2E3844]">
                      <span className="text-[11px] text-[#007856] dark:text-[#5BE49B] font-bold block">
                        Student Kiosk 4-Digit Calling PIN 🔐
                      </span>
                      <span className="text-sm font-mono font-extrabold text-[#00A76F] tracking-widest">
                        {viewParentModal.metadata?.kiosk_pin || "1234"}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => copyToClipboard(
                      `Hostel Video Call Login:\nURL: http://localhost:3000/login\nRole: Parent\nMobile: ${p.phone}\nPassword: ${p.metadata?.initial_password || "Parent@1234"}\nStudent Kiosk PIN: ${viewParentModal.metadata?.kiosk_pin || "1234"}`
                    )}
                    className="w-full bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-xs rounded-xl h-11 gap-2 cursor-pointer"
                  >
                    <Copy className="w-4 h-4" /> {copiedText ? "Credentials Copied!" : "Copy Parent & Student Credentials"}
                  </Button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─── School Recharge Modal ─── */}
      {showRechargeModal && selectedStudentForRecharge && (
        <div className="fixed inset-0 z-50 bg-[#1C252E]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F5] dark:border-[#2E3844]">
              <div>
                <h3 className="text-lg font-bold text-[#1C252E] dark:text-white">School Recharge 💳</h3>
                <p className="text-xs text-[#919EAB]">Collect cash/payment and credit student wallet</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRechargeModal(false)}
                className="p-2 rounded-xl text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] space-y-2">
              <p className="text-xs text-[#919EAB]">Student Account</p>
              <p className="text-base font-bold text-[#1C252E] dark:text-white">
                {selectedStudentForRecharge.first_name} {selectedStudentForRecharge.last_name || ""}
              </p>
              <p className="text-xs font-mono text-[#00A76F]">ID: {selectedStudentForRecharge.admission_number}</p>
            </div>

            <form onSubmit={handleSchoolRecharge} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#1C252E] dark:text-white">Recharge Amount (₹)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-2.5 rounded-xl text-xs font-extrabold cursor-pointer transition-all ${
                        rechargeAmount === amt
                          ? "bg-[#00A76F] text-white shadow-xs"
                          : "bg-white dark:bg-[#1C252E] text-[#637381] border border-[#E5E8EB] dark:border-[#2E3844]"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRechargeModal(false)}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#00A76F] hover:bg-[#007856] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#00A76F]/25"
                >
                  {submitting ? "Processing..." : `Credit ₹${rechargeAmount} to Student`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
