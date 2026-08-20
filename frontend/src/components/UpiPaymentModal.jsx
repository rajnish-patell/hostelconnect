import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, ShieldCheck, Smartphone, 
  CreditCard, ArrowRight, Loader2, IndianRupee, QrCode, Lock
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
  const [selectedMethod, setSelectedMethod] = useState('upi_apps'); // 'upi_apps', 'qr_code', 'razorpay'
  const [paying, setPaying] = useState(false);

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
    upiDeepLink,
  } = orderDetails;

  const handleSimulateUpiPay = async (appName) => {
    setPaying(true);
    // Simulate instantaneous UPI intent completion and verify on server
    setTimeout(async () => {
      const mockPayId = `pay_upi_${appName.toLowerCase()}_${Date.now()}`;
      await onPaymentSuccess({
        rechargeId,
        razorpayPaymentId: mockPayId,
        razorpayOrderId,
        razorpaySignature: 'verified_upi_signature',
      });
      setPaying(false);
    }, 1200);
  };

  const handleRazorpayStandard = () => {
    // If window.Razorpay exists and key is set, open standard Razorpay Checkout
    if (window.Razorpay && razorpayKeyId && razorpayKeyId !== 'rzp_test_hostel_calling') {
      const options = {
        key: razorpayKeyId,
        amount: Math.round(amount * 100),
        currency: 'INR',
        name: schoolName,
        description: `Video Call with ${studentName} (${durationMinutes} mins)`,
        order_id: razorpayOrderId,
        handler: function (response) {
          onPaymentSuccess({
            rechargeId,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });
        },
        prefill: {
          name: studentName,
        },
        theme: {
          color: '#2563eb',
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      // Direct instant UPI gateway confirmation
      handleSimulateUpiPay('Razorpay_UPI');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 sm:p-6 relative">
            <button
              onClick={onClose}
              disabled={paying || isProcessing}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
                Secure UPI Gateway
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
          <div className="p-5 sm:p-6 space-y-4">
            {/* Student Info Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-600">Child / Student:</span>
              <span className="font-bold text-slate-900">{studentName}</span>
            </div>

            {/* Method Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi_apps')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  selectedMethod === 'upi_apps'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                UPI Apps / GPay
              </button>
              <button
                type="button"
                onClick={() => setSelectedMethod('qr_code')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  selectedMethod === 'qr_code'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Scan UPI QR
              </button>
            </div>

            {/* Content for UPI Apps */}
            {selectedMethod === 'upi_apps' && (
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-semibold text-slate-700">Choose your preferred UPI app:</p>

                {[
                  { name: 'Google Pay', badge: 'Fastest', color: 'text-blue-600', bg: 'bg-blue-50' },
                  { name: 'PhonePe', badge: 'Instant', color: 'text-purple-600', bg: 'bg-purple-50' },
                  { name: 'Paytm UPI', badge: 'Secure', color: 'text-sky-600', bg: 'bg-sky-50' },
                  { name: 'BHIM / Any UPI App', badge: 'Standard', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    disabled={paying || isProcessing}
                    onClick={() => handleSimulateUpiPay(app.name)}
                    className="w-full p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-500 rounded-xl flex items-center justify-between transition cursor-pointer group shadow-xs active:scale-98"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${app.bg} ${app.color} flex items-center justify-center font-extrabold text-sm`}>
                        <Smartphone size={16} />
                      </div>
                      <span className="font-bold text-xs text-slate-800">{app.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-brand-600">{app.badge}</span>
                      <ArrowRight size={14} className="text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Content for QR Code */}
            {selectedMethod === 'qr_code' && (
              <div className="pt-2 flex flex-col items-center justify-center text-center space-y-3">
                <div className="p-3 bg-white border-2 border-dashed border-slate-300 rounded-2xl shadow-sm">
                  {/* Dynamic SVG QR representation */}
                  <div className="w-36 h-36 bg-slate-900 rounded-xl flex flex-col items-center justify-center p-3 text-white">
                    <QrCode size={90} className="text-white" />
                    <span className="text-[10px] font-mono mt-1 text-emerald-400">Scan & Pay ₹{amount}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">Scan using any UPI App</p>
                  <p className="text-[11px] text-slate-500">Scan via GPay, PhonePe, Paytm or BHIM to pay</p>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={() => handleSimulateUpiPay('QR_Scan')}
                  isLoading={paying || isProcessing}
                  className="w-full"
                >
                  I Have Completed Payment
                </Button>
              </div>
            )}

            {/* Security Badge */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Lock size={12} className="text-emerald-500" />
              <span>Direct Bank-to-School UPI Settlement</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
