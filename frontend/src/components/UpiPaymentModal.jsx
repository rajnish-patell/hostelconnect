import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, ShieldCheck, Smartphone, 
  CreditCard, ArrowRight, Loader2, IndianRupee, QrCode, Lock, AlertTriangle
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

export default function UpiPaymentModal({
  isOpen,
  onClose,
  orderDetails,
  onPaymentSuccess,
  isProcessing,
}) {
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState(null);

  if (!isOpen || !orderDetails) return null;

  const {
    rechargeId,
    studentName,
    schoolName,
    pricePerMinute,
    durationMinutes,
    amount,
    razorpayOrderId,
    razorpayKeyId,
    razorpayConfigured,
  } = orderDetails;

  // ── Real Razorpay Standard Checkout ──────────────────────────────────────
  const openRazorpayCheckout = useCallback((preferredMethod) => {
    setPaymentError(null);

    // Check if Razorpay SDK is loaded and configured
    if (!window.Razorpay) {
      setPaymentError('Payment gateway is loading. Please try again.');
      return;
    }

    if (!razorpayKeyId || !razorpayConfigured) {
      setPaymentError('Payment gateway is not configured. Please contact the administrator.');
      return;
    }

    setPaying(true);

    const options = {
      key: razorpayKeyId,
      amount: Math.round(parseFloat(amount) * 100), // in paise
      currency: 'INR',
      name: schoolName || 'Hostel Video Call',
      description: `Video Call with ${studentName} (${durationMinutes} mins)`,
      order_id: razorpayOrderId,
      handler: function (response) {
        // Payment successful — verify on server
        setPaying(false);
        onPaymentSuccess({
          rechargeId,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpayOrderId: response.razorpay_order_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      prefill: {
        name: studentName || '',
      },
      notes: {
        rechargeId: String(rechargeId),
        studentName,
        durationMinutes: String(durationMinutes),
      },
      theme: {
        color: '#2563eb',
        backdrop_color: 'rgba(15, 23, 42, 0.6)',
      },
      modal: {
        ondismiss: function () {
          setPaying(false);
          setPaymentError('Payment was cancelled. You can try again.');
        },
        escape: true,
        animation: true,
      },
      // Preferred payment method
      ...(preferredMethod === 'upi' ? {
        config: {
          display: {
            blocks: {
              upi: {
                name: 'Pay via UPI',
                instruments: [
                  { method: 'upi', flows: ['qrcode', 'collect', 'intent'] },
                ],
              },
            },
            sequence: ['block.upi'],
            preferences: {
              show_default_blocks: true,
            },
          },
        },
      } : {}),
    };

    try {
      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (response) {
        setPaying(false);
        const errorDesc = response.error?.description || 'Payment failed. Please try again.';
        setPaymentError(errorDesc);
      });

      rzp.open();
    } catch (err) {
      setPaying(false);
      setPaymentError('Failed to open payment gateway. Please try again.');
      console.error('Razorpay open error:', err);
    }
  }, [razorpayKeyId, razorpayConfigured, razorpayOrderId, amount, schoolName, studentName, durationMinutes, rechargeId, onPaymentSuccess]);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={paying ? undefined : onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ y: '100%', opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10 max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-6 relative shrink-0">
            {/* Mobile Drag Pill */}
            <div className="flex justify-center mb-2 sm:hidden">
              <div className="w-10 h-1 bg-slate-600 rounded-full" />
            </div>

            <button
              onClick={onClose}
              disabled={paying || isProcessing}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition touch-target-44 flex items-center justify-center"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
                Secure Payment Gateway
              </Badge>
              <span className="text-xs text-slate-400 font-mono">• 256-bit Encrypted</span>
            </div>

            <h2 className="text-xl font-bold tracking-tight text-white mt-1">Video Call Checkout</h2>
            <p className="text-xs text-slate-300 mt-0.5">{schoolName}</p>

            {/* Total Amount Pill */}
            <div className="mt-4 bg-white/10 border border-white/15 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-300 font-semibold">Total Payable</p>
                <p className="text-2xl font-extrabold text-white font-mono">₹{parseFloat(amount).toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-400 font-bold">{durationMinutes} Minutes</p>
                <p className="text-[11px] text-slate-300 font-mono">@ ₹{parseFloat(pricePerMinute).toFixed(2)}/min</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Student Info Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Child / Student:</span>
              <span className="font-bold text-slate-900">{studentName}</span>
            </div>

            {/* Error Message */}
            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-800">{paymentError}</p>
                </div>
              </div>
            )}

            {/* Payment Options */}
            <div className="space-y-2.5 pt-1">
              <p className="text-xs font-semibold text-slate-700">Choose payment method:</p>

              {/* UPI Payment Button */}
              <button
                type="button"
                disabled={paying || isProcessing}
                onClick={() => openRazorpayCheckout('upi')}
                className="w-full p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-500 rounded-xl flex items-center justify-between transition cursor-pointer group shadow-xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-sm">
                    <Smartphone size={18} />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-800 block">UPI / GPay / PhonePe</span>
                    <span className="text-[10px] text-slate-400">Instant bank transfer</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-emerald-600 group-hover:text-brand-600">Recommended</span>
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition" />
                </div>
              </button>

              {/* Cards / NetBanking / All Methods */}
              <button
                type="button"
                disabled={paying || isProcessing}
                onClick={() => openRazorpayCheckout('all')}
                className="w-full p-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-500 rounded-xl flex items-center justify-between transition cursor-pointer group shadow-xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-sm">
                    <CreditCard size={18} />
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-xs text-slate-800 block">Cards / Net Banking / Wallet</span>
                    <span className="text-[10px] text-slate-400">Debit, Credit, or Net Banking</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight size={14} className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition" />
                </div>
              </button>
            </div>

            {/* Loading State */}
            {paying && (
              <div className="flex items-center justify-center gap-2 py-3">
                <Loader2 size={16} className="text-brand-600 animate-spin" />
                <span className="text-xs font-semibold text-slate-600">Processing payment...</span>
              </div>
            )}

            {/* Security Badge */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock size={12} className="text-emerald-500" />
              <span>Powered by Razorpay • PCI DSS Compliant</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
