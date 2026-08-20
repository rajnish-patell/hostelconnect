import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, ShieldCheck, User } from 'lucide-react';
import Button from './ui/Button';

export default function IncomingCallModal({ isOpen, callerName, callerRole = 'Parent', onAccept, onDecline }) {
  // Synthesize soft pleasant ringtone audio using Web Audio API when modal is open
  useEffect(() => {
    if (!isOpen) return;

    let audioCtx;
    let isRinging = true;

    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();

      const playTone = () => {
        if (!isRinging || !audioCtx || audioCtx.state === 'closed') return;

        try {
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 tone
          osc2.frequency.setValueAtTime(480, audioCtx.currentTime);

          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(audioCtx.currentTime + 1.2);
          osc2.stop(audioCtx.currentTime + 1.2);
        } catch (e) {
          // Ignore audio play error
        }
      };

      playTone();
      const interval = setInterval(playTone, 2200);

      return () => {
        isRinging = false;
        clearInterval(interval);
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
      };
    } catch {
      // Web Audio unsupported fallback
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-200 text-center relative overflow-hidden space-y-6"
        >
          {/* Top Decorative Banner */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#00A76F] via-[#00B8D9] to-[#007849]" />

          {/* Caller Avatar with Pulsing Rings */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#00A76F]/20 animate-ping" />
            <span className="absolute inset-2 rounded-full bg-[#00A76F]/30 animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#00A76F] to-[#007849] text-white flex items-center justify-center shadow-lg border-2 border-white text-2xl font-black">
              {callerName ? callerName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="absolute bottom-0 right-0 bg-[#00A76F] text-white p-1.5 rounded-full border-2 border-white shadow">
              <Video size={14} />
            </div>
          </div>

          {/* Caller Info */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00A76F]/10 text-[#007849] text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={13} />
              <span>Incoming Call from {callerRole}</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {callerName || 'Family Call'}
            </h3>
            <p className="text-xs text-slate-500 font-medium animate-pulse">
              HD Video Call Request...
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Decline Button */}
            <button
              type="button"
              onClick={onDecline}
              className="py-3.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm flex items-center justify-center gap-2 border border-rose-200/60 active:scale-95 transition cursor-pointer touch-target-44"
            >
              <PhoneOff size={18} />
              <span>Decline</span>
            </button>

            {/* Accept Button */}
            <button
              type="button"
              onClick={onAccept}
              className="py-3.5 px-4 rounded-2xl bg-[#00A76F] hover:bg-[#007849] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00A76F]/30 active:scale-95 transition cursor-pointer touch-target-44"
            >
              <Phone size={18} className="animate-bounce" />
              <span>Accept</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
