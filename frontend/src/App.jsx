import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import SchoolDashboard from './pages/SchoolDashboard';
import StudentApp from './pages/StudentApp';
import ParentApp from './pages/ParentApp';
import { getUser } from './utils/auth';

function PrivateRoute({ children, roles }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      
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
