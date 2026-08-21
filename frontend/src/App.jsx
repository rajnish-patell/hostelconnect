import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SchoolDashboard from './pages/SchoolDashboard';
import StudentApp from './pages/StudentApp';
import ParentApp from './pages/ParentApp';
import { getUser, logout, setAuth } from './utils/auth';
import { getSupabaseSession, onSupabaseAuthStateChange } from './utils/supabase';

function resolveDashboardRoute(user) {
  if (!user) return '/login';
  if (user.role === 'superadmin') return '/superadmin';
  if (user.role === 'school') return '/school';
  if (user.role === 'student') return '/student';
  if (user.role === 'parent') return '/parent';
  return '/login';
}

function PrivateRoute({ children, roles }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={resolveDashboardRoute(user)} replace />;
  }
  return children;
}

export default function App() {
  useEffect(() => {
    const syncSession = async () => {
      const { data } = await getSupabaseSession();
      const sessionUser = data?.session?.user;
      const currentUser = getUser();

      if (sessionUser && currentUser && currentUser.role === 'parent' && !currentUser.supabaseUserId) {
        setAuth(localStorage.getItem('token'), { ...currentUser, supabaseUserId: sessionUser.id });
      }
    };

    syncSession();

    const { data: authListener } = onSupabaseAuthStateChange((event, session) => {
      const currentUser = getUser();
      if (event === 'SIGNED_OUT') {
        if (currentUser && currentUser.role === 'parent' && currentUser.supabaseUserId) {
          logout();
        }
      }

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && currentUser?.role === 'parent') {
        const nextUser = { ...currentUser, supabaseUserId: session.user.id };
        if (!currentUser.supabaseUserId || currentUser.supabaseUserId !== session.user.id) {
          setAuth(localStorage.getItem('token'), nextUser);
        }
      }
    });

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  return (

    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          (() => {
            const currentUser = getUser();
            return currentUser ? <Navigate to={resolveDashboardRoute(currentUser)} replace /> : <Login />;
          })()
        }
      />
      
      <Route
        path="/superadmin/*"
        element={
          <PrivateRoute roles={['superadmin']}>
            <SuperAdminDashboard />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/school/*"
        element={
          <PrivateRoute roles={['school']}>
            <SchoolDashboard />
          </PrivateRoute>
        }
      />

      <Route
        path="/student"
        element={
          <PrivateRoute roles={['student']}>
            <StudentApp />
          </PrivateRoute>
        }
      />

      <Route
        path="/parent"
        element={
          <PrivateRoute roles={['parent']}>
            <ParentApp />
          </PrivateRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
