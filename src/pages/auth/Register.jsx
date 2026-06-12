import { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_ROUTES = {
  super_admin:    '/dashboard',
  estate_manager: '/dashboard',
  resident:       '/dashboard',
  security:       '/dashboard',
};

export default function Register() {
  const { estateCode: paramCode } = useParams();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    role: 'resident', estateCode: paramCode || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await register(form);
      toast.success('Account created successfully!');
      navigate(ROLE_ROUTES[user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (key, val) => setForm({ ...form, [key]: val });

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          >
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#0F172A' }}>Join Estate</h1>
          <p className="text-sm" style={{ color: '#94A3B8' }}>Create your resident account</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card-gold p-6 space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-sm"
              style={{ color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Full Name</label>
              <input
                className="input-field"
                placeholder="Adaeze Obi"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Phone</label>
              <input
                className="input-field"
                placeholder="+234..."
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Role</label>
              <select className="input-field" value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="resident">Resident</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Estate Invite Code</label>
              <input
                className="input-field font-mono uppercase tracking-widest"
                placeholder="e.g. GREEN1"
                value={form.estateCode}
                onChange={(e) => set('estateCode', e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm" style={{ color: '#94A3B8' }}>
            Already registered?{' '}
            <Link
              to="/login"
              className="font-medium hover:underline transition-colors"
              style={{ color: '#059669' }}
            >
              Sign in
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
