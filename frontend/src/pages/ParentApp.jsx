import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Phone, Wallet, History, LogOut, User, Video, 
  Clock, CreditCard, ShieldCheck, RefreshCw, 
  MessageSquare, Plus, Minus, IndianRupee, 
  Sparkles, CheckCircle2, Lock, ArrowRight
} from 'lucide-react';
import api from '../api';
import { getUser, logout } from '../utils/auth';
import NativeVideoRoom from '../components/NativeVideoRoom';
import UpiPaymentModal from '../components/UpiPaymentModal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

export default function ParentApp() {
  const user = getUser();
  const [students, setStudents] = useState([]);
  const [history, setHistory] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'book', 'chat', 'history', 'transactions'
  
  // Booking & UPI Pricing State
  const [selectedStudentForBooking, setSelectedStudentForBooking] = useState(null);
  const [schoolPricing, setSchoolPricing] = useState({
    perMinuteCharge: 2.5,
    minCallDurationMins: 5,
    maxCallDurationMins: 60,
    schoolName: 'Hostel Institute',
  });
  const [selectedDuration, setSelectedDuration] = useState(30); // in minutes
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [activeOrderDetails, setActiveOrderDetails] = useState(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // In-Call Video Room State
  const [inCall, setInCall] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/calls/history');
      setHistory(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const res = await api.get('/recharge/transactions');
      setTransactions(res.data.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  const loadData = useCallback(() => {
    if (!user || user.role !== 'parent') return;

    if (user.students && user.students.length > 0) {
      setStudents(user.students);
      if (!selectedStudentForBooking) {
        setSelectedStudentForBooking(user.students[0]);
      }
    }

    fetchHistory();
    fetchTransactions();
  }, [user, fetchHistory, fetchTransactions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch school pricing when booking student changes
  useEffect(() => {
    if (selectedStudentForBooking) {
      const schoolId = selectedStudentForBooking.schoolId || 1;
      api.get(`/schools/${schoolId}/pricing`)
        .then((res) => {
          if (res.data.data) {
            const sp = res.data.data;
            setSchoolPricing({
              perMinuteCharge: parseFloat(sp.perMinuteCharge || 2.5),
              minCallDurationMins: parseInt(sp.minCallDurationMins || 5, 10),
              maxCallDurationMins: parseInt(sp.maxCallDurationMins || 60, 10),
              schoolName: sp.name || selectedStudentForBooking.schoolName || 'Hostel Institute',
            });
            // Ensure selected duration is within school limits
            setSelectedDuration((prev) => {
              const min = parseInt(sp.minCallDurationMins || 5, 10);
              const max = parseInt(sp.maxCallDurationMins || 60, 10);
              if (prev < min) return min;
              if (prev > max) return max;
              return prev;
            });
          }
        })
        .catch(() => {});
    }
  }, [selectedStudentForBooking]);

  // Re-fetch on tab navigation
  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'transactions') fetchTransactions();
  }, [activeTab, fetchHistory, fetchTransactions]);

  const handleDurationChange = (delta) => {
    setSelectedDuration((prev) => {
      const next = prev + delta;
      if (next < schoolPricing.minCallDurationMins) return schoolPricing.minCallDurationMins;
      if (next > schoolPricing.maxCallDurationMins) return schoolPricing.maxCallDurationMins;
      return next;
    });
  };

  const handleInitiateUpiBooking = async () => {
    if (!selectedStudentForBooking) {
      toast.error('Please select a student');
      return;
    }

    setIsCreatingOrder(true);
    try {
      // Backend calculates authoritative price based on school's configured rate
      const res = await api.post('/recharge/online/order', {
        studentId: selectedStudentForBooking.id,
        requestedDurationMinutes: selectedDuration,
      });

      setActiveOrderDetails(res.data.data);
      setUpiModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create payment order');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleVerifyPayment = async ({ rechargeId, razorpayPaymentId, razorpayOrderId, razorpaySignature }) => {
    setVerifyingPayment(true);
    try {
      const res = await api.post('/recharge/online/confirm', {
        rechargeId,
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
      });

      toast.success(res.data.message || `Payment of ₹${activeOrderDetails?.amount} verified! Calling minutes credited.`);
      setUpiModalOpen(false);
      setActiveOrderDetails(null);
      loadData();

      // Automatically offer to join call
      if (selectedStudentForBooking) {
        joinVideoCall(selectedStudentForBooking);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment verification failed');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const joinVideoCall = (student) => {
    setSelectedStudent(student);
    setInCall(true);
    toast.success(`Connecting with ${student.name}...`);
  };

  const handleEndCall = (durationSeconds) => {
    setInCall(false);
    toast.success(`Call ended (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`);
    loadData();
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
      case 'success': return 'success';
      case 'ongoing': return 'brand';
      case 'initiated':
      case 'pending': return 'info';
      case 'rejected':
      case 'missed':
      case 'failed': return 'danger';
      default: return 'neutral';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (!user || user.role !== 'parent') {
    return null;
  }

  if (inCall) {
    return (
      <NativeVideoRoom
        myPeerId={`hostel_parent_${user?.id || 1}`}
        targetPeerId={`hostel_student_${selectedStudent?.id || 1}`}
        callerName={selectedStudent?.name || 'Student'}
        isCaller={false}
        onEndCall={handleEndCall}
      />
    );
  }

  const estimatedTotal = (selectedDuration * schoolPricing.perMinuteCharge).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* UPI Modal */}
      <UpiPaymentModal
        isOpen={upiModalOpen}
        onClose={() => setUpiModalOpen(false)}
        orderDetails={activeOrderDetails}
        onPaymentSuccess={handleVerifyPayment}
        isProcessing={verifyingPayment}
      />

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <User size={18} />
            </div>
            <div className="truncate">
              <h1 className="font-bold text-sm sm:text-base leading-tight text-slate-900 truncate">
                {user?.name || 'Parent Portal'}
              </h1>
              <p className="text-xs text-slate-500 font-mono font-medium truncate">{user?.mobile || '9876501234'}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={LogOut}
            onClick={logout}
            className="text-slate-500 hover:text-slate-800"
          >
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Badge variant="brand" withDot>Parent Video Calling & UPI</Badge>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight mt-1">Connect With Your Child</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
              School-administered per-minute calling rates with instant UPI recharge & browser HD video calls.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-xl flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Billing Model</p>
              <p className="text-sm font-bold text-slate-900">School-Specific Rate</p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-4 gap-1 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 max-w-2xl mx-auto">
          {[
            { id: 'home', label: 'My Students', icon: User },
            { id: 'book', label: 'Book & Pay', icon: Wallet },
            { id: 'chat', label: 'Live Chat', icon: MessageSquare },
            { id: 'transactions', label: 'Payments', icon: CreditCard },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-2.5 px-2 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 select-none ${
                  isSelected ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeParentTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/90"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 truncate">
                  <Icon size={16} className={isSelected ? 'text-brand-600' : 'text-slate-400'} />
                  <span className="truncate">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {/* Tab 1: My Students */}
          {activeTab === 'home' && (
            <motion.div
              key="students-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-800">Linked Students</h3>
                <span className="text-xs text-slate-500 font-semibold">{students.length} student{students.length !== 1 ? 's' : ''}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {students.map((s) => (
                  <Card key={s.id} className="p-5 flex flex-col justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                        <User size={20} />
                      </div>
                      <div className="truncate">
                        <p className="font-bold text-slate-900 text-sm truncate">{s.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="brand" className="font-mono">{s.studentId}</Badge>
                          <span className="text-xs text-slate-500 truncate">{s.schoolName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <Button
                        variant="secondary"
                        size="md"
                        icon={Wallet}
                        onClick={() => {
                          setSelectedStudentForBooking(s);
                          setActiveTab('book');
                        }}
                        className="flex-1 text-slate-700"
                      >
                        Recharge
                      </Button>
                      <Button
                        variant="success"
                        size="md"
                        icon={Video}
                        onClick={() => joinVideoCall(s)}
                        className="flex-1"
                      >
                        Join Call
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab 2: Book & Pay with UPI (School-Specific Authoritative Pricing) */}
          {activeTab === 'book' && (
            <motion.div
              key="book-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="max-w-xl mx-auto"
            >
              <Card className="overflow-hidden border-slate-200/90 shadow-xl">
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="brand" className="bg-brand-500/20 text-brand-200 border-brand-400/30">
                      School Configured Pricing
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-slate-300">
                      <Lock size={13} className="text-emerald-400" />
                      <span>Authoritative</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold tracking-tight text-white mt-2">Book Video Call Duration</h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    School: <span className="font-bold text-white">{schoolPricing.schoolName}</span>
                  </p>
                </div>

                <CardContent className="p-6 space-y-6">
                  {/* Select Child */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Select Child / Student <span className="text-rose-500">*</span>
                    </label>
                    <select
                      className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-500/20 shadow-xs"
                      value={selectedStudentForBooking?.id || ''}
                      onChange={(e) => {
                        const s = students.find((st) => st.id === parseInt(e.target.value, 10));
                        if (s) setSelectedStudentForBooking(s);
                      }}
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.studentId}) – {s.schoolName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* School Active Price Banner (Locked & Clear) */}
                  <div className="bg-brand-50/70 border border-brand-200/80 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-brand-900">Active School Call Rate</p>
                      <p className="text-[11px] text-brand-700 mt-0.5">
                        Allowed Duration: {schoolPricing.minCallDurationMins}m to {schoolPricing.maxCallDurationMins}m
                      </p>
                    </div>
                    <div className="bg-brand-600 text-white font-mono font-extrabold text-base px-3.5 py-1.5 rounded-xl shadow-xs">
                      ₹{schoolPricing.perMinuteCharge.toFixed(2)} / min
                    </div>
                  </div>

                  {/* Interactive Duration Stepper */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">Select Call Duration</label>
                      <span className="text-xs text-slate-500 font-semibold font-mono">
                        {selectedDuration} Minutes
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleDurationChange(-5)}
                        disabled={selectedDuration <= schoolPricing.minCallDurationMins}
                        className="w-12 h-12 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700 transition cursor-pointer"
                        title="Decrease 5 minutes"
                      >
                        <Minus size={18} />
                      </button>

                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <span className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                          {selectedDuration} <span className="text-xs font-semibold text-slate-500">minutes</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDurationChange(5)}
                        disabled={selectedDuration >= schoolPricing.maxCallDurationMins}
                        className="w-12 h-12 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-700 transition cursor-pointer"
                        title="Increase 5 minutes"
                      >
                        <Plus size={18} />
                      </button>
                    </div>

                    {/* Quick Duration Preset Chips */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {[15, 30, 45, 60].map((mins) => {
                        const disabled = mins < schoolPricing.minCallDurationMins || mins > schoolPricing.maxCallDurationMins;
                        const active = selectedDuration === mins;
                        return (
                          <button
                            key={mins}
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedDuration(mins)}
                            className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                              active
                                ? 'bg-brand-600 border-brand-600 text-white shadow-xs'
                                : disabled
                                ? 'opacity-30 border-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-white border-slate-200 hover:border-brand-500 text-slate-700'
                            }`}
                          >
                            {mins} mins
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calculated Price Summary Card */}
                  <div className="bg-slate-900 text-white rounded-2xl p-4.5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Call Calculation:</span>
                      <span className="font-mono">{selectedDuration} mins × ₹{schoolPricing.perMinuteCharge.toFixed(2)}/min</span>
                    </div>

                    <div className="h-px bg-slate-800" />

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Estimated Total</p>
                        <p className="text-2xl font-black text-white font-mono">₹{estimatedTotal}</p>
                      </div>

                      <div className="text-right text-[11px] text-emerald-400 font-medium">
                        ✓ Instant UPI Payment
                      </div>
                    </div>
                  </div>

                  {/* Pay with UPI Button */}
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleInitiateUpiBooking}
                    isLoading={isCreatingOrder}
                    className="w-full text-base py-3.5 shadow-md"
                  >
                    Pay ₹{estimatedTotal} with UPI
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tab 3: Live Chat & Calling */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Student Messaging & Video Room</CardTitle>
                  <CardDescription>Select any linked student to open encrypted video & real-time messaging</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {students.map((s) => (
                    <div key={s.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                          <MessageSquare size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.studentId} • {s.schoolName}</p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={MessageSquare}
                        onClick={() => joinVideoCall(s)}
                      >
                        Open Chat & Call
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tab 4: Auditable Payment Transactions */}
          {activeTab === 'transactions' && (
            <motion.div
              key="transactions-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="overflow-hidden">
                <CardHeader>
                  <div>
                    <CardTitle>Payment & Billing Transactions</CardTitle>
                    <CardDescription>Auditable historical records with immutable pricing snapshots</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    isLoading={loadingTransactions}
                    onClick={fetchTransactions}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Refresh
                  </Button>
                </CardHeader>

                <div className="divide-y divide-slate-100">
                  {loadingTransactions && transactions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading payment transactions...
                    </div>
                  ) : transactions.length === 0 ? (
                    <EmptyState
                      icon={CreditCard}
                      title="No payment records yet"
                      description="Completed UPI payments and recharge credits will appear here."
                      actionLabel="Book a Video Call"
                      onAction={() => setActiveTab('book')}
                    />
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CreditCard size={18} />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-sm text-slate-900 truncate">
                              {tx.student?.name || 'Student'} • {tx.durationMinutes ? `${tx.durationMinutes} mins` : 'Recharge'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span>Snapshot: ₹{tx.pricePerMinute ? tx.pricePerMinute.toFixed(2) : '2.50'}/min</span>
                              <span>•</span>
                              <span>{formatDate(tx.createdAt)}</span>
                              {tx.transactionId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                                    {tx.transactionId}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <p className="font-extrabold text-sm text-slate-900 font-mono">
                            ₹{parseFloat(tx.amount).toFixed(2)}
                          </p>
                          <Badge variant={getStatusVariant(tx.status)} withDot>
                            {tx.status || 'success'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
