import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FaceEnrollPage from './pages/FaceEnrollPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import ExamRoomPage from './pages/ExamRoomPage';
import ResultsPage from './pages/ResultsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import CreateExamPage from './pages/CreateExamPage';
import LiveMonitorPage from './pages/LiveMonitorPage';

// Route guards
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-screen">
      <div className="spinner" />
      <span className="loading-text">Loading ProctorAI...</span>
    </div>
  );
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes */}
      <Route path="/" element={<RequireAuth><HomeRedirect /></RequireAuth>} />

      <Route path="/face-enroll" element={<RequireAuth><FaceEnrollPage /></RequireAuth>} />

      {/* Student routes */}
      <Route path="/dashboard" element={<RequireAuth><StudentDashboardPage /></RequireAuth>} />
      <Route path="/exam/:examId" element={<RequireAuth><ExamRoomPage /></RequireAuth>} />
      <Route path="/results/:attemptId" element={<RequireAuth><ResultsPage /></RequireAuth>} />

      {/* Admin routes */}
      <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
      <Route path="/admin/exams/create" element={<RequireAdmin><CreateExamPage /></RequireAdmin>} />
      <Route path="/admin/monitor/:examId" element={<RequireAdmin><LiveMonitorPage /></RequireAdmin>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#16191f',
                color: '#f1f5f9',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 500,
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#16191f' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#16191f' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
