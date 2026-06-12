import { useEffect, useState } from 'react';
import {
  Building2, Users, Home, Eye, CreditCard, AlertCircle, RefreshCw,
  Shield, TrendingUp, CheckCircle, BarChart2, Percent, ArrowRight,
} from 'lucide-react';
import { adminAPI, planAPI, estateAPI } from '../api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

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
    <div className="flex justify-center py-32">
      <RefreshCw size={24} className="animate-spin" style={{ color: '#10B981' }} />
    </div>
  );

  const mrr      = subStats?.mrr ?? 0;
  const subTotal = Math.max((subStats?.active ?? 0) + (subStats?.trial ?? 0) + (subStats?.expired ?? 0), 1);
  const growth   = stats?.estateGrowth ?? [];
  const maxCount = Math.max(...growth.map(g => g.count), 1);

  const totalUnits    = stats?.totalUnits ?? 0;
  const occupancyRate = totalUnits > 0
    ? Math.round((estates.reduce((a, _) => a, 0) / totalUnits) * 100)
    : 0;

  const conversionRate = Math.round(((subStats?.active ?? 0) / subTotal) * 100);
  const totalPeople    = (stats?.totalResidents ?? 0) + (stats?.totalManagers ?? 0) + (stats?.totalSecurity ?? 0);

  const kpis = [
    { label: 'Total Estates',    value: stats?.totalEstates ?? 0,    icon: Building2,  color: '#D97706' },
    { label: 'Active Residents', value: stats?.totalResidents ?? 0,  icon: Users,      color: '#2563EB' },
    { label: 'Platform MRR',     value: `₦${mrr.toLocaleString()}`,  icon: TrendingUp, color: '#059669' },
    { label: 'Total Units',      value: totalUnits,                   icon: Home,       color: '#7C3AED' },
    { label: 'Active Estates',   value: estates.filter(e => e.isActive).length, icon: CheckCircle, color: '#059669' },
    { label: 'Total Users',      value: totalPeople,                  icon: Users,      color: '#D97706' },
    { label: 'Paid Conversion',  value: `${conversionRate}%`,        icon: Percent,    color: '#7C3AED' },
    { label: 'Open Alerts',      value: stats?.openAlerts ?? 0,      icon: AlertCircle, color: '#DC2626' },
  ];

  const subHealth = [
    { label: 'Active',   count: subStats?.active  ?? 0, color: '#10B981' },
    { label: 'On Trial', count: subStats?.trial   ?? 0, color: '#3B82F6' },
    { label: 'Expired',  count: subStats?.expired ?? 0, color: '#EF4444' },
  ];

  const userBreakdown = [
    { label: 'Estate Managers', value: stats?.totalManagers  ?? 0, color: '#D97706',  icon: Building2 },
    { label: 'Residents',       value: stats?.totalResidents ?? 0, color: '#2563EB',  icon: Users     },
    { label: 'Security Staff',  value: stats?.totalSecurity  ?? 0, color: '#059669',  icon: Shield    },
    { label: 'Total Visitors',  value: stats?.totalVisitors  ?? 0, color: '#7C3AED',  icon: Eye       },
  ];
  const maxUsers = Math.max(...userBreakdown.map(u => u.value), 1);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Platform Analytics</h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Real-time overview of your estate management platform</p>
      </div>

      {/* 8 Primary KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#94A3B8' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: color + '14' }}>
                <Icon size={15} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#0F172A' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subscription Health */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
              Subscription Health
            </h2>
            <Link to="/subscriptions" className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
              Manage <ArrowRight size={10} />
            </Link>
          </div>
          <div className="space-y-3 mb-4">
            {subHealth.map(({ label, count, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: '#475569' }}>{label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold" style={{ color: '#0F172A' }}>{count}</span>
                    <span className="text-xs" style={{ color: '#94A3B8' }}>
                      ({Math.round((count / subTotal) * 100)}%)
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                  <div className="h-2 rounded-full transition-all"
                    style={{ width: `${Math.round((count / subTotal) * 100)}%`, background: color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-4 flex flex-wrap gap-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            {subHealth.map(({ label, count, color }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold" style={{ color }}>{count}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{label}</div>
              </div>
            ))}
            <div className="ml-auto text-right">
              <div className="text-xl font-bold" style={{ color: '#059669' }}>{conversionRate}%</div>
              <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Conversion rate</div>
            </div>
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
              Plan Distribution
            </h2>
            <Link to="/plans" className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
              View Plans <ArrowRight size={10} />
            </Link>
          </div>
          {subStats?.byPlan?.length ? (
            <div className="space-y-3">
              {subStats.byPlan.map(plan => {
                const pct = Math.round((plan.count / Math.max(subStats.total, 1)) * 100);
                return (
                  <div key={plan._id}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: plan.color }} />
                        <span style={{ color: '#475569' }}>{plan.name}</span>
                      </div>
                      <span className="font-semibold" style={{ color: '#0F172A' }}>
                        {plan.count} <span className="font-normal" style={{ color: '#94A3B8' }}>({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: '#F1F5F9' }}>
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: plan.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#94A3B8' }}>No subscription data yet</p>
          )}
          {subStats?.total > 0 && (
            <div className="mt-4 pt-4 grid grid-cols-2 gap-4 text-center"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <div className="text-lg font-bold" style={{ color: '#059669' }}>{conversionRate}%</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Trial → Paid rate</div>
              </div>
              <div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{subStats.total}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Total subscriptions</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Breakdown */}
      <div className="glass-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#94A3B8' }}>
          User Breakdown Across All Estates
        </h2>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {userBreakdown.map(({ label, value, color, icon: Icon }) => {
            const pct = Math.round((value / Math.max(totalPeople + (stats?.totalVisitors ?? 0), 1)) * 100);
            return (
              <div key={label} className="p-4 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: color + '12' }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: '#94A3B8' }}>{pct}%</span>
                </div>
                <div className="text-2xl font-bold mb-0.5" style={{ color: '#0F172A' }}>{value}</div>
                <div className="text-xs mb-2" style={{ color: '#94A3B8' }}>{label}</div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                  <div className="h-full rounded-full"
                    style={{ width: `${Math.round((value / maxUsers) * 100)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estate Growth + ARR in row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Estate Growth Chart */}
        {growth.length > 0 && (
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#94A3B8' }}>
              Estate Registrations — Last 6 Months
            </h2>
            <div className="flex items-end gap-2 h-28">
              {growth.map(g => {
                const pct = Math.max(8, Math.round((g.count / maxCount) * 100));
                return (
                  <div key={`${g._id.year}-${g._id.month}`} className="flex-1 flex flex-col items-center gap-1.5 group">
                    <span className="text-xs font-semibold" style={{ color: '#475569' }}>{g.count}</span>
                    <div className="w-full rounded-t-md transition-colors"
                      style={{ height: `${pct}%`, background: 'rgba(16,185,129,0.50)' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#10B981'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'rgba(16,185,129,0.50)'} />
                    <span className="text-xs" style={{ color: '#94A3B8' }}>{MONTHS[g._id.month - 1]}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Total registered</div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{stats?.totalEstates ?? 0}</div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: '#94A3B8' }}>Active rate</div>
                <div className="text-lg font-bold" style={{ color: '#059669' }}>
                  {stats?.totalEstates > 0
                    ? Math.round((estates.filter(e => e.isActive).length / stats.totalEstates) * 100)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revenue summary */}
        <div className="glass-card p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#94A3B8' }}>
            Revenue Snapshot
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 px-4 rounded-xl"
              style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.12)' }}>
              <div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Monthly Recurring Revenue</div>
                <div className="text-2xl font-bold" style={{ color: '#059669' }}>₦{mrr.toLocaleString()}</div>
              </div>
              <TrendingUp size={28} style={{ color: 'rgba(5,150,105,0.3)' }} />
            </div>
            <div className="flex items-center justify-between py-3 px-4 rounded-xl"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Annual Recurring Revenue</div>
                <div className="text-2xl font-bold" style={{ color: '#D97706' }}>₦{(mrr * 12).toLocaleString()}</div>
              </div>
              <BarChart2 size={28} style={{ color: 'rgba(245,158,11,0.3)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="py-3 px-4 rounded-xl text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="text-lg font-bold" style={{ color: '#7C3AED' }}>{subStats?.active ?? 0}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Paying estates</div>
              </div>
              <div className="py-3 px-4 rounded-xl text-center" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="text-lg font-bold" style={{ color: '#2563EB' }}>{subStats?.trial ?? 0}</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Free trials</div>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Link to="/revenue" className="flex items-center justify-between text-sm font-medium"
              style={{ color: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
              View full revenue report <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Estate List — active vs inactive */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
            Estate Activity Overview
          </h2>
          <Link to="/estates" className="flex items-center gap-1 text-xs font-medium"
            style={{ color: '#7C3AED' }}
            onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
            onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
            All Estates <ArrowRight size={10} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total',       value: estates.length,                                 color: '#0F172A' },
            { label: 'Active',      value: estates.filter(e => e.isActive).length,         color: '#059669' },
            { label: 'Inactive',    value: estates.filter(e => !e.isActive).length,        color: '#DC2626' },
            { label: 'Managed',     value: estates.filter(e => e.managerId).length,        color: '#7C3AED' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center py-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{label}</div>
            </div>
          ))}
        </div>
        {estates.length > 0 && (
          <div className="h-2 rounded-full overflow-hidden flex" style={{ background: '#E2E8F0' }}>
            <div
              style={{ width: `${Math.round((estates.filter(e => e.isActive).length / estates.length) * 100)}%`, background: '#10B981' }}
              title="Active" />
            <div
              style={{ width: `${Math.round((estates.filter(e => !e.isActive).length / estates.length) * 100)}%`, background: '#EF4444' }}
              title="Inactive" />
          </div>
        )}
        <div className="flex items-center gap-4 mt-2">
          {[{ label: 'Active', color: '#10B981' }, { label: 'Inactive', color: '#EF4444' }].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: '#94A3B8' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
