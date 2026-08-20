import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Phone, Wallet, History, LogOut, User, Video, Clock, PhoneCall, RefreshCw, MessageSquare, LayoutDashboard } from 'lucide-react';
import api from '../api';
import { getUser, logout } from '../utils/auth';
import DashboardLayout from '../components/DashboardLayout';
import NativeVideoRoom from '../components/NativeVideoRoom';
import IncomingCallModal from '../components/IncomingCallModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

export default function StudentApp() {
  const user = useMemo(() => getUser(), []);
  const [wallet, setWallet] = useState(0);
  const [parents, setParents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('call');
  const [inCall, setInCall] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [activeCallSession, setActiveCallSession] = useState(null);

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

  const loadData = useCallback(async () => {
    if (!user || user.role !== 'student') return;

    try {
      const meRes = await api.get(`/students/${user.id}`);
      const studentData = meRes.data.data;
      setWallet(parseFloat(studentData.walletBalance || 0));
      setParents(studentData.parents || []);
    } catch {
      // ignore
    }

    fetchHistory();
  }, [user?.id, fetchHistory]);

  // Initial load only when student ID is available
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Re-fetch call history ONLY when switching to history tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'history') {
      fetchHistory();
    }
  };

  const [incomingCallModalOpen, setIncomingCallModalOpen] = useState(false);

  const handleAcceptStudentCall = () => {
    setIncomingCallModalOpen(false);
    setInCall(true);
  };

  const handleDeclineStudentCall = () => {
    setIncomingCallModalOpen(false);
    toast.error('Call declined');
  };

  const startVideoCall = async (parentLink) => {
    const parent = parentLink.parent || parentLink;
    if (wallet <= 0) {
      toast.error('Insufficient wallet balance! Please ask school or parents to recharge.');
      return;
    }

    setSelectedParent(parent);

    try {
      const res = await api.post('/calls/initiate', {
        parentId: parent.id,
      });

      const callSession = res.data.data;
      setActiveCallSession(callSession);
      setInCall(true);
      toast.success(`Calling ${parent.name}...`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start call');
    }
  };

  const handleEndCall = async (durationSeconds) => {
    setInCall(false);
    if (activeCallSession) {
      try {
        const res = await api.post(`/calls/${activeCallSession.callId || activeCallSession.id}/end`, {
          durationSeconds,
        });
        const charged = res.data.data?.chargeAmount || 0;
        toast.success(`Call ended (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s). Charged: ₹${charged}`);
      } catch {
        toast.success(`Call ended (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`);
      }
      setActiveCallSession(null);
    }
    loadData();
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'ongoing': return 'brand';
      case 'initiated': return 'info';
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

  if (!user || user.role !== 'student') {
    return null;
  }

  if (inCall) {
    return (
      <NativeVideoRoom
        myPeerId={`hostel_student_${user?.id || 1}`}
        targetPeerId={`hostel_parent_${selectedParent?.id || 1}`}
        callerName={selectedParent?.name || 'Parent'}
        isCaller={true}
        onEndCall={handleEndCall}
      />
    );
  }

  const links = [
    { to: '/student', label: 'Call Family', icon: Video },
    { to: '/student', label: 'Wallet Balance', icon: Wallet },
    { to: '/student', label: 'Call History', icon: History },
  ];

  return (
    <DashboardLayout
      navLinks={links}
      title="Student Video Call Kiosk"
      subtitle={`${user?.name || 'Student'} (ID: ${user?.studentId || 'STU001'})`}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Incoming Call Modal */}
        <IncomingCallModal
          isOpen={incomingCallModalOpen}
          callerName={selectedParent?.name || 'Parent'}
          callerRole="Parent"
          onAccept={handleAcceptStudentCall}
          onDecline={handleDeclineStudentCall}
        />

        {/* Banner Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-slate-200/90 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-1">
            <Badge variant="brand" withDot>HD Video Calling & Chat</Badge>
            <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight mt-1">Connect with Family</h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed">
              Start direct WebRTC video calls and live messaging with registered parent and guardian contacts.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Wallet size={18} />
            </div>
            <div>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500">Available Balance</p>
              <p className="text-base sm:text-lg font-extrabold text-slate-900 font-mono">₹{wallet.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 max-w-xl mx-auto">
          {[
            { id: 'call', label: 'Call Parent', icon: PhoneCall },
            { id: 'chat', label: 'Live Chat', icon: MessageSquare },
            { id: 'history', label: 'Call History', icon: History },
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative py-2.5 px-1.5 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none touch-manipulation min-h-[44px] ${
                  isSelected ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeStudentTab"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm border border-slate-200/90"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5 truncate">
                  <Icon size={15} className={`shrink-0 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span className="truncate text-[11px] sm:text-xs md:text-sm">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'call' && (
            <motion.div
              key="call-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-slate-800">Authorized Parent Contacts</h3>
                <span className="text-xs text-slate-500 font-semibold">{parents.length} linked</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {parents.length === 0 ? (
                  <Card className="col-span-1 sm:col-span-2">
                    <EmptyState
                      icon={User}
                      title="No parent contacts linked"
                      description="Please ask your hostel administrator to link your parent contact number."
                    />
                  </Card>
                ) : (
                  parents.map((sp) => {
                    const p = sp.parent || sp;
                    return (
                      <Card key={sp.id || p.id} className="p-5 flex flex-col justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                            <User size={20} />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-slate-900 text-sm truncate">{p.name || 'Parent'}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="neutral">{p.relation || 'Parent'}</Badge>
                              <span className="text-xs text-slate-500 font-mono font-medium">{p.mobile}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <Button
                            variant="secondary"
                            size="md"
                            icon={MessageSquare}
                            onClick={() => startVideoCall(sp)}
                            className="flex-1 text-brand-700 hover:bg-brand-50"
                          >
                            Chat
                          </Button>
                          <Button
                            variant="success"
                            size="md"
                            icon={Video}
                            onClick={() => startVideoCall(sp)}
                            className="flex-1"
                          >
                            Start Call
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

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
                  <CardTitle>Parent Messaging & Video Room</CardTitle>
                  <CardDescription>Select any linked parent to start video calling with live encrypted messaging</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {parents.map((sp) => {
                    const p = sp.parent || sp;
                    return (
                      <div key={sp.id || p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
                            <MessageSquare size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-slate-900">{p.name || 'Parent'}</p>
                            <p className="text-xs text-slate-500">{p.relation || 'Guardian'} • {p.mobile}</p>
                          </div>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={MessageSquare}
                          onClick={() => startVideoCall(sp)}
                        >
                          Open Chat & Call
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <Card className="overflow-hidden">
                <CardHeader>
                  <div>
                    <CardTitle>Call History & Duration</CardTitle>
                    <CardDescription>Records of past video call sessions and wallet deductions</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={RefreshCw}
                    isLoading={loadingHistory}
                    onClick={fetchHistory}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    Refresh
                  </Button>
                </CardHeader>

                <div className="divide-y divide-slate-100">
                  {loadingHistory && history.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading calling records...
                    </div>
                  ) : history.length === 0 ? (
                    <EmptyState
                      icon={Clock}
                      title="No calls recorded yet"
                      description="Completed video call sessions will appear here."
                      actionLabel="Refresh List"
                      onAction={fetchHistory}
                    />
                  ) : (
                    history.map((c) => (
                      <div key={c.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/60 transition gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <Phone size={17} />
                          </div>
                          <div className="truncate">
                            <p className="font-bold text-sm text-slate-900 truncate">{c.parent?.name || c.parent?.mobile || 'Parent'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span>Duration: {Math.floor((c.durationSeconds || 0) / 60)}m {(c.durationSeconds || 0) % 60}s</span>
                              <span>•</span>
                              <span>{formatDate(c.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 space-y-1">
                          <p className="font-extrabold text-sm text-slate-900 font-mono">
                            {c.chargeAmount > 0 ? `₹${parseFloat(c.chargeAmount).toFixed(2)}` : '₹0.00'}
                          </p>
                          <Badge variant={getStatusVariant(c.status)} withDot>
                            {c.status || 'completed'}
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
      </div>
    </DashboardLayout>
  );
}
