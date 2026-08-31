"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }) {
  // Never intercept internal Next.js redirects
  if (
    error?.message === "NEXT_REDIRECT" ||
    error?.digest?.startsWith("NEXT_REDIRECT") ||
    error?.message?.includes("NEXT_REDIRECT")
  ) {
    throw error;
  }

  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4 text-red-500">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-[#1C252E] dark:text-white mb-2">
        Session Expired or Connection Interrupted
      </h2>
      <p className="text-xs text-[#919EAB] max-w-md mb-6 leading-relaxed">
        Your active session may have timed out or your device was disconnected. Please refresh or sign in again.
      </p>
      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          variant="outline"
          className="rounded-xl font-bold text-xs h-11 px-5 gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
        <Link href="/login">
          <Button className="bg-[#00A76F] hover:bg-[#007856] text-white rounded-xl font-bold text-xs h-11 px-5 gap-2 shadow-md shadow-[#00A76F]/20 cursor-pointer">
            <LogIn className="w-4 h-4" /> Go to Login
          </Button>
        </Link>
      </div>
    </div>
  );
}
