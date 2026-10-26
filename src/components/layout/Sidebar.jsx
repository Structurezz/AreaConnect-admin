import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Building2, LogOut, CreditCard, Users, BarChart2, TrendingUp, Settings, AlertTriangle,
  Presentation, Megaphone, Mail, Music, Radio, Eye, Wallet, Receipt, PhoneCall, Gift, ShoppingBag, Rocket, Landmark,
} from 'lucide-react';

export const NAV = [
  {
    section: 'Overview',
    links: [
      { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics',        icon: BarChart2,       label: 'Analytics' },
      { to: '/visitor-insights', icon: Eye,             label: 'Visitor insights' },
    ],
  },
  {
    section: 'Estates',
    links: [
      { to: '/estates',     icon: Building2,     label: 'All estates' },
      { to: '/onboarding',  icon: Rocket,        label: 'Onboard estates' },
      { to: '/users',       icon: Users,         label: 'Users' },
      { to: '/operations',  icon: AlertTriangle, label: 'Operations' },
      { to: '/calls',       icon: PhoneCall,     label: 'Calls' },
    ],
  },
  {
    section: 'Finance',
    links: [
      { to: '/finance',       icon: Landmark,    label: 'Finance' },
      { to: '/subscriptions', icon: Settings,    label: 'Subscriptions' },
      { to: '/marketplace',   icon: ShoppingBag, label: 'Marketplace' },
      { to: '/call-credits',  icon: Gift,        label: 'Call credits' },
      { to: '/plans',         icon: CreditCard,  label: 'Plans & pricing' },
    ],
  },
  {
    section: 'Growth',
    links: [
      { to: '/campaigns',       icon: Megaphone,    label: 'Campaigns' },
      { to: '/email-campaigns', icon: Mail,         label: 'Email campaigns' },
      { to: '/pitch-deck',      icon: Presentation, label: 'Pitch deck & leads' },
    ],
  },
  {
    section: 'Content',
    links: [
      { to: '/lounge-defaults', icon: Music, label: 'Lounge playlist' },
      { to: '/podcast',         icon: Radio, label: 'Podcast studio' },
    ],
  },
];

export default function Sidebar({ mobile = false, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={`flex flex-col h-full ${mobile ? 'w-72' : 'w-60'}`} style={{ background: 'var(--nav)' }}>
      {/* Brand */}
      <Link to="/dashboard" onClick={onClose} className="flex items-center gap-2.5 px-4 h-14 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none' }}>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white" style={{ background: 'linear-gradient(135deg,#10B981,#047857)' }}>AC</span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[14px] font-semibold text-white">Area<span style={{ color: '#34D399' }}>Connect</span></span>
          <span className="block text-[11px] text-[#667085]">Platform admin</span>
        </span>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map(({ section, links }) => (
          <div key={section}>
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#475467]">{section}</p>
            <div className="space-y-0.5">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} end={to === '/dashboard'} onClick={onClose}
                  className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}>
                  <Icon size={15} /><span className="truncate">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Account */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
          {user?.profilePhoto
            ? <img src={user.profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
            : <span className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold text-white" style={{ background: '#1D2939' }}>{user?.name?.[0]?.toUpperCase()}</span>}
          <span className="flex-1 min-w-0 leading-tight">
            <span className="block text-[13px] font-medium text-[#F2F4F7] truncate">{user?.name}</span>
            <span className="block text-[11px] text-[#667085] truncate">{user?.email}</span>
          </span>
          <button onClick={() => { logout(); navigate('/login'); }} title="Sign out" aria-label="Sign out"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] hover:text-white hover:bg-white/5 transition-colors">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
