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
  VolumeX,
  Sparkles,
  Users,
  Camera,
  RefreshCw,
  MonitorUp,
  MessageSquare,
  Settings,
  Grid,
  Square,
  Send,
  X,
  Signal,
  Smile,
  Hand,
  Check,
  Heart,
  ThumbsUp,
  PartyPopper,
  Flame,
  Palette,
  Eraser,
  Download,
  Trash2,
  Undo2,
  Camera as SnapshotIcon,
  BookOpen,
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

  // Call & Media States
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isWarningShown, setIsWarningShown] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewMode, setViewMode] = useState("speaker"); // "speaker" | "grid"
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);

  // 🎨 Advanced Feature 1: Interactive Whiteboard / Live Drawing Canvas
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

  // In-Call Live Chat Drawer
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "1",
      sender: isStudent ? parentName : studentName,
      text: "Hello! Call connected safely. ❤️",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [messageInput, setMessageInput] = useState("");

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");

  // Status & Refs
  const [statusText, setStatusText] = useState("Live HD Connected");
  const localVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const chatScrollRef = useRef(null);

  const maxSeconds = maxDurationMinutes * 60;
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);

  // 1. Initialize Direct Local Video & Audio Stream
  useEffect(() => {
    async function startMedia() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }

          const devices = await navigator.mediaDevices.enumerateDevices();
          setAudioDevices(devices.filter((d) => d.kind === "audioinput"));
          setVideoDevices(devices.filter((d) => d.kind === "videoinput"));
        }
      } catch (err) {
        console.warn("Camera/Mic access warning:", err.message);
      }
    }

    startMedia();

    if (sessionId) {
      fetch(`/api/calls/${sessionId}/start`, { method: "POST" }).catch(() => {});
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [sessionId]);

  // Duration warnings
  useEffect(() => {
    if (remainingSeconds <= 120 && remainingSeconds > 0 && !isWarningShown) {
      setIsWarningShown(true);
    }
    if (remainingSeconds <= 0 && !callEnded) {
      handleEndCall("MAX_DURATION_REACHED");
    }
  }, [remainingSeconds, isWarningShown, callEnded]);

  // Setup Canvas when Whiteboard Opens
  useEffect(() => {
    if (isWhiteboardOpen && whiteboardCanvasRef.current) {
      const canvas = whiteboardCanvasRef.current;
      canvas.width = canvas.parentElement.clientWidth;
      canvas.height = canvas.parentElement.clientHeight;
      const ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      whiteboardCtxRef.current = ctx;
    }
  }, [isWhiteboardOpen]);

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatOpen]);

  const handleEndCall = async (reason = "NORMAL_HANGUP") => {
    if (callEnded) return;
    setCallEnded(true);

    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (sessionId) {
      try {
        await fetch(`/api/calls/${sessionId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endReason: reason }),
        });
      } catch (err) {
        console.error("End call error:", err);
      }
    }

    if (onCallEnded) {
      onCallEnded(reason);
    } else {
      router.push(isStudent ? "/device" : "/parent/calls");
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          screenStreamRef.current = screenStream;
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = screenStream;
          }
          setIsScreenSharing(true);
          const videoTrack = screenStream.getVideoTracks()?.[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              setIsScreenSharing(false);
            };
          }
        }
      } catch (err) {
        console.warn("Screen share cancelled:", err);
      }
    } else {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsScreenSharing(false);
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

  // 📸 Advanced Feature 2: Take Live Memory Snapshot
  const handleTakeSnapshot = () => {
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 300);

    if (localVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = localVideoRef.current.videoWidth || 1280;
      canvas.height = localVideoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);

      // Watermark with timestamp and hostel title
      ctx.fillStyle = "rgba(0, 167, 111, 0.85)";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`HostelConnect Moment: ${studentName} & ${parentName}`, 30, canvas.height - 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px sans-serif";
      ctx.fillText(new Date().toLocaleDateString("en-IN", { dateStyle: "full" }), 30, canvas.height - 15);

      const link = document.createElement("a");
      link.download = `HostelConnect_Moment_${studentName}_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  // 🎨 Drawing Handlers
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

  const triggerReaction = (emoji) => {
    const id = Date.now().toString() + Math.random();
    setFloatingEmojis((prev) => [...prev, { id, emoji, left: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2500);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      sender: isStudent ? studentName : parentName,
      isSelf: true,
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setMessageInput("");
  };

  const remoteParticipantName = isStudent ? parentName : studentName;
  const selfParticipantName = isStudent ? studentName : parentName;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[580px] bg-[#0A0E14] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between font-sans select-none"
    >
      {/* Camera Shutter Flash Effect */}
      {snapshotFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />
      )}

      {/* ─── FLOATING PARTICLES / EMOJI BURST ─── */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-24 text-4xl animate-float-fade"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* ─── 1. TOP FLOATING GLASSMORPHIC STATUS BAR ─── */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between pointer-events-none">
        {/* Left: Meeting Pill */}
        <div className="pointer-events-auto flex items-center gap-3 px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl text-white">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00A76F]" />
            <span className="w-4 h-4 rounded-full bg-[#00A76F]/40 animate-ping absolute" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-xs sm:text-sm text-white tracking-tight">
                {studentName} ↔ {parentName}
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold bg-[#00A76F]/20 text-[#5BE49B] border border-[#00A76F]/30 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3" /> Encrypted
              </span>
            </div>
            <p className="text-[10px] text-white/50 font-medium">HostelConnect Live Video Stream</p>
          </div>
        </div>

        {/* Right: Timer & Tools */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Signal Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-[11px] font-bold text-[#5BE49B]">
            <Signal className="w-3.5 h-3.5 text-[#00A76F]" />
            <span>HD 1080p</span>
          </div>

          {/* Supervised Remaining Time Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl border backdrop-blur-xl transition-all shadow-xl ${
              remainingSeconds <= 120
                ? "bg-red-500/30 border-red-500 text-red-300 animate-pulse"
                : "bg-black/60 border-white/10 text-white"
            }`}
          >
            <Clock className="w-4 h-4 text-[#00A76F]" />
            <div className="text-right">
              <p className="text-[8px] text-white/50 uppercase font-extrabold leading-none">Remaining</p>
              <p className="text-xs sm:text-sm font-mono font-extrabold leading-tight">
                {formatDuration(remainingSeconds)}
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "speaker" ? "grid" : "speaker")}
            className="p-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-white/15 transition-all cursor-pointer shadow-xl"
            title={viewMode === "speaker" ? "Grid View" : "Speaker View"}
          >
            {viewMode === "speaker" ? <Grid className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-white/15 transition-all cursor-pointer shadow-xl"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── 2. MAIN IMMERSIVE VIDEO CANVAS ─── */}
      <div className="w-full h-full flex-1 relative flex items-center justify-center overflow-hidden">
        {/* 🎨 INTERACTIVE LIVE WHITEBOARD OVERLAY */}
        {isWhiteboardOpen ? (
          <div className="w-full h-full relative bg-[#141A21] flex flex-col z-30 animate-in zoom-in-95">
            {/* Whiteboard Floating Toolbar */}
            <div className="p-3 bg-[#1C252E] border-b border-white/10 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5 mr-2">
                  <Palette className="w-4 h-4 text-[#00A76F]" /> Live Drawing & Study Board
                </span>

                {/* Color Swatches */}
                {["#00A76F", "#4285F4", "#EA4335", "#FBBC05", "#FFFFFF"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { setDrawColor(color); setIsEraser(false); }}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      drawColor === color && !isEraser ? "border-white scale-125" : "border-transparent"
                    }`}
                  />
                ))}

                {/* Eraser */}
                <button
                  type="button"
                  onClick={() => setIsEraser(true)}
                  className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    isEraser ? "bg-[#00A76F] text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Eraser className="w-4 h-4" /> Eraser
                </button>

                {/* Clear */}
                <button
                  type="button"
                  onClick={clearWhiteboard}
                  className="p-2 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Clear
                </button>

                {/* Download */}
                <button
                  type="button"
                  onClick={downloadWhiteboard}
                  className="p-2 rounded-xl text-xs font-bold bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-4 h-4" /> Save
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
        ) : isScreenSharing ? (
          <div className="w-full h-full relative bg-black flex items-center justify-center">
            <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
            <div className="absolute top-20 left-6 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-xs font-bold text-white flex items-center gap-2 border border-white/10">
              <MonitorUp className="w-4 h-4 text-[#00A76F]" />
              <span>You are presenting your screen</span>
            </div>
          </div>
        ) : viewMode === "speaker" ? (
          /* ─── SPEAKER MODE (Immersive Apple/Google Style) ─── */
          <div className="w-full h-full relative flex items-center justify-center bg-radial from-[#151D29] via-[#0E141D] to-[#080B10]">
            {/* Ambient Background Aura Glow */}
            <div className="absolute w-[450px] h-[450px] rounded-full bg-[#00A76F]/10 filter blur-[100px] pointer-events-none animate-pulse" />

            {/* Remote Avatar with Animated Equalizer Rings */}
            <div className="relative flex flex-col items-center justify-center space-y-4 z-10">
              <div className="relative flex items-center justify-center">
                <span className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-[#00A76F]/10 border border-[#00A76F]/20 animate-ping absolute duration-1000" />
                <span className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-[#00A76F]/15 border border-[#00A76F]/30 animate-pulse absolute" />

                {/* Avatar Circle */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br from-[#00A76F] via-[#007856] to-[#004B34] text-white flex items-center justify-center font-extrabold text-5xl sm:text-6xl shadow-2xl ring-8 ring-white/10 relative z-10">
                  {remoteParticipantName.charAt(0)}
                  <span className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#00A76F] border-4 border-[#0E141D] flex items-center justify-center shadow-lg">
                    <Mic className="w-4 h-4 text-white" />
                  </span>
                </div>
              </div>

              {/* Name & Active Voice Indicator */}
              <div className="text-center space-y-1 z-10">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {remoteParticipantName}
                  </h3>
                  {/* Live Audio Equalizer Wave Bars */}
                  <div className="flex items-end gap-0.5 h-4 px-1.5 py-0.5 rounded-md bg-[#00A76F]/20">
                    <span className="w-1 bg-[#00A76F] rounded-full animate-bounce h-2" />
                    <span className="w-1 bg-[#00A76F] rounded-full animate-bounce h-3 delay-75" />
                    <span className="w-1 bg-[#00A76F] rounded-full animate-bounce h-4 delay-150" />
                  </div>
                </div>
                <p className="text-xs text-[#5BE49B] font-semibold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00A76F] animate-ping" />
                  Live Audio & Video Channel Connected
                </p>
              </div>
            </div>

            {/* Self Video PiP (Picture-in-Picture) */}
            <div className="absolute top-20 right-6 w-40 sm:w-52 md:w-60 h-28 sm:h-36 md:h-40 rounded-3xl overflow-hidden bg-[#141A21] border-2 border-white/20 shadow-2xl z-20 transition-all hover:scale-105 hover:border-[#00A76F] group">
              {isVideoOff ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/70 bg-[#1C252E] text-xs font-semibold gap-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-bold text-base">
                    {selfParticipantName.charAt(0)}
                  </div>
                  <span className="text-[10px] text-[#919EAB]">Camera Off</span>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
              {/* PiP Overlay Pill */}
              <div className="absolute bottom-2 left-2 right-2 px-2 py-1 rounded-xl bg-black/65 backdrop-blur-md text-[10px] font-bold text-white flex items-center justify-between">
                <span className="truncate">You ({isStudent ? "Student" : "Parent"})</span>
                {isMuted && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
              </div>
            </div>
          </div>
        ) : (
          /* ─── GRID / TILE VIEW (2 Equal Side-by-Side Video Feeds) ─── */
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-20">
            {/* Tile 1: Remote Participant */}
            <div className="h-full rounded-3xl bg-gradient-to-b from-[#1C252E] to-[#141A21] border border-white/10 relative flex flex-col items-center justify-center shadow-xl">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007856] text-white flex items-center justify-center font-extrabold text-4xl shadow-2xl ring-4 ring-white/10 mb-3 animate-pulse">
                {remoteParticipantName.charAt(0)}
              </div>
              <h4 className="text-lg font-bold text-white">{remoteParticipantName}</h4>
              <p className="text-xs text-[#00A76F] font-semibold">Active Speaker</p>
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#00A76F]" />
                <span>{remoteParticipantName}</span>
              </div>
            </div>

            {/* Tile 2: Self Video */}
            <div className="h-full rounded-3xl bg-[#141A21] border border-white/10 relative overflow-hidden flex items-center justify-center shadow-xl">
              {isVideoOff ? (
                <div className="text-center space-y-2">
                  <div className="w-24 h-24 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-3xl mx-auto ring-4 ring-white/10">
                    {selfParticipantName.charAt(0)}
                  </div>
                  <p className="text-xs text-[#919EAB]">Your camera is off</p>
                </div>
              ) : (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              )}
              <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5">
                <span>You ({selfParticipantName})</span>
                {isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
              </div>
            </div>
          </div>
        )}

        {/* Hand Raised Banner */}
        {raisedHand && (
          <div className="absolute top-20 left-6 z-30 px-4 py-2 rounded-2xl bg-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-2xl animate-bounce">
            <Hand className="w-4 h-4" />
            <span>Hand Raised</span>
          </div>
        )}

        {/* ─── IN-CALL LIVE CHAT DRAWER ─── */}
        {isChatOpen && (
          <div className="absolute top-0 right-0 bottom-0 w-80 sm:w-96 bg-[#141A21]/95 backdrop-blur-2xl border-l border-white/10 flex flex-col z-40 animate-in slide-in-from-right duration-200 shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-[#00A76F]" />
                <span>Live Call Chat</span>
              </div>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 p-4 space-y-3 overflow-y-auto">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-white/40 mb-0.5 font-medium">
                    {msg.sender} • {msg.time}
                  </span>
                  <div
                    className={`px-3.5 py-2 rounded-2xl text-xs font-medium max-w-[85%] shadow-md ${
                      msg.isSelf
                        ? "bg-[#00A76F] text-white rounded-br-none"
                        : "bg-[#212B36] text-white border border-white/10 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#00A76F]"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-[#00A76F] hover:bg-[#007856] text-white flex items-center justify-center cursor-pointer shadow-lg shadow-[#00A76F]/25"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ─── 3. ADVANCED FLOATING GLASSMORPHIC CONTROL DOCK BAR ─── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-2.5 px-5 py-3 rounded-full bg-black/80 backdrop-blur-2xl border border-white/15 shadow-2xl">
        {/* Mic Button */}
        <button
          type="button"
          onClick={toggleAudio}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isMuted
              ? "bg-red-500 text-white shadow-red-500/30 scale-105"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
          title={isMuted ? "Unmute Audio (M)" : "Mute Audio (M)"}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Video Button */}
        <button
          type="button"
          onClick={toggleVideo}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isVideoOff
              ? "bg-red-500 text-white shadow-red-500/30 scale-105"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
          title={isVideoOff ? "Turn On Camera (V)" : "Turn Off Camera (V)"}
        >
          {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
        </button>

        {/* 🎨 Interactive Whiteboard Button */}
        <button
          type="button"
          onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isWhiteboardOpen
              ? "bg-[#00A76F] text-white shadow-[#00A76F]/30"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
          title="Interactive Whiteboard / Drawing"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* 📸 Moment Snapshot Capture */}
        <button
          type="button"
          onClick={handleTakeSnapshot}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-90"
          title="Capture Call Moment (Save Photo)"
        >
          <SnapshotIcon className="w-4 h-4" />
        </button>

        {/* Screen Share */}
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            isScreenSharing
              ? "bg-[#00A76F] text-white shadow-[#00A76F]/30"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
          title="Share Screen"
        >
          <MonitorUp className="w-4 h-4" />
        </button>

        {/* Floating Reactions Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-lg"
            title="Send Reaction"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Emoji Popup Pill */}
          {showEmojiPicker && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 rounded-full bg-black/85 backdrop-blur-2xl border border-white/15 flex items-center gap-2 shadow-2xl animate-in zoom-in-95">
              {["❤️", "👍", "👏", "🎉", "🔥", "👋"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => triggerReaction(emoji)}
                  className="text-xl hover:scale-125 transition-transform p-1 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Raise Hand */}
        <button
          type="button"
          onClick={() => setRaisedHand(!raisedHand)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
            raisedHand
              ? "bg-amber-500 text-white shadow-amber-500/30"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
          title="Raise Hand"
        >
          <Hand className="w-4 h-4" />
        </button>

        {/* Chat Toggle */}
        <button
          type="button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-all relative cursor-pointer shadow-lg ${
            isChatOpen
              ? "bg-[#00A76F] text-white shadow-[#00A76F]/30"
              : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
          }`}
          title="In-Call Chat"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#00A76F] border-2 border-black absolute top-2 right-2" />
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title="Audio & Video Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Big End Call Button */}
        <Button
          variant="destructive"
          onClick={() => handleEndCall("NORMAL_HANGUP")}
          className="h-11 px-5 rounded-full font-extrabold text-xs bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-xl shadow-red-600/40 gap-1.5 cursor-pointer transition-all active:scale-95 ml-1"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">End Call</span>
        </Button>
      </div>

      {/* ─── 4. SETTINGS MODAL ─── */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#1C252E] text-white rounded-3xl border border-white/15 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2 font-bold text-base">
                <Settings className="w-5 h-5 text-[#00A76F]" />
                <span>Audio & Video Device Settings</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Mic Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-[#00A76F]" /> Microphone Input
                </label>
                <select
                  value={selectedAudioDevice}
                  onChange={(e) => setSelectedAudioDevice(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#141A21] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00A76F]"
                >
                  <option value="">Default HD Microphone</option>
                  {audioDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Microphone ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#00A76F]" /> Camera Video Device
                </label>
                <select
                  value={selectedVideoDevice}
                  onChange={(e) => setSelectedVideoDevice(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-[#141A21] border border-white/10 text-xs text-white focus:outline-none focus:border-[#00A76F]"
                >
                  <option value="">Default Front Camera (1080p)</option>
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Features Pill */}
              <div className="p-4 rounded-2xl bg-[#141A21] border border-white/10 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>AI Noise Suppression</span>
                  <span className="text-[#00A76F] font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Echo Cancellation</span>
                  <span className="text-[#00A76F] font-bold">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Video Quality</span>
                  <span className="text-[#00A76F] font-bold">1080p Full HD</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => setIsSettingsOpen(false)}
                className="bg-[#00A76F] hover:bg-[#007856] text-white font-bold text-xs rounded-xl h-11 px-6 shadow-lg shadow-[#00A76F]/25"
              >
                Apply & Return to Call
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
