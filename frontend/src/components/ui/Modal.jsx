import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) {
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-50 ${isMobile ? 'flex items-end' : 'flex items-center justify-center p-4 sm:p-6'} overflow-y-auto`}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1C252E]/60 backdrop-blur-sm"
          />

          {/* Modal Card — Bottom-sheet on mobile, centered on desktop */}
          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.8 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: '100%', opacity: 0.8 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={isMobile ? { type: 'spring', damping: 28, stiffness: 280 } : { duration: 0.2, ease: 'easeOut' }}
            className={`relative bg-white shadow-[0_0_2px_0_rgba(145,158,171,0.24),-20px_20px_40px_-4px_rgba(145,158,171,0.24)] border border-[rgba(145,158,171,0.16)] w-full overflow-hidden z-10 ${
              isMobile
                ? 'rounded-t-2xl max-h-[92vh]'
                : `rounded-2xl ${maxWidth} my-8`
            }`}
          >
            {/* Drag Handle — mobile only */}
            {isMobile && (
              <div className="flex justify-center pt-2.5 pb-1">
                <div className="w-10 h-1 bg-[#919EAB]/30 rounded-full" />
              </div>
            )}

            {/* Modal Header */}
            <div className={`${isMobile ? 'px-4 pt-2 pb-3' : 'p-5 sm:p-6'} border-b border-[rgba(145,158,171,0.12)] flex items-center justify-between gap-3`}>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-[#1C252E] leading-tight truncate">{title}</h3>
                {subtitle && <p className="text-xs text-[#637381] mt-0.5 truncate">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-[#919EAB] hover:text-[#1C252E] hover:bg-[#919EAB]/8 transition cursor-pointer touch-target-44 flex items-center justify-center shrink-0"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className={`${isMobile ? 'px-4 py-4' : 'p-5 sm:p-6'} max-h-[75vh] sm:max-h-[75vh] overflow-y-auto`}
              style={isMobile ? { maxHeight: 'calc(92vh - 100px)' } : undefined}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
