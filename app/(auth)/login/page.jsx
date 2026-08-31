"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Video,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Phone,
  Shield,
  GraduationCap,
  Users,
  Building,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/common/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  // Mode: "signin" | "signup"
  const [activeMode, setActiveMode] = useState("signin");

  // Roles: "superadmin" | "school" | "student" | "parent"
  const [activeRole, setActiveRole] = useState("superadmin");

  const [identifier, setIdentifier] = useState(""); // Email, Phone, or Student ID
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const supabase = createClient();

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIdentifier("");
    setPassword("");
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });
      if (error) {
        if (error.message?.includes("provider is not enabled") || error.code === "validation_failed") {
          throw new Error("Google Sign-In is not enabled yet in your Supabase project. Please enable Google in Supabase Dashboard -> Authentication -> Providers.");
        }
        throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || "Google sign-in failed. Please enable Google in Supabase Authentication -> Providers.");
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanIdentifier = identifier.trim();

      // ─── Case 1: Student Login via Student ID ───
      if (activeRole === "student") {
        if (!cleanIdentifier) {
          throw new Error("Please enter your Student ID (Admission Number).");
        }

        // Store active student session in localStorage
        localStorage.setItem("hc_active_student_id", cleanIdentifier);
        setSuccessMsg(`Welcome, Student (${cleanIdentifier})! Launching calling terminal...`);
        setTimeout(() => {
          router.push("/device");
          router.refresh();
        }, 600);
        return;
      }

      // ─── Case 2: Parent / Staff / Admin Login ───
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanIdentifier, password }),
      });

      let serverJson = null;
      if (res.headers.get("content-type")?.includes("application/json")) {
        serverJson = await res.json();
      }

      if (!res.ok || !serverJson?.success) {
        throw new Error(serverJson?.error?.message || "Invalid mobile number, email, or password.");
      }

      const userRole = serverJson.role;

      // Also set client-side session if session data returned or attempt client sign in
      if (serverJson.session) {
        try {
          await supabase.auth.setSession({
            access_token: serverJson.session.access_token,
            refresh_token: serverJson.session.refresh_token,
          });
        } catch {}
      } else {
        try {
          await supabase.auth.signInWithPassword({
            email: serverJson.user?.email || cleanIdentifier,
            password: password,
          });
        } catch {}
      }

      // Role guard validation
      if (activeRole === "superadmin" && userRole !== "SUPER_ADMIN") {
        await supabase.auth.signOut();
        throw new Error("Access Denied: You cannot sign in as Super Admin with this account.");
      }
      if (activeRole === "school" && userRole !== "HOSTEL_ADMIN" && userRole !== "SUPER_ADMIN") {
        await supabase.auth.signOut();
        throw new Error("Access Denied: This account is not a School Administrator.");
      }

      setSuccessMsg("Signed in successfully!");

      setTimeout(() => {
        if (redirectTo && redirectTo !== "/" && !redirectTo.includes("/login")) {
          router.push(redirectTo);
        } else if (userRole === "SUPER_ADMIN") {
          router.push("/super-admin");
        } else if (userRole === "HOSTEL_ADMIN") {
          router.push("/admin");
        } else if (userRole === "WARDEN" || userRole === "STAFF") {
          router.push("/staff");
        } else {
          router.push("/parent");
        }
        router.refresh();
      }, 400);
    } catch (err) {
      setErrorMsg(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const getIdentifierLabel = () => {
    switch (activeRole) {
      case "superadmin":
        return "Super Admin Email";
      case "school":
        return "School / Campus Admin Email";
      case "student":
        return "Student ID / Admission Number";
      case "parent":
        return "Parent Registered Mobile / Email";
      default:
        return "Email Address";
    }
  };

  const getIdentifierPlaceholder = () => {
    switch (activeRole) {
      case "superadmin":
        return "superadmin@domain.com";
      case "school":
        return "admin@school.edu";
      case "student":
        return "e.g. STU-1001";
      case "parent":
        return "9876543210 or parent@gmail.com";
      default:
        return "user@domain.com";
    }
  };

  const getRoleIcon = () => {
    switch (activeRole) {
      case "superadmin":
        return <Shield className="w-4 h-4 text-[#00A76F]" />;
      case "school":
        return <Building className="w-4 h-4 text-indigo-500" />;
      case "student":
        return <GraduationCap className="w-4 h-4 text-amber-500" />;
      case "parent":
        return <Users className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
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
          <Video className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
          HostelConnect
        </h1>
        <p className="text-xs text-[#919EAB]">
          Child-Safe Video Calling & Hostel Management Portal
        </p>
      </div>

      {/* Card Container */}
      <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xl p-6 sm:p-8 space-y-6">
        {/* Sign In / Sign Up Top Switcher */}
        <div className="flex p-1 bg-[#F4F6F8] dark:bg-[#1C252E] rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveMode("signin")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeMode === "signin"
                ? "bg-white dark:bg-[#212B36] text-[#00A76F] shadow-xs"
                : "text-[#637381] hover:text-[#1C252E]"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Sign In
          </button>
          <Link
            href="/signup"
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#637381] hover:text-[#1C252E] flex items-center justify-center gap-1.5 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5" /> Parent Sign Up
          </Link>
        </div>

        {/* 4 Role Tabs */}
        <div className="grid grid-cols-4 p-1 bg-[#F4F6F8] dark:bg-[#1C252E] rounded-2xl gap-1">
          {[
            { key: "superadmin", label: "Super Admin" },
            { key: "school", label: "School" },
            { key: "student", label: "Student" },
            { key: "parent", label: "Parent" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleRoleChange(tab.key)}
              className={`py-2 rounded-xl text-xs font-bold transition-all truncate px-1 cursor-pointer ${
                activeRole === tab.key
                  ? "bg-white dark:bg-[#212B36] text-[#00A76F] shadow-xs"
                  : "text-[#637381] hover:text-[#1C252E] dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Role Helper Info Pill */}
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EAFBF1] dark:bg-[#00A76F]/10 border border-[#C8FACD] dark:border-[#00A76F]/20 text-xs font-medium text-[#007856] dark:text-[#5BE49B]">
          {getRoleIcon()}
          <span>
            {activeRole === "superadmin" && "Super Admin Platform Governance & Pricing Command"}
            {activeRole === "school" && "School Management, Students Roster & Recharge Control"}
            {activeRole === "student" && "Instant Student Kiosk Video Calling (Enter Student ID)"}
            {activeRole === "parent" && "Parent Video Receiver & Student Wallet Recharge"}
          </span>
        </div>

        {/* Google 1-Click Login (Exclusively For Parents) */}
        {activeRole === "parent" && (
          <div>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] hover:bg-[#F4F6F8] dark:hover:bg-[#2A3542] text-sm font-bold text-[#1C252E] dark:text-white flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.29 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.97 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.29 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Sign In with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#E5E8EB] dark:border-[#2E3844] w-full" />
              <span className="bg-white dark:bg-[#212B36] px-3 text-xs text-[#919EAB] font-semibold uppercase tracking-wider absolute">
                or sign in with password
              </span>
            </div>
          </div>
        )}

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
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#1C252E] dark:text-white flex items-center gap-1">
              {getIdentifierLabel()} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              {activeRole === "student" ? (
                <GraduationCap className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
              ) : activeRole === "parent" ? (
                <Phone className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
              ) : (
                <Mail className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
              )}
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={getIdentifierPlaceholder()}
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
              />
            </div>
          </div>

          {activeRole !== "student" && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C252E] dark:text-white flex items-center gap-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-[#919EAB] hover:text-[#1C252E] focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {activeRole !== "student" && (
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-[#00A76F] hover:underline font-bold"
              >
                Forgot Password?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#00A76F] hover:bg-[#007856] text-white font-bold rounded-2xl shadow-lg shadow-[#00A76F]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : activeRole === "student" ? (
              "Open Calling Kiosk"
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] dark:bg-[#141A21] p-4">
      <Suspense fallback={<div className="p-8 text-center text-[#919EAB]">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
