"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, Video, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function IncomingCallNotification({ user, profile }) {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState(null);
  const dismissedIdsRef = useRef(new Set());
  const audioContextRef = useRef(null);
  const ringIntervalRef = useRef(null);
  const supabaseRef = useRef(null);
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);

  // Play synthetic telephone ring chime
  const playRingChime = useCallback(() => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio playback restricted
    }
  }, []);

  // Main poll function — stable reference, no dependency on state
  const checkIncomingCalls = useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const res = await fetch("/api/calls?limit=5");
      if (!res.ok || !isMountedRef.current) return;
      const json = await res.json();
      if (!isMountedRef.current || !json.success || !Array.isArray(json.data)) return;

      const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const activeCall = json.data.find(
        (c) =>
          (c.status === "READY" || c.status === "IN_PROGRESS") &&
          c.created_at >= tenMinsAgo &&
          !dismissedIdsRef.current.has(c.id)
      );

      setIncomingCall((prev) => {
        if (activeCall) {
          if (!prev || prev.id !== activeCall.id) {
            return activeCall;
          }
          return prev;
        }
        return null;
      });
    } catch (err) {
      console.error("Error polling incoming calls:", err);
    }
  }, []); // Empty deps — never recreated

  // Setup polling + Supabase channel ONCE on mount
  useEffect(() => {
    isMountedRef.current = true;
    supabaseRef.current = createClient();

    // Initial check
    checkIncomingCalls();

    // Poll every 3 seconds
    intervalRef.current = setInterval(checkIncomingCalls, 3000);

    // Supabase Realtime for instant push
    const channel = supabaseRef.current.channel("hct_incoming_calls_v2");
    channel
      .on("broadcast", { event: "new_call" }, checkIncomingCalls)
      .subscribe();

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
      try { supabaseRef.current?.removeChannel(channel); } catch (_) {}
    };
  }, []); // Empty — runs only ONCE

  // Play ring chime when a new call arrives
  useEffect(() => {
    if (incomingCall) {
      playRingChime();
      ringIntervalRef.current = setInterval(playRingChime, 2500);
    } else {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    }
    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [incomingCall, playRingChime]);

  if (!incomingCall) return null;

  const studentName = `${incomingCall.student?.first_name || "Child"} ${incomingCall.student?.last_name || ""}`.trim();
  const hostelName = incomingCall.hostel?.name || "Campus Calling Kiosk";

  const handleAccept = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    const callId = incomingCall.id;
    setIncomingCall(null);
    router.push(`/call/${callId}`);
  };

  const handleDismiss = () => {
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    dismissedIdsRef.current.add(incomingCall.id);
    setIncomingCall(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#1C252E]/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#212B36] rounded-3xl border border-[#00A76F]/40 shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
        {/* Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full text-[#919EAB] hover:text-[#1C252E] dark:hover:text-white hover:bg-[#F4F6F8] dark:hover:bg-[#1C252E] transition-colors cursor-pointer"
          title="Decline"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Pulsing Green Call Icon */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-[#00A76F]/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-[#00A76F]/10 animate-pulse" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#00A76F] via-[#007856] to-[#004B34] text-white flex items-center justify-center shadow-xl shadow-[#00A76F]/40 ring-4 ring-white dark:ring-[#212B36]">
            <PhoneCall className="w-9 h-9 sm:w-11 sm:h-11 animate-bounce" />
          </div>
        </div>

        {/* Caller Info */}
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAFBF1] dark:bg-[#00A76F]/20 text-[#007856] dark:text-[#5BE49B] text-xs font-extrabold uppercase tracking-wider">
            <Video className="w-3.5 h-3.5" /> Incoming Video Call
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#1C252E] dark:text-white">
            {studentName} is calling you!
          </h3>
          <p className="text-xs text-[#919EAB]">
            From <span className="font-bold text-[#1C252E] dark:text-white">{hostelName}</span> terminal
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button
            type="button"
            onClick={handleDismiss}
            variant="outline"
            className="h-12 rounded-2xl border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs cursor-pointer"
          >
            Decline
          </Button>

          <Button
            type="button"
            onClick={handleAccept}
            className="h-12 rounded-2xl bg-[#00A76F] hover:bg-[#007856] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#00A76F]/30 gap-2 cursor-pointer transition-all active:scale-95 animate-pulse"
          >
            <Video className="w-4 h-4" /> Accept Call
          </Button>
        </div>
      </div>
    </div>
  );
}
