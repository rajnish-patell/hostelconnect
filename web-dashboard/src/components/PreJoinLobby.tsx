import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Camera, Settings, RefreshCw, UserCheck, Shield, Phone, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PreJoinLobbyProps {
  roomName: string;
  displayName: string;
  role: 'caller' | 'joiner';
  onJoin: (localStream: MediaStream, selectedVideoDevice: string, selectedAudioDevice: string) => void;
}

export const PreJoinLobby: React.FC<PreJoinLobbyProps> = ({ roomName, displayName, role, onJoin }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const initMedia = async (videoDeviceId?: string, audioDeviceId?: string) => {
    try {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      const constraints: MediaStreamConstraints = {
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setPermissionState('granted');
      if (videoRef.current) videoRef.current.srcObject = stream;

      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDevices = devices.filter(d => d.kind === 'videoinput');
      const aDevices = devices.filter(d => d.kind === 'audioinput');
      setVideoDevices(vDevices);
      setAudioDevices(aDevices);
      if (vDevices.length > 0 && !selectedVideoDevice) setSelectedVideoDevice(vDevices[0].deviceId);
      if (aDevices.length > 0 && !selectedAudioDevice) setSelectedAudioDevice(aDevices[0].deviceId);

      setupAudioMeter(stream);
    } catch (err) {
      console.warn('Media permission error (falling back to synthetic demo stream option):', err);
      setPermissionState('denied');
    }
  };

  const createSyntheticMediaStream = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');

      let frame = 0;
      const draw = () => {
        if (!ctx) return;
        frame++;
        const grad = ctx.createLinearGradient(0, 0, 640, 480);
        grad.addColorStop(0, '#1e1b4b');
        grad.addColorStop(1, '#0e7490');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

        // Pulsing avatar circle
        ctx.beginPath();
        ctx.arc(320, 210, 65 + Math.sin(frame * 0.08) * 6, 0, Math.PI * 2);
        ctx.fillStyle = '#4f46e5';
        ctx.fill();

        // Initial
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(displayName.charAt(0).toUpperCase() || 'U', 320, 210);

        // Name Subtitle
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(displayName, 320, 310);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#a5f3fc';
        ctx.fillText('Encrypted WebRTC Demo Stream', 320, 340);
      };

      const timer = setInterval(draw, 50);
      draw();

      const videoStream = canvas.captureStream(30);
      const videoTrack = videoStream.getVideoTracks()[0];

      // Audio track (silent oscillator fallback)
      const audioCtx = new AudioContext();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.001;
      osc.connect(gain);
      gain.connect(dst);
      osc.start();

      const audioTrack = dst.stream.getAudioTracks()[0];
      const combined = new MediaStream([videoTrack, audioTrack]);

      setLocalStream(combined);
      setPermissionState('granted');
      if (videoRef.current) videoRef.current.srcObject = combined;
    } catch (e) {
      console.error('Failed to create synthetic stream:', e);
    }
  };

  const setupAudioMeter = (stream: MediaStream) => {
    try {
      if (audioContextRef.current) audioContextRef.current.close();
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.min(100, avg * 1.5));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch { /* ignore */ }
  };

  useEffect(() => {
    initMedia();
    return () => {
      if (localStream) localStream.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const toggleMic = () => {
    if (!localStream) return;
    const newState = !isMicOn;
    localStream.getAudioTracks().forEach(t => { t.enabled = newState; });
    setIsMicOn(newState);
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const newState = !isVideoOn;
    localStream.getVideoTracks().forEach(t => { t.enabled = newState; });
    setIsVideoOn(newState);
  };

  const handleJoin = () => {
    if (localStream) onJoin(localStream, selectedVideoDevice, selectedAudioDevice);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left: Video Preview & Controls */}
        <div className="flex-1 p-6 bg-slate-900 text-white flex flex-col justify-between relative min-h-[320px] sm:min-h-[400px]">
          {/* Camera Viewport */}
          <div className="relative flex-1 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
            {isVideoOn && permissionState === 'granted' ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            ) : (
              <div className="text-center p-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl font-bold mx-auto mb-3 shadow-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-slate-400">
                  {permissionState === 'denied' ? 'Camera permission denied' : 'Camera is turned off'}
                </p>
              </div>
            )}

            {/* Mic/Video Floating Toggles */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700">
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isMicOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isMicOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isVideoOn ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                {isVideoOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
            </div>
          </div>

          {/* Audio Meter & Device Controls */}
          <div className="mt-4 space-y-3">
            {isMicOn && permissionState === 'granted' && (
              <div className="flex items-center gap-3 bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700/60">
                <Mic size={14} className="text-emerald-400 shrink-0" />
                <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-100" style={{ width: `${audioLevel}%` }} />
                </div>
                <span className="text-[11px] text-slate-400">Mic Testing</span>
              </div>
            )}

            {permissionState === 'granted' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Camera Source</label>
                  <select
                    value={selectedVideoDevice}
                    onChange={(e) => { setSelectedVideoDevice(e.target.value); initMedia(e.target.value, selectedAudioDevice); }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {videoDevices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Microphone Source</label>
                  <select
                    value={selectedAudioDevice}
                    onChange={(e) => { setSelectedAudioDevice(e.target.value); initMedia(selectedVideoDevice, e.target.value); }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {audioDevices.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Join Info Card */}
        <div className="w-full md:w-[360px] p-6 sm:p-8 flex flex-col justify-between bg-white">
          <div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md mb-4">
              <Shield size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Hostel<span className="text-cyan-600">Connect</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">Pre-Call Device & Security Check</p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 mb-6">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Session Room</span>
                <span className="text-sm font-bold text-slate-900 font-mono break-all">{roomName}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Participant</span>
                  <span className="text-sm font-semibold text-slate-800">{displayName}</span>
                </div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {role === 'caller' ? 'HOST' : 'GUEST'}
                </span>
              </div>
            </div>

            {permissionState === 'denied' && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 mb-6 space-y-2.5">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertTriangle size={14} className="shrink-0" /> Camera & Mic Access Needed
                </p>
                <p className="text-red-600">Please allow browser permissions or use the demo stream for testing.</p>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => initMedia()}
                    className="w-full py-2 bg-white border border-red-300 rounded-lg text-red-700 font-semibold flex items-center justify-center gap-1.5 hover:bg-red-50 transition cursor-pointer"
                  >
                    <RefreshCw size={12} /> Retry Permission Check
                  </button>
                  <button
                    type="button"
                    onClick={createSyntheticMediaStream}
                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg font-bold flex items-center justify-center gap-1.5 hover:from-indigo-700 hover:to-indigo-800 transition cursor-pointer shadow-sm"
                  >
                    <Camera size={12} /> Use Demo Video Stream →
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            {!localStream && permissionState !== 'denied' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Waiting for camera & microphone access to enable joining...</span>
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={!localStream}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition ${
                localStream
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-indigo-200 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none border border-slate-300'
              }`}
            >
              <Phone size={18} />
              {!localStream
                ? 'Waiting for Media...'
                : role === 'caller' ? 'Start Call & Wait for Parent' : 'Join Video Call'}
            </button>

            <p className="text-center text-[11px] text-slate-400 mt-3 flex items-center justify-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" /> End-to-End Encrypted WebRTC Session
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
