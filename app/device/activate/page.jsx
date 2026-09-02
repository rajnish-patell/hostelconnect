"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Tablet,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function DeviceActivationPage() {
  const router = useRouter();
  const [activationCode, setActivationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showCode, setShowCode] = useState(false);

  // Check if device is already activated
  useEffect(() => {
    const storedToken = localStorage.getItem("hc_device_session_token");
    if (storedToken) {
      // Device already activated, redirect to kiosk
      router.push("/device");
    }
  }, [router]);

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const code = activationCode.trim().toUpperCase();

      if (!code) {
        throw new Error("Please enter an activation code.");
      }

      if (code.length < 6 || code.length > 12) {
        throw new Error("Activation code must be 6-12 characters.");
      }

      // Call activation endpoint
      const res = await fetch("/api/devices/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      let json = null;
      if (res.headers.get("content-type")?.includes("application/json")) {
        json = await res.json();
      }

      if (!res.ok || !json?.success) {
        throw new Error(
          json?.error?.message || "Activation failed. Please check the code and try again."
        );
      }

      // ─── SECURITY: Store device session token ───
      if (!json.data?.sessionToken) {
        throw new Error("No session token received from server.");
      }

      localStorage.setItem("hc_device_session_token", json.data.sessionToken);

      setSuccessMsg(
        `Device "${json.data.device?.name || "Kiosk"}" activated successfully! Launching...`
      );

      setTimeout(() => {
        router.push("/device");
        router.refresh();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || "Activation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] dark:bg-[#141A21] p-4">
      <div className="w-full max-w-lg mx-auto py-8 px-4">
        {/* Top Back Link & Theme Toggle */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#637381] hover:text-[#00A76F] font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
          </Link>
          <ThemeToggle />
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00A76F] text-white shadow-lg shadow-[#00A76F]/25">
            <Tablet className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
            Device Activation
          </h1>
          <p className="text-xs text-[#919EAB]">
            Campus Calling Kiosk Setup
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xl p-6 sm:p-8 space-y-6">
          {/* Info Pill */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-700 dark:text-blue-400">
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Enter the 6-12 character activation code provided by your school administrator to activate this kiosk.
            </span>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C252E] dark:text-white flex items-center gap-1">
                Activation Code <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
                <input
                  type={showCode ? "text" : "password"}
                  required
                  value={activationCode}
                  onChange={(e) => {
                    // Allow only alphanumeric characters
                    const value = e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                    setActivationCode(value.slice(0, 12));
                  }}
                  placeholder="e.g., ABC123XYZ"
                  maxLength={12}
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-mono font-medium text-center tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3.5 top-3.5 text-[#919EAB] hover:text-[#1C252E] focus:outline-none cursor-pointer"
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[#919EAB] mt-1.5">
                {activationCode.length}/12 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || activationCode.length < 6}
              className="w-full h-12 bg-[#00A76F] hover:bg-[#007856] disabled:bg-[#919EAB] text-white font-bold rounded-2xl shadow-lg shadow-[#00A76F]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Tablet className="w-5 h-5" /> Activate Kiosk
                </>
              )}
            </button>
          </form>

          {/* Footer Help */}
          <div className="pt-4 border-t border-[#E5E8EB] dark:border-[#2E3844] text-center">
            <p className="text-xs text-[#919EAB]">
              Don&apos;t have an activation code?{" "}
              <a
                href="/contact"
                className="text-[#00A76F] hover:underline font-bold"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
