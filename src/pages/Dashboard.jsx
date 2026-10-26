import { useEffect, useState } from 'react';
import { estateAPI, adminAPI, planAPI } from '../api';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Plus, ArrowRight, TrendingUp, Home, AlertCircle,
  Clock, CreditCard, BarChart2, Settings, Shield, Bell,
  CheckCircle, MapPin, UserCheck, Briefcase, ChevronRight,
} from 'lucide-react';
import Spinner from '../components/ui/Spinner';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { format, subMonths, startOfMonth } from 'date-fns';
import { useAuth } from '../context/AuthContext';

// Simple CSS column chart — no chart lib in this app.
function ColumnChart({ data, color = '#059669', height = 160 }) {
  const max = Math.max(1, ...data.map(d => d.value));
  return (
    <div>
      <div className="relative" style={{ height }}>
        {[0, 0.5, 1].map(p => (
          <div key={p} className="absolute left-0 right-0 border-t" style={{ bottom: `${p * 100}%`, borderColor: '#F2F4F7' }} />
        ))}
        <div className="absolute inset-0 flex items-end gap-3 px-1">
          {data.map(d => (
            <div key={d.label} className="flex-1 h-full flex flex-col justify-end items-center group">
              <span className="text-[11px] font-medium text-[#475467] tabular-nums mb-1">{d.value}</span>
              <div className="w-full max-w-[36px] rounded-t-[4px] transition-all"
                style={{ height: `${(d.value / max) * 85}%`, minHeight: d.value ? 3 : 0, background: color }} />
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 px-1 mt-2 border-t border-[#E4E7EC] pt-2">
        {data.map(d => (
          <div key={d.label} className="flex-1 text-center text-[11px] text-[#98A2B3]">{d.label}</div>
        ))}
      </div>
    </div>
  );
}

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

  // Estates onboarded per month (last 6 months) from createdAt
  const growth = Array.from({ length: 6 }, (_, i) => {
    const m = startOfMonth(subMonths(new Date(), 5 - i));
    const next = startOfMonth(subMonths(new Date(), 4 - i));
    return {
      label: format(m, 'MMM'),
      value: estates.filter(e => {
        const d = new Date(e.createdAt);
        return d >= m && d < next;
      }).length,
    };
  });

  const subTotal = subStats?.total ?? 0;
  const subMix = [
    { label: 'Active',  value: subStats?.active ?? 0,  color: '#059669' },
    { label: 'Trial',   value: subStats?.trial ?? 0,   color: '#2E90FA' },
    { label: 'Expired', value: subStats?.expired ?? 0, color: '#F04438' },
  ];
  const pct = (v) => (subTotal > 0 ? Math.round((v / subTotal) * 100) : 0);

  const healthItems = [
    { label: 'Trials active',     value: subStats?.trial ?? 0,   icon: Clock,       good: (subStats?.trial ?? 0) === 0,   to: '/subscriptions', sub: 'Conversion opportunities' },
    { label: 'Expired / lapsed',  value: subStats?.expired ?? 0, icon: AlertCircle, good: (subStats?.expired ?? 0) === 0, to: '/operations',    sub: 'Need immediate action' },
    { label: 'Unmanaged estates', value: unmanaged,              icon: Building2,   good: unmanaged === 0,                to: '/operations',    sub: 'No manager assigned' },
    { label: 'Open alerts',       value: openAlerts,             icon: Bell,        good: openAlerts === 0,               to: '/analytics',     sub: 'Across all estates' },
  ];

  const quickActions = [
    { to: '/onboarding',    icon: Plus,        label: 'Onboard estates',  sub: 'Register new communities' },
    { to: '/estates',       icon: Building2,   label: 'All estates',      sub: 'Browse, filter and manage' },
    { to: '/users',         icon: Users,       label: 'Users',            sub: 'Roles and accounts' },
    { to: '/analytics',     icon: BarChart2,   label: 'Analytics',        sub: 'KPIs, growth, trends' },
    { to: '/revenue',       icon: TrendingUp,  label: 'Revenue',          sub: 'MRR, ARR, financials' },
    { to: '/operations',    icon: AlertCircle, label: 'Operations',       sub: 'Watchlists and health' },
    { to: '/subscriptions', icon: CreditCard,  label: 'Subscriptions',    sub: 'Plans and billing' },
    { to: '/plans',         icon: Settings,    label: 'Plans & pricing',  sub: 'Feature plan management' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        heading title={`Welcome back, ${firstName}`}
        description={`Platform overview across all estates · ${format(new Date(), 'EEEE, MMMM d, yyyy')}`}
        actions={
          <>
            <Link to="/analytics" className="btn-outline gap-2"><BarChart2 size={14} /> Analytics</Link>
          </>
        }
      />

      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total estates"   value={estates.length} icon={Building2} color="green" hint={`${active} active · ${withManager} managed`} />
          <StatCard label="Total residents" value={platformStats?.totalResidents ?? 0} icon={Users} color="blue" hint={`${(platformStats?.totalUnits ?? 0).toLocaleString()} units`} />
          <StatCard label="Monthly recurring revenue" value={`₦${mrr.toLocaleString()}`} icon={TrendingUp} color="green" hint={`${subStats?.active ?? 0} paying subscriptions`} />
          <StatCard label="Open alerts"     value={openAlerts} icon={Bell} color={openAlerts > 0 ? 'red' : 'amber'} hint="Across all estates" />
        </div>

        {platformStats && (
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total units"     value={platformStats.totalUnits ?? 0}    icon={Home}      color="blue" />
            <StatCard label="Estate managers" value={platformStats.totalManagers ?? 0} icon={Briefcase} color="amber" />
            <StatCard label="Security staff"  value={platformStats.totalSecurity ?? 0} icon={Shield}    color="purple" />
            <StatCard label="Total visitors"  value={platformStats.totalVisitors ?? 0} icon={UserCheck} color="green" />
          </div>
        )}

        {/* Charts */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="card-header">
              <div>
                <div className="card-title">Estates onboarded</div>
                <div className="card-sub">New estates per month · last 6 months</div>
              </div>
              <Link to="/estates" className="text-[12.5px] font-medium text-[#059669] hover:underline inline-flex items-center gap-1">
                View estates <ArrowRight size={12} />
              </Link>
            </div>
            <div className="p-5">
              <ColumnChart data={growth} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Subscription mix</div>
                <div className="card-sub">{subTotal} total subscriptions</div>
              </div>
              <Link to="/subscriptions" className="text-[12.5px] font-medium text-[#059669] hover:underline inline-flex items-center gap-1">
                Manage <ArrowRight size={12} />
              </Link>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] font-semibold tracking-tight text-[#101828] tabular-nums">{pct(subStats?.active ?? 0)}%</span>
                <span className="text-[12px] text-[#98A2B3]">active rate</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden flex mt-3 bg-[#F2F4F7]">
                {subMix.map(s => (
                  <div key={s.label} style={{ width: `${pct(s.value)}%`, background: s.color }} />
                ))}
              </div>
              <ul className="mt-4 divide-y divide-[#F2F4F7]">
                {subMix.map(s => (
                  <li key={s.label} className="flex items-center justify-between py-2 text-[13px]">
                    <span className="flex items-center gap-2 text-[#475467]">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="tabular-nums text-[#101828] font-medium">
                      {s.value} <span className="text-[#98A2B3] font-normal ml-1">{pct(s.value)}%</span>
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between py-2 text-[13px]">
                  <span className="text-[#475467]">MRR</span>
                  <span className="tabular-nums text-[#101828] font-semibold">₦{mrr.toLocaleString()}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Platform health */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Platform health</div>
              <div className="card-sub">Items that may need attention</div>
            </div>
            <Link to="/operations" className="text-[12.5px] font-medium text-[#059669] hover:underline inline-flex items-center gap-1">
              View operations <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {healthItems.map(({ label, value, icon: Icon, good, to, sub }, i) => {
              const ok = good || value === 0;
              return (
                <Link key={label} to={to}
                  className={`p-4 flex items-center gap-3 hover:bg-[#F9FAFB] transition-colors border-[#F2F4F7]
                    ${i % 2 === 1 ? 'border-l' : ''} ${i >= 2 ? 'border-t lg:border-t-0' : ''} ${i === 2 ? 'lg:border-l' : ''}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ok ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#B42318]'}`}>
                    {ok ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[18px] font-semibold leading-none text-[#101828] tabular-nums">{value}</div>
                    <div className="text-[12.5px] font-medium text-[#344054] mt-1 truncate">{label}</div>
                    <div className="text-[11.5px] text-[#98A2B3] truncate">{sub}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent estates */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <div>
              <div className="card-title">Recent estates</div>
              <div className="card-sub">Latest {Math.min(10, estates.length)} of {estates.length}</div>
            </div>
            <Link to="/estates" className="text-[12.5px] font-medium text-[#059669] hover:underline inline-flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {estates.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mx-auto mb-3">
                <Building2 size={18} className="text-[#98A2B3]" />
              </div>
              <p className="text-[13.5px] font-medium text-[#101828]">No estates yet</p>
              <p className="text-[12.5px] text-[#98A2B3] mt-0.5 mb-4">Onboard your first estate to get started.</p>
              <Link to="/onboarding" className="btn-primary inline-flex gap-2"><Plus size={14} /> Onboard estates</Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="table min-w-[720px]">
                  <thead>
                    <tr>
                      <th>Estate</th>
                      <th>Manager</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estates.slice(0, 10).map(e => (
                      <tr key={e._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-[13px] flex-shrink-0 bg-[#F2F4F7] text-[#344054] border border-[#E4E7EC]">
                              {e.name[0]}
                            </div>
                            <div className="min-w-0">
                              <Link to={`/estates/${e._id}`} className="cell-strong hover:underline">{e.name}</Link>
                              <div className="font-mono text-[11.5px] text-[#98A2B3] tracking-wider">{e.estateCode}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {e.managerId?.name || <span className="text-[#98A2B3]">Unassigned</span>}
                        </td>
                        <td className="max-w-[220px]">
                          <span className="flex items-center gap-1 text-[#667085]">
                            <MapPin size={12} className="flex-shrink-0 text-[#98A2B3]" />
                            <span className="truncate">{e.address}</span>
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${e.isActive ? 'badge-green' : 'badge-red'}`}>
                            {e.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap tabular-nums text-[#667085]">
                          {format(new Date(e.createdAt), 'MMM d, yyyy')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {estates.length > 10 && (
                <div className="px-4 py-3 text-center border-t border-[#F2F4F7]">
                  <Link to="/estates" className="text-[13px] font-medium text-[#059669] hover:underline">
                    View all {estates.length} estates
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Quick actions */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <div>
              <div className="card-title">Quick actions</div>
              <div className="card-sub">Jump to common admin tasks</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#F2F4F7]">
            {quickActions.map(({ to, icon: Icon, label, sub }) => (
              <Link key={to} to={to}
                className="bg-white p-4 flex items-center gap-3 hover:bg-[#F9FAFB] transition-colors group">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#ECFDF3] text-[#059669]">
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-[#101828]">{label}</div>
                  <div className="text-[12px] text-[#98A2B3] truncate">{sub}</div>
                </div>
                <ChevronRight size={14} className="text-[#D0D5DD] group-hover:text-[#059669] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
