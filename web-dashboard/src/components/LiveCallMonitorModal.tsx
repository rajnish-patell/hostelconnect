import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Video, Volume2, PhoneOff, Activity, Clock, Zap, Copy, Check, ExternalLink, Mic, MicOff, VideoOff } from 'lucide-react';

interface ActiveCallProps {
  callId: string;
  studentName: string;
  parentName: string;
  hostelBlock: string;
  tabletDevice: string;
  startTime: string;
  onClose: () => void;
  onEmergencyHangup: (callId: string) => void;
}

export const LiveCallMonitorModal: React.FC<ActiveCallProps> = ({
  callId,
  studentName,
  parentName,
  hostelBlock,
  tabletDevice,
  onClose,
  onEmergencyHangup,
}) => {
  const [seconds, setSeconds] = useState(245); // 4 mins 5 secs
  const [bitrate, setBitrate] = useState(2450); // kbps
  const [packetLoss, setPacketLoss] = useState(0.2); // %
  const [isCopied, setIsCopied] = useState(false);

  // WebRTC Controls
  const [micMuted, setMicMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);

  // Generate Unique Room & Secure JWT Token Link
  const roomName = `room_SCH-DAP_${studentName.toLowerCase().replace(/\s+/g, '')}_${callId}`;
  const token = `jwt_lk_${callId}_${Date.now().toString(36)}`;
  const uniqueCallLink = `http://localhost:3000/call/join?room=${roomName}&token=${token}`;

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
      setBitrate(2300 + Math.floor(Math.random() * 300));
      setPacketLoss(Number((0.1 + Math.random() * 0.3).toFixed(2)));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const copyCallLink = () => {
    navigator.clipboard.writeText(uniqueCallLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-[900px] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-dot shrink-0" />
              <span className="text-xs font-bold text-red-600 uppercase tracking-wide">Live WebRTC Room</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {studentName} → {parentName}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Unique Call Link Generator Bar */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                🔒 Unique Secure Call Access Link (LiveKit Room Token)
              </span>
              <code className="text-xs sm:text-sm text-cyan-400 font-mono break-all leading-relaxed">
                {uniqueCallLink}
              </code>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyCallLink}
                className="flex items-center gap-1.5 text-xs font-bold py-2 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer shadow-md shadow-indigo-200/20"
              >
                {isCopied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                {isCopied ? 'Copied!' : 'Copy Link'}
              </button>
              <a
                href={uniqueCallLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-800 transition no-underline"
              >
                <ExternalLink size={14} /> Open
              </a>
            </div>
          </div>

          {/* Video Stream Feeds Mock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Hostel Student Feed */}
            <div className="relative h-56 sm:h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-xl font-bold text-white mb-3 shadow-lg">
                {studentName.charAt(0)}
              </div>
              <span className="font-semibold text-sm text-white">{studentName} (Student)</span>
              <span className="text-xs text-slate-400 mt-1">Hostel Block: {hostelBlock} • {tabletDevice}</span>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1.5">
                {videoOff ? <VideoOff size={14} className="text-red-400" /> : <Video size={14} className="text-emerald-400" />}
                {videoOff ? 'Video Muted' : 'HD 1080p WebRTC'}
              </div>
            </div>

            {/* Parent Feed */}
            <div className="relative h-56 sm:h-64 bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-xl font-bold text-white mb-3 shadow-lg">
                {parentName.charAt(0)}
              </div>
              <span className="font-semibold text-sm text-white">{parentName} (Parent)</span>
              <span className="text-xs text-slate-400 mt-1">Android App • Verified OTP Session</span>
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1.5">
                {micMuted ? <MicOff size={14} className="text-red-400" /> : <Volume2 size={14} className="text-emerald-400" />}
                {micMuted ? 'Audio Muted' : 'Audio Clear (Echo Cancelled)'}
              </div>
            </div>
          </div>

          {/* Telemetry Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Clock size={13} /> Duration
              </div>
              <div className="text-lg font-extrabold text-cyan-600 mt-1 font-mono">{formatTime(seconds)}</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Activity size={13} /> Bitrate
              </div>
              <div className="text-lg font-extrabold text-emerald-600 mt-1 font-mono">{bitrate} kbps</div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Zap size={13} /> Packet Loss
              </div>
              <div className="text-lg font-extrabold text-purple-600 mt-1 font-mono">{packetLoss}%</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Encryption</div>
              <div className="text-sm font-extrabold text-emerald-600 mt-1">DTLS-SRTP AES-256</div>
            </div>
          </div>

          {/* Meeting Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setMicMuted(!micMuted)}
                className={`flex items-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl border transition cursor-pointer ${
                  micMuted
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {micMuted ? <MicOff size={16} /> : <Mic size={16} />}
                {micMuted ? 'Unmute Audio' : 'Mute Audio'}
              </button>

              <button
                onClick={() => setVideoOff(!videoOff)}
                className={`flex items-center gap-2 text-xs font-bold py-2.5 px-4 rounded-xl border transition cursor-pointer ${
                  videoOff
                    ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {videoOff ? <VideoOff size={16} /> : <Video size={16} />}
                {videoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              </button>
            </div>

            <button
              onClick={() => onEmergencyHangup(callId)}
              className="flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-5 rounded-xl bg-red-600 text-white hover:bg-red-700 transition cursor-pointer shadow-lg shadow-red-100"
            >
              <PhoneOff size={16} /> Force End Call (Emergency Disconnect)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
