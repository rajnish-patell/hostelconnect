"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Video, Lock, Mail, User, Phone, ArrowLeft, Loader2, CheckCircle2, AlertCircle, LogIn, UserPlus, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState("PARENT");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const supabase = createClient();

  const handleGoogleSignup = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/callback?role=PARENT`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        if (error.message?.includes("provider is not enabled") || error.code === "validation_failed") {
          throw new Error("Google Sign-Up is not enabled yet in your Supabase project. Please enable Google in Supabase Dashboard -> Authentication -> Providers.");
        }
        throw error;
      }
    } catch (err) {
      setErrorMsg(err.message || "Google sign-up failed. Please enable Google in Supabase Authentication -> Providers.");
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/callback`,
        },
      });

      if (error) throw error;

      if (data.session) {
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName,
            phone: phone,
            role: role,
            is_active: true,
          });

          const nameParts = fullName.split(" ");
          await supabase.from("parents").upsert({
            user_id: data.user.id,
            first_name: nameParts[0] || fullName,
            last_name: nameParts.slice(1).join(" ") || null,
            email: email.trim(),
            phone: phone || null,
            is_active: true,
          });
        } catch {}

        if (role === "SUPER_ADMIN") router.push("/super-admin");
        else if (role === "HOSTEL_ADMIN") router.push("/admin");
        else router.push("/parent");
        router.refresh();
      } else {
        setSuccessMsg("Account created successfully! You can now log in.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to create account.");
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
            <Video className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1C252E] dark:text-white">
            HostelConnect
          </h1>
          <p className="text-xs text-[#919EAB]">
            Create your verified parent account to start safe video calling
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#212B36] rounded-3xl border border-[#E5E8EB] dark:border-[#2E3844] shadow-xl p-6 sm:p-8 space-y-6">
          <div className="flex p-1 bg-[#F4F6F8] dark:bg-[#1C252E] rounded-2xl">
            <Link
              href="/login"
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[#637381] hover:text-[#1C252E] flex items-center justify-center gap-1.5 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign In
            </Link>
            <button
              type="button"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-[#212B36] text-[#00A76F] shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" /> Parent Sign Up
            </button>
          </div>

          {/* 1-Click Google Sign Up Button */}
          <div>
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full h-12 rounded-2xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] hover:bg-[#F4F6F8] dark:hover:bg-[#2A3542] text-sm font-bold text-[#1C252E] dark:text-white flex items-center justify-center gap-3 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              {/* Google SVG Icon */}
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
              <span>Sign Up with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-[#E5E8EB] dark:border-[#2E3844] w-full" />
            <span className="bg-white dark:bg-[#212B36] px-3 text-xs text-[#919EAB] font-semibold uppercase tracking-wider absolute">
              or with email
            </span>
          </div>

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

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C252E] dark:text-white flex items-center gap-1">
                Parent Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C252E] dark:text-white flex items-center gap-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@gmail.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C252E] dark:text-white flex items-center gap-1">
                Registered Mobile Number (For Auto-Connect)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 8349655888"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1C252E] dark:text-white flex items-center gap-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#1C252E] text-sm text-[#1C252E] dark:text-white placeholder:text-[#919EAB] focus:outline-none focus:ring-2 focus:ring-[#00A76F]/20 focus:border-[#00A76F] font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#00A76F] hover:bg-[#007856] text-white font-bold rounded-2xl shadow-lg shadow-[#00A76F]/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Create Parent Account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
