"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PhoneOff,
  Maximize,
  Minimize,
  Clock,
  ShieldCheck,
  Palette,
  Eraser,
  X,
  Smile,
  Users,
  Video,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";

export default function JitsiMeetingWrapper({
  sessionId,
  meetingId,
  studentName = "Student",
  parentName = "Parent",
  isStudent = false,
  maxDurationMinutes = 15,
  onCallEnded,
}) {
  const router = useRouter();

  // Call duration & states
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [callEnded, setCallEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Whiteboard overlay
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [drawColor, setDrawColor] = useState("#00A76F");
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const whiteboardCanvasRef = useRef(null);
  const whiteboardCtxRef = useRef(null);

  // Floating Reactions
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const containerRef = useRef(null);
  const timerRef = useRef(null);

  const maxSeconds = maxDurationMinutes * 60;
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);
  const myName = isStudent ? studentName : parentName;
  const peerName = isStudent ? parentName : studentName;
  const roomIdentifier = (meetingId || sessionId || "hostelconnect-safe-call").replace(/[^a-zA-Z0-9-_]/g, "");

  // Jitsi Domain from environment or default meet.jit.si
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

  // End Call Handler
  const handleEndCall = useCallback(
    async (reason = "NORMAL_HANGUP") => {
      if (callEnded) return;
      setCallEnded(true);
      if (timerRef.current) clearInterval(timerRef.current);

      if (sessionId) {
        try {
          await fetch(`/api/calls/${sessionId}/end`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endReason: reason }),
          });
        } catch (err) {
          console.error("End call API error:", err);
        }
      }

      if (onCallEnded) {
        try {
          onCallEnded();
        } catch (_) {
          router.push(isStudent ? "/device" : "/parent/calls");
        }
      } else {
        router.push(isStudent ? "/device" : "/parent/calls");
      }
    },
    [callEnded, isStudent, onCallEnded, router, sessionId]
  );

  // Automatic Call Timer & Mark Call Started
  useEffect(() => {
    if (sessionId) {
      fetch(`/api/calls/${sessionId}/start`, { method: "POST" }).catch(() => {});
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  // Auto-hangup when max duration is reached
  useEffect(() => {
    if (remainingSeconds <= 0 && !callEnded) {
      handleEndCall("MAX_DURATION_EXCEEDED");
    }
  }, [remainingSeconds, callEnded, handleEndCall]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Floating Emoji Reactions
  const triggerReaction = (emoji) => {
    const id = Date.now().toString() + Math.random();
    setFloatingEmojis((prev) => [...prev, { id, emoji, left: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2500);
    setShowEmojiPicker(false);
  };

  // Whiteboard canvas setup
  useEffect(() => {
    if (!isWhiteboardOpen) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 600;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      whiteboardCtxRef.current = ctx;
    }
  }, [isWhiteboardOpen]);

  const startDrawing = (e) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas || !whiteboardCtxRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    setIsDrawing(true);
    whiteboardCtxRef.current.beginPath();
    whiteboardCtxRef.current.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing || !whiteboardCtxRef.current) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;

    const ctx = whiteboardCtxRef.current;
    ctx.strokeStyle = isEraser ? "#202124" : drawColor;
    ctx.lineWidth = isEraser ? 20 : 4;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (whiteboardCtxRef.current) {
      whiteboardCtxRef.current.closePath();
    }
  };

  const clearWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (canvas && whiteboardCtxRef.current) {
      whiteboardCtxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // Build clean Jitsi Meet conference URL with auto-connect parameters
  const toolbarButtons = [
    "microphone",
    "camera",
    "hangup",
    "tileview",
    "fullscreen",
    "videoquality",
    "chat",
  ];

  const jitsiUrl = `https://${jitsiDomain}/${roomIdentifier}#userInfo.displayName=${encodeURIComponent(
    myName
  )}&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&config.toolbarButtons=${encodeURIComponent(
    JSON.stringify(toolbarButtons)
  )}&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&interfaceConfig.SHOW_BRAND_WATERMARK=false&interfaceConfig.SHOW_POWERED_BY=false&interfaceConfig.APP_NAME=HostelConnect`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[500px] flex flex-col bg-[#141A21] text-white select-none overflow-hidden"
    >
      {/* ─── Top Supervised Header Bar ─── */}
      <header className="h-16 bg-[#1C252E] border-b border-[#2E3844] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-md">
        {/* Left: Call Context & Badges */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00A76F]/20 text-[#00A76F] border border-[#00A76F]/30 flex items-center justify-center shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                {isStudent ? `Calling Parent: ${peerName}` : `Calling Student: ${peerName}`}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00A76F]/20 text-[#5BE49B] border border-[#00A76F]/30">
                <ShieldCheck className="w-3 h-3" /> Supervised & Encrypted
              </span>
            </div>
            <p className="text-[11px] text-[#919EAB] flex items-center gap-1.5">
              <Users className="w-3 h-3 text-[#00A76F]" />
              <span>
                {myName} ({isStudent ? "Student Kiosk" : "Parent"}) ↔ {peerName}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Actions & Countdown Timer */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Realtime Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold border transition-all ${
              remainingSeconds <= 120
                ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                : "bg-[#212B36] text-white border-[#2E3844]"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#00A76F]" />
            <span>{formatDuration(remainingSeconds)}</span>
          </div>

          {/* Whiteboard Toggle */}
          <button
            type="button"
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isWhiteboardOpen
                ? "bg-[#00A76F] border-[#00A76F] text-white"
                : "bg-[#212B36] border-[#2E3844] text-[#919EAB] hover:text-white hover:bg-[#2A3542]"
            }`}
            title="Interactive Whiteboard"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Emoji Reactions Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 rounded-xl bg-[#212B36] border border-[#2E3844] text-[#919EAB] hover:text-white hover:bg-[#2A3542] transition-all cursor-pointer"
              title="Send Reaction"
            >
              <Smile className="w-4 h-4" />
            </button>

            {showEmojiPicker && (
              <div className="absolute top-12 right-0 p-2 bg-[#212B36] border border-[#2E3844] rounded-2xl shadow-2xl flex items-center gap-1.5 z-50">
                {["❤️", "👍", "🎉", "🔥", "🌟", "👏"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => triggerReaction(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-[#2E3844] text-lg flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-[#212B36] border border-[#2E3844] text-[#919EAB] hover:text-white hover:bg-[#2A3542] transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Prominent End Call Button */}
          <button
            type="button"
            onClick={() => handleEndCall("NORMAL_HANGUP")}
            className="h-10 px-4 rounded-xl bg-[#FF5630] hover:bg-[#B71D18] text-white font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-red-500/25 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </header>

      {/* ─── Main Video Stage: Embedded High-Reliability Jitsi Conference ─── */}
      <main className="flex-1 w-full relative bg-[#0B0F15] overflow-hidden flex flex-col">
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="w-full h-full border-0 flex-1"
          title="HostelConnect Supervised Video Call"
        />

        {/* Floating Reactions Overlay */}
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-20 text-4xl sm:text-5xl pointer-events-none animate-bounce z-40 transition-all"
          >
            {item.emoji}
          </div>
        ))}

        {/* 🎨 Live Whiteboard Drawer Overlay */}
        {isWhiteboardOpen && (
          <div className="absolute inset-4 bg-[#141A21]/95 backdrop-blur-xl rounded-2xl z-40 flex flex-col border border-white/10 shadow-2xl">
            <div className="h-14 px-4 sm:px-6 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0 rounded-t-2xl">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#00A76F]" /> Shared Whiteboard
                </span>

                {["#00A76F", "#FF5630", "#FFAB00", "#00B8D9", "#FFFFFF"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setDrawColor(color);
                      setIsEraser(false);
                    }}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                      drawColor === color && !isEraser ? "border-white scale-125" : "border-transparent"
                    }`}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setIsEraser(!isEraser)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                    isEraser ? "bg-[#00A76F] text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" /> Eraser
                </button>

                <button
                  type="button"
                  onClick={clearWhiteboard}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 text-white hover:text-red-400 hover:bg-white/20 transition-all cursor-pointer"
                >
                  Clear Canvas
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsWhiteboardOpen(false)}
                className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 relative cursor-crosshair overflow-hidden">
              <canvas
                ref={whiteboardCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full touch-none"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
