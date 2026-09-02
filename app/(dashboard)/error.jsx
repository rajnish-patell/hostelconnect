"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function ErrorBoundary({ error, reset }) {
  const [retrying, setRetrying] = useState(false);

  // Never intercept internal Next.js redirects
  if (
    error?.message === "NEXT_REDIRECT" ||
    error?.digest?.includes("NEXT_REDIRECT") ||
    error?.message?.includes("NEXT_REDIRECT")
  ) {
    throw error;
  }

  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]:", error);
  }, [error]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const supabase = createClient();
      await supabase.auth.refreshSession();
    } catch (_) {
      // Ignore
    } finally {
      if (typeof window !== "undefined") {
        window.location.reload();
      } else {
        reset();
      }
    }
  };

  const isAuthError =
    error?.status === 401 ||
    error?.message?.toLowerCase().includes("unauthor") ||
    error?.message?.toLowerCase().includes("session") ||
    error?.message?.toLowerCase().includes("token");

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-500">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-[#1C252E] dark:text-white mb-2">
        {isAuthError ? "Session Expired or Disconnected" : "Dashboard Temporary Glitch"}
      </h2>
      <p className="text-xs text-[#919EAB] max-w-md mb-6 leading-relaxed">
        {isAuthError
          ? "Your active session may have timed out or your device was disconnected. Click Reload Dashboard to restore your session or sign in again."
          : (error?.message || "A temporary connection glitch occurred while loading this dashboard view.")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={handleRetry}
          disabled={retrying}
          className="bg-[#00A76F] hover:bg-[#007856] text-white rounded-xl font-bold text-xs h-11 px-5 gap-2 shadow-md shadow-[#00A76F]/20 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
          <span>{retrying ? "Refreshing..." : "Reload Dashboard"}</span>
        </Button>
        <Link href="/login">
          <Button
            variant="outline"
            className="rounded-xl font-bold text-xs h-11 px-5 gap-2 border-[#E5E8EB] dark:border-[#2E3844] cursor-pointer"
          >
            <LogIn className="w-4 h-4" /> Go to Login
          </Button>
        </Link>
      </div>
    </div>
  );
}
