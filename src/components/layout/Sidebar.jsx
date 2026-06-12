import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Building2, Plus, LogOut,
  CreditCard, Users, BarChart2, TrendingUp,
  Settings, AlertTriangle,
} from 'lucide-react';

const NAV = [
  {
    section: 'Platform',
    links: [
      { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics',  icon: BarChart2,        label: 'Analytics' },
      { to: '/revenue',    icon: TrendingUp,        label: 'Revenue' },
    ],
  },
  {
    section: 'Management',
    links: [
      { to: '/estates',     icon: Building2,      label: 'All Estates' },
      { to: '/estates/new', icon: Plus,            label: 'New Estate' },
      { to: '/users',       icon: Users,           label: 'Users' },
      { to: '/operations',  icon: AlertTriangle,   label: 'Operations' },
    ],
  },
  {
    section: 'Configuration',
    links: [
      { to: '/plans',         icon: CreditCard, label: 'Plans & Pricing' },
      { to: '/subscriptions', icon: Settings,   label: 'Subscriptions' },
    ],
  },
];

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside
      className={`flex flex-col h-full ${mobile ? 'w-72' : 'w-64'}`}
      style={{ background: '#FFFFFF', borderRight: '1px solid #E2E8F0' }}
    >
      {/* Logo */}
      <Link to="/dashboard" className="block p-5 transition-opacity hover:opacity-80" style={{ borderBottom: '1px solid #E2E8F0', textDecoration: 'none' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}
          >
            <Building2 size={20} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Area<span style={{ color: '#8B5CF6' }}>Connect</span>
            </div>
            <div className="text-xs font-medium" style={{ color: '#94A3B8' }}>Super Admin</div>
          </div>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
        {NAV.map(({ section, links }) => (
          <div key={section}>
            <p
              className="text-xs font-medium uppercase tracking-widest px-3 pb-1.5"
              style={{ color: '#94A3B8' }}
            >
              {section}
            </p>
            <div className="space-y-0.5">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/dashboard' || to === '/estates/new'}
                  onClick={onClose}
                  className={({ isActive }) => isActive ? 'sidebar-link active' : 'sidebar-link'}
                >
                  <Icon size={16} /><span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4" style={{ borderTop: '1px solid #E2E8F0' }}>
        <div className="flex items-center gap-3 p-2 rounded-xl mb-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
            style={{
              background: 'rgba(139,92,246,0.10)',
              border: '1px solid rgba(139,92,246,0.25)',
              color: '#7C3AED',
            }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate" style={{ color: '#0F172A' }}>
              {user?.name}
            </div>
            <div className="text-xs truncate" style={{ color: '#94A3B8' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button
          onClick={async () => { await logout(); navigate('/login'); }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl transition-all text-sm mt-1"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#DC2626';
            e.currentTarget.style.background = '#FEF2F2';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}
