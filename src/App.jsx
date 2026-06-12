import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AppLayout from './components/layout/AppLayout';
import { LoadingScreen } from './components/ui/Spinner';
import { Toaster } from 'react-hot-toast';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminDashboard from './pages/Dashboard';
import AdminEstates from './pages/Estates';
import NewEstate from './pages/NewEstate';
import EstateDetail from './pages/EstateDetail';
import Plans from './pages/Plans';
import Subscriptions from './pages/Subscriptions';
import Analytics from './pages/Analytics';
import Revenue from './pages/Revenue';
import AdminUsers from './pages/Users';
import Operations from './pages/Operations';

function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8" style={{ background: '#F8FAFC' }}>
        <div className="glass-card p-8 max-w-sm">
          <p className="font-semibold mb-2" style={{ color: '#DC2626' }}>Access Denied</p>
          <p className="text-sm" style={{ color: '#94A3B8' }}>This portal is for Super Admins only.</p>
        </div>
      </div>
    );
  }
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={user?.role === 'super_admin' ? <Navigate to="/dashboard" replace /> : <Login redirectTo="/dashboard" allowedRole="super_admin" />} />
      <Route path="/register" element={user?.role === 'super_admin' ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/dashboard" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
      <Route path="/estates" element={<RequireAdmin><AdminEstates /></RequireAdmin>} />
      <Route path="/estates/new" element={<RequireAdmin><NewEstate /></RequireAdmin>} />
      <Route path="/estates/:estateId" element={<RequireAdmin><EstateDetail /></RequireAdmin>} />
      <Route path="/plans" element={<RequireAdmin><Plans /></RequireAdmin>} />
      <Route path="/subscriptions" element={<RequireAdmin><Subscriptions /></RequireAdmin>} />
      <Route path="/analytics" element={<RequireAdmin><Analytics /></RequireAdmin>} />
      <Route path="/revenue" element={<RequireAdmin><Revenue /></RequireAdmin>} />
      <Route path="/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
      <Route path="/operations" element={<RequireAdmin><Operations /></RequireAdmin>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              fontSize: '0.875rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#ECFDF5' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: '#FEF2F2' } },
          }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
