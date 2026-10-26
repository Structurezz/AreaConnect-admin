import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

function BrandTile({ size = 36 }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38, background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)' }}
    >
      AC
    </div>
  );
}

// Split-screen auth layout: dark brand panel (desktop only) + white form panel.
function AuthShell({ children, headline, points }) {
  return (
    <div className="min-h-screen flex bg-white">
      <aside className="hidden lg:flex w-[44%] max-w-[620px] flex-col justify-between p-10 xl:p-12 bg-[#0B1220] text-white relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="relative flex items-center gap-3">
          <BrandTile />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-white">AreaConnect</div>
            <div className="text-[12px] text-[#98A2B3]">Platform admin</div>
          </div>
        </div>
        <div className="relative max-w-md">
          <p className="text-[26px] leading-snug font-semibold tracking-tight text-white">{headline}</p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-[13.5px] text-[#D0D5DD]">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[#34D399]" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-[11px] text-[#667085] tracking-wide">
          Powered by <span className="font-semibold text-[#98A2B3]">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
        </p>
      </aside>
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">{children}</div>
        <p className="lg:hidden pb-6 px-5 text-[11px] text-[#98A2B3] text-center tracking-wide">
          Powered by <span className="font-semibold text-[#667085]">AREA CONNECTOR TECHNOLOGIES</span> · RC&nbsp;9607864
        </p>
      </main>
    </div>
  );
}

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
    <AuthShell
      headline="Operate every estate on the network from one console."
      points={[
        'Onboard estates, managers and subscriptions',
        'Monitor payments, payouts and platform health',
        'Audit activity across residents and security',
      ]}
    >
      <div className="w-full max-w-[380px] animate-fade-in">
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <BrandTile />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-[#101828]">AreaConnect</div>
            <div className="text-[11.5px] text-[#98A2B3]">Platform admin</div>
          </div>
        </div>

        <h1 className="text-[22px] font-semibold tracking-tight text-[#101828]">Sign in</h1>
        <p className="mt-1 text-[13.5px] text-[#475467]">Use your administrator credentials to continue.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA]">
              <AlertCircle size={15} className="mt-px flex-shrink-0" /> <span>{error}</span>
            </div>
          )}
          <div>
            <label className="field-label">Email address</label>
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
            <label className="field-label">Password</label>
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#475467] transition-colors"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-2.5">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-[13px] text-[#475467]">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-[#059669] hover:text-[#047857] hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
