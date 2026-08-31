"use client";

import React, { useState, useEffect } from "react";
import {
  Building,
  Plus,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  MoreVertical,
  Clock,
  IndianRupee,
  Power,
  Edit2,
  Trash2,
  X,
  CreditCard,
  Users,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LoadingState from "@/components/common/LoadingState";

export default function SuperAdminHostelsPage() {
  const [hostels, setHostels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [callRate, setCallRate] = useState(2);
  const [callTimeMinutes, setCallTimeMinutes] = useState(15);
  const [unlimitedCalls, setUnlimitedCalls] = useState(false);
  const [schoolStatus, setSchoolStatus] = useState("ACTIVE");

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hostels");
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const json = await res.json();
        if (json.success) {
          setHostels(json.data || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostels();
  }, []);

  const toggleSchoolStatus = async (hostel) => {
    const nextStatus = hostel.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch("/api/hostels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: hostel.id,
          status: nextStatus,
        }),
      });

      // Update locally
      setHostels(hostels.map(h => h.id === hostel.id ? { ...h, status: nextStatus } : h));
      setSuccessMsg(`School "${hostel.name}" is now ${nextStatus === "ACTIVE" ? "ON (ACTIVE)" : "OFF (SUSPENDED)"}!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSchool = async (hostel) => {
    if (!window.confirm(`Are you sure you want to completely remove "${hostel.name}" from the platform?`)) return;

    try {
      const res = await fetch(`/api/hostels?id=${hostel.id}`, { method: "DELETE" });
      setHostels(hostels.filter(h => h.id !== hostel.id));
      setSuccessMsg(`Campus "${hostel.name}" removed successfully.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSchool = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingHostel) {
        const res = await fetch("/api/hostels", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingHostel.id,
            name,
            city,
            callRate,
            callTimeMinutes,
            unlimitedCalls,
            status: schoolStatus,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to update school");

        setSuccessMsg(`Settings updated for "${name}"!`);
      } else {
        const res = await fetch("/api/hostels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            code,
            city,
            adminEmail,
            adminPassword,
            callRate,
            callTimeMinutes,
            unlimitedCalls,
            status: schoolStatus,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to onboard school");

        setSuccessMsg(`New school "${name}" onboarded successfully! School Admin access granted to ${adminEmail || "Campus Admin"}.`);
      }

      setShowAddModal(false);
      resetForm();
      fetchHostels();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setCode("");
    setCity("");
    setAdminEmail("");
    setAdminPassword("");
    setCallRate(2);
    setCallTimeMinutes(15);
    setUnlimitedCalls(false);
    setSchoolStatus("ACTIVE");
    setEditingHostel(null);
  };

  const startEdit = (h) => {
    setEditingHostel(h);
    setName(h.name);
    setCode(h.code || "");
    setCity(h.metadata?.city || h.address?.city || "");
    setCallRate(h.metadata?.call_rate_per_minute || 2);
    setCallTimeMinutes(h.max_call_duration_minutes || 15);
    setUnlimitedCalls(Boolean(h.metadata?.unlimited_calls_enabled));
    setSchoolStatus(h.status);
    setShowAddModal(true);
  };

  const filtered = hostels.filter((h) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase().trim();
    const cleanTerm = term.replace(/[^a-z0-9]/g, "");

    const name = (h.name || "").toLowerCase();
    const code = (h.code || "").toLowerCase();
    const cleanCode = code.replace(/[^a-z0-9]/g, "");
    const city = (h.metadata?.city || h.address?.city || "").toLowerCase();
    const email = (h.email || h.metadata?.admin_email || "").toLowerCase();
    const status = (h.status || "").toLowerCase();

    return (
      name.includes(term) ||
      code.includes(term) ||
      (cleanTerm && cleanCode.includes(cleanTerm)) ||
      city.includes(term) ||
      email.includes(term) ||
      status.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* ─── Header & Add School CTA ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
            School & Campus Onboarding 🏫
          </h1>
          <p className="text-xs text-[#919EAB]">
            Super Admin Master Control: Onboard schools, School Admin account creation, School ON/OFF switch, and calling price governance.
          </p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-xs rounded-xl shadow-lg shadow-[#00A76F]/25 h-10 px-4 gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Onboard New School
        </Button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs flex items-center gap-3 font-semibold animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ─── Search Filter ─── */}
      <div className="flex items-center gap-3 p-3 bg-white dark:bg-[#212B36] rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xs">
        <Search className="w-4 h-4 text-[#919EAB] ml-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by school name, campus code, or location..."
          className="flex-1 bg-transparent text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none font-medium"
        />
      </div>

      {/* ─── Schools Table ─── */}
      {loading ? (
        <LoadingState message="Loading registered school campuses..." />
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#212B36] border border-[#E5E8EB] dark:border-[#2E3844]">
          <Building className="w-12 h-12 text-[#919EAB] mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#1C252E] dark:text-white">No schools onboarded yet</h3>
          <p className="text-xs text-[#919EAB] mt-1 max-w-sm mx-auto">
            Click &quot;Onboard New School&quot; above to grant school administration access to your first residential campus.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#F1F3F5] dark:border-[#2E3844] bg-[#F4F6F8]/60 dark:bg-[#1C252E]/60">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">School / Campus</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Code</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Call Rate</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">Duration Limit</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB]">School Status</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#919EAB] text-right">Master Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5] dark:divide-[#2E3844]">
                {filtered.map((h) => {
                  const rate = h.metadata?.call_rate_per_minute || 2;
                  const isUnlimited = h.metadata?.unlimited_calls_enabled;
                  const duration = h.max_call_duration_minutes || 15;

                  return (
                    <tr key={h.id} className="hover:bg-[#F4F6F8]/50 dark:hover:bg-[#2E3844]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#00A76F]/10 text-[#00A76F] flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {h.name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#1C252E] dark:text-white">{h.name}</p>
                            <p className="text-xs text-[#919EAB]">
                              {h.metadata?.city || h.address?.city || "Active Campus"} • Admin: {h.metadata?.admin_email || "Managed"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-[#637381] dark:text-[#919EAB]">{h.code}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#00A76F] bg-[#EAFBF1] dark:bg-[#00A76F]/20 px-2.5 py-1 rounded-lg">
                          <IndianRupee className="w-3 h-3" /> {rate}/min
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isUnlimited ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8E33FF] bg-[#8E33FF]/10 px-2 py-0.5 rounded-md">
                            Unlimited Calls
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
                          onClick={() => toggleSchoolStatus(h)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                            h.status === "ACTIVE"
                              ? "bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B]"
                              : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {h.status === "ACTIVE" ? "SCHOOL ON" : "SCHOOL OFF"}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(h)}
                            className="text-xs font-bold rounded-lg h-8 gap-1 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSchool(h)}
                            className="text-xs font-bold rounded-lg h-8 gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ─── Onboard / Edit School Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#1C252E]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#F1F3F5] dark:border-[#2E3844]">
              <div>
                <h3 className="text-lg font-bold text-[#1C252E] dark:text-white">
                  {editingHostel ? "Edit School & Pricing Settings" : "Onboard New School Campus"}
                </h3>
                <p className="text-xs text-[#919EAB]">Set campus details, grant School Admin access, and configure calling rates</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="p-2 rounded-xl text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSchool} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C252E] dark:text-white">School / Campus Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Doon International Residential School"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C252E] dark:text-white">Campus Code *</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingHostel)}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. DIRS-01"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium uppercase font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#1C252E] dark:text-white">City / Location *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Dehradun"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                  />
                </div>
              </div>

              {/* School Admin Account Credentials (Only on new onboarding) */}
              {!editingHostel && (
                <div className="p-4 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C252E] dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-[#00A76F]" />
                    <span>Grant School Admin Access</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#1C252E] dark:text-white">Admin Email *</label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="admin@doonschool.edu"
                        className="w-full h-10 px-3 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] text-xs text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-[#1C252E] dark:text-white">Initial Password *</label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-10 px-3 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] text-xs text-[#1C252E] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing & Call Duration Settings */}
              <div className="p-4 rounded-2xl bg-[#F4F6F8] dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#1C252E] dark:text-white">Video Call Charges (₹/Min)</p>
                    <p className="text-[11px] text-[#919EAB]">Set per-minute calling rate</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[2, 3, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCallRate(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                          callRate === r
                            ? "bg-[#00A76F] text-white shadow-xs"
                            : "bg-white dark:bg-[#212B36] text-[#637381] border border-[#E5E8EB] dark:border-[#2E3844]"
                        }`}
                      >
                        ₹{r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E8EB] dark:border-[#2E3844]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-[#1C252E] dark:text-white">Call Duration Limit</p>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#8E33FF]">
                      <input
                        type="checkbox"
                        checked={unlimitedCalls}
                        onChange={(e) => setUnlimitedCalls(e.target.checked)}
                        className="rounded text-[#8E33FF] focus:ring-[#8E33FF]"
                      />
                      <span>Unlimited Calling</span>
                    </label>
                  </div>

                  {!unlimitedCalls && (
                    <div className="grid grid-cols-4 gap-2">
                      {[5, 10, 15, 20].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setCallTimeMinutes(mins)}
                          className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            callTimeMinutes === mins
                              ? "bg-[#00A76F] text-white shadow-xs"
                              : "bg-white dark:bg-[#212B36] text-[#637381] border border-[#E5E8EB] dark:border-[#2E3844]"
                          }`}
                        >
                          {mins} Mins
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1C252E] border border-[#E5E8EB] dark:border-[#2E3844]">
                <span className="text-xs font-bold text-[#1C252E] dark:text-white">School Operational Status</span>
                <button
                  type="button"
                  onClick={() => setSchoolStatus(schoolStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer ${
                    schoolStatus === "ACTIVE"
                      ? "bg-[#EAFBF1] text-[#007856]"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {schoolStatus === "ACTIVE" ? "ON (ACTIVE)" : "OFF (INACTIVE)"}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="rounded-xl font-bold text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#00A76F] hover:bg-[#007856] text-white rounded-xl font-bold text-xs shadow-lg shadow-[#00A76F]/25"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingHostel ? (
                    "Save Changes"
                  ) : (
                    "Onboard School & Grant Access"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
