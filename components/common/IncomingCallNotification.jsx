"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, Video, X, Volume2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IncomingCallNotification({ user, profile }) {
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState(null);
  const [dismissedCallId, setDismissedCallId] = useState(null);
  const audioContextRef = useRef(null);
  const ringIntervalRef = useRef(null);

  // Play browser-synthesized telephone ring chime
  const playRingChime = () => {
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
      osc1.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc2.frequency.setValueAtTime(480, ctx.currentTime); // B4

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.8);
      osc2.stop(ctx.currentTime + 0.8);
    } catch {
      // Audio playback restricted by user gesture
    }
  };

  // Poll for ready incoming calls
  useEffect(() => {
    let isMounted = true;

    async function checkIncomingCalls() {
      try {
        const res = await fetch("/api/calls?limit=5");
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted) return;

        if (json.success && Array.isArray(json.data)) {
          // Find any call that is READY or IN_PROGRESS and created in the last 5 minutes
          const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
          const activeCall = json.data.find(
            (c) =>
              (c.status === "READY" || c.status === "IN_PROGRESS") &&
              c.created_at >= fiveMinsAgo &&
              c.id !== dismissedCallId
          );

          if (activeCall && (!incomingCall || incomingCall.id !== activeCall.id)) {
            setIncomingCall(activeCall);
            playRingChime();
          } else if (!activeCall && incomingCall) {
            setIncomingCall(null);
          }
        }
      } catch (err) {
        console.error("Error polling incoming calls:", err);
      }
    }

    // Check immediately and every 3.5 seconds
    checkIncomingCalls();
    const interval = setInterval(checkIncomingCalls, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [dismissedCallId, incomingCall]);

  // Repeated chime while incoming call modal is active
  useEffect(() => {
    if (incomingCall) {
      ringIntervalRef.current = setInterval(playRingChime, 3000);
    } else {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    }
    return () => {
      if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    };
  }, [incomingCall]);

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
    setDismissedCallId(incomingCall.id);
    setIncomingCall(null);
  };

  return (
    <div className="fixed top-6 right-6 z-50 max-w-md w-full animate-in slide-in-from-top-6 duration-300">
      <div className="bg-[#141A21] text-white p-5 rounded-3xl border-2 border-[#00A76F] shadow-2xl shadow-[#00A76F]/30 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-[#00A76F] text-white flex items-center justify-center font-extrabold text-xl shadow-lg shadow-[#00A76F]/40 animate-pulse">
                {studentName.charAt(0)}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#141A21] flex items-center justify-center">
                <PhoneCall className="w-2.5 h-2.5 text-white animate-bounce" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#00A76F]/20 text-[#5BE49B] border border-[#00A76F]/30">
                  Incoming Live Call
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <h4 className="font-extrabold text-base text-white mt-0.5">{studentName}</h4>
              <p className="text-xs text-[#919EAB]">{hostelName} • Video Terminal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-full text-[#919EAB] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            onClick={handleAccept}
            className="flex-1 h-12 bg-[#00A76F] hover:bg-[#007856] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-[#00A76F]/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
          >
            <Video className="w-4 h-4" />
            <span>Accept Video Call</span>
          </Button>

          <Button
            onClick={handleDismiss}
            variant="outline"
            className="h-12 px-4 rounded-xl border-[#2E3844] bg-white/5 hover:bg-red-500/20 text-red-400 hover:text-red-300 font-bold text-xs cursor-pointer"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}
