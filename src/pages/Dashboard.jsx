import { useEffect, useState } from 'react';
import { estateAPI, adminAPI, planAPI } from '../api';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Plus, ArrowRight, TrendingUp, Home, AlertCircle,
  Clock, CreditCard, BarChart2, Settings, Shield, Bell, RefreshCw,
  CheckCircle, MapPin,
} from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [estates, setEstates]       = useState([]);
  const [platformStats, setPlatform] = useState(null);
  const [subStats, setSubStats]     = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      estateAPI.getAll(),
      adminAPI.getPlatformStats(),
      planAPI.getSubscriptionStats(),
    ])
      .then(([e, s, ss]) => {
        setEstates(e.data.data);
        setPlatform(s.data.data);
        setSubStats(ss.data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-16"><Spinner size={32} /></div>;

  const active      = estates.filter(e => e.isActive).length;
  const withManager = estates.filter(e => e.managerId).length;
  const unmanaged   = estates.length - withManager;
  const mrr         = subStats?.mrr ?? 0;
  const firstName   = user?.name?.split(' ')[0] || 'Admin';
  const openAlerts  = platformStats?.openAlerts ?? 0;

  const heroStats = [
    { label: 'Total Estates',    value: estates.length },
    { label: 'Active Estates',   value: active },
    { label: 'With Manager',     value: withManager },
    { label: 'Unmanaged',        value: unmanaged,                           warn: unmanaged > 0 },
    { label: 'Total Residents',  value: platformStats?.totalResidents ?? 0 },
    { label: 'Total Units',      value: platformStats?.totalUnits ?? 0 },
    { label: 'Monthly Revenue',  value: `₦${mrr.toLocaleString()}` },
    { label: 'Open Alerts',      value: openAlerts,                          warn: openAlerts > 0 },
  ];

  const healthItems = [
    {
      label: 'Trials Active',
      value: subStats?.trial ?? 0,
      icon: Clock,
      good: (subStats?.trial ?? 0) === 0,
      to: '/subscriptions',
      sub: 'Conversion opportunities',
    },
    {
      label: 'Expired / Lapsed',
      value: subStats?.expired ?? 0,
      icon: AlertCircle,
      good: (subStats?.expired ?? 0) === 0,
      to: '/operations',
      sub: 'Need immediate action',
    },
    {
      label: 'Unmanaged Estates',
      value: unmanaged,
      icon: Building2,
      good: unmanaged === 0,
      to: '/operations',
      sub: 'No manager assigned',
    },
    {
      label: 'Open Alerts',
      value: openAlerts,
      icon: Bell,
      good: openAlerts === 0,
      to: '/analytics',
      sub: 'Across all estates',
    },
  ];

  const quickActions = [
    { to: '/estates/new',   icon: Plus,       label: 'Create Estate',   sub: 'Register a new gated community', color: '#7C3AED', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' },
    { to: '/estates',       icon: Building2,  label: 'All Estates',     sub: 'Browse, filter and manage', color: '#2563EB', bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.15)' },
    { to: '/users',         icon: Users,      label: 'Users',           sub: 'Manage roles and accounts', color: '#059669', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.15)' },
    { to: '/analytics',     icon: BarChart2,  label: 'Analytics',       sub: 'KPIs, growth, trends', color: '#D97706', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.15)' },
    { to: '/revenue',       icon: TrendingUp, label: 'Revenue',         sub: 'MRR, ARR, financials', color: '#059669', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.15)' },
    { to: '/operations',    icon: AlertCircle,label: 'Operations',      sub: 'Watchlists and health', color: '#DC2626', bg: 'rgba(220,38,38,0.07)', border: 'rgba(220,38,38,0.15)' },
    { to: '/subscriptions', icon: CreditCard, label: 'Subscriptions',   sub: 'Plans and billing', color: '#7C3AED', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' },
    { to: '/plans',         icon: Settings,   label: 'Plans & Pricing', sub: 'Feature plan management', color: '#475569', bg: 'rgba(71,85,105,0.07)', border: 'rgba(71,85,105,0.15)' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 60%, #6D28D9 100%)' }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.07)' }} />
        <div className="absolute -bottom-12 left-1/2 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4"
            style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)' }}>
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1" style={{ letterSpacing: '-0.03em' }}>
                Welcome back, {firstName}
              </h1>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.72)' }}>
                Platform overview — all estates across the network
              </p>
            </div>
            <Link
              to="/estates/new"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl self-start sm:self-auto transition-all"
              style={{ background: 'white', color: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F5F3FF'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <Plus size={15} /> New Estate
            </Link>
          </div>

          {/* 8 stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {heroStats.map(({ label, value, warn }) => (
              <div key={label}
                className="rounded-xl p-3.5 sm:p-4"
                style={{
                  background: warn ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                }}>
                <div className="text-2xl font-bold text-white mb-0.5">{value}</div>
                <div className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.72)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Platform Health ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Platform Health</h2>
          <Link to="/operations" className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#7C3AED' }}
            onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
            onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
            View Operations <ArrowRight size={11} />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {healthItems.map(({ label, value, icon: Icon, good, to, sub }) => {
            const color  = good ? '#059669' : value > 0 ? '#DC2626' : '#059669';
            const bg     = good ? 'rgba(16,185,129,0.08)' : value > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(16,185,129,0.08)';
            const border = good ? 'rgba(16,185,129,0.18)' : value > 0 ? 'rgba(220,38,38,0.18)' : 'rgba(16,185,129,0.18)';
            return (
              <Link key={label} to={to}
                className="glass-card p-4 flex items-center gap-3 transition-all"
                style={{ textDecoration: 'none', border: `1px solid ${border}` }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}>
                  {good && value === 0
                    ? <CheckCircle size={17} style={{ color }} />
                    : <Icon size={17} style={{ color }} />
                  }
                </div>
                <div>
                  <div className="text-lg font-bold leading-none mb-0.5" style={{ color: '#0F172A' }}>{value}</div>
                  <div className="text-xs font-semibold" style={{ color }}>{label}</div>
                  <div className="text-xs" style={{ color: '#94A3B8' }}>{sub}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Subscription Summary ── */}
      {subStats && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Subscription Summary</h2>
            <Link to="/subscriptions" className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
              Manage <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total',    value: subStats.total ?? 0,   color: '#0F172A' },
              { label: 'Active',   value: subStats.active ?? 0,  color: '#059669' },
              { label: 'Trial',    value: subStats.trial ?? 0,   color: '#2563EB' },
              { label: 'Expired',  value: subStats.expired ?? 0, color: '#DC2626' },
              { label: 'MRR',      value: `₦${mrr.toLocaleString()}`, color: '#059669' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center py-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="text-xl font-bold" style={{ color }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{label}</div>
              </div>
            ))}
          </div>
          {subStats.total > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: '#94A3B8' }}>
                <span>Subscription health</span>
                <span>Active: {Math.round(((subStats.active ?? 0) / subStats.total) * 100)}% · Trial: {Math.round(((subStats.trial ?? 0) / subStats.total) * 100)}% · Expired: {Math.round(((subStats.expired ?? 0) / subStats.total) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex" style={{ background: '#E2E8F0' }}>
                <div style={{ width: `${Math.round(((subStats.active ?? 0) / subStats.total) * 100)}%`, background: '#10B981' }} />
                <div style={{ width: `${Math.round(((subStats.trial ?? 0) / subStats.total) * 100)}%`, background: '#3B82F6' }} />
                <div style={{ width: `${Math.round(((subStats.expired ?? 0) / subStats.total) * 100)}%`, background: '#EF4444' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Platform User Stats ── */}
      {platformStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Estate Managers', value: platformStats.totalManagers ?? 0, icon: Building2, color: '#D97706' },
            { label: 'Security Staff',  value: platformStats.totalSecurity  ?? 0, icon: Shield,   color: '#2563EB' },
            { label: 'Total Visitors',  value: platformStats.totalVisitors  ?? 0, icon: Users,    color: '#7C3AED' },
            { label: 'Open Alerts',     value: platformStats.openAlerts     ?? 0, icon: Bell,     color: '#DC2626' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: color + '12' }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <div className="text-xl font-bold" style={{ color: '#0F172A' }}>{value}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recent Estates ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Recent Estates</h2>
          <Link to="/estates" className="flex items-center gap-1 text-sm font-medium transition-colors"
            style={{ color: '#7C3AED' }}
            onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
            onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {estates.length === 0 ? (
          <div className="glass-card p-16 text-center">
            <Building2 size={48} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
            <p className="font-medium mb-1" style={{ color: '#475569' }}>No estates yet</p>
            <p className="text-sm mb-5" style={{ color: '#94A3B8' }}>Create your first estate to get started</p>
            <Link to="/estates/new" className="btn-primary inline-flex gap-2">
              <Plus size={16} /> Create Estate
            </Link>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  {['Estate', 'Code', 'Manager', 'Location', 'Status', 'Created'].map(h => (
                    <th key={h} className="text-left text-xs font-medium uppercase tracking-wider px-5 py-3"
                      style={{ color: '#94A3B8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estates.slice(0, 10).map(e => (
                  <tr key={e._id} className="transition-colors"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0"
                          style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: '#7C3AED' }}>
                          {e.name[0]}
                        </div>
                        <Link to={`/estates/${e._id}`}
                          className="font-medium text-sm hover:underline"
                          style={{ color: '#0F172A' }}>
                          {e.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-sm tracking-widest" style={{ color: '#7C3AED' }}>{e.estateCode}</span>
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: '#475569' }}>
                      {e.managerId?.name || <span className="italic" style={{ color: '#CBD5E1' }}>Unassigned</span>}
                    </td>
                    <td className="px-5 py-4 text-sm max-w-[180px] truncate" style={{ color: '#94A3B8' }}>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} style={{ flexShrink: 0 }} />
                        <span className="truncate">{e.address}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${e.isActive ? 'badge-green' : 'badge-red'}`}>
                        {e.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm whitespace-nowrap" style={{ color: '#94A3B8' }}>
                      {format(new Date(e.createdAt), 'MMM d, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {estates.length > 10 && (
              <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <Link to="/estates" className="text-sm font-medium hover:underline" style={{ color: '#7C3AED' }}>
                  View all {estates.length} estates →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-lg font-semibold mb-4" style={{ color: '#0F172A', letterSpacing: '-0.02em' }}>Quick Actions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map(({ to, icon: Icon, label, sub, bg, border, color }) => (
            <Link key={to} to={to}
              className="glass-card p-4 flex items-center gap-3 transition-all"
              style={{ textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.07)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: bg, border: `1px solid ${border}` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <div className="font-semibold text-sm mb-0.5" style={{ color: '#0F172A' }}>{label}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
