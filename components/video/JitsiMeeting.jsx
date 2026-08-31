"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Maximize,
  Minimize,
  AlertCircle,
  Clock,
  ShieldCheck,
  Volume2,
  Sparkles,
  Users,
  Camera as SnapshotIcon,
  Palette,
  Eraser,
  Download,
  Trash2,
  X,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Supervision & Timer States
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);

  // 🎨 Advanced Feature: Live Drawing / Whiteboard Overlay
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const [drawColor, setDrawColor] = useState("#00A76F");
  const [lineWidth, setLineWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const whiteboardCanvasRef = useRef(null);
  const whiteboardCtxRef = useRef(null);

  // Floating Reactions
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const iframeRef = useRef(null);

  const maxSeconds = maxDurationMinutes * 60;
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);
  const displayName = isStudent ? `${studentName} (Hostel Student)` : `${parentName} (Parent)`;
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

  // Build clean Jitsi Meet URL with pre-configured settings
  const jitsiRoomUrl = `https://${jitsiDomain}/${encodeURIComponent(
    meetingId || "hc-safe-room"
  )}#config.prejoinConfig.enabled=false&config.requireDisplayName=false&config.disableDeepLinking=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false&userInfo.displayName=${encodeURIComponent(
    displayName
  )}`;

  // Start call session timer and record in database
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

  // Duration warnings and automatic auto-hangup when limit is reached
  useEffect(() => {
    if (remainingSeconds <= 120 && remainingSeconds > 0 && !isWarningShown) {
      setIsWarningShown(true);
    }
    if (remainingSeconds === 0 && !callEnded) {
      handleEndCall("MAX_DURATION_REACHED");
    }
  }, [remainingSeconds, isWarningShown, callEnded]);

  // Whiteboard Canvas Init
  useEffect(() => {
    if (isWhiteboardOpen && whiteboardCanvasRef.current) {
      const canvas = whiteboardCanvasRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      whiteboardCtxRef.current = ctx;
    }
  }, [isWhiteboardOpen]);

  const handleEndCall = async (reason = "NORMAL_HANGUP") => {
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
        console.error("Failed to record call end in DB:", err);
      }
    }

    if (onCallEnded) {
      onCallEnded();
    } else {
      router.push(isStudent ? "/device" : "/parent/calls");
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const triggerReaction = (emoji) => {
    const id = Date.now().toString() + Math.random();
    setFloatingEmojis((prev) => [...prev, { id, emoji, left: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2500);
    setShowEmojiPicker(false);
  };

  // Drawing Handlers
  const startDrawing = (e) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = whiteboardCtxRef.current;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? "#141A21" : drawColor;
    ctx.lineWidth = isEraser ? 24 : lineWidth;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = whiteboardCtxRef.current;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      whiteboardCtxRef.current?.closePath();
      setIsDrawing(false);
    }
  };

  const clearWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (canvas && whiteboardCtxRef.current) {
      whiteboardCtxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const downloadWhiteboard = () => {
    const canvas = whiteboardCanvasRef.current;
    if (canvas) {
      const link = document.createElement("a");
      link.download = `Whiteboard_Drawing_${studentName}_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#080B10] text-white flex flex-col font-sans select-none overflow-hidden"
    >
      {/* ─── Top Supervised Calling Control Bar ─── */}
      <div className="h-16 px-4 sm:px-6 bg-[#0E141D]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00A76F] text-white flex items-center justify-center font-extrabold text-base shadow-md shadow-[#00A76F]/30">
            {isStudent ? parentName.charAt(0) : studentName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                {studentName} ↔ {parentName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#00A76F]/20 text-[#5BE49B] text-[10px] font-extrabold border border-[#00A76F]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5BE49B] animate-pulse" />
                Live 2-Way HD
              </span>
            </div>
            <p className="text-[11px] text-[#919EAB]">
              Encrypted Supervised Room • {meetingId || "HC-Secure"}
            </p>
          </div>
        </div>

        {/* Supervised Timer and Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Remaining Time Badge */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-extrabold text-xs sm:text-sm transition-all ${
              remainingSeconds <= 120
                ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                : "bg-white/5 text-white border-white/10"
            }`}
          >
            <Clock className="w-4 h-4 text-[#00A76F]" />
            <span>{formatDuration(remainingSeconds)} Left</span>
          </div>

          {/* Interactive Whiteboard Button */}
          <button
            type="button"
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
              isWhiteboardOpen
                ? "bg-[#00A76F] text-white border-[#00A76F]"
                : "bg-white/10 text-white border-white/10 hover:bg-white/20"
            }`}
            title="Open Interactive Whiteboard"
          >
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Drawing Board</span>
          </button>

          {/* Emoji Reactions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>

            {showEmojiPicker && (
              <div className="absolute right-0 top-12 p-2 bg-[#1C252E] border border-[#2E3844] rounded-2xl shadow-2xl flex items-center gap-2 z-50 animate-in zoom-in-95">
                {["❤️", "👍", "🎉", "🔥", "🌟", "👏", "😊"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => triggerReaction(emoji)}
                    className="w-9 h-9 rounded-xl hover:bg-white/10 text-xl flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs cursor-pointer"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* End Call Button */}
          <Button
            onClick={() => handleEndCall("NORMAL_HANGUP")}
            className="h-10 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-red-600/30 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </Button>
        </div>
      </div>

      {/* ─── Main 2-Party Live Video Stage (Jitsi Meet WebRTC Bridge) ─── */}
      <div className="flex-1 w-full h-full relative bg-black flex items-center justify-center overflow-hidden">
        {/* Real-time 2-Party Jitsi IFrame */}
        <iframe
          ref={iframeRef}
          src={jitsiRoomUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          className="w-full h-full border-0 bg-[#080B10]"
          title="HostelConnect Live Video Call"
        />

        {/* 🎨 Interactive Whiteboard Canvas Overlay */}
        {isWhiteboardOpen && (
          <div className="absolute inset-0 bg-[#141A21]/95 backdrop-blur-lg z-40 flex flex-col animate-in fade-in duration-200">
            {/* Whiteboard Toolbar */}
            <div className="h-14 px-6 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#00A76F]" /> Live Drawing & Notes
                </span>

                {/* Colors */}
                {["#00A76F", "#FF5630", "#FFAB00", "#00B8D9", "#8E33FF", "#FFFFFF"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { setDrawColor(color); setIsEraser(false); }}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      drawColor === color && !isEraser ? "border-white scale-125 shadow-md" : "border-transparent"
                    }`}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setIsEraser(true)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    isEraser ? "bg-[#00A76F] text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" /> Eraser
                </button>

                <button
                  type="button"
                  onClick={clearWhiteboard}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>

                <button
                  type="button"
                  onClick={downloadWhiteboard}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Save Image
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsWhiteboardOpen(false)}
                className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawing Canvas */}
            <div className="flex-1 w-full h-full relative cursor-crosshair">
              <canvas
                ref={whiteboardCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="w-full h-full touch-none"
              />
            </div>
          </div>
        )}

        {/* Floating Animated Reaction Emojis */}
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-16 text-5xl pointer-events-none animate-bounce duration-1000 z-50 select-none"
          >
            {item.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
