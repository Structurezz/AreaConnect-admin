import { useEffect, useState } from 'react';
import {
  TrendingUp, CreditCard, Users, RefreshCw, DollarSign, ArrowRight,
  Gift, AlertTriangle, Calendar, Zap,
} from 'lucide-react';
import { planAPI } from '../api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const STATUS_COLORS = {
  active:    '#059669',
  trial:     '#2563EB',
  expired:   '#DC2626',
  suspended: '#D97706',
  cancelled: '#94A3B8',
};
const fmt = (n) => `₦${Math.round(n || 0).toLocaleString()}`;

export default function Revenue() {
  const [stats, setStats]       = useState(null);
  const [subs, setSubs]         = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [failed, setFailed]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [compOnly, setCompOnly] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      planAPI.getSubscriptionStats(),
      planAPI.getSubscriptions(),
      planAPI.getUpcomingRenewals({ days: 7 }),
      planAPI.getFailedRenewals(),
    ])
      .then(([ss, sl, up, fl]) => {
        setStats(ss.data.data);
        setSubs(sl.data.data);
        setRenewals(up.data.data || []);
        setFailed(fl.data.data || []);
      })
      .catch(() => toast.error('Failed to load revenue data'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex justify-center py-32">
      <RefreshCw size={24} className="animate-spin" style={{ color: '#10B981' }} />
    </div>
  );

  const paidMrr    = stats?.mrrPaid     ?? stats?.mrr ?? 0;
  const compMrr    = stats?.mrrComp     ?? 0;
  const totalMrr   = stats?.mrrTotal    ?? (paidMrr + compMrr);
  const arr        = paidMrr * 12;
  const compArr    = compMrr * 12;
  const trialMrr   = stats?.trialPipelineMrr ?? 0;
  const activeComp = stats?.activeComp  ?? 0;
  const trial      = stats?.trial       ?? 0;
  const subTotal   = Math.max(stats?.total ?? 1, 1);

  const isCompLive = (sub) => {
    if (!sub?.comp?.isActive || !sub?.comp?.planId) return false;
    if (!sub.comp.expiresAt) return true;
    return new Date(sub.comp.expiresAt) > new Date();
  };

  // Paying count — active AND no live comp AND has a priced underlying plan
  const paying = subs.filter(s =>
    s.status === 'active' &&
    !isCompLive(s) &&
    (s.planId?.price?.monthly > 0 || s.planId?.price?.annual > 0),
  ).length;

  const recentSubs = (compOnly
    ? subs.filter(isCompLive)
    : subs
  ).slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 15);

  const topRevenue = subs
    .filter(s => s.status === 'active' && s.planId && !isCompLive(s))
    .map(s => ({
      ...s,
      monthlyValue: s.cycle === 'annual'
        ? Math.round((s.planId?.price?.annual ?? 0) / 12)
        : (s.planId?.price?.monthly ?? 0),
    }))
    .sort((a, b) => b.monthlyValue - a.monthlyValue)
    .slice(0, 8);

  const planRevenue = (stats?.byPlan ?? []).map(p => ({ ...p }));
  const maxPlanCount = Math.max(...planRevenue.map(p => p.count || 0), 1);

  // Billing model breakdown
  const flatSubs       = subs.filter(s => s.billingModel === 'flat' || !s.billingModel).length;
  const perResidentSubs = subs.filter(s => s.billingModel === 'per_resident').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Revenue</h1>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Financial performance, gifted MRR foregone, and renewal risk</p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#F1F5F9', color: '#0F172A' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Paid vs Comp MRR split — the fix for "revenue not reflecting the gift" */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-card p-5" style={{ background: 'linear-gradient(135deg,#F0FDF4,#FFFFFF 60%)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#047857' }}>
              Paid MRR
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
              <TrendingUp size={16} style={{ color: '#059669' }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: '#0F172A' }}>{fmt(paidMrr)}</div>
          <div className="text-xs mt-1" style={{ color: '#059669' }}>
            {paying} paying estate{paying === 1 ? '' : 's'} · ARR {fmt(arr)}
          </div>
        </div>
        <div className="glass-card p-5" style={{ background: 'linear-gradient(135deg,#FEF3C7,#FFFFFF 60%)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#B45309' }}>
              Comp MRR foregone
            </span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.18)' }}>
              <Gift size={16} style={{ color: '#D97706' }} />
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: '#0F172A' }}>{fmt(compMrr)}</div>
          <div className="text-xs mt-1" style={{ color: '#B45309' }}>
            {activeComp} live comp{activeComp === 1 ? '' : 's'} · would-be ARR {fmt(compArr)}
          </div>
        </div>
      </div>

      {/* Secondary KPIs */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Trial pipeline', value: fmt(trialMrr),  sub: `${trial} estate${trial === 1 ? '' : 's'} on trial`, icon: Zap,         color: '#2563EB' },
          { label: 'Renewals due', value: stats?.renewalsDue7d ?? 0, sub: 'Next 7 days',                      icon: Calendar,    color: '#7C3AED' },
          { label: 'Failed renewals', value: stats?.failedRenewalCount ?? 0, sub: 'Card declined / no auth', icon: AlertTriangle, color: stats?.failedRenewalCount ? '#DC2626' : '#94A3B8' },
          { label: 'Churn 30 d', value: stats?.cancelled30d ?? 0, sub: 'Cancelled or expired',               icon: Users,       color: '#DC2626' },
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

      {/* Failed renewals — ACTIONABLE QUEUE */}
      {failed.length > 0 && (
        <div className="glass-card overflow-hidden" style={{ borderColor: '#FECACA' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #FECACA', background: '#FEF2F2' }}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} style={{ color: '#DC2626' }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#B91C1C' }}>Failed auto-renewals · needs attention</h2>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#DC2626', color: '#fff' }}>{failed.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {failed.slice(0, 10).map(sub => (
              <Link key={sub._id} to={`/estates/${sub.estateId?._id || sub.estateId}`}
                className="px-5 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors" style={{ textDecoration: 'none' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                     style={{ background: '#FEE2E2', color: '#DC2626' }}>!</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{sub.estateId?.name || 'Unknown'}</div>
                  <div className="text-xs truncate" style={{ color: '#DC2626' }}>
                    {sub.lastRenewalError || 'Unknown error'}
                    {sub.renewalAttempts > 1 ? ` · ${sub.renewalAttempts} attempts` : ''}
                  </div>
                </div>
                <div className="text-xs text-right" style={{ color: '#94A3B8' }}>
                  {sub.lastRenewalAttemptAt ? formatDistanceToNow(new Date(sub.lastRenewalAttemptAt), { addSuffix: true }) : '—'}
                </div>
                <ArrowRight size={14} style={{ color: '#CBD5E1', flexShrink: 0 }} />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Plan — paid vs comp */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Plan mix (paid vs comp)</h2>
            <Link to="/plans" className="flex items-center gap-1 text-xs font-medium" style={{ color: '#7C3AED' }}>
              Manage Plans <ArrowRight size={10} />
            </Link>
          </div>
          {planRevenue.length ? (
            <div className="space-y-3">
              {planRevenue.map(plan => {
                const paidPct = Math.round(((plan.paid || 0) / maxPlanCount) * 100);
                const compPct = Math.round(((plan.comp || 0) / maxPlanCount) * 100);
                return (
                  <div key={plan.planId} className="p-3 rounded-xl" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: plan.color }} />
                        <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{plan.name}</span>
                      </div>
                      <div className="text-xs" style={{ color: '#64748B' }}>
                        <strong style={{ color: '#059669' }}>{plan.paid || 0} paid</strong>
                        {plan.comp ? <> · <strong style={{ color: '#B45309' }}>{plan.comp} comp</strong></> : null}
                        <> · total {plan.count}</>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                      <div style={{ width: `${paidPct}%`, background: plan.color || '#10B981' }} />
                      {plan.comp ? <div style={{ width: `${compPct}%`, background: '#F59E0B' }} /> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm" style={{ color: '#94A3B8' }}>No plan data yet</p>
          )}
          <div className="mt-4 pt-4 flex items-center justify-between text-xs" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <span style={{ color: '#94A3B8' }}>Total active MRR (paid + comp foregone)</span>
            <span className="font-bold" style={{ color: '#059669' }}>{fmt(totalMrr)}</span>
          </div>
        </div>

        {/* Status mix + billing model */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#94A3B8' }}>Subscription status mix</h2>
            <div className="space-y-3">
              {[
                { label: 'Active (paid)',  count: (stats?.active ?? 0) - activeComp, color: '#10B981' },
                { label: 'Active (comp)',  count: activeComp,                        color: '#F59E0B' },
                { label: 'Trial',          count: stats?.trial     ?? 0,             color: '#3B82F6' },
                { label: 'Expired',        count: stats?.expired   ?? 0,             color: '#EF4444' },
                { label: 'Cancelled',      count: stats?.cancelled ?? 0,             color: '#64748B' },
                { label: 'Suspended',      count: stats?.suspended ?? 0,             color: '#D97706' },
              ].filter(r => r.count > 0 || ['Active (paid)','Trial'].includes(r.label)).map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-right shrink-0" style={{ color: '#475569' }}>{label}</div>
                  <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.round((count / subTotal) * 100)}%`, background: color }} />
                  </div>
                  <div className="w-8 text-xs font-semibold text-right" style={{ color: '#0F172A' }}>{count}</div>
                  <div className="w-10 text-xs text-right" style={{ color: '#94A3B8' }}>{Math.round((count / subTotal) * 100)}%</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 grid grid-cols-2 gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Paid conversion</div>
                <div className="text-lg font-bold" style={{ color: '#059669' }}>
                  {Math.round(((((stats?.active ?? 0) - activeComp)) / subTotal) * 100)}%
                </div>
              </div>
              <div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>Total tracked</div>
                <div className="text-lg font-bold" style={{ color: '#0F172A' }}>{stats?.total ?? 0}</div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#94A3B8' }}>Billing model</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Flat fee',    value: flatSubs,        color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
                { label: 'Per resident', value: perResidentSubs, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
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

      {/* Upcoming renewals (next 7 days) */}
      {renewals.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2">
              <Calendar size={14} style={{ color: '#7C3AED' }} />
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#64748B' }}>Renewals in the next 7 days</h2>
            </div>
            <span className="text-xs" style={{ color: '#94A3B8' }}>{renewals.length} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {renewals.slice(0, 10).map(sub => {
              const price = sub.cycle === 'annual'
                ? Math.round((sub.planId?.price?.annual ?? 0) / 12)
                : (sub.planId?.price?.monthly ?? 0);
              const hasCard = !!sub.paystackAuth?.authorizationCode;
              return (
                <Link key={sub._id} to={`/estates/${sub.estateId?._id || sub.estateId}`}
                  className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors" style={{ textDecoration: 'none' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                       style={{ background: sub.planId?.color + '14' || '#F1F5F9', color: sub.planId?.color || '#64748B' }}>
                    {sub.estateId?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{sub.estateId?.name}</div>
                    <div className="text-xs truncate" style={{ color: '#94A3B8' }}>{sub.planId?.name} · {sub.cycle}</div>
                  </div>
                  <div className="hidden sm:block text-xs" style={{ color: hasCard ? '#059669' : '#DC2626' }}>
                    {hasCard ? `Card on file ••${sub.paystackAuth?.cardLast4 || ''}` : 'No card — will expire'}
                  </div>
                  <div className="text-sm font-bold" style={{ color: '#0F172A' }}>{fmt(price)}</div>
                  <div className="text-xs text-right" style={{ color: '#94A3B8', minWidth: 90 }}>
                    {format(new Date(sub.nextBillingDate), 'MMM d')}
                  </div>
                  <ArrowRight size={14} style={{ color: '#CBD5E1' }} />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Top revenue estates (paid only) */}
      {topRevenue.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Top revenue estates</h2>
            <span className="text-xs" style={{ color: '#94A3B8' }}>Paid, sorted by monthly value — comps excluded</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Estate</th>
                <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Plan</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell" style={{ color: '#94A3B8' }}>Cycle</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell" style={{ color: '#94A3B8' }}>Next billing</th>
                <th className="text-right font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Monthly value</th>
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
                        <div className="font-medium" style={{ color: '#0F172A' }}>{sub.estateId?.name || '—'}</div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>{sub.estateId?.estateCode}</div>
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
                  <td className="px-5 py-3.5 hidden md:table-cell capitalize text-sm" style={{ color: '#475569' }}>{sub.cycle}</td>
                  <td className="px-5 py-3.5 hidden lg:table-cell text-xs" style={{ color: '#94A3B8' }}>
                    {sub.nextBillingDate ? format(new Date(sub.nextBillingDate), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-bold" style={{ color: '#059669' }}>{fmt(sub.monthlyValue)}</span>
                    <span className="text-xs ml-1" style={{ color: '#94A3B8' }}>/mo</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent activity — filterable by comp */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Recent subscription activity</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCompOnly(false)}
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={!compOnly
                ? { background: '#0F172A', color: '#fff' }
                : { background: '#F1F5F9', color: '#475569' }}>All</button>
            <button onClick={() => setCompOnly(true)}
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
              style={compOnly
                ? { background: '#D97706', color: '#fff' }
                : { background: '#F1F5F9', color: '#475569' }}>
              <Gift size={10}/> Comp
            </button>
            <Link to="/subscriptions" className="flex items-center gap-1 text-xs font-medium ml-2" style={{ color: '#7C3AED' }}>
              All subscriptions <ArrowRight size={10} />
            </Link>
          </div>
        </div>
        <div>
          {recentSubs.length ? recentSubs.map(sub => {
            const color = STATUS_COLORS[sub.status] || '#94A3B8';
            const price = sub.cycle === 'annual' ? sub.planId?.price?.annual : sub.planId?.price?.monthly;
            const compLive = isCompLive(sub);
            return (
              <div key={sub._id} className="px-5 py-3.5 flex items-center justify-between transition-colors"
                style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569' }}>
                    {sub.estateId?.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2" style={{ color: '#0F172A' }}>
                      <span className="truncate">{sub.estateId?.name || 'Unknown'}</span>
                      {compLive && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                          <Gift size={8}/> COMP
                        </span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: '#94A3B8' }}>
                      {sub.planId?.name || '—'} · {sub.cycle} · {sub.billingModel || 'flat'}
                      {compLive && sub.comp?.reason ? ` · ${sub.comp.reason}` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {price > 0 && !compLive && (
                    <span className="text-xs font-medium hidden sm:block" style={{ color: '#475569' }}>
                      ₦{price?.toLocaleString()}/{sub.cycle === 'annual' ? 'yr' : 'mo'}
                    </span>
                  )}
                  {compLive && (
                    <span className="text-xs font-semibold hidden sm:block" style={{ color: '#B45309' }}>FREE</span>
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
              {compOnly ? 'No comp subscriptions yet' : 'No subscription activity yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
