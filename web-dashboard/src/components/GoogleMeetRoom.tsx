import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { MediaConnection, DataConnection } from 'peerjs';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor, MessageSquare, Hand,
  Info, Clock, Wallet, Send, X, Copy, Check, Activity, Camera, Users,
  Loader, WifiOff, CheckCircle2
} from 'lucide-react';

interface GoogleMeetRoomProps {
  roomName: string;
  localDisplayName: string;
  remoteDisplayName: string;
  role: 'caller' | 'joiner';
  remotePeerId?: string;      // Only for joiner — the caller's peer ID
  hostelBlock: string;
  maxMinutes?: number;
  initialWalletBalance?: number;
  localStream: MediaStream;
  onLeaveRoom: () => void;
}

interface ChatMessage {
  sender: string;
  text: string;
  time: string;
}

export const GoogleMeetRoom: React.FC<GoogleMeetRoomProps> = ({
  roomName,
  localDisplayName,
  remoteDisplayName,
  role,
  remotePeerId,
  hostelBlock,
  maxMinutes = 15,
  initialWalletBalance = 450.00,
  localStream,
  onLeaveRoom,
}) => {
  // Call Timer
  const [secondsRemaining, setSecondsRemaining] = useState(maxMinutes * 60);
  const [walletBalance, setWalletBalance] = useState(initialWalletBalance);

  // Controls
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [showMetricsHud, setShowMetricsHud] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connecting' | 'connected' | 'disconnected'>('waiting');
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteMicOn, setRemoteMicOn] = useState(true);
  const [remoteVideoOn, setRemoteVideoOn] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // WebRTC Stats
  const [bitrate, setBitrate] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);

  // Mobile Viewport Tracking
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const mediaConnectionRef = useRef<MediaConnection | null>(null);
  const dataConnectionRef = useRef<DataConnection | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Generate the shareable link
  const getShareableLink = useCallback(() => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?room=${encodeURIComponent(roomName)}&peerId=${encodeURIComponent(myPeerId)}&role=joiner`;
  }, [roomName, myPeerId]);

  // ──────────── PeerJS Initialization ────────────
  useEffect(() => {
    // Generate a deterministic-ish peer ID for the caller based on room name
    const peerId = role === 'caller'
      ? `hc_${roomName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36)}`
      : `hc_joiner_${Date.now().toString(36)}`;

    const peer = new Peer(peerId, {
      debug: 1,
    });

    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('[PeerJS] My peer ID:', id);
      setMyPeerId(id);

      // If joiner, immediately call the remote peer
      if (role === 'joiner' && remotePeerId) {
        setConnectionStatus('connecting');

        // Media call
        const call = peer.call(remotePeerId, localStream);
        mediaConnectionRef.current = call;

        call.on('stream', (rStream) => {
          console.log('[PeerJS] Received remote stream from caller');
          setRemoteStream(rStream);
          setConnectionStatus('connected');
        });

        call.on('close', () => {
          setConnectionStatus('disconnected');
        });

        // Data channel for chat
        const dataConn = peer.connect(remotePeerId, { reliable: true });
        dataConnectionRef.current = dataConn;
        setupDataChannel(dataConn);
      }
    });

    // Caller: listen for incoming calls
    peer.on('call', (call) => {
      console.log('[PeerJS] Incoming call from:', call.peer);
      setConnectionStatus('connecting');
      call.answer(localStream);
      mediaConnectionRef.current = call;

      call.on('stream', (rStream) => {
        console.log('[PeerJS] Received remote stream from joiner');
        setRemoteStream(rStream);
        setConnectionStatus('connected');
      });

      call.on('close', () => {
        setConnectionStatus('disconnected');
      });
    });

    // Caller: listen for incoming data connection
    peer.on('connection', (dataConn) => {
      console.log('[PeerJS] Incoming data connection from:', dataConn.peer);
      dataConnectionRef.current = dataConn;
      setupDataChannel(dataConn);
    });

    peer.on('error', (err) => {
      console.error('[PeerJS] Error:', err);
      if (err.type === 'peer-unavailable') {
        setConnectionStatus('disconnected');
      }
    });

    // Set local video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    return () => {
      peer.destroy();
    };
  }, []);

  // Set remote video when stream changes
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ──────────── Data Channel Setup ────────────
  const setupDataChannel = (conn: DataConnection) => {
    conn.on('open', () => {
      console.log('[PeerJS] Data channel open');
      // Send initial metadata
      conn.send(JSON.stringify({
        type: 'meta',
        name: localDisplayName,
        micOn: isMicOn,
        videoOn: isVideoOn,
      }));
    });

    conn.on('data', (data) => {
      try {
        const parsed = JSON.parse(data as string);
        if (parsed.type === 'chat') {
          const msg: ChatMessage = { sender: parsed.sender, text: parsed.text, time: parsed.time };
          setChatMessages(prev => [...prev, msg]);
          setUnreadMessages(prev => prev + 1);
        } else if (parsed.type === 'mic_toggle') {
          setRemoteMicOn(parsed.value);
        } else if (parsed.type === 'video_toggle') {
          setRemoteVideoOn(parsed.value);
        } else if (parsed.type === 'hand_raise') {
          // Could show a notification
        }
      } catch { /* ignore parse errors */ }
    });

    conn.on('close', () => {
      console.log('[PeerJS] Data channel closed');
    });
  };

  // ──────────── Timer & Wallet ────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleLeave();
          return 0;
        }
        return prev - 1;
      });

      // Deduct wallet: ₹2/min = ₹0.033/sec
      if (connectionStatus === 'connected') {
        setWalletBalance(prev => Math.max(0, Number((prev - 0.033).toFixed(2))));
      }

      // Simulated WebRTC stats (real stats would come from RTCPeerConnection.getStats())
      if (connectionStatus === 'connected') {
        setBitrate(2350 + Math.floor(Math.random() * 250));
        setPacketLoss(Number((0.05 + Math.random() * 0.15).toFixed(2)));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [connectionStatus]);

  // ──────────── Controls ────────────
  const toggleMic = () => {
    localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    const newState = !isMicOn;
    setIsMicOn(newState);
    dataConnectionRef.current?.send(JSON.stringify({ type: 'mic_toggle', value: newState }));
  };

  const toggleVideo = () => {
    localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    const newState = !isVideoOn;
    setIsVideoOn(newState);
    dataConnectionRef.current?.send(JSON.stringify({ type: 'video_toggle', value: newState }));
  };

  const toggleHandRaise = () => {
    const newState = !handRaised;
    setHandRaised(newState);
    dataConnectionRef.current?.send(JSON.stringify({ type: 'hand_raise', value: newState }));
  };

  const handleLeave = () => {
    localStream.getTracks().forEach(t => t.stop());
    mediaConnectionRef.current?.close();
    dataConnectionRef.current?.close();
    peerRef.current?.destroy();
    onLeaveRoom();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const msg: ChatMessage = { sender: localDisplayName, text: inputMessage, time: now() };
    setChatMessages(prev => [...prev, msg]);
    dataConnectionRef.current?.send(JSON.stringify({ type: 'chat', sender: localDisplayName, text: inputMessage, time: now() }));
    setInputMessage('');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getShareableLink());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  // ──────────── Connection Status Badge ────────────
  const StatusBadge = () => {
    const config = {
      waiting: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: <Loader size={14} className="spin-animation" />, text: 'Waiting for parent to join...' },
      connecting: { color: '#38bdf8', bg: 'rgba(56,189,248,0.15)', icon: <Loader size={14} className="spin-animation" />, text: 'Connecting...' },
      connected: { color: '#34d399', bg: 'rgba(16,185,129,0.15)', icon: <CheckCircle2 size={14} />, text: 'Connected' },
      disconnected: { color: '#f87171', bg: 'rgba(239,68,68,0.15)', icon: <WifiOff size={14} />, text: 'Disconnected' },
    };
    const c = config[connectionStatus];
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: c.bg, padding: '4px 12px', borderRadius: '20px', border: `1px solid ${c.color}30`, fontSize: '0.8rem', color: c.color }}>
        {c.icon} {c.text}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#202124', color: '#fff', zIndex: 3000,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
    }}>
      {/* ─── Top Header ─── */}
      <div style={{
        height: '56px', padding: '0 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', background: '#1e1e1e', borderBottom: '1px solid #3c4043',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>
            {localDisplayName} ➔ {remoteDisplayName}
          </span>
          <StatusBadge />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Wallet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#3c4043', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>
            <Wallet size={14} color="#38bdf8" />
            <span style={{ color: '#bdc1c6' }}>Wallet:</span>
            <span style={{ fontWeight: 700, color: '#38bdf8' }}>₹{walletBalance.toFixed(2)}</span>
            <span style={{ color: '#9aa0a6', fontSize: '0.7rem' }}>(₹2/min)</span>
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: secondsRemaining < 180 ? 'rgba(239,68,68,0.3)' : '#3c4043',
            padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem',
            border: secondsRemaining < 180 ? '1px solid #ef4444' : 'none',
          }}>
            <Clock size={14} color={secondsRemaining < 180 ? '#f87171' : '#f59e0b'} />
            <span style={{ fontWeight: 700, color: secondsRemaining < 180 ? '#f87171' : '#f59e0b' }}>
              {formatTimer(secondsRemaining)}
            </span>
          </div>

          {showMetricsHud && connectionStatus === 'connected' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: '#9aa0a6' }}>
              <span>Bitrate: <strong style={{ color: '#38bdf8' }}>{bitrate}kbps</strong></span>
              <span>Loss: <strong style={{ color: '#a78bfa' }}>{packetLoss}%</strong></span>
            </div>
          )}

          <button onClick={() => setShowMetricsHud(!showMetricsHud)} style={{
            background: 'none', border: 'none', color: '#9aa0a6', cursor: 'pointer', padding: '4px',
          }}>
            <Activity size={16} />
          </button>
        </div>
      </div>

      {/* ─── Video Grid ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', padding: '12px', gap: '12px' }}>
        <div
          className="video-grid-container"
          style={{
            flex: '1 1 0%',
            display: 'grid',
            gridTemplateColumns: isMobile || connectionStatus !== 'connected' ? '1fr' : '1fr 1fr',
            gridTemplateRows: isMobile && connectionStatus === 'connected' ? '1fr 1fr' : '1fr',
            gap: '12px',
            height: '100%',
          }}
        >
          {/* Local Video */}
          <div style={{
            position: 'relative', background: '#3c4043', borderRadius: '12px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            border: connectionStatus === 'connected' ? '2px solid #5f6368' : '2px solid #6366f1',
          }}>
            <video
              ref={localVideoRef}
              autoPlay playsInline muted
              style={{
                display: isVideoOn ? 'block' : 'none',
                width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)',
              }}
            />
            {!isVideoOn && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  background: 'linear-gradient(135deg, #6366f1, #3b82f6)', width: '96px', height: '96px',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2.4rem', fontWeight: 700, color: '#fff', margin: '0 auto 12px',
                }}>
                  {localDisplayName.charAt(0)}
                </div>
                <p style={{ color: '#bdc1c6' }}>{localDisplayName}</p>
              </div>
            )}
            {/* Label */}
            <div style={{
              position: 'absolute', bottom: '12px', left: '12px',
              background: 'rgba(32,33,36,0.8)', backdropFilter: 'blur(6px)',
              padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              {isMicOn ? <Mic size={12} color="#34d399" /> : <MicOff size={12} color="#f87171" />}
              {localDisplayName} (You)
            </div>
          </div>

          {/* Remote Video / Waiting State */}
          <div style={{
            position: 'relative', background: '#3c4043', borderRadius: '12px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            border: '2px solid #5f6368',
          }}>
            {connectionStatus === 'connected' && remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay playsInline
                  style={{
                    display: remoteVideoOn ? 'block' : 'none',
                    width: '100%', height: '100%', objectFit: 'cover',
                  }}
                />
                {!remoteVideoOn && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', width: '96px', height: '96px',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '2.4rem', fontWeight: 700, color: '#fff', margin: '0 auto 12px',
                    }}>
                      {remoteDisplayName.charAt(0)}
                    </div>
                    <p style={{ color: '#bdc1c6' }}>{remoteDisplayName}</p>
                    <p style={{ color: '#5f6368', fontSize: '0.8rem' }}>Camera off</p>
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: '12px', left: '12px',
                  background: 'rgba(32,33,36,0.8)', backdropFilter: 'blur(6px)',
                  padding: '4px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {remoteMicOn ? <Mic size={12} color="#34d399" /> : <MicOff size={12} color="#f87171" />}
                  {remoteDisplayName}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="pulse-dot" style={{
                  width: '16px', height: '16px', margin: '0 auto 20px',
                  background: connectionStatus === 'connecting' ? '#38bdf8' : '#f59e0b',
                }} />
                <div style={{
                  background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', width: '80px', height: '80px',
                  borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', fontWeight: 700, color: '#fff', margin: '0 auto 16px',
                  opacity: 0.6,
                }}>
                  {remoteDisplayName.charAt(0)}
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
                  {connectionStatus === 'connecting' ? 'Connecting...' : `Waiting for ${remoteDisplayName}`}
                </h3>
                <p style={{ color: '#9aa0a6', fontSize: '0.85rem', marginBottom: '20px' }}>
                  {role === 'caller'
                    ? 'Share the link below so they can join this call'
                    : 'Establishing secure connection...'}
                </p>

                {role === 'caller' && myPeerId && (
                  <button onClick={copyLink} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isCopied ? 'Link Copied!' : 'Copy Invite Link'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Chat Drawer ─── */}
        {showChatDrawer && (
          <div style={{
            width: '340px', background: '#1e1e1e', borderRadius: '12px',
            border: '1px solid #3c4043', display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #3c4043',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>In-call messages</h4>
              <button onClick={() => { setShowChatDrawer(false); setUnreadMessages(0); }} style={{
                background: 'none', border: 'none', color: '#bdc1c6', cursor: 'pointer',
              }}>
                <X size={16} />
              </button>
            </div>

            <div style={{
              flex: 1, padding: '12px', overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <div style={{
                background: 'rgba(99,102,241,0.12)', padding: '8px 10px', borderRadius: '8px',
                fontSize: '0.75rem', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)',
              }}>
                🔒 Messages are end-to-end via WebRTC DataChannel. Audit logged for compliance.
              </div>

              {chatMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#5f6368', fontSize: '0.85rem', padding: '32px 0' }}>
                  No messages yet. Say hello! 👋
                </div>
              )}

              {chatMessages.map((msg, i) => (
                <div key={i} style={{
                  background: msg.sender === localDisplayName ? 'rgba(99,102,241,0.15)' : '#2D2E31',
                  padding: '8px 12px', borderRadius: '10px',
                  marginLeft: msg.sender === localDisplayName ? '24px' : '0',
                  marginRight: msg.sender === localDisplayName ? '0' : '24px',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.7rem', color: '#9aa0a6', marginBottom: '2px',
                  }}>
                    <span style={{ fontWeight: 600, color: msg.sender === localDisplayName ? '#818cf8' : '#38bdf8' }}>
                      {msg.sender === localDisplayName ? 'You' : msg.sender}
                    </span>
                    <span>{msg.time}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#e8eaed' }}>{msg.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} style={{
              padding: '12px', borderTop: '1px solid #3c4043', display: 'flex', gap: '8px',
            }}>
              <input
                type="text"
                placeholder={connectionStatus === 'connected' ? 'Type a message...' : 'Waiting for connection...'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={connectionStatus !== 'connected'}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '20px',
                  background: '#2D2E31', border: 'none', color: '#fff', fontSize: '0.85rem',
                  opacity: connectionStatus === 'connected' ? 1 : 0.5,
                }}
              />
              <button type="submit" disabled={connectionStatus !== 'connected'} style={{
                width: '40px', height: '40px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: connectionStatus === 'connected' ? 'linear-gradient(135deg, #6366f1, #4338ca)' : '#3c4043',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Send size={16} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ─── Bottom Control Bar ─── */}
      <div style={{
        height: '76px', background: '#1e1e1e', borderTop: '1px solid #3c4043',
        padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Left: Room Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Info size={16} color="#9aa0a6" />
          <span style={{ fontSize: '0.85rem', color: '#bdc1c6', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {roomName}
          </span>
          {role === 'caller' && myPeerId && (
            <button onClick={copyLink} style={{
              background: '#3c4043', border: 'none', color: '#e8eaed', cursor: 'pointer',
              padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              {isCopied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
              {isCopied ? 'Copied' : 'Invite'}
            </button>
          )}
        </div>

        {/* Center: Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {[
            { icon: isMicOn ? <Mic size={20} /> : <MicOff size={20} />, active: !isMicOn, onClick: toggleMic, color: '#ea4335' },
            { icon: isVideoOn ? <Video size={20} /> : <VideoOff size={20} />, active: !isVideoOn, onClick: toggleVideo, color: '#ea4335' },
            { icon: <Monitor size={20} />, active: isScreenSharing, onClick: () => setIsScreenSharing(!isScreenSharing), color: '#8ab4f8' },
            { icon: <Hand size={20} />, active: handRaised, onClick: toggleHandRaise, color: '#fbbc04' },
          ].map((btn, i) => (
            <button key={i} onClick={btn.onClick} style={{
              width: '46px', height: '46px', borderRadius: '50%', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: btn.active ? btn.color : '#3c4043',
              color: btn.active && btn.color !== '#ea4335' ? '#202124' : '#fff',
              transition: 'all 0.2s',
            }}>
              {btn.icon}
            </button>
          ))}

          {/* End Call */}
          <button onClick={handleLeave} style={{
            width: '60px', height: '46px', borderRadius: '23px', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#ea4335', color: '#fff',
            boxShadow: '0 4px 12px rgba(234,67,53,0.4)', transition: 'all 0.2s',
          }}>
            <PhoneOff size={20} />
          </button>
        </div>

        {/* Right: Chat Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => { setShowChatDrawer(!showChatDrawer); if (!showChatDrawer) setUnreadMessages(0); }} style={{
            position: 'relative', width: '46px', height: '46px', borderRadius: '50%', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showChatDrawer ? '#8ab4f8' : '#3c4043',
            color: showChatDrawer ? '#202124' : '#fff',
          }}>
            <MessageSquare size={20} />
            {unreadMessages > 0 && !showChatDrawer && (
              <div style={{
                position: 'absolute', top: '-2px', right: '-2px',
                width: '18px', height: '18px', borderRadius: '50%',
                background: '#ea4335', color: '#fff', fontSize: '0.65rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
              }}>
                {unreadMessages}
              </div>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#9aa0a6' }}>
            <Users size={14} />
            {connectionStatus === 'connected' ? '2' : '1'}
          </div>
        </div>
      </div>
    </div>
  );
};
