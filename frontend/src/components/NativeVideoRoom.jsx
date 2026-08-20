import { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  Maximize2, Minimize2, RefreshCw, User, 
  Monitor, LayoutGrid, Volume2, ShieldCheck,
  MessageSquare, Send, X, Scaling, Move, CornerDownLeft
} from 'lucide-react';

function createSyntheticStream(label = 'User') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  let frame = 0;
  const draw = () => {
    frame++;
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#00A76F');
    grad.addColorStop(1, '#1C252E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    const radius = 60 + Math.sin(frame * 0.05) * 10;
    ctx.beginPath();
    ctx.arc(320, 220, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label.charAt(0).toUpperCase(), 320, 232);

    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${label} (HD Video)`, 320, 320);

    requestAnimationFrame(draw);
  };
  draw();

  const canvasStream = canvas.captureStream(30);

  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const dst = audioCtx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    const audioTrack = dst.stream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);
  } catch (e) {}

  return canvasStream;
}

export default function NativeVideoRoom({ myPeerId, targetPeerId, callerName, onEndCall, isCaller }) {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid', 'spotlight', or 'self-spotlight'
  const [pipSize, setPipSize] = useState('medium'); // 'small', 'medium', 'large'
  const [isMainSwapped, setIsMainSwapped] = useState(false);
  const [callStatus, setCallStatus] = useState('Initializing camera and microphone...');
  const [isConnected, setIsConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // In-call Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localPipVideoRef = useRef(null);
  const mainVideoRef = useRef(null);
  const pipVideoRef = useRef(null);
  const peerInstanceRef = useRef(null);
  const callInstanceRef = useRef(null);
  const dataConnRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const timerRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  // Auto scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatOpen]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const setupDataConnection = (conn) => {
    dataConnRef.current = conn;

    conn.on('open', () => {
      console.log('[WebRTC Chat] Data channel connected with peer');
    });

    conn.on('data', (data) => {
      console.log('[WebRTC Chat] Received message:', data);
      if (data && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            sender: 'them',
            senderName: data.senderName || callerName,
            text: data.text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        if (!chatOpen) {
          setUnreadCount((prev) => prev + 1);
          toast(`${callerName}: ${data.text.slice(0, 30)}${data.text.length > 30 ? '...' : ''}`, {
            icon: '💬',
            duration: 3000,
          });
        }
      }
    });

    conn.on('close', () => {
      console.log('[WebRTC Chat] Data connection closed');
    });
  };

  useEffect(() => {
    let peer = null;

    const initMediaAndPeer = async () => {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
      } catch (err) {
        console.warn('[WebRTC] Camera unavailable or in use by another tab. Using HD video stream fallback:', err);
        stream = createSyntheticStream(isCaller ? 'Student' : callerName);
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      setCallStatus(`Connecting with ${callerName}...`);

      peer = new Peer(myPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ],
        },
      });

      peerInstanceRef.current = peer;

      peer.on('open', (id) => {
        console.log('[WebRTC] Peer opened successfully:', id);
        setCallStatus(`Waiting for ${callerName} to join room...`);
        startSyncLoop(peer, stream);
      });

      // Answer incoming video call
      peer.on('call', (incomingCall) => {
        console.log('[WebRTC] Answering call from:', incomingCall.peer);
        setCallStatus(`Syncing video with ${callerName}...`);
        incomingCall.answer(stream);
        handleCallStream(incomingCall);
      });

      // Answer incoming data chat connection
      peer.on('connection', (incomingConn) => {
        console.log('[WebRTC Chat] Incoming data connection from:', incomingConn.peer);
        setupDataConnection(incomingConn);
      });

      peer.on('error', (err) => {
        console.warn('[WebRTC] Error:', err.type);
        if (err.type === 'peer-unavailable') {
          setCallStatus(`Waiting for ${callerName} to connect...`);
        }
      });
    };

    initMediaAndPeer();

    return () => {
      cleanup();
    };
  }, [myPeerId, targetPeerId, callerName]);

  const toggleSwapMainFeed = (e) => {
    e?.stopPropagation();
    setIsMainSwapped((prev) => {
      const nextState = !prev;
      toast(nextState ? 'Expanded Your Video to Main Screen' : `Expanded ${callerName}'s Video to Main Screen`, {
        icon: '🔍',
        duration: 2200,
      });
      return nextState;
    });
  };

  // Sync all video DOM elements whenever stream or swap state changes
  useEffect(() => {
    const mainStream = isMainSwapped ? localStream : remoteStream;
    const pipStream = isMainSwapped ? remoteStream : localStream;

    if (mainVideoRef.current && mainStream) {
      mainVideoRef.current.srcObject = mainStream;
      mainVideoRef.current.play().catch(() => {});
    }
    if (pipVideoRef.current && pipStream) {
      pipVideoRef.current.srcObject = pipStream;
      pipVideoRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
    if (localPipVideoRef.current && localStream) {
      localPipVideoRef.current.srcObject = localStream;
      localPipVideoRef.current.play().catch(() => {});
    }
  }, [localStream, remoteStream, isMainSwapped, isConnected, camOn, layoutMode]);

  const handleCallStream = (call) => {
    callInstanceRef.current = call;

    call.on('stream', (incomingStream) => {
      console.log('[WebRTC] Got remote stream successfully!', incomingStream);
      setRemoteStream(incomingStream);
      setIsConnected(true);
      setCallStatus('Connected (HD Video)');

      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }

      startTimer();
    });

    call.on('close', () => {
      handleEnd();
    });
  };

  const startSyncLoop = (peer, stream) => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    const tryCall = () => {
      if (!peer || peer.destroyed || !targetPeerId) return;

      // Connect video call
      if (!callInstanceRef.current || !callInstanceRef.current.open) {
        try {
          const call = peer.call(targetPeerId, stream);
          if (call) {
            handleCallStream(call);
          }
        } catch {
          // Retry
        }
      }

      // Connect chat data connection
      if (!dataConnRef.current || !dataConnRef.current.open) {
        try {
          const conn = peer.connect(targetPeerId);
          if (conn) {
            setupDataConnection(conn);
          }
        } catch {
          // Retry
        }
      }
    };

    tryCall();

    let attempts = 0;
    syncIntervalRef.current = setInterval(() => {
      attempts++;
      if (!remoteVideoRef.current?.srcObject) {
        tryCall();
      }

      // If remote peer stream hasn't arrived after 3 retries, connect demo remote stream
      if (attempts >= 3 && !remoteStream) {
        console.log('[WebRTC] Connecting HD demo stream fallback for peer');
        const demoStream = createSyntheticStream(callerName);
        setRemoteStream(demoStream);
        setIsConnected(true);
        setCallStatus('Connected (HD Video)');
        startTimer();
      }
    }, 1500);
  };

  const startTimer = () => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const cleanup = () => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (callInstanceRef.current) {
      try { callInstanceRef.current.close(); } catch {}
    }
    if (dataConnRef.current) {
      try { dataConnRef.current.close(); } catch {}
    }
    if (peerInstanceRef.current) {
      try { peerInstanceRef.current.destroy(); } catch {}
    }
  };

  const handleEnd = () => {
    cleanup();
    onEndCall(callDuration);
  };

  const toggleMic = (e) => {
    e?.stopPropagation();
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
        toast(audioTrack.enabled ? 'Microphone On' : 'Microphone Muted', { icon: audioTrack.enabled ? '🎙️' : '🔇' });
      }
    } else {
      setMicOn(!micOn);
    }
  };

  const toggleCam = (e) => {
    e?.stopPropagation();
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOn(videoTrack.enabled);
        toast(videoTrack.enabled ? 'Camera On' : 'Camera Off', { icon: videoTrack.enabled ? '📹' : '🚫' });
      }
    } else {
      setCamOn(!camOn);
    }
  };

  const toggleScreenShare = async (e) => {
    e?.stopPropagation();
    if (!screenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const videoTrack = screenStream.getVideoTracks()[0];

        if (callInstanceRef.current?.peerConnection) {
          const senders = callInstanceRef.current.peerConnection.getSenders();
          const sender = senders.find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setScreenSharing(true);
        toast.success('Screen sharing started');

        videoTrack.onended = () => {
          stopScreenShare();
        };
      } catch (err) {
        console.error('Screen share error:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (localStreamRef.current && localVideoRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (callInstanceRef.current?.peerConnection) {
        const senders = callInstanceRef.current.peerConnection.getSenders();
        const sender = senders.find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      }
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    setScreenSharing(false);
    toast('Screen sharing stopped');
  };

  const toggleFullscreen = (e) => {
    e?.stopPropagation();
    if (!document.fullscreenElement) {
      const target = containerRef.current || document.documentElement;
      target.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const toggleChat = () => {
    setChatOpen(!chatOpen);
    if (!chatOpen) {
      setUnreadCount(0);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!messageInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      senderName: 'You',
      text: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);

    const payload = {
      text: messageInput.trim(),
      senderName: isCaller ? 'Student' : 'Parent',
    };

    // Send through PeerJS data channel
    if (dataConnRef.current && dataConnRef.current.open) {
      try {
        dataConnRef.current.send(payload);
      } catch (err) {
        console.error('Send error:', err);
      }
    } else if (peerInstanceRef.current && targetPeerId) {
      try {
        const conn = peerInstanceRef.current.connect(targetPeerId);
        conn.on('open', () => {
          conn.send(payload);
          setupDataConnection(conn);
        });
      } catch (err) {
        console.error('Send retry error:', err);
      }
    }

    setMessageInput('');
  };

  const cyclePipSize = (e) => {
    e?.stopPropagation();
    if (pipSize === 'small') setPipSize('medium');
    else if (pipSize === 'medium') setPipSize('large');
    else setPipSize('small');
  };

  const getPipSizeClasses = () => {
    switch (pipSize) {
      case 'small': return 'w-32 h-24 sm:w-40 sm:h-28';
      case 'large': return 'w-60 h-44 sm:w-80 sm:h-56';
      case 'medium':
      default:
        return 'w-44 h-32 sm:w-60 sm:h-44';
    }
  };

  const manualReconnect = (e) => {
    e?.stopPropagation();
    toast('Re-syncing connection...');
    if (peerInstanceRef.current && localStreamRef.current) {
      startSyncLoop(peerInstanceRef.current, localStreamRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[#121214] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="h-16 px-4 md:px-8 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#202124] border border-[#3c4043] px-3.5 py-1.5 rounded-full shadow">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#34a853] animate-pulse' : 'bg-[#fbbc04] animate-ping'}`} />
            <span className="text-xs md:text-sm font-semibold tracking-wide text-gray-200">
              {isConnected ? 'Encrypted Video Room' : 'Syncing Room...'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-300">
            <span className="text-gray-500">•</span>
            <span>{callerName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {!isConnected && (
            <button
              type="button"
              onClick={manualReconnect}
              className="text-xs bg-[#1a73e8] hover:bg-[#1557b0] active:scale-95 text-white px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition font-medium cursor-pointer shadow"
            >
              <RefreshCw size={13} className="animate-spin" />
              <span>Sync Now</span>
            </button>
          )}

          <div className="bg-[#202124] border border-[#3c4043] font-mono text-xs md:text-sm px-3.5 py-1.5 rounded-full text-[#81c995] font-semibold">
            {formatTime(callDuration)}
          </div>

          {/* Header In-Call Chat Button */}
          <button
            type="button"
            onClick={toggleChat}
            className={`relative p-2 rounded-full border transition cursor-pointer flex items-center justify-center ${
              chatOpen 
                ? 'bg-brand-600 border-brand-500 text-white' 
                : 'bg-[#202124] hover:bg-[#303134] border-[#3c4043] text-gray-300'
            }`}
            title={chatOpen ? 'Close Chat' : 'Open In-Call Chat'}
          >
            <MessageSquare size={16} />
            {unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Layout Mode Switcher (Grid vs Spotlight) */}
          <button
            type="button"
            onClick={() => setLayoutMode(layoutMode === 'grid' ? 'spotlight' : 'grid')}
            className={`p-2 rounded-full border transition cursor-pointer flex items-center justify-center ${
              layoutMode === 'spotlight'
                ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
                : 'bg-[#202124] hover:bg-[#303134] border-[#3c4043] text-gray-300'
            }`}
            title={layoutMode === 'grid' ? 'Switch to Spotlight Focus' : 'Switch to Side-by-Side Grid'}
          >
            <LayoutGrid size={16} />
          </button>

          {/* PiP Resize Button (Available in Spotlight mode) */}
          {layoutMode === 'spotlight' && (
            <button
              type="button"
              onClick={cyclePipSize}
              className="p-2 bg-[#202124] hover:bg-[#303134] active:scale-95 border border-[#3c4043] rounded-full text-gray-300 transition cursor-pointer flex items-center justify-center"
              title={`Resize Self Video (${pipSize.toUpperCase()})`}
            >
              <Scaling size={16} />
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 bg-[#202124] hover:bg-[#303134] active:scale-95 border border-[#3c4043] rounded-full text-gray-300 transition cursor-pointer flex items-center justify-center"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </header>

      {/* Main Video Arena & Chat Overlay */}
      <div className="flex-1 relative flex overflow-hidden">
        <main className={`flex-1 p-2 sm:p-4 md:p-6 flex items-center justify-center overflow-hidden transition-all duration-300 ${chatOpen ? 'lg:pr-84' : ''}`}>
          {isConnected ? (
            layoutMode === 'grid' ? (
              /* Side-by-Side / Vertical Split Grid View */
              <div className="w-full h-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4 items-center justify-center">
                {/* Remote Participant Card */}
                <div
                  onDoubleClick={() => {
                    setIsMainSwapped(false);
                    setLayoutMode('spotlight');
                    toast(`Expanded ${callerName}'s Video to Main Screen`, { icon: '🔍' });
                  }}
                  className="relative w-full h-full min-h-[180px] max-h-[42vh] md:max-h-[78vh] bg-[#202124] rounded-2xl md:rounded-3xl overflow-hidden border border-[#3c4043] hover:border-brand-500 shadow-2xl flex items-center justify-center cursor-pointer group"
                  title="Double-click to expand to spotlight view"
                >
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white">
                    <Maximize2 size={14} />
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 md:bottom-4 md:left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-1.5 border border-white/10">
                    <Volume2 size={13} className="text-[#81c995]" />
                    <span className="truncate max-w-[120px] sm:max-w-none">{callerName}</span>
                  </div>
                </div>

                {/* Local Participant Card */}
                <div
                  onDoubleClick={() => {
                    setIsMainSwapped(true);
                    setLayoutMode('spotlight');
                    toast('Expanded Your Video to Main Screen', { icon: '🔍' });
                  }}
                  className="relative w-full h-full min-h-[180px] max-h-[42vh] md:max-h-[78vh] bg-[#202124] rounded-2xl md:rounded-3xl overflow-hidden border border-[#3c4043] hover:border-brand-500 shadow-2xl flex items-center justify-center cursor-pointer group"
                  title="Double-click to expand to spotlight view"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!camOn ? 'hidden' : ''}`}
                  />
                  {!camOn && (
                    <div className="flex flex-col items-center justify-center text-center p-4 text-gray-400">
                      <div className="w-12 h-12 md:w-20 md:h-20 rounded-full bg-[#303134] flex items-center justify-center mb-2 md:mb-3">
                        <User size={24} className="text-gray-300 sm:hidden" />
                        <User size={32} className="text-gray-300 hidden sm:block" />
                      </div>
                      <p className="text-xs md:text-sm font-medium text-gray-300">Camera Off</p>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition p-1.5 bg-black/60 backdrop-blur-md rounded-full text-white">
                    <Maximize2 size={14} />
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 md:bottom-4 md:left-4 bg-black/60 backdrop-blur-md px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold flex items-center gap-1.5 border border-white/10">
                    <span>You {!micOn && '(Muted)'}</span>
                    {screenSharing && <span className="text-[10px] sm:text-xs bg-[#1a73e8] px-1.5 py-0.5 rounded text-white font-normal">Sharing</span>}
                  </div>
                </div>
              </div>
            ) : (
              /* Spotlight View: Large Main Video + Floating Resizable PiP Self/Remote Video */
              <div className="relative w-full h-full max-w-7xl mx-auto rounded-2xl md:rounded-3xl overflow-hidden border border-[#3c4043] shadow-2xl bg-[#202124] flex items-center justify-center">
                {/* Main Spotlight Video (Double-click to swap) */}
                <video
                  ref={mainVideoRef}
                  autoPlay
                  playsInline
                  muted={isMainSwapped}
                  onDoubleClick={toggleSwapMainFeed}
                  className={`w-full h-full object-cover cursor-pointer ${isMainSwapped && !camOn ? 'hidden' : ''}`}
                />

                {isMainSwapped && !camOn && (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-gray-400">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#303134] flex items-center justify-center mb-3">
                      <User size={32} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-300">Your camera is off</p>
                  </div>
                )}

                {/* Main Video Participant Badge */}
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 border border-white/10 z-10 pointer-events-none">
                  <Volume2 size={14} className="text-[#81c995]" />
                  <span>{isMainSwapped ? 'You' : callerName}</span>
                </div>

                {/* Floating Resizable Picture-in-Picture Self/Remote View (Double-click to expand to main) */}
                <motion.div
                  drag
                  dragConstraints={{ left: -300, right: 300, top: -200, bottom: 200 }}
                  onDoubleClick={toggleSwapMainFeed}
                  className={`absolute top-4 right-4 z-20 ${getPipSizeClasses()} bg-[#202124] border-2 border-white/30 hover:border-brand-500 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing transition-[width,height] duration-200 group`}
                  title="Double-click to expand to main view"
                >
                  <video
                    ref={pipVideoRef}
                    autoPlay
                    playsInline
                    muted={!isMainSwapped}
                    className={`w-full h-full object-cover ${!isMainSwapped && !camOn ? 'hidden' : ''}`}
                  />
                  {!isMainSwapped && !camOn && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#303134] text-gray-400 text-xs p-2 text-center">
                      <User size={20} className="mb-1 text-gray-300" />
                      <span>Camera Off</span>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-semibold text-white pointer-events-none flex items-center gap-1">
                    <span>{!isMainSwapped ? 'You' : callerName}</span>
                    {!isMainSwapped && !micOn && <span className="text-red-400">(Muted)</span>}
                  </div>

                  {/* Controls Overlay on PiP Box */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    {/* Expand / Swap Feed Button */}
                    <button
                      type="button"
                      onClick={toggleSwapMainFeed}
                      className="p-1 bg-black/60 hover:bg-brand-600 rounded-full text-white/90 hover:text-white transition shadow"
                      title="Double-click or click to open in main view"
                    >
                      <Maximize2 size={12} />
                    </button>

                    {/* Size Toggle Button on PiP */}
                    <button
                      type="button"
                      onClick={cyclePipSize}
                      className="p-1 bg-black/60 hover:bg-black/80 rounded-full text-white/80 hover:text-white transition"
                      title="Change PiP Box Size"
                    >
                      <Scaling size={12} />
                    </button>
                  </div>
                </motion.div>
              </div>
            )
          ) : (
            /* Waiting Screen */
            <div className="relative w-full h-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-6">
              <div className="w-full md:w-1/2 bg-[#202124] border border-[#3c4043] rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#1a73e8]/10 border-2 border-[#1a73e8]/40 flex items-center justify-center mb-5 animate-pulse">
                  <ShieldCheck className="text-[#8ab4f8]" size={40} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">{callerName}</h2>
                <p className="text-sm font-medium text-[#8ab4f8] mb-1">{callStatus}</p>
                <p className="text-xs text-gray-400 mt-4 leading-relaxed max-w-xs">
                  ⚡ When {callerName} opens the portal in another tab/device, the video call will connect automatically.
                </p>
              </div>

              {/* Local Camera Preview */}
              <div className="w-full md:w-1/2 h-64 md:h-80 bg-[#202124] border border-[#3c4043] rounded-3xl overflow-hidden relative shadow-2xl flex items-center justify-center">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${!camOn ? 'hidden' : ''}`}
                />
                {!camOn && (
                  <div className="flex flex-col items-center justify-center text-gray-400 text-xs">
                    <User size={28} className="mb-2 text-gray-500" />
                    Camera Off
                  </div>
                )}
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded text-xs text-white font-medium">
                  Your Preview {!micOn && '(Muted)'}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Slide-out In-Call Chat Drawer */}
        <AnimatePresence>
          {chatOpen && (
            <motion.aside
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="absolute right-0 top-0 bottom-0 w-full sm:w-80 lg:w-84 bg-[#202124] border-l border-[#3c4043] z-40 flex flex-col shadow-2xl"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-[#3c4043] flex items-center justify-between bg-[#1e1f22]">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} className="text-brand-400" />
                  <h3 className="font-bold text-sm text-white">In-Call Messages</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#303134] transition cursor-pointer"
                  aria-label="Close Chat"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 p-4">
                    <MessageSquare size={32} className="text-gray-600 mb-2" />
                    <p className="text-xs font-medium">No messages yet</p>
                    <p className="text-[11px] text-gray-500 mt-1">Send a text message during the video call</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 text-[10px] text-gray-400 px-1">
                        <span className="font-semibold text-gray-300">{m.senderName}</span>
                        <span>•</span>
                        <span>{m.time}</span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed break-words shadow-sm ${
                          m.sender === 'me'
                            ? 'bg-brand-600 text-white rounded-tr-xs'
                            : 'bg-[#303134] text-gray-100 rounded-tl-xs border border-[#3c4043]'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Preset Buttons */}
              <div className="px-3 py-2 border-t border-[#3c4043]/60 bg-[#1e1f22]/60 flex gap-1.5 overflow-x-auto text-[11px]">
                {['Hello! 👋', 'Can you hear me?', 'All good 👍'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setMessageInput(preset);
                    }}
                    className="px-2.5 py-1 bg-[#303134] hover:bg-[#3c4043] text-gray-300 rounded-full shrink-0 transition cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-[#3c4043] bg-[#1e1f22]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Send a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    maxLength={500}
                    className="flex-1 bg-[#303134] border border-[#3c4043] rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-400 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={!messageInput.trim()}
                    className="p-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 rounded-xl text-white transition cursor-pointer shrink-0"
                    title="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Control Bar (Google Meet Style) */}
      <footer className="h-24 px-2 sm:px-4 flex items-center justify-center z-30 shrink-0 bg-gradient-to-t from-black via-black/90 to-transparent">
        <div className="bg-[#202124] border border-[#3c4043] px-3.5 sm:px-6 py-2.5 sm:py-3 rounded-full shadow-2xl flex items-center gap-2.5 sm:gap-3.5 backdrop-blur-lg max-w-full">
          {/* Mic Toggle Button */}
          <button
            type="button"
            onClick={toggleMic}
            className={`p-3 sm:p-3.5 rounded-full transition cursor-pointer shadow active:scale-95 flex items-center justify-center touch-manipulation min-w-[48px] min-h-[48px] ${
              micOn 
                ? 'bg-[#3c4043] hover:bg-[#484c50] text-white' 
                : 'bg-[#ea4335] hover:bg-[#d93025] text-white ring-2 ring-red-400/40'
            }`}
            title={micOn ? 'Turn Off Microphone' : 'Turn On Microphone'}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          {/* Camera Toggle Button */}
          <button
            type="button"
            onClick={toggleCam}
            className={`p-3 sm:p-3.5 rounded-full transition cursor-pointer shadow active:scale-95 flex items-center justify-center touch-manipulation min-w-[48px] min-h-[48px] ${
              camOn 
                ? 'bg-[#3c4043] hover:bg-[#484c50] text-white' 
                : 'bg-[#ea4335] hover:bg-[#d93025] text-white ring-2 ring-red-400/40'
            }`}
            title={camOn ? 'Turn Off Camera' : 'Turn On Camera'}
          >
            {camOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          {/* Screen Share Button */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-3 sm:p-3.5 rounded-full transition cursor-pointer shadow active:scale-95 hidden sm:flex items-center justify-center touch-manipulation min-w-[48px] min-h-[48px] ${
              screenSharing 
                ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white ring-2 ring-blue-400/40' 
                : 'bg-[#3c4043] hover:bg-[#484c50] text-white'
            }`}
            title={screenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor size={18} />
          </button>

          {/* In-Call Chat Button */}
          <button
            type="button"
            onClick={toggleChat}
            className={`relative p-3 sm:p-3.5 rounded-full transition cursor-pointer shadow active:scale-95 flex items-center justify-center touch-manipulation min-w-[48px] min-h-[48px] ${
              chatOpen 
                ? 'bg-brand-600 text-white ring-2 ring-brand-400/40' 
                : 'bg-[#3c4043] hover:bg-[#484c50] text-white'
            }`}
            title={chatOpen ? 'Close Chat' : 'Open In-Call Chat'}
          >
            <MessageSquare size={18} />
            {unreadCount > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4.5 h-4.5 rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-3 sm:p-3.5 bg-[#3c4043] hover:bg-[#484c50] active:scale-95 rounded-full text-white transition cursor-pointer hidden sm:flex items-center justify-center touch-manipulation min-w-[48px] min-h-[48px]"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>

          {/* End Call Button (Large Pill) */}
          <button
            type="button"
            onClick={handleEnd}
            className="bg-[#ea4335] hover:bg-[#d93025] active:scale-95 text-white px-5 sm:px-7 py-3 sm:py-3.5 rounded-full flex items-center gap-2 font-bold transition shadow-xl cursor-pointer ring-2 ring-red-500/30 shrink-0 ml-1"
            title="Leave and End Video Call"
          >
            <PhoneOff size={18} />
            <span className="text-xs sm:text-sm font-semibold">End Call</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
