import React, { useState, useEffect } from 'react';
import { Header, SchoolTenant, ALL_SCHOOL_TENANTS } from './components/Header';
import { SchoolAdminDashboard } from './components/SchoolAdminDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { PreJoinLobby } from './components/PreJoinLobby';
import { GoogleMeetRoom } from './components/GoogleMeetRoom';
import { AuthScreen, UserSession } from './components/AuthScreen';
import { api } from './services/api';

type AppView = 'auth' | 'dashboard' | 'prejoin' | 'inCall';

interface CallConfig {
  roomName: string;
  localDisplayName: string;
  remoteDisplayName: string;
  role: 'caller' | 'joiner';
  remotePeerId?: string;
  hostelBlock: string;
  localStream?: MediaStream;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [portalRole, setPortalRole] = useState<'SCHOOL_ADMIN' | 'SUPER_ADMIN'>('SUPER_ADMIN');
  const [schools, setSchools] = useState<SchoolTenant[]>(ALL_SCHOOL_TENANTS);
  const [selectedTenant, setSelectedTenant] = useState<SchoolTenant>(ALL_SCHOOL_TENANTS[0]);
  const [view, setView] = useState<AppView>('dashboard');
  const [callConfig, setCallConfig] = useState<CallConfig | null>(null);

  // Load schools from backend API
  useEffect(() => {
    api.schools
      .getAll()
      .then((data) => {
        if (data && data.length > 0) {
          const mapped = data.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            students: s.students || 0,
            tablets: s.tablets || 0,
          }));
          setSchools(mapped);
          setSelectedTenant(mapped[0]);
        }
      })
      .catch((err) => {
        console.warn('Using default schools fallback list:', err);
      });
  }, []);

  // Restore a persisted session on initial load when available
  useEffect(() => {
    const storedSession = localStorage.getItem('hostelconnect_user_session');
    if (!storedSession) {
      sessionStorage.removeItem('hostelconnect_user_session');
      return;
    }

    try {
      const parsedSession = JSON.parse(storedSession) as UserSession;
      setCurrentUser(parsedSession);
      if (parsedSession.role === 'SUPER_ADMIN') {
        setPortalRole('SUPER_ADMIN');
      } else {
        setPortalRole('SCHOOL_ADMIN');
        const matched = schools.find((t) => t.code === parsedSession.schoolCode) || schools[0];
        setSelectedTenant(matched);
      }
      setView('dashboard');
    } catch {
      localStorage.removeItem('hostelconnect_user_session');
      sessionStorage.removeItem('hostelconnect_user_session');
    }
  }, [schools]);

  // Check URL params for direct join (parent opening shared link)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const peerIdParam = urlParams.get('peerId');
    const roleParam = urlParams.get('role');

    if (roomParam && peerIdParam && roleParam === 'joiner') {
      setCallConfig({
        roomName: roomParam,
        localDisplayName: 'Parent Guardian',
        remoteDisplayName: 'Hostel Student',
        role: 'joiner',
        remotePeerId: peerIdParam,
        hostelBlock: 'Remote',
      });
      setView('prejoin');
    }
  }, []);

  const handleLoginSuccess = (session: UserSession) => {
    setCurrentUser(session);

    localStorage.setItem('hostelconnect_user_session', JSON.stringify(session));
    sessionStorage.setItem('hostelconnect_user_session', JSON.stringify(session));

    if (session.role === 'SUPER_ADMIN') {
      setPortalRole('SUPER_ADMIN');
      setSelectedTenant(schools[0]);
    } else {
      setPortalRole('SCHOOL_ADMIN');
      const matched = schools.find((t) => t.code === session.schoolCode) || schools[0];
      setSelectedTenant(matched);
    }
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hostelconnect_user_session');
    sessionStorage.removeItem('hostelconnect_user_session');
    setView('auth');
  };

  // Called from SchoolAdminDashboard when clicking "Join Google Meet"
  const handleStartCall = (config: { studentName: string; parentName: string; hostelBlock: string; roomId: string }) => {
    setCallConfig({
      roomName: `room_${config.roomId}`,
      localDisplayName: config.studentName,
      remoteDisplayName: config.parentName,
      role: 'caller',
      hostelBlock: config.hostelBlock,
    });
    setView('prejoin');
  };

  // Called from PreJoinLobby when user clicks "Join"
  const handleJoinCall = (localStream: MediaStream) => {
    if (callConfig) {
      setCallConfig({ ...callConfig, localStream });
      setView('inCall');
    }
  };

  // Called when leaving the call
  const handleLeaveRoom = () => {
    setCallConfig(null);
    setView('dashboard');
    window.history.pushState({}, document.title, window.location.pathname);
  };

  // Switch to specific school tenant from Super Admin Dashboard
  const handleAccessTenantFromSuperAdmin = (tenant: SchoolTenant) => {
    setSelectedTenant(tenant);
    setPortalRole('SCHOOL_ADMIN');
  };

  // ─── Unauthenticated Auth Screen ───
  if (!currentUser && view !== 'prejoin' && view !== 'inCall') {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // ─── Pre-Join Lobby ───
  if (view === 'prejoin' && callConfig) {
    return (
      <PreJoinLobby
        roomName={callConfig.roomName}
        displayName={callConfig.localDisplayName}
        role={callConfig.role}
        onJoin={handleJoinCall}
      />
    );
  }

  // ─── In-Call View ───
  if (view === 'inCall' && callConfig && callConfig.localStream) {
    return (
      <GoogleMeetRoom
        roomName={callConfig.roomName}
        localDisplayName={callConfig.localDisplayName}
        remoteDisplayName={callConfig.remoteDisplayName}
        role={callConfig.role}
        remotePeerId={callConfig.remotePeerId}
        hostelBlock={callConfig.hostelBlock}
        localStream={callConfig.localStream}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  // ─── Main Authenticated Dashboard ───
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const isSchoolAdmin = currentUser?.role === 'SCHOOL_ADMIN';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/80 overflow-y-auto overflow-x-hidden">
      <Header
        portalRole={portalRole}
        onSwitchPortal={(role) => {
          if (role === 'SUPER_ADMIN' && !isSuperAdmin) {
            alert('Access Denied: Only Super Admin can access all tenants and the Super Admin console.');
            return;
          }
          setPortalRole(role);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        selectedTenant={selectedTenant}
        onSelectTenant={setSelectedTenant}
        schools={schools}
      />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
        {isSuperAdmin ? (
          portalRole === 'SUPER_ADMIN' ? (
            <SuperAdminDashboard onAccessTenant={handleAccessTenantFromSuperAdmin} />
          ) : (
            <div className="space-y-4">
              {/* Impersonation Tenant Banner */}
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  <span>Viewing Tenant: <strong>{selectedTenant.name} ({selectedTenant.code})</strong></span>
                  <span className="text-slate-400">•</span>
                  <span className="text-indigo-600 font-mono">Super Admin Cross-Tenant Mode</span>
                </div>
                <button
                  onClick={() => setPortalRole('SUPER_ADMIN')}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                >
                  ← Return to Super Admin All Tenants Console
                </button>
              </div>
              <SchoolAdminDashboard onStartCall={handleStartCall} tenant={selectedTenant} />
            </div>
          )
        ) : isSchoolAdmin ? (
          /* School Admin: Isolated to their own single tenant */
          <SchoolAdminDashboard onStartCall={handleStartCall} tenant={selectedTenant} />
        ) : (
          /* Student / Parent Portals */
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-10 sm:p-14 text-center max-w-md w-full">
              <div className="w-16 h-16 bg-linear-to-br from-indigo-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                {currentUser?.role === 'STUDENT' ? 'Student Portal' : 'Parent Portal'}
              </h2>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Welcome, <span className="font-semibold text-slate-700">{currentUser?.name}</span>! 
                Tenant: <span className="font-semibold text-indigo-600">{selectedTenant?.name || currentUser?.schoolName || 'Delhi Public School'}</span>
              </p>
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-700 font-medium">
                🔒 Your session is securely isolated to your school hostel network.
              </div>
              <button
                onClick={handleLogout}
                className="mt-6 text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer transition"
              >
                Sign Out →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
