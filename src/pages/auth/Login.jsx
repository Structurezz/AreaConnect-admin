import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO = { label: 'Super Admin', email: 'admin@estate-demo.com', password: 'Admin@123' };

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#F8FAFC' }}
    >
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo / heading */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
          >
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#0F172A' }}>Admin Portal</h1>
          <p className="text-sm" style={{ color: '#94A3B8' }}>Super Administrator Access</p>
        </div>

        {/* Demo account card */}
        <div className="glass-card p-4 mb-6">
          <p
            className="text-xs font-medium mb-3 uppercase tracking-wider"
            style={{ color: '#94A3B8' }}
          >
            Demo Account
          </p>
          <button
            onClick={() => { setForm({ email: DEMO.email, password: DEMO.password }); setError(''); }}
            className="w-full text-xs text-left p-2.5 rounded-lg transition-all"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              color: '#0F172A',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.borderColor = 'rgba(16,185,129,0.30)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >
            <div className="font-semibold" style={{ color: '#0F172A' }}>{DEMO.label}</div>
            <div style={{ color: '#94A3B8' }}>{DEMO.email}</div>
          </button>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="glass-card-gold p-6 space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-sm"
              style={{
                color: '#DC2626',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
              }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}
          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>
              Email Address
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="admin@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field pr-10"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-medium hover:underline transition-colors"
              style={{ color: '#7C3AED' }}
            >
              Sign up
            </Link>
          </p>
        </form>
        <p className="text-[11px] text-slate-400 text-center mt-6 tracking-wide">
          Powered by <span className="font-semibold text-slate-500">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
        </p>
      </div>
    </div>
  );
}
