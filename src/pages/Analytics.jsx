import { useEffect, useState } from 'react';
import {
  Building2, Users, Home, Eye, CreditCard, AlertCircle, RefreshCw,
  Shield, TrendingUp, CheckCircle, BarChart2, Percent, ArrowRight,
  UserCheck, Zap, Wallet,
} from 'lucide-react';
import { adminAPI, planAPI, estateAPI } from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Analytics() {
  const [stats, setStats]       = useState(null);
  const [subStats, setSubStats] = useState(null);
  const [estates, setEstates]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([adminAPI.getPlatformStats(), planAPI.getSubscriptionStats(), estateAPI.getAll()])
      .then(([s, ss, e]) => {
        setStats(s.data.data);
        setSubStats(ss.data.data);
        setEstates(e.data.data);
      })
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="max-w-[1400px] mx-auto pb-12">
      <PageHeader title="Platform analytics" description="Real-time overview of the AreaConnect platform." />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-[104px] !rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="skeleton h-64 !rounded-xl" />
        <div className="skeleton h-64 !rounded-xl" />
      </div>
    </div>
  );

  const paidMrr = subStats?.mrrPaid ?? subStats?.mrr ?? 0;
  const compMrr = subStats?.mrrComp ?? 0;
  const subTotal = Math.max((subStats?.active ?? 0) + (subStats?.trial ?? 0) + (subStats?.expired ?? 0), 1);
  const growth   = stats?.estateGrowth ?? [];
  const maxCount = Math.max(...growth.map(g => g.count), 1);

  // Server now ships occupancyRate directly (fixes the busted client reduce)
  const totalUnits    = stats?.totalUnits ?? 0;
  const occupancyRate = stats?.occupancyRate ?? 0;

  const conversionRate = Math.round(((subStats?.active ?? 0) / subTotal) * 100);
  const totalPeople    = (stats?.totalResidents ?? 0) + (stats?.totalManagers ?? 0) + (stats?.totalSecurity ?? 0);
  const fmtNGN = (n) => `₦${Number(n || 0).toLocaleString()}`;

  const kpis = [
    { label: 'Total estates',    value: stats?.totalEstates ?? 0,    sub: `${stats?.activeEstates ?? 0} active`, icon: Building2,  color: 'amber' },
    { label: 'Active residents', value: stats?.totalResidents ?? 0,  sub: `${totalPeople} total users`, icon: Users, color: 'blue' },
    { label: 'Paid MRR',         value: fmtNGN(paidMrr),             sub: compMrr ? `+${fmtNGN(compMrr)} gift` : 'live revenue', icon: TrendingUp, color: 'green' },
    { label: 'Visitors today',   value: stats?.visitorsToday ?? 0,   sub: `${stats?.visitorsWeek ?? 0} this week`, icon: UserCheck, color: 'blue' },
    { label: 'Payment volume 30d', value: fmtNGN(stats?.paymentVolume30d),  sub: `${fmtNGN(stats?.paymentVolume)} all-time`, icon: Wallet, color: 'green' },
    { label: 'DAU / WAU / MAU',  value: `${stats?.dau ?? 0} / ${stats?.wau ?? 0} / ${stats?.mau ?? 0}`, sub: 'Logged in recently', icon: Zap, color: 'purple' },
    { label: 'Occupancy',        value: `${occupancyRate}%`,         sub: `${stats?.occupiedUnits ?? 0}/${totalUnits} units`, icon: Home, color: 'green' },
    { label: 'Open alerts',      value: stats?.openAlerts ?? 0,      sub: 'Platform-wide', icon: AlertCircle, color: stats?.openAlerts ? 'red' : 'blue' },
  ];

  const subHealth = [
    { label: 'Active',   count: subStats?.active  ?? 0, color: '#059669' },
    { label: 'On trial', count: subStats?.trial   ?? 0, color: '#2E90FA' },
    { label: 'Expired',  count: subStats?.expired ?? 0, color: '#F04438' },
  ];

  const userBreakdown = [
    { label: 'Estate managers', value: stats?.totalManagers  ?? 0, color: '#059669',  icon: Building2 },
    { label: 'Residents',       value: stats?.totalResidents ?? 0, color: '#2E90FA',  icon: Users     },
    { label: 'Security staff',  value: stats?.totalSecurity  ?? 0, color: '#F79009',  icon: Shield    },
    { label: 'Total visitors',  value: stats?.totalVisitors  ?? 0, color: '#7A5AF8',  icon: Eye       },
  ];
  const maxUsers = Math.max(...userBreakdown.map(u => u.value), 1);

  const activeEstates   = estates.filter(e => e.isActive).length;
  const inactiveEstates = estates.filter(e => !e.isActive).length;
  const linkCls = 'inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#059669] hover:text-[#047857]';
  const Bar = ({ pct, color, h = 'h-1.5' }) => (
    <div className={`${h} rounded-full bg-[#F2F4F7] overflow-hidden`}>
      <div className={`${h} rounded-full transition-all`} style={{ width: `${pct}%`, background: color }} />
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Platform analytics"
        description="Real-time overview of the AreaConnect platform."
        actions={<Link to="/revenue" className="btn-outline gap-2"><BarChart2 size={14} /> Revenue report</Link>}
      />

      {/* 8 Primary KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
        {kpis.map(({ label, value, sub, icon, color }) => (
          <StatCard key={label} label={label} value={value} icon={icon} color={color} hint={sub} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Subscription Health */}
        <div className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="card-title">Subscription health</h2>
              <p className="card-sub">Status of all estate subscriptions</p>
            </div>
            <Link to="/subscriptions" className={linkCls}>Manage <ArrowRight size={12} /></Link>
          </div>
          <div className="p-5 space-y-3.5">
            {subHealth.map(({ label, count, color }) => {
              const pct = Math.round((count / subTotal) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between items-center text-[13px] mb-1.5">
                    <span className="flex items-center gap-2 text-[#475467]">
                      <span className="w-2 h-2 rounded-full" style={{ background: color }} />{label}
                    </span>
                    <span className="tabular-nums">
                      <span className="font-semibold text-[#101828]">{count}</span>
                      <span className="text-[12px] text-[#98A2B3] ml-1.5">{pct}%</span>
                    </span>
                  </div>
                  <Bar pct={pct} color={color} h="h-2" />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-4 border-t border-[#E4E7EC] divide-x divide-[#E4E7EC]">
            {subHealth.map(({ label, count }) => (
              <div key={label} className="px-4 py-3">
                <div className="text-[11.5px] text-[#98A2B3]">{label}</div>
                <div className="text-[17px] font-semibold text-[#101828] tabular-nums">{count}</div>
              </div>
            ))}
            <div className="px-4 py-3">
              <div className="text-[11.5px] text-[#98A2B3]">Conversion</div>
              <div className="text-[17px] font-semibold text-[#059669] tabular-nums">{conversionRate}%</div>
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="card overflow-hidden flex flex-col">
          <div className="card-header">
            <div>
              <h2 className="card-title">Plan distribution</h2>
              <p className="card-sub">Subscriptions by plan</p>
            </div>
            <Link to="/plans" className={linkCls}>View plans <ArrowRight size={12} /></Link>
          </div>
          <div className="p-5 flex-1">
            {subStats?.byPlan?.length ? (
              <div className="space-y-3.5">
                {subStats.byPlan.map(plan => {
                  const pct = Math.round((plan.count / Math.max(subStats.total, 1)) * 100);
                  return (
                    <div key={plan.planId || plan._id || plan.name}>
                      <div className="flex justify-between items-center text-[13px] mb-1.5">
                        <span className="flex items-center gap-2 text-[#475467] min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: plan.color || '#059669' }} />
                          <span className="truncate">{plan.name}</span>
                        </span>
                        <span className="tabular-nums">
                          <span className="font-semibold text-[#101828]">{plan.count}</span>
                          <span className="text-[12px] text-[#98A2B3] ml-1.5">{pct}%</span>
                        </span>
                      </div>
                      <Bar pct={pct} color={plan.color || '#059669'} h="h-2" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-9 h-9 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-2.5">
                  <CreditCard size={16} className="text-[#98A2B3]" />
                </div>
                <p className="text-[13px] font-semibold text-[#101828]">No subscription data yet</p>
                <p className="text-[12px] text-[#98A2B3]">Plans will appear once estates subscribe.</p>
              </div>
            )}
          </div>
          {subStats?.total > 0 && (
            <div className="grid grid-cols-2 border-t border-[#E4E7EC] divide-x divide-[#E4E7EC]">
              <div className="px-4 py-3">
                <div className="text-[11.5px] text-[#98A2B3]">Trial → paid rate</div>
                <div className="text-[17px] font-semibold text-[#059669] tabular-nums">{conversionRate}%</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[11.5px] text-[#98A2B3]">Total subscriptions</div>
                <div className="text-[17px] font-semibold text-[#101828] tabular-nums">{subStats.total}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Breakdown */}
      <div className="card overflow-hidden mb-4">
        <div className="card-header">
          <div>
            <h2 className="card-title">User breakdown</h2>
            <p className="card-sub">Across all estates</p>
          </div>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 divide-x divide-y xl:divide-y-0 divide-[#E4E7EC]">
          {userBreakdown.map(({ label, value, color, icon: Icon }) => {
            const pct = Math.round((value / Math.max(totalPeople + (stats?.totalVisitors ?? 0), 1)) * 100);
            return (
              <div key={label} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="flex items-center gap-2 text-[12.5px] font-medium text-[#475467]">
                    <Icon size={14} style={{ color }} /> {label}
                  </span>
                  <span className="text-[11.5px] text-[#98A2B3] tabular-nums">{pct}%</span>
                </div>
                <div className="text-[22px] font-semibold text-[#101828] tabular-nums mb-2">{value.toLocaleString()}</div>
                <Bar pct={Math.round((value / maxUsers) * 100)} color={color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Estate Growth + Revenue */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {growth.length > 0 && (
          <div className="card overflow-hidden flex flex-col">
            <div className="card-header">
              <div>
                <h2 className="card-title">Estate registrations</h2>
                <p className="card-sub">Last 6 months</p>
              </div>
            </div>
            <div className="p-5 flex-1">
              <div className="relative h-36">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
                  {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-[#F2F4F7]" />)}
                </div>
                <div className="relative h-full flex items-end gap-3">
                  {growth.map(g => {
                    const pct = Math.max(6, Math.round((g.count / maxCount) * 100));
                    return (
                      <div key={`${g._id.year}-${g._id.month}`} className="flex-1 h-full flex flex-col items-center justify-end gap-1 group">
                        <span className="text-[11px] font-medium text-[#475467] tabular-nums">{g.count}</span>
                        <div className="w-full max-w-[44px] flex-1 flex items-end" style={{ maxHeight: 'calc(100% - 36px)' }}>
                          <div className="w-full rounded-t bg-[#059669] opacity-80 group-hover:opacity-100 transition-opacity" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] text-[#98A2B3]">{MONTHS[g._id.month - 1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 border-t border-[#E4E7EC] divide-x divide-[#E4E7EC]">
              <div className="px-4 py-3">
                <div className="text-[11.5px] text-[#98A2B3]">Total registered</div>
                <div className="text-[17px] font-semibold text-[#101828] tabular-nums">{stats?.totalEstates ?? 0}</div>
              </div>
              <div className="px-4 py-3">
                <div className="text-[11.5px] text-[#98A2B3]">Active rate</div>
                <div className="text-[17px] font-semibold text-[#059669] tabular-nums">
                  {stats?.totalEstates > 0
                    ? Math.round((activeEstates / stats.totalEstates) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revenue summary */}
        <div className="card overflow-hidden flex flex-col">
          <div className="card-header">
            <div>
              <h2 className="card-title">Revenue snapshot</h2>
              <p className="card-sub">Recurring subscription revenue</p>
            </div>
          </div>
          <div className="divide-y divide-[#F2F4F7] flex-1">
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] text-[#475467]">Monthly recurring revenue</div>
                <div className="text-[22px] font-semibold text-[#101828] tabular-nums">₦{paidMrr.toLocaleString()}</div>
                {compMrr > 0 && (
                  <div className="text-[11.5px] text-[#B54708] mt-0.5 tabular-nums">+ ₦{compMrr.toLocaleString()} gift foregone</div>
                )}
              </div>
              <span className="w-8 h-8 rounded-lg bg-[#ECFDF3] text-[#067647] flex items-center justify-center"><TrendingUp size={16} /></span>
            </div>
            <div className="px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-[12px] text-[#475467]">Annual recurring revenue</div>
                <div className="text-[22px] font-semibold text-[#101828] tabular-nums">₦{(paidMrr * 12).toLocaleString()}</div>
              </div>
              <span className="w-8 h-8 rounded-lg bg-[#F2F4F7] text-[#475467] flex items-center justify-center"><BarChart2 size={16} /></span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-[#E4E7EC]">
              <div className="px-5 py-3">
                <div className="text-[11.5px] text-[#98A2B3]">Paying estates</div>
                <div className="text-[17px] font-semibold text-[#101828] tabular-nums">{subStats?.active ?? 0}</div>
              </div>
              <div className="px-5 py-3">
                <div className="text-[11.5px] text-[#98A2B3]">Free trials</div>
                <div className="text-[17px] font-semibold text-[#101828] tabular-nums">{subStats?.trial ?? 0}</div>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 border-t border-[#E4E7EC]">
            <Link to="/revenue" className={`${linkCls} w-full justify-between`}>
              View full revenue report <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Estate activity */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <h2 className="card-title">Estate activity</h2>
            <p className="card-sub">Active vs inactive estates</p>
          </div>
          <Link to="/estates" className={linkCls}>All estates <ArrowRight size={12} /></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#E4E7EC] border-b border-[#E4E7EC]">
          {[
            { label: 'Total',    value: estates.length },
            { label: 'Active',   value: activeEstates, dot: '#059669' },
            { label: 'Inactive', value: inactiveEstates, dot: '#F04438' },
            { label: 'Managed',  value: estates.filter(e => e.managerId).length, dot: '#2E90FA' },
          ].map(({ label, value, dot }) => (
            <div key={label} className="px-4 py-3">
              <div className="text-[11.5px] text-[#98A2B3] flex items-center gap-1.5">
                {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}{label}
              </div>
              <div className="text-[17px] font-semibold text-[#101828] tabular-nums">{value}</div>
            </div>
          ))}
        </div>
        <div className="p-5">
          {estates.length > 0 && (
            <div className="h-2 rounded-full overflow-hidden flex bg-[#F2F4F7]">
              <div style={{ width: `${Math.round((activeEstates / estates.length) * 100)}%`, background: '#059669' }} title="Active" />
              <div style={{ width: `${Math.round((inactiveEstates / estates.length) * 100)}%`, background: '#F04438' }} title="Inactive" />
            </div>
          )}
          <div className="flex items-center gap-4 mt-2.5">
            {[{ label: 'Active', color: '#059669' }, { label: 'Inactive', color: '#F04438' }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-[12px] text-[#98A2B3]">
                <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
