import { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
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
    <AuthShell
      headline="Join your estate on AreaConnect."
      points={[
        'Use the invite code shared by your estate manager',
        'Residents and security staff sign up here',
        'Your account is linked to your estate instantly',
      ]}
    >
      <div className="w-full max-w-[420px] animate-fade-in">
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <BrandTile />
          <div className="leading-tight">
            <div className="text-[14px] font-semibold text-[#101828]">AreaConnect</div>
            <div className="text-[11.5px] text-[#98A2B3]">Platform admin</div>
          </div>
        </div>

        <h1 className="text-[22px] font-semibold tracking-tight text-[#101828]">Create your account</h1>
        <p className="mt-1 text-[13.5px] text-[#475467]">Join your estate with the invite code you were given.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-[13px] text-[#B42318] bg-[#FEF3F2] border border-[#FECDCA]">
              <AlertCircle size={15} className="mt-px flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            <div className="col-span-2">
              <label className="field-label">Full name</label>
              <input
                className="input-field"
                placeholder="Adaeze Obi"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="field-label">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="field-label">Phone</label>
              <input
                className="input-field"
                placeholder="+234..."
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="field-label">Role</label>
              <select className="input-field" value={form.role} onChange={(e) => set('role', e.target.value)}>
                <option value="resident">Resident</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="field-label">Estate invite code</label>
              <input
                className="input-field font-mono uppercase tracking-widest"
                placeholder="e.g. GREEN1"
                value={form.estateCode}
                onChange={(e) => set('estateCode', e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="field-label">Password</label>
              <input
                type="password"
                className="input-field"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                required
                minLength={6}
              />
              <p className="field-hint">At least 6 characters.</p>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center !py-2.5">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-[13px] text-[#475467]">
          Already registered?{' '}
          <Link to="/login" className="font-medium text-[#059669] hover:text-[#047857] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
