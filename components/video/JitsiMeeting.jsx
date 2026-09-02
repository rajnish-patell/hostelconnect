"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Radio,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

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
  const warningShownRef = useRef(false);
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [raisedHand, setRaisedHand] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  // Spotlight / Enlarged view (null: split 50/50, 'remote': remote focused, 'local': self focused)
  const [spotlightTile, setSpotlightTile] = useState(null);

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

  // Whiteboard / Drawing Drawer
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
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const broadcastChannelRef = useRef(null);
  const supabaseChannelRef = useRef(null);
  const chatScrollRef = useRef(null);

  const maxSeconds = maxDurationMinutes * 60;
  const remainingSeconds = Math.max(0, maxSeconds - elapsedSeconds);
  const myName = isStudent ? studentName : parentName;
  const peerName = isStudent ? parentName : studentName;
  const myRole = isStudent ? "STUDENT" : "PARENT";
  const roomIdentifier = meetingId || sessionId || "safe-room";

  // Helper to send WebRTC signals
  const sendSignal = useCallback(
    (signalPayload) => {
      const payload = { ...signalPayload, senderRole: myRole, timestamp: Date.now() };

      if (supabaseChannelRef.current) {
        supabaseChannelRef.current.send({
          type: "broadcast",
          event: "webrtc_signal",
          payload,
        }).catch(() => {});
      }

      if (broadcastChannelRef.current) {
        try {
          broadcastChannelRef.current.postMessage(payload);
        } catch (_) {}
      }
    },
    [myRole]
  );

  // Floating Emoji Reactions
  const triggerReaction = useCallback(
    (emoji, broadcast = true) => {
      const id = Date.now().toString() + Math.random();
      setFloatingEmojis((prev) => [...prev, { id, emoji, left: Math.random() * 60 + 20 }]);
      setTimeout(() => {
        setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
      }, 2500);

      if (broadcast) {
        sendSignal({ type: "EMOJI_REACTION", emoji });
      }
      setShowEmojiPicker(false);
    },
    [sendSignal]
  );

  // End Call Handler
  const handleEndCall = useCallback(
    async (reason = "NORMAL_HANGUP", broadcast = true) => {
      if (callEnded) return;
      setCallEnded(true);
      if (timerRef.current) clearInterval(timerRef.current);

      if (broadcast) {
        sendSignal({ type: "CALL_ENDED" });
      }

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
          console.error("End call log error:", err);
        }
      }

      if (onCallEnded) {
        try {
          onCallEnded();
        } catch (_) {
          router.push(isStudent ? "/device" : "/parent/calls");
        }
      } else {
        if (isStudent) {
          router.push("/device");
        } else {
          router.push("/parent/calls");
        }
      }
    },
    [callEnded, isStudent, onCallEnded, router, sendSignal, sessionId]
  );

  // 1. Initialize Direct Camera & Cross-Device WebRTC Signaling
  useEffect(() => {
    let isCleanedUp = false;
    const supabase = createClient();

    async function setupWebRTC() {
      try {
        let stream = null;
        if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
        }

        if (typeof window === "undefined" || !window.RTCPeerConnection) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        if (stream) {
          stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
          });
        }

        // Handle incoming remote audio/video tracks
        pc.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
              remoteVideoRef.current.play().catch(() => {});
            }
            setHasRemoteVideo(true);
            setPeerConnected(true);
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            sendSignal({ type: "ICE_CANDIDATE", candidate: event.candidate });
          }
        };

        // Process incoming signaling messages
        const handleIncomingSignal = async (data) => {
          if (!data || data.senderRole === myRole || isCleanedUp) return;

          try {
            if (data.type === "PEER_JOINED") {
              setPeerConnected(true);
              if (isStudent) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal({ type: "SDP_OFFER", sdp: offer });
              }
            } else if (data.type === "SDP_OFFER" && !isStudent) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignal({ type: "SDP_ANSWER", sdp: answer });
              setPeerConnected(true);
            } else if (data.type === "SDP_ANSWER" && isStudent) {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              setPeerConnected(true);
            } else if (data.type === "ICE_CANDIDATE" && data.candidate) {
              await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else if (data.type === "CHAT_MESSAGE" && data.message) {
              setChatMessages((prev) => [...prev, data.message]);
            } else if (data.type === "EMOJI_REACTION" && data.emoji) {
              triggerReaction(data.emoji, false);
            } else if (data.type === "WHITEBOARD_CLEAR") {
              const canvas = whiteboardCanvasRef.current;
              if (canvas && whiteboardCtxRef.current) {
                whiteboardCtxRef.current.clearRect(0, 0, canvas.width, canvas.height);
              }
            } else if (data.type === "CALL_ENDED") {
              handleEndCall("REMOTE_HANGUP", false);
            }
          } catch (err) {
            console.warn("[Signaling Note]:", err.message);
          }
        };

        // 1. Setup Supabase Realtime Channel
        const sbChannel = supabase.channel(`call_room_${roomIdentifier}`, {
          config: { broadcast: { self: false } },
        });

        sbChannel
          .on("broadcast", { event: "webrtc_signal" }, ({ payload }) => {
            handleIncomingSignal(payload);
          })
          .subscribe((status) => {
            if (status === "SUBSCRIBED") {
              sendSignal({ type: "PEER_JOINED" });
            }
          });

        supabaseChannelRef.current = sbChannel;

        // 2. Setup BroadcastChannel Fallback
        if ("BroadcastChannel" in window) {
          const bc = new BroadcastChannel(`hct_call_${roomIdentifier}`);
          broadcastChannelRef.current = bc;
          bc.onmessage = (event) => handleIncomingSignal(event.data);
          sendSignal({ type: "PEER_JOINED" });
        }

        // Student creates initial offer
        if (isStudent) {
          setTimeout(async () => {
            if (!isCleanedUp && pc.signalingState !== "closed") {
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                sendSignal({ type: "SDP_OFFER", sdp: offer });
              } catch (_) {}
            }
          }, 600);
        }
      } catch (err) {
        console.warn("Camera/Mic access note:", err.message);
      }
    }

    setupWebRTC();

    if (sessionId) {
      fetch(`/api/calls/${sessionId}/start`, { method: "POST" }).catch(() => {});
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      isCleanedUp = true;
      if (timerRef.current) clearInterval(timerRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (supabaseChannelRef.current) {
        supabase.removeChannel(supabaseChannelRef.current);
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [roomIdentifier, sessionId, isStudent, handleEndCall, sendSignal, triggerReaction, myRole]);

  // Supervision Warnings & Auto Hangup
  useEffect(() => {
    if (remainingSeconds <= 120 && remainingSeconds > 0 && !warningShownRef.current) {
      warningShownRef.current = true;
    }
    if (remainingSeconds === 0 && !callEnded) {
      const timer = setTimeout(() => {
        handleEndCall("MAX_DURATION_REACHED");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [remainingSeconds, callEnded, handleEndCall]);

  // Initialize Whiteboard Canvas Context when Whiteboard opens
  useEffect(() => {
    if (isWhiteboardOpen && whiteboardCanvasRef.current) {
      const canvas = whiteboardCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 800;
      canvas.height = rect.height || 500;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        whiteboardCtxRef.current = ctx;
      }
    }
  }, [isWhiteboardOpen]);

  // ─── 1. TOGGLE MICROPHONE (Audio Mute) ───
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const nextState = !isMuted;
      audioTracks.forEach((track) => {
        track.enabled = !nextState;
      });
      setIsMuted(nextState);
    } else {
      setIsMuted(!isMuted);
    }
  };

  // ─── 2. TOGGLE VIDEO (Camera Off / On with Safe Track Recovery) ───
  const toggleVideo = async () => {
    try {
      const nextState = !isVideoOff;
      setIsVideoOff(nextState);

      if (localStreamRef.current) {
        const videoTracks = localStreamRef.current.getVideoTracks();
        if (videoTracks.length > 0) {
          videoTracks.forEach((track) => {
            track.enabled = !nextState;
          });
        }

        // If turning camera back ON, ensure srcObject is active and playing
        if (!nextState && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
          localVideoRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      console.error("Toggle video error:", err);
    }
  };

  // ─── 3. TOGGLE SCREEN SHARING (WebRTC Sender Track Replacement) ───
  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert("Screen sharing is not supported in this browser.");
          return;
        }

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];

        // 1. Update local preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
          localVideoRef.current.play().catch(() => {});
        }

        // 2. Replace track on WebRTC PeerConnection sender
        if (peerConnectionRef.current) {
          const senders = peerConnectionRef.current.getSenders();
          const videoSender = senders.find((s) => s.track && s.track.kind === "video");
          if (videoSender) {
            videoSender.replaceTrack(screenTrack);
          }
        }

        setIsScreenSharing(true);

        // Listen for browser native "Stop Sharing" button
        screenTrack.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }
    } catch (err) {
      console.warn("Screen share cancelled or not allowed:", err);
      setIsScreenSharing(false);
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    // Restore camera track to local video and WebRTC peer
    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }

      if (peerConnectionRef.current && cameraTrack) {
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(cameraTrack);
        }
      }
    }

    setIsScreenSharing(false);
  };

  // ─── 4. DOUBLE CLICK / SPOTLIGHT TOGGLE ───
  const handleToggleSpotlight = (target) => {
    if (spotlightTile === target) {
      setSpotlightTile(null); // Restore 50/50 split
    } else {
      setSpotlightTile(target); // Enlarge selected participant
    }
  };

  // ─── 5. SEND CHAT MESSAGE ───
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
    sendSignal({ type: "CHAT_MESSAGE", message: newMsg });
  };

  // ─── 6. MEMORY SNAPSHOT ───
  const handleTakeSnapshot = () => {
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 300);

    const videoSource = remoteVideoRef.current?.videoWidth ? remoteVideoRef.current : localVideoRef.current;

    if (videoSource) {
      const canvas = document.createElement("canvas");
      canvas.width = videoSource.videoWidth || 1280;
      canvas.height = videoSource.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoSource, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(0, 167, 111, 0.9)";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText(`HostelConnect: ${studentName} ↔ ${parentName}`, 30, canvas.height - 40);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px sans-serif";
      ctx.fillText(new Date().toLocaleDateString("en-IN", { dateStyle: "full" }), 30, canvas.height - 15);

      const link = document.createElement("a");
      link.download = `HostelConnect_${studentName}_${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }
  };

  // ─── 7. FULLSCREEN TOGGLE ───
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // ─── 8. WHITEBOARD DRAWING LOGIC (Mouse & Touch Safe) ───
  const getCanvasCoords = (e) => {
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const canvas = whiteboardCanvasRef.current;
    if (!canvas) return;

    if (!whiteboardCtxRef.current) {
      whiteboardCtxRef.current = canvas.getContext("2d");
    }
    const ctx = whiteboardCtxRef.current;
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isEraser ? "#202124" : drawColor;
    ctx.lineWidth = isEraser ? 24 : lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = whiteboardCtxRef.current;
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
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
      sendSignal({ type: "WHITEBOARD_CLEAR" });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[100dvh] bg-[#202124] text-white flex flex-col font-sans select-none overflow-hidden"
    >
      {/* Snapshot Flash Overlay */}
      {snapshotFlash && <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-300 pointer-events-none" />}

      {/* ─── Top Header Bar ─── */}
      <header className="h-14 sm:h-16 px-3 sm:px-6 bg-[#202124] flex items-center justify-between z-20 shrink-0 border-b border-[#3c4043]/50">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#00A76F] animate-pulse shrink-0" />
          <h1 className="font-bold text-xs sm:text-base text-white truncate max-w-[160px] sm:max-w-[320px]">
            {studentName} ↔ {parentName}
          </h1>
          <span className="hidden lg:inline-flex text-[11px] text-[#9aa0a6] px-2.5 py-0.5 rounded-full bg-[#3c4043]/50 font-mono">
            {meetingId || "meet.google.com/safe"}
          </span>
        </div>

        {/* Timer & Supervised Indicator */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all ${
              remainingSeconds <= 120
                ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                : "bg-[#303134] text-white border-[#3c4043]"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#00A76F]" />
            <span>{formatDuration(remainingSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-full hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ─── Video Stage (Supports Split 50/50 AND Double-Click Spotlight Mode) ─── */}
      <main className="flex-1 w-full p-2 sm:p-4 relative overflow-hidden flex items-center justify-center">
        <div
          className={`w-full h-full transition-all duration-300 ${
            spotlightTile ? "relative" : "grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4"
          }`}
        >
          {/* ─── Tile 1: Remote Participant ─── */}
          <div
            onDoubleClick={() => handleToggleSpotlight("remote")}
            className={`relative rounded-2xl bg-[#3c4043] overflow-hidden flex items-center justify-center border border-[#3c4043]/60 shadow-xl transition-all duration-300 cursor-pointer ${
              spotlightTile === "remote"
                ? "w-full h-full z-10"
                : spotlightTile === "local"
                ? "absolute bottom-4 right-4 w-44 sm:w-56 h-32 sm:h-40 z-20 ring-2 ring-[#00A76F] shadow-2xl rounded-2xl"
                : "w-full h-full min-h-[220px]"
            }`}
            title="Double-click to Spotlight / Enlarge"
          >
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${hasRemoteVideo ? "block" : "hidden"}`}
            />

            {!hasRemoteVideo && (
              <div className="flex flex-col items-center justify-center space-y-3 p-4 sm:p-6 text-center">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-[#00A76F] via-[#007856] to-[#004B34] text-white flex items-center justify-center font-extrabold text-3xl sm:text-4xl shadow-2xl ring-4 ring-white/10 animate-pulse">
                    {peerName.charAt(0)}
                  </div>
                  <span className="absolute bottom-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00A76F] border-2 border-[#202124] flex items-center justify-center">
                    <Radio className="w-3 h-3 text-white animate-spin" />
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">{peerName}</h3>
                  <p className="text-[11px] sm:text-xs text-[#5BE49B] flex items-center justify-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Connecting live encrypted stream...
                  </p>
                </div>
              </div>
            )}

            {/* Tile Label & Spotlight Button */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] sm:text-xs font-bold text-white flex items-center gap-2 border border-white/10 z-10 pointer-events-none">
              <span>{peerName}</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSpotlight("remote");
              }}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white/80 hover:text-white transition-all z-10 cursor-pointer"
              title={spotlightTile === "remote" ? "Exit Spotlight" : "Spotlight Participant"}
            >
              {spotlightTile === "remote" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* ─── Tile 2: Self View Camera ─── */}
          <div
            onDoubleClick={() => handleToggleSpotlight("local")}
            className={`relative rounded-2xl bg-[#3c4043] overflow-hidden flex items-center justify-center border border-[#3c4043]/60 shadow-xl transition-all duration-300 cursor-pointer ${
              spotlightTile === "local"
                ? "w-full h-full z-10"
                : spotlightTile === "remote"
                ? "absolute bottom-4 right-4 w-44 sm:w-56 h-32 sm:h-40 z-20 ring-2 ring-[#00A76F] shadow-2xl rounded-2xl"
                : "w-full h-full min-h-[220px]"
            }`}
            title="Double-click to Spotlight / Enlarge"
          >
            {/* Camera Off Avatar Overlay */}
            {isVideoOff && (
              <div className="flex flex-col items-center justify-center space-y-2 z-10">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#5f6368] text-white flex items-center justify-center font-extrabold text-2xl sm:text-3xl">
                  {myName.charAt(0)}
                </div>
                <p className="text-[11px] text-[#9aa0a6] font-semibold">Camera is Off</p>
              </div>
            )}

            {/* Video Element is ALWAYS kept in DOM so srcObject is never lost */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover mirror transform -scale-x-100 ${
                isVideoOff ? "hidden" : "block"
              }`}
            />

            {/* Tile Label & Spotlight Button */}
            <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] sm:text-xs font-bold text-white flex items-center gap-2 border border-white/10 z-10 pointer-events-none">
              <span>{myName} (You)</span>
              {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
              {isScreenSharing && <span className="text-[10px] text-blue-400">(Sharing Screen)</span>}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleSpotlight("local");
              }}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md text-white/80 hover:text-white transition-all z-10 cursor-pointer"
              title={spotlightTile === "local" ? "Exit Spotlight" : "Spotlight Self View"}
            >
              {spotlightTile === "local" ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {raisedHand && (
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-500 text-black font-extrabold text-[11px] flex items-center gap-1 shadow-lg animate-bounce z-10">
                <Hand className="w-3 h-3" /> Hand Raised
              </div>
            )}
          </div>
        </div>

        {/* 🎨 Live Whiteboard Drawer */}
        {isWhiteboardOpen && (
          <div className="absolute inset-2 sm:inset-4 bg-[#202124]/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl z-40 flex flex-col border border-white/10 shadow-2xl">
            <div className="h-12 sm:h-14 px-3 sm:px-6 bg-black/40 border-b border-white/10 flex items-center justify-between shrink-0 rounded-t-2xl sm:rounded-t-3xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  <Palette className="w-4 h-4 text-[#00A76F]" /> Whiteboard
                </span>

                {["#00A76F", "#EA4335", "#FBBC04", "#4285F4", "#FFFFFF"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setDrawColor(color);
                      setIsEraser(false);
                    }}
                    style={{ backgroundColor: color }}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 transition-all cursor-pointer ${
                      drawColor === color && !isEraser ? "border-white scale-125" : "border-transparent"
                    }`}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => setIsEraser(!isEraser)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    isEraser ? "bg-[#00A76F] text-white" : "bg-white/10 text-white"
                  }`}
                >
                  <Eraser className="w-3 h-3" /> Eraser
                </button>

                <button
                  type="button"
                  onClick={clearWhiteboard}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-white hover:text-red-400 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsWhiteboardOpen(false)}
                className="p-1 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
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
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full touch-none"
              />
            </div>
          </div>
        )}

        {/* 💬 In-Call Chat Drawer */}
        {isChatOpen && (
          <div className="absolute right-2 sm:right-4 top-2 sm:top-4 bottom-2 sm:bottom-4 w-72 sm:w-80 max-w-[90vw] bg-[#202124] border border-[#3c4043] rounded-2xl z-40 flex flex-col shadow-2xl">
            <div className="h-12 px-4 border-b border-[#3c4043] flex items-center justify-between shrink-0">
              <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#00A76F]" /> Messages
              </h3>
              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="p-1 rounded-full text-[#9aa0a6] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={chatScrollRef} className="flex-1 p-3 overflow-y-auto space-y-2">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-[#303134] space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] text-[#9aa0a6]">
                    <span className="font-bold text-white">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-xs text-[#e8eaed]">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-2.5 border-t border-[#3c4043] flex items-center gap-1.5">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Message..."
                className="flex-1 h-9 px-3 rounded-lg bg-[#303134] text-xs text-white placeholder:text-[#9aa0a6] focus:outline-none focus:ring-1 focus:ring-[#00A76F]"
              />
              <button
                type="submit"
                className="w-9 h-9 rounded-lg bg-[#00A76F] hover:bg-[#007856] text-white flex items-center justify-center cursor-pointer transition-all shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {/* Floating Animated Emojis */}
        {floatingEmojis.map((item) => (
          <div
            key={item.id}
            style={{ left: `${item.left}%` }}
            className="absolute bottom-24 text-4xl pointer-events-none animate-bounce duration-1000 z-50 select-none"
          >
            {item.emoji}
          </div>
        ))}
      </main>

      {/* ─── Bottom Responsive Control Bar ─── */}
      <footer className="h-18 sm:h-22 bg-[#202124] px-3 sm:px-8 flex items-center justify-between z-30 shrink-0 border-t border-[#3c4043]/50">
        <div className="hidden md:flex items-center gap-2 text-xs text-[#9aa0a6]">
          <ShieldCheck className="w-4 h-4 text-[#00A76F]" />
          <span>Supervised Call</span>
        </div>

        {/* Control Pill Buttons */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mx-auto w-full md:w-auto max-w-full overflow-x-auto py-1">
          {/* 1. Mute Mic */}
          <button
            type="button"
            onClick={toggleMute}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isMuted ? "bg-[#ea4335] text-white hover:bg-[#d93025]" : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* 2. Turn Off/On Camera */}
          <button
            type="button"
            onClick={toggleVideo}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isVideoOff ? "bg-[#ea4335] text-white hover:bg-[#d93025]" : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title={isVideoOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* 3. Raise Hand */}
          <button
            type="button"
            onClick={() => setRaisedHand(!raisedHand)}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              raisedHand ? "bg-[#FBBC04] text-black" : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title="Raise Hand"
          >
            <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 4. Reactions */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#3c4043] hover:bg-[#474a4d] text-white flex items-center justify-center transition-all cursor-pointer"
              title="Reactions"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-14 sm:bottom-16 left-1/2 -translate-x-1/2 p-2 bg-[#202124] border border-[#3c4043] rounded-2xl shadow-2xl flex items-center gap-1 z-50">
                {["❤️", "👍", "🎉", "🔥", "🌟", "👏"].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => triggerReaction(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-[#3c4043] text-lg flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5. Whiteboard Drawing */}
          <button
            type="button"
            onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isWhiteboardOpen ? "bg-[#00A76F] text-white" : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title="Whiteboard"
          >
            <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 6. Snapshot Button */}
          <button
            type="button"
            onClick={handleTakeSnapshot}
            className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#3c4043] hover:bg-[#474a4d] text-white items-center justify-center transition-all cursor-pointer shrink-0"
            title="Snapshot"
          >
            <SnapshotIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </button>

          {/* 7. Screen Share */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full items-center justify-center transition-all cursor-pointer shrink-0 ${
              isScreenSharing ? "bg-[#4285F4] text-white shadow-lg shadow-blue-500/30" : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 8. Chat Toggle Button */}
          <button
            type="button"
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isChatOpen ? "bg-[#00A76F] text-white" : "bg-[#3c4043] text-white hover:bg-[#474a4d]"
            }`}
            title="Chat Messages"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* 9. Leave Call Button */}
          <button
            type="button"
            onClick={() => handleEndCall("NORMAL_HANGUP")}
            className="h-10 sm:h-12 px-4 sm:px-6 rounded-full bg-[#ea4335] hover:bg-[#d93025] text-white font-extrabold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-red-500/30 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Leave Call"
          >
            <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline sm:inline">Leave</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] text-[#9aa0a6]">{isStudent ? "Hostel Kiosk" : "Parent App"}</span>
        </div>
      </footer>
    </div>
  );
}
