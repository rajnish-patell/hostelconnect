"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Video, Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/constants/brand";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const supabase = createClient();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setSuccessMsg("Password reset link has been dispatched to your email address.");
    } catch (err) {
      setErrorMsg(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F8] dark:bg-[#141A21] p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Logo */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#00A76F] text-white shadow-lg shadow-[#00A76F]/25 group-hover:scale-105 transition-transform">
              <Video className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-2xl text-[#1C252E] dark:text-white tracking-tight">{BRAND.name}</span>
          </Link>
        </div>

        <Card className="rounded-3xl border-[#E5E8EB] dark:border-[#2E3844] bg-white dark:bg-[#212B36] shadow-xl p-2 sm:p-4">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-extrabold text-[#1C252E] dark:text-white">Reset Password</CardTitle>
            <CardDescription className="text-xs text-[#919EAB]">
              Enter your verified email to receive password recovery instructions
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMsg && (
              <div className="p-3.5 mb-4 text-xs bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-2xl font-semibold">
                {errorMsg}
              </div>
            )}

            {successMsg ? (
              <div className="p-4 bg-[#EAFBF1] dark:bg-[#00A76F]/10 border border-[#C8FACD] dark:border-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B] rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-[#00A76F]" /> Link Sent Successfully
                </div>
                <p>{successMsg}</p>
                <Link href="/login" className="inline-flex items-center gap-1 font-bold text-[#00A76F] hover:underline mt-2">
                  <ArrowLeft className="w-3.5 h-3.5" /> Return to Login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-[#1C252E] dark:text-white">Email Address</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#919EAB] absolute left-3.5 top-3.5" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="parent@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-11 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-bold bg-[#00A76F] hover:bg-[#007856] text-white shadow-lg shadow-[#00A76F]/25 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Send Reset Link"}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center border-t border-[#F1F3F5] dark:border-[#2E3844] pt-4 mt-2">
            <Link href="/login" className="text-xs text-[#637381] dark:text-[#919EAB] hover:text-[#00A76F] font-bold flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
