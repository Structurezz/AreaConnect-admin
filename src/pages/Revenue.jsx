import { useEffect, useState } from 'react';
import { TrendingUp, CreditCard, Users, RefreshCw, DollarSign, ArrowRight, Building2 } from 'lucide-react';
import { planAPI } from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  active:    '#059669',
  trial:     '#2563EB',
  expired:   '#DC2626',
  suspended: '#D97706',
  cancelled: '#94A3B8',
};

export default function Revenue() {
  const [stats, setStats] = useState(null);
  const [subs, setSubs]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([planAPI.getSubscriptionStats(), planAPI.getSubscriptions()])
      .then(([ss, sl]) => { setStats(ss.data.data); setSubs(sl.data.data); })
      .catch(() => toast.error('Failed to load revenue data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-32">
      <RefreshCw size={24} className="animate-spin" style={{ color: '#10B981' }} />
    </div>
  );

  const mrr       = stats?.mrr ?? 0;
  const arr       = mrr * 12;
  const paying    = subs.filter(s => s.status === 'active' && (s.planId?.price?.monthly > 0 || s.planId?.price?.annual > 0)).length;
  const subTotal  = Math.max(stats?.total ?? 1, 1);

  const recentSubs = [...subs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 15);

  // Top revenue-generating estates (active, sorted by plan price)
  const topRevenue = subs
    .filter(s => s.status === 'active' && s.planId)
    .map(s => ({
      ...s,
      monthlyValue: s.cycle === 'annual'
        ? Math.round((s.planId?.price?.annual ?? 0) / 12)
        : (s.planId?.price?.monthly ?? 0),
    }))
    .sort((a, b) => b.monthlyValue - a.monthlyValue)
    .slice(0, 8);

  // Revenue by plan WITH total amounts
  const planRevenue = (stats?.byPlan ?? []).map(p => {
    const planSubs = subs.filter(s =>
      s.status === 'active' &&
      (s.planId?._id === p._id || s.planId === p._id)
    );
    const totalMonthly = planSubs.reduce((acc, s) => {
      const v = s.cycle === 'annual'
        ? Math.round((s.planId?.price?.annual ?? 0) / 12)
        : (s.planId?.price?.monthly ?? 0);
      return acc + v;
    }, 0);
    return { ...p, totalMonthly };
  });
  const maxPlanRevenue = Math.max(...planRevenue.map(p => p.totalMonthly), 1);

  // Billing model breakdown
  const flatSubs       = subs.filter(s => s.billingModel === 'flat' || !s.billingModel).length;
  const perResidentSubs = subs.filter(s => s.billingModel === 'per_resident').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Revenue</h1>
        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Financial performance and subscription metrics</p>
      </div>

      {/* Revenue KPIs */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Recurring Revenue', value: `₦${mrr.toLocaleString()}`,  sub: 'MRR',                     icon: TrendingUp, color: '#059669' },
          { label: 'Annual Recurring Revenue',  value: `₦${arr.toLocaleString()}`,  sub: 'Projected ARR',           icon: DollarSign, color: '#D97706' },
          { label: 'Paying Estates',            value: paying,                       sub: 'Active paid plans',       icon: CreditCard, color: '#7C3AED' },
          { label: 'On Free Trial',             value: stats?.trial ?? 0,            sub: 'Conversion opportunities', icon: Users,     color: '#2563EB' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '14' }}>
                <Icon size={14} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold" style={{ color: '#0F172A' }}>{value}</div>
            <div className="text-xs mt-1 font-medium" style={{ color }}>{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Plan — WITH amounts */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
              Revenue by Plan
            </h2>
            <Link to="/plans" className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
              Manage Plans <ArrowRight size={10} />
            </Link>
          </div>
          {planRevenue.length ? (
            <div className="space-y-4">
              {planRevenue.map(plan => {
                const pct = Math.round((plan.count / subTotal) * 100);
                const revPct = Math.round((plan.totalMonthly / maxPlanRevenue) * 100);
                return (
                  <div key={plan._id} className="p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
                        <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{plan.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: '#059669' }}>
                          ₦{plan.totalMonthly.toLocaleString()}<span className="text-xs font-normal" style={{ color: '#94A3B8' }}>/mo</span>
                        </div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>
                          {plan.count} estate{plan.count !== 1 ? 's' : ''} · {pct}% of total
                        </div>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: '#E2E8F0' }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${revPct}%`, background: plan.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#94A3B8' }}>No plan data yet</p>
          )}
          <div className="mt-4 pt-4 flex justify-between text-xs"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ color: '#94A3B8' }}>Total active MRR</span>
            <span className="font-bold" style={{ color: '#059669' }}>₦{mrr.toLocaleString()}</span>
          </div>
        </div>

        {/* Subscription Status Mix + Billing Models */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#94A3B8' }}>
              Subscription Status Mix
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Active (Paid)', count: stats?.active ?? 0, color: '#10B981' },
                { label: 'On Trial',      count: stats?.trial  ?? 0, color: '#3B82F6' },
                { label: 'Expired/Lapsed', count: stats?.expired ?? 0, color: '#EF4444' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-right shrink-0" style={{ color: '#475569' }}>{label}</div>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.round((count / subTotal) * 100)}%`, background: color }} />
                  </div>
                  <div className="w-8 text-xs font-semibold text-right" style={{ color: '#0F172A' }}>{count}</div>
                  <div className="w-8 text-xs text-right" style={{ color: '#94A3B8' }}>
                    {Math.round((count / subTotal) * 100)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 grid grid-cols-2 gap-3"
              style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Paid conversion rate</div>
                <div className="text-lg font-bold" style={{ color: '#059669' }}>
                  {Math.round(((stats?.active ?? 0) / subTotal) * 100)}%
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Total tracked</div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{stats?.total ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Billing Model Breakdown */}
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#94A3B8' }}>
              Billing Model Breakdown
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Flat Fee', value: flatSubs, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
                { label: 'Per Resident', value: perResidentSubs, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className="text-center p-4 rounded-xl" style={{ background: bg }}>
                  <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {subs.length > 0 ? Math.round((value / subs.length) * 100) : 0}% of all
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Revenue Estates */}
      {topRevenue.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
                Top Revenue Estates
              </h2>
              <span className="text-xs" style={{ color: '#94A3B8' }}>Active subscriptions, sorted by monthly value</span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Estate</th>
                <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Plan</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell" style={{ color: '#94A3B8' }}>Cycle</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell" style={{ color: '#94A3B8' }}>Next Billing</th>
                <th className="text-right font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Monthly Value</th>
              </tr>
            </thead>
            <tbody>
              {topRevenue.map((sub, idx) => (
                <tr key={sub._id} className="transition-colors"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: idx < 3 ? 'rgba(5,150,105,0.12)' : '#F1F5F9', color: idx < 3 ? '#059669' : '#94A3B8' }}>
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-medium" style={{ color: '#0F172A' }}>
                          {sub.estateId?.name || '—'}
                        </div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>
                          {sub.estateId?.estateCode}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {sub.planId && (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sub.planId.color }} />
                        <span className="font-medium text-sm" style={{ color: '#0F172A' }}>{sub.planId.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell capitalize text-sm" style={{ color: '#475569' }}>
                    {sub.cycle}
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-xs" style={{ color: '#94A3B8' }}>
                    {sub.nextBillingDate ? format(new Date(sub.nextBillingDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold" style={{ color: '#059669' }}>
                      ₦{sub.monthlyValue.toLocaleString()}
                    </span>
                    <span className="text-xs ml-1" style={{ color: '#94A3B8' }}>/mo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Subscription Activity */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>
              Recent Subscription Activity
            </h2>
            <Link to="/subscriptions" className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#7C3AED' }}
              onMouseEnter={e => e.currentTarget.style.color = '#8B5CF6'}
              onMouseLeave={e => e.currentTarget.style.color = '#7C3AED'}>
              All Subscriptions <ArrowRight size={10} />
            </Link>
          </div>
        </div>
        <div>
          {recentSubs.length ? recentSubs.map(sub => {
            const color = STATUS_COLORS[sub.status] || '#94A3B8';
            const price = sub.cycle === 'annual' ? sub.planId?.price?.annual : sub.planId?.price?.monthly;
            return (
              <div key={sub._id} className="px-5 py-3.5 flex items-center justify-between transition-colors"
                style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569' }}>
                    {sub.estateId?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: '#0F172A' }}>
                      {sub.estateId?.name || 'Unknown estate'}
                    </div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>
                      {sub.planId?.name || '—'} · {sub.cycle} · {sub.billingModel || 'flat'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {price > 0 && (
                    <span className="text-xs font-medium hidden sm:block" style={{ color: '#475569' }}>
                      ₦{price?.toLocaleString()}/{sub.cycle === 'annual' ? 'yr' : 'mo'}
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: color + '14', color, border: `1px solid ${color}28` }}>
                    {sub.status}
                  </span>
                  <span className="text-xs hidden sm:block" style={{ color: '#CBD5E1' }}>
                    {new Date(sub.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          }) : (
            <div className="px-5 py-8 text-center text-sm" style={{ color: '#94A3B8' }}>
              No subscription activity yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
