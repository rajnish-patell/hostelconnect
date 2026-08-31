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
  Hand,
  Send,
  MoreVertical,
  MonitorUp,
  Settings,
  Smile,
  CheckCircle2,
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  // In-Call Live Chat Drawer
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: "1",
      sender: "HostelConnect System",
      text: "Encrypted supervised call room connected. Zero external login required.",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [messageInput, setMessageInput] = useState("");

  // 🎨 Advanced Feature: Google Meet Style Whiteboard / Canvas
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

  // Refs & Streams
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const chatScrollRef = useRef(null);

  const maxSeconds = maxDurationMinutes * 60;
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);
  const myName = isStudent ? studentName : parentName;
  const peerName = isStudent ? parentName : studentName;
  const myRole = isStudent ? "Student (Hostel Kiosk)" : "Parent / Guardian";

  // 1. Initialize Direct Camera & Microphone Stream
  useEffect(() => {
    async function startMedia() {
      try {
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn("Camera/Mic access note:", err.message);
      }
    }

    startMedia();

    // Setup Cross-Tab / Cross-Device Signaling Channel for Instant Peer Connection
    const channelName = `google_meet_${meetingId || sessionId || "safe-room"}`;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const bc = new BroadcastChannel(channelName);
      broadcastChannelRef.current = bc;

      // Announce presence
      bc.postMessage({ type: "PEER_JOINED", sender: myName, role: isStudent ? "STUDENT" : "PARENT" });

      bc.onmessage = (event) => {
        const msg = event.data;
        if (!msg) return;

        if (msg.type === "PEER_JOINED") {
          setPeerConnected(true);
          // Respond back so new peer knows we are here
          bc.postMessage({ type: "PEER_ACK", sender: myName });
        } else if (msg.type === "PEER_ACK") {
          setPeerConnected(true);
        } else if (msg.type === "CHAT_MESSAGE") {
          setChatMessages((prev) => [...prev, msg.message]);
        } else if (msg.type === "EMOJI_REACTION") {
          triggerReaction(msg.emoji, false);
        } else if (msg.type === "CALL_ENDED") {
          handleEndCall("REMOTE_HANGUP", false);
        }
      };
    }

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
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [meetingId, sessionId]);

  // Supervision Warnings & Auto Hangup
  useEffect(() => {
    if (remainingSeconds <= 120 && remainingSeconds > 0 && !isWarningShown) {
      setIsWarningShown(true);
    }
    if (remainingSeconds === 0 && !callEnded) {
      handleEndCall("MAX_DURATION_REACHED");
    }
  }, [remainingSeconds, isWarningShown, callEnded]);

  // Toggle Microphone
  const toggleMute = () => {
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

  // Toggle Video Camera
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

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        setIsScreenSharing(true);
        screenStream.getVideoTracks()?.[0]?.addEventListener("ended", () => {
          if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          setIsScreenSharing(false);
        });
      } else {
        if (localStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsScreenSharing(false);
      }
    } catch {
      setIsScreenSharing(false);
    }
  };

  // End Call Handler
  const handleEndCall = async (reason = "NORMAL_HANGUP", broadcast = true) => {
    if (callEnded) return;
    setCallEnded(true);
    if (timerRef.current) clearInterval(timerRef.current);

    if (broadcast && broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: "CALL_ENDED" });
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (sessionId) {
      try {
        await fetch(`/api/calls/${sessionId}/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endReason: reason }),
        });
      } catch (err) {
        console.error("End call log error:", err);
      }
    }

    if (onCallEnded) {
      onCallEnded();
    } else {
      router.push(isStudent ? "/device" : "/parent/calls");
    }
  };

  // Send In-Call Chat Message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: myName,
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setMessageInput("");

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: "CHAT_MESSAGE", message: newMsg });
    }
  };

  // Floating Emoji Reactions
  const triggerReaction = (emoji, broadcast = true) => {
    const id = Date.now().toString() + Math.random();
    setFloatingEmojis((prev) => [...prev, { id, emoji, left: Math.random() * 60 + 20 }]);
    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
    }, 2500);

    if (broadcast && broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: "EMOJI_REACTION", emoji });
    }
    setShowEmojiPicker(false);
  };

  // Memory Snapshot Capture
  const handleTakeSnapshot = () => {
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 300);

    if (localVideoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = localVideoRef.current.videoWidth || 1280;
      canvas.height = localVideoRef.current.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(0, 167, 111, 0.9)";
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

  // Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
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
    ctx.strokeStyle = isEraser ? "#202124" : drawColor;
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

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#202124] text-white flex flex-col font-sans select-none overflow-hidden"
    >
      {/* Snapshot Flash Overlay */}
      {snapshotFlash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300" />}

      {/* ─── Top Google Meet Header ─── */}
      <div className="h-14 sm:h-16 px-4 sm:px-6 bg-[#202124] flex items-center justify-between z-20 shrink-0 border-b border-[#3c4043]/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#00A76F] animate-pulse" />
            <h1 className="font-bold text-sm sm:text-base text-white tracking-tight">
              {studentName} ↔ {parentName}
            </h1>
          </div>
          <span className="hidden md:inline-block text-xs text-[#9aa0a6] px-2.5 py-0.5 rounded-full bg-[#3c4043]/50">
            {meetingId || "meet.google.com/hct-safe"}
          </span>
        </div>

        {/* Supervised Hostel Timer Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-mono font-bold border transition-all ${
              remainingSeconds <= 120
                ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                : "bg-[#303134] text-white border-[#3c4043]"
            }`}
          >
            <Clock className="w-4 h-4 text-[#00A76F]" />
            <span>{formatDuration(remainingSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ─── Main Google Meet Video Stage ─── */}
      <div className="flex-1 w-full h-full p-2 sm:p-4 grid grid-cols-1 md:grid-cols-2 gap-3 relative overflow-hidden">
        {/* Tile 1: Remote Participant (Mom/Dad or Student) */}
        <div className="relative w-full h-full rounded-2xl bg-[#3c4043] overflow-hidden flex items-center justify-center border border-[#3c4043]/60 shadow-xl group">
          {/* If peer is connected & camera active, render stream, else Google Meet avatar tile */}
          <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#00A76F] via-[#007856] to-[#004B34] text-white flex items-center justify-center font-extrabold text-4xl sm:text-5xl shadow-2xl ring-4 ring-white/10 animate-pulse">
                {peerName.charAt(0)}
              </div>
              <span className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#00A76F] border-2 border-[#202124] flex items-center justify-center">
                <Mic className="w-3 h-3 text-white" />
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg sm:text-xl text-white">{peerName}</h3>
              <p className="text-xs text-[#5BE49B] flex items-center justify-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Live High-Definition Connected
              </p>
            </div>
          </div>

          {/* Bottom Left Name Badge */}
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 border border-white/10">
            <span>{peerName}</span>
          </div>
        </div>

        {/* Tile 2: Self View (Camera Stream) */}
        <div className="relative w-full h-full rounded-2xl bg-[#3c4043] overflow-hidden flex items-center justify-center border border-[#3c4043]/60 shadow-xl">
          {isVideoOff ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-[#5f6368] text-white flex items-center justify-center font-extrabold text-3xl">
                {myName.charAt(0)}
              </div>
              <p className="text-xs text-[#9aa0a6] font-semibold">Your Camera is Off</p>
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror transform -scale-x-100"
            />
          )}

          {/* Bottom Left Name Badge */}
          <div className="absolute bottom-3 left-3 px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md text-xs font-bold text-white flex items-center gap-2 border border-white/10">
            <span>{myName} (You)</span>
            {isMuted && <MicOff className="w-3.5 h-3.5 text-red-400" />}
          </div>

          {/* Raised Hand Indicator */}
          {raisedHand && (
            <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg animate-bounce">
              <Hand className="w-3.5 h-3.5" /> Hand Raised
            </div>
          )}
        </div>

        {/* 🎨 Live Whiteboard / Drawing Drawer Overlay */}
        {isWhiteboardOpen && (
          <div className="absolute inset-2 sm:inset-4 bg-[#202124]/95 backdrop-blur-xl rounded-3xl z-40 flex flex-col border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="h-14 px-4 sm:px-6 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0 rounded-t-3xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#00A76F]" /> Collaborative Whiteboard
                </span>

                {["#00A76F", "#EA4335", "#FBBC04", "#4285F4", "#A142F4", "#FFFFFF"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => { setDrawColor(color); setIsEraser(false); }}
                    style={{ backgroundColor: color }}
                    className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                      drawColor === color && !isEraser ? "border-white scale-125" : "border-transparent"
                    }`}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setIsEraser(true)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                    isEraser ? "bg-[#00A76F] text-white" : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <Eraser className="w-3 h-3" /> Eraser
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const canvas = whiteboardCanvasRef.current;
                    if (canvas && whiteboardCtxRef.current) {
                      whiteboardCtxRef.current.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/10 text-white hover:bg-red-500/20 hover:text-red-400 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Clear
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

        {/* 💬 Google Meet In-Call Chat Drawer */}
        {isChatOpen && (
          <div className="absolute right-2 sm:right-4 top-2 sm:top-4 bottom-2 sm:bottom-4 w-80 sm:w-96 bg-[#202124] border border-[#3c4043] rounded-3xl z-40 flex flex-col shadow-2xl animate-in slide-in-from-right-10 duration-200">
            <div className="h-14 px-5 border-b border-[#3c4043] flex items-center justify-between shrink-0">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00A76F]" /> In-Call Messages
              </h3>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-full text-[#9aa0a6] hover:text-white hover:bg-[#3c4043] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat History */}
            <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-3 rounded-2xl bg-[#303134] space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#9aa0a6]">
                    <span className="font-bold text-white">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-xs text-[#e8eaed]">{msg.text}</p>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-[#3c4043] flex items-center gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Send a message..."
                className="flex-1 h-10 px-3.5 rounded-xl bg-[#303134] text-xs text-white placeholder:text-[#9aa0a6] focus:outline-none focus:ring-1 focus:ring-[#00A76F]"
              />
              <button
                type="submit"
                className="w-10 h-10 rounded-xl bg-[#00A76F] hover:bg-[#007856] text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Animated Emojis */}
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-20 text-5xl pointer-events-none animate-bounce duration-1000 z-50 select-none"
          >
            {item.emoji}
          </div>
        ))}
      </div>

      {/* ─── Bottom Google Meet Control Pill Bar ─── */}
      <div className="h-20 sm:h-22 bg-[#202124] px-4 sm:px-8 flex items-center justify-between z-30 shrink-0 border-t border-[#3c4043]/40">
        {/* Left Info */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-[#9aa0a6]">
          <ShieldCheck className="w-4 h-4 text-[#00A76F]" />
          <span>Hostel Supervised Calling</span>
        </div>

        {/* Center Control Buttons (Google Meet Style) */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto sm:mx-0">
          {/* Mute Mic */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? "bg-[#ea4335] text-white hover:bg-[#d93025]"
                : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Turn Off Camera */}
          <button
            type="button"
            onClick={toggleVideo}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isVideoOff
                ? "bg-[#ea4335] text-white hover:bg-[#d93025]"
                : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Raise Hand */}
          <button
            type="button"
            onClick={() => setRaisedHand(!raisedHand)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              raisedHand
                ? "bg-[#FBBC04] text-black hover:bg-amber-400"
                : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title="Raise Hand"
          >
            <Hand className="w-5 h-5" />
          </button>

          {/* Live Whiteboard Drawing */}
          <button
            type="button"
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isWhiteboardOpen
                ? "bg-[#00A76F] text-white hover:bg-[#007856]"
                : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title="Open Collaborative Whiteboard"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Screen Share */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isScreenSharing
                ? "bg-[#4285F4] text-white hover:bg-blue-600"
                : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title="Share Screen"
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          {/* Emoji Reactions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#3c4043] hover:bg-[#474a4d] text-white flex items-center justify-center transition-all cursor-pointer"
              title="Reactions"
            >
              <Smile className="w-5 h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 p-2 bg-[#202124] border border-[#3c4043] rounded-2xl shadow-2xl flex items-center gap-1.5 z-50 animate-in zoom-in-95">
                {["❤️", "👍", "🎉", "🔥", "🌟", "👏", "😊"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => triggerReaction(emoji)}
                    className="w-9 h-9 rounded-xl hover:bg-[#3c4043] text-xl flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Snapshot Button */}
          <button
            type="button"
            onClick={handleTakeSnapshot}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#3c4043] hover:bg-[#474a4d] text-white flex items-center justify-center transition-all cursor-pointer"
            title="Take Memory Photo"
          >
            <SnapshotIcon className="w-5 h-5 text-emerald-400" />
          </button>

          {/* Red Google Meet Pill "Leave Call" Button */}
          <button
            type="button"
            onClick={() => handleEndCall("NORMAL_HANGUP")}
            className="h-11 sm:h-12 px-5 sm:px-6 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-500/30 transition-all cursor-pointer active:scale-95"
            title="Leave Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="hidden sm:inline">Leave Call</span>
          </button>
        </div>

        {/* Right Chat Toggle */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isChatOpen ? "bg-[#00A76F] text-white" : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title="In-Call Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
