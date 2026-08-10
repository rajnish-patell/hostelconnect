import React, { useState, useEffect } from 'react';
import {
  Users, PhoneCall, Video, Wallet, Tablet, Settings, Search, Plus, UserCheck, Lock, Unlock,
  RefreshCw, FileText, ArrowUpRight, ShieldCheck, CheckCircle2, AlertTriangle, Play, X,
  Link as LinkIcon, Copy, Check, TrendingUp, Clock, MoreVertical, LayoutDashboard, ChevronRight, Menu, Loader2
} from 'lucide-react';

import { SchoolTenant } from './Header';
import { api } from '../services/api';

interface SchoolAdminDashboardProps {
  onStartCall?: (config: { studentName: string; parentName: string; hostelBlock: string; roomId: string }) => void;
  tenant?: SchoolTenant;
}

export const SchoolAdminDashboard: React.FC<SchoolAdminDashboardProps> = ({ onStartCall, tenant }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'parents' | 'tablets' | 'rules' | 'finance'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentCode, setNewStudentCode] = useState('');
  const [newStudentRoom, setNewStudentRoom] = useState('');
  const [newStudentGrade, setNewStudentGrade] = useState('Grade 9-B');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [students, setStudents] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [tablets, setTablets] = useState<any[]>([]);
  const [activeCalls, setActiveCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3500); };

  const loadTenantData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    const code = tenant?.code || 'SCH-DAP';
    try {
      const [stuRes, parRes, tabRes, callRes] = await Promise.all([
        api.students.getAll(code, searchQuery),
        api.parents.getAll(code),
        api.tablets.getAll(code),
        api.calls.getActive(code),
      ]);
      setStudents(stuRes);
      setParents(parRes);
      setTablets(tabRes);
      setActiveCalls(callRes);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch school records from backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenantData();
  }, [tenant?.code, searchQuery]);

  const toggleTabletLock = async (id: string, deviceId: string) => {
    try {
      const updated = await api.tablets.toggleLock(id);
      setTablets(prev => prev.map(t => t.id === id ? { ...t, isLocked: updated.isLocked } : t));
      triggerToast(`Tablet ${deviceId}: ${updated.isLocked ? 'LOCKED' : 'UNLOCKED'}`);
    } catch (err: any) {
      triggerToast(`Failed to toggle tablet lock: ${err?.message}`);
    }
  };

  const handleForceEndCall = async (callId: string) => {
    try {
      await api.calls.end(callId, 120, 'ADMIN_FORCE_DISCONNECT');
      setActiveCalls(prev => prev.filter(c => c.id !== callId));
      triggerToast(`Call ${callId} force disconnected.`);
    } catch (err: any) {
      triggerToast(`Failed to end call: ${err?.message}`);
    }
  };

  const handleCopyUniqueCallLink = (callId: string, studentName: string) => {
    const roomName = `room_${tenant?.code || 'SCH-DAP'}_${studentName.toLowerCase().replace(/\s+/g, '')}_${callId}`;
    const link = `${window.location.origin}${window.location.pathname}?room=${roomName}&peerId=pending&role=joiner`;
    navigator.clipboard.writeText(link);
    triggerToast(`Copied call link for ${studentName}`);
  };

  const handleInitiateTestCall = async (studentName: string, parentName: string) => {
    try {
      const callData = await api.calls.initiate({
        studentId: studentName,
        parentId: parentName,
        schoolCode: tenant?.code || 'SCH-DAP',
      });
      setActiveCalls([callData, ...activeCalls]);
      if (onStartCall) {
        onStartCall({
          studentName,
          parentName,
          hostelBlock: 'Block A (Boys)',
          roomId: callData.callId,
        });
      }
      triggerToast(`Starting video call: ${studentName} → ${parentName}`);
    } catch (err: any) {
      triggerToast(`Call failed: ${err?.message}`);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentCode.trim()) {
      alert('Please fill out student name and ID');
      return;
    }
    try {
      const created = await api.students.create({
        name: newStudentName.trim(),
        code: newStudentCode.trim(),
        room: newStudentRoom.trim() || 'A-101',
        grade: newStudentGrade,
        schoolCode: tenant?.code || 'SCH-DAP',
      });
      setStudents([created, ...students]);
      setShowAddStudentModal(false);
      setNewStudentName('');
      setNewStudentCode('');
      setNewStudentRoom('');
      triggerToast(`Created ${created.name} (${created.code}) with PIN ${created.pin}`);
    } catch (err: any) {
      alert(err?.message || 'Failed to add student');
    }
  };

  const handleResetPin = async (id: string, name: string) => {
    try {
      const res = await api.students.resetPin(id);
      setStudents(prev => prev.map(s => s.id === id ? { ...s, pin: res.pin } : s));
      triggerToast(`Reset PIN for ${name}: ${res.pin}`);
    } catch (err: any) {
      triggerToast(`Reset PIN failed: ${err?.message}`);
    }
  };

  const handleApproveParent = async (id: string, name: string) => {
    try {
      await api.parents.approve(id);
      setParents(prev => prev.map(p => p.id === id ? { ...p, status: 'VERIFIED' } : p));
      triggerToast(`Verified guardian: ${name}`);
    } catch (err: any) {
      triggerToast(`Verification failed: ${err?.message}`);
    }
  };

  const handleExcelImport = async () => {
    try {
      const imported = await api.students.bulkImport(tenant?.code || 'SCH-DAP');
      setStudents([...imported, ...students]);
      triggerToast(`Imported ${imported.length} student records from Excel template!`);
    } catch (err: any) {
      triggerToast(`Import failed: ${err?.message}`);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, badge: activeCalls.length > 0 ? `${activeCalls.length} Live` : undefined },
    { id: 'students', label: 'Student Directory', icon: Users, badge: `${students.length}` },
    { id: 'parents', label: 'Guardians', icon: UserCheck, badge: `${parents.filter(p => p.status === 'PENDING_APPROVAL').length} Pending` },
    { id: 'tablets', label: 'Kiosk Tablets', icon: Tablet, badge: `${tablets.length} Devices` },
    { id: 'rules', label: 'Call Rules', icon: Settings },
    { id: 'finance', label: 'Billing & Wallet', icon: Wallet },
  ];

  const Badge = ({ variant, children }: { variant: 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }) => {
    const styles = {
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      warning: 'bg-amber-50 text-amber-700 border-amber-200',
      danger: 'bg-red-50 text-red-700 border-red-200',
      info: 'bg-sky-50 text-sky-700 border-sky-200',
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]}`}>{children}</span>;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-[calc(100vh-120px)]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 text-white py-3.5 px-6 rounded-2xl shadow-2xl text-sm font-medium animate-fade-in-up">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 bg-white rounded-2xl border border-slate-200/80 p-4 lg:p-5 shadow-sm shrink-0 flex flex-col justify-between">
        <div>
          {/* Mobile Collapse Header */}
          <div className="flex lg:hidden items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation Menu</span>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">
              <Menu size={20} />
            </button>
          </div>

          <div className={`space-y-2 ${sidebarOpen ? 'block' : 'hidden lg:block'}`}>
            <p className="hidden lg:block text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3.5 mb-3">School Operations</p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }}
                  className={`w-full flex items-center justify-between py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={18} className={active ? 'text-white shrink-0' : 'text-slate-400 shrink-0'} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0 ml-2 ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tenant Footer Info */}
        <div className="hidden lg:block pt-5 border-t border-slate-100 mt-8">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs font-bold text-slate-900">{tenant?.name || 'Delhi Public School (R.K. Puram)'}</p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Code: {tenant?.code || 'SCH-DAP'}</p>
            <div className="mt-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Server
              </div>
              <button onClick={loadTenantData} className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer flex items-center gap-1">
                <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} /> Sync
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 space-y-8 overflow-hidden">
        {errorMsg && (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={loadTenantData} className="font-bold underline cursor-pointer">Retry</button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { label: 'Total Students', value: students.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: '100% Enrolled' },
                { label: "Today's Active Calls", value: activeCalls.length, icon: PhoneCall, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: 'Live Stream' },
                { label: 'Registered Tablets', value: tablets.length, icon: Tablet, color: 'text-cyan-600', bg: 'bg-cyan-50', trend: `${tablets.filter(t => t.status === 'ONLINE').length} Online` },
                { label: 'Verified Parents', value: parents.filter(p => p.status === 'VERIFIED').length, icon: UserCheck, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Authorized' },
              ].map((kpi, i) => {
                const Icon = kpi.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                      <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                        <Icon size={20} className={kpi.color} />
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                      {isLoading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : kpi.value}
                    </div>
                    <span className="text-xs text-slate-400 mt-2 flex items-center gap-1 font-medium">
                      <TrendingUp size={13} className="text-emerald-500" /> {kpi.trend}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Live Video Monitor Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <Video size={20} className="text-red-500 animate-pulse" /> Live Video Sessions Monitor
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">Real-time P2P WebRTC connection streams</p>
                </div>
                <Badge variant="danger">● {activeCalls.length} Active</Badge>
              </div>

              {isLoading ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-medium">Connecting to live call subsystem...</span>
                </div>
              ) : activeCalls.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <PhoneCall size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700">No active calls in progress</p>
                  <p className="text-xs text-slate-400 mt-1">When students initiate calls from hostel tablets, they will appear here live.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCalls.map((call) => (
                    <div key={call.id} className="flex flex-col gap-3 bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shrink-0">
                          <PhoneCall size={22} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-bold text-sm sm:text-base text-slate-900">{call.studentName} → {call.parentName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{call.hostelBlock} • {call.tabletDevice || 'Tablet Kiosk'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-full border border-cyan-200/60 font-mono">
                          ⏱ {call.duration || '00:01'}
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                          <button onClick={() => handleCopyUniqueCallLink(call.id, call.studentName)} className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-sm">
                            <LinkIcon size={13} /> Copy Link
                          </button>
                          <button onClick={() => onStartCall && onStartCall({ studentName: call.studentName, parentName: call.parentName, hostelBlock: call.hostelBlock || 'Block A', roomId: call.id })} className="text-xs font-bold py-2 px-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-100">
                            <Video size={13} /> Join Meet
                          </button>
                          <button onClick={() => handleForceEndCall(call.id)} className="text-xs font-bold py-2 px-3 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition cursor-pointer">
                            End
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Student Directory</h3>
                <p className="text-xs text-slate-400 mt-1">Manage hostel student accounts, security PINs & parent links</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search student name or ID..."
                    className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium" />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={handleExcelImport} className="flex-1 sm:flex-none justify-center text-xs font-bold py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-sm">
                    <FileText size={14} /> Import Excel
                  </button>
                  <button onClick={() => setShowAddStudentModal(true)} className="flex-1 sm:flex-none justify-center text-xs font-bold py-2.5 px-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-100">
                    <Plus size={14} /> Add Student
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading student directory from database...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Users size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No students enrolled</p>
                <p className="text-xs text-slate-400 mt-1">Add students manually or use "Import Excel".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                      <th className="text-left py-4 px-6">Student</th>
                      <th className="text-left py-4 px-6">Student Code</th>
                      <th className="text-left py-4 px-6 hidden md:table-cell">Hostel Room</th>
                      <th className="text-left py-4 px-6 hidden lg:table-cell">Guardian</th>
                      <th className="text-left py-4 px-6">Security PIN</th>
                      <th className="text-right py-4 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 text-sm">{s.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{s.grade}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6"><code className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-mono font-bold border border-slate-200">{s.code}</code></td>
                        <td className="py-4 px-6 hidden md:table-cell text-slate-600 font-semibold">{s.room}</td>
                        <td className="py-4 px-6 hidden lg:table-cell text-slate-600">{s.parent}</td>
                        <td className="py-4 px-6"><code className="text-xs bg-amber-50 text-amber-800 px-3 py-1 rounded-lg font-mono font-bold border border-amber-200">{s.pin}</code></td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleResetPin(s.id, s.name)} className="text-xs font-bold py-2 px-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1">
                              <RefreshCw size={13} /> Reset PIN
                            </button>
                            <button onClick={() => handleInitiateTestCall(s.name, s.parent)} className="text-xs font-bold py-2 px-3.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1">
                              <Play size={13} /> Call
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PARENTS TAB */}
        {activeTab === 'parents' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Guardian Verification Portal</h3>
              <p className="text-xs text-slate-400 mt-1">Verified parents authorized for video calling sessions</p>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Loading authorized guardians...</span>
              </div>
            ) : parents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No guardians registered yet.</div>
            ) : (
              <div className="space-y-4">
                {parents.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm sm:text-base text-slate-900">{p.name} <span className="text-slate-400 font-normal">({p.relationship})</span></p>
                        <p className="text-xs text-slate-400 mt-0.5">{p.phone} • {p.student}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={p.status === 'VERIFIED' ? 'success' : 'warning'}>
                        {p.status === 'VERIFIED' ? '✓ Verified Guardian' : '⏳ ID Pending'}
                      </Badge>
                      {p.status === 'PENDING_APPROVAL' && (
                        <button onClick={() => handleApproveParent(p.id, p.name)} className="text-xs font-bold py-2 px-4 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-100">
                          <ShieldCheck size={14} /> Approve Guardian
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TABLETS TAB */}
        {activeTab === 'tablets' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Hostel Kiosk Devices</h3>
              <p className="text-xs text-slate-400 mt-1">Lock & monitor Android / Web calling tablets in student blocks</p>
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-xs font-medium">Checking tablet telemetry status...</span>
              </div>
            ) : tablets.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No tablet devices paired.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {tablets.map((t) => (
                  <div key={t.id} className="bg-slate-50/80 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <Tablet size={20} className="text-indigo-600" />
                          <span className="font-bold text-base text-slate-900">{t.deviceId}</span>
                        </div>
                        <Badge variant={t.status === 'ONLINE' ? 'success' : t.status === 'BUSY' ? 'warning' : 'danger'}>{t.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{t.name} • {t.block}</p>
                    </div>
                    <button onClick={() => toggleTabletLock(t.id, t.deviceId)} className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                      t.isLocked ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                    }`}>
                      {t.isLocked ? <><Lock size={14} /> Kiosk Lock Enabled</> : <><Unlock size={14} /> Unlocked (Admin Mode)</>}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RULES TAB */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Calling Schedule & Enforcement Rules</h3>
              <p className="text-xs text-slate-400 mt-1">Automated time-window restrictions and duration limits</p>
            </div>
            <div className="space-y-3.5">
              {[
                { label: 'Maximum Session Duration', value: '15 Minutes', desc: 'Auto disconnects after 15 mins to allow all students access' },
                { label: 'Daily Allowed Calling Window', value: '6:00 PM – 9:00 PM', desc: 'Weekdays (Mon-Fri) boarding hostel window' },
                { label: 'Daily Session Quota', value: '2 Calls / Student / Day', desc: 'Enforced via student PIN authentication' },
                { label: 'Guardian Verification Rule', value: 'Strict Govt ID Mandatory', desc: 'Unverified guardians cannot receive WebRTC links' },
                { label: 'Compliance Audio Record', value: 'Encrypted Cloud Vault', desc: 'For boarding school security audits' },
              ].map((rule, i) => (
                <div key={i} className="flex items-center justify-between p-5 bg-slate-50/60 rounded-2xl border border-slate-100">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{rule.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{rule.desc}</p>
                  </div>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-xl border border-indigo-200/60 font-mono shrink-0 ml-4">
                    {rule.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINANCE TAB */}
        {activeTab === 'finance' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 lg:p-10 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100">
              <h3 className="text-lg font-extrabold text-slate-900">Billing & Parent Wallet Ledger</h3>
              <p className="text-xs text-slate-400 mt-1">Prepaid balance ledger (₹2/minute call rate)</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 rounded-2xl p-6 border border-indigo-200/60">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Total Monthly Revenue</p>
                <p className="text-3xl font-extrabold text-indigo-950 mt-2">₹1,42,800</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 rounded-2xl p-6 border border-emerald-200/60">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Active Wallets</p>
                <p className="text-3xl font-extrabold text-emerald-950 mt-2">{parents.length * 12 + 48} Parents</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/40 rounded-2xl p-6 border border-cyan-200/60">
                <p className="text-xs font-bold text-cyan-600 uppercase tracking-wider">Avg Balance / Parent</p>
                <p className="text-3xl font-extrabold text-cyan-950 mt-2">₹294.00</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-slate-900">Add New Student Profile</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer text-slate-400">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Student Full Name</label>
                <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="e.g. Aarav Sharma"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Student Code</label>
                  <input type="text" value={newStudentCode} onChange={(e) => setNewStudentCode(e.target.value)} placeholder="STU-1005"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-mono font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Hostel Room</label>
                  <input type="text" value={newStudentRoom} onChange={(e) => setNewStudentRoom(e.target.value)} placeholder="A-101"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Grade / Section</label>
                <select value={newStudentGrade} onChange={(e) => setNewStudentGrade(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer font-medium">
                  {['Grade 6-A', 'Grade 7-B', 'Grade 8-C', 'Grade 9-B', 'Grade 10-A', 'Grade 11-B', 'Grade 12-A'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setShowAddStudentModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer">Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition cursor-pointer shadow-md shadow-indigo-100">Create Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
