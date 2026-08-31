"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootErrorBoundary({ error, reset }) {
  // Never intercept internal Next.js redirects
  if (
    error?.message === "NEXT_REDIRECT" ||
    error?.digest?.startsWith("NEXT_REDIRECT") ||
    error?.message?.includes("NEXT_REDIRECT")
  ) {
    throw error;
  }

  useEffect(() => {
    console.error("[Root Error Boundary Caught]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F4F6F8] dark:bg-[#141A21] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mb-4 text-red-500">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-[#1C252E] dark:text-white mb-2">
        Something went wrong
      </h1>
      <p className="text-xs text-[#919EAB] max-w-md mb-6 leading-relaxed">
        We encountered an unexpected issue. Please click below to refresh the page or return to the home screen.
      </p>
      <div className="flex items-center gap-3">
        <Button
          onClick={() => reset()}
          variant="outline"
          className="rounded-xl font-bold text-xs h-11 px-5 gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Reload Page
        </Button>
        <Link href="/login">
          <Button className="bg-[#00A76F] hover:bg-[#007856] text-white rounded-xl font-bold text-xs h-11 px-5 gap-2 shadow-md shadow-[#00A76F]/20 cursor-pointer">
            <Home className="w-4 h-4" /> Go to Login
          </Button>
        </Link>
      </div>
    </div>
  );
}
