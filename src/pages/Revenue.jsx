import { useEffect, useState } from 'react';
import {
  TrendingUp, CreditCard, Users, RefreshCw, DollarSign, ArrowRight,
  Gift, AlertTriangle, Calendar, Zap,
} from 'lucide-react';
import { planAPI } from '../api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const STATUS_BADGE = {
  active:    'badge-green',
  trial:     'badge-blue',
  expired:   'badge-red',
  suspended: 'badge-yellow',
  cancelled: 'badge-gray',
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
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Revenue" description="Financial performance, gifted MRR foregone, and renewal risk." />
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-[104px] rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <div className="skeleton h-[280px] rounded-xl" />
        <div className="skeleton h-[280px] rounded-xl" />
      </div>
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

  const statusRows = [
    { label: 'Active (paid)',  count: (stats?.active ?? 0) - activeComp, color: '#059669' },
    { label: 'Active (comp)',  count: activeComp,                        color: '#F79009' },
    { label: 'Trial',          count: stats?.trial     ?? 0,             color: '#2E90FA' },
    { label: 'Expired',        count: stats?.expired   ?? 0,             color: '#F04438' },
    { label: 'Cancelled',      count: stats?.cancelled ?? 0,             color: '#98A2B3' },
    { label: 'Suspended',      count: stats?.suspended ?? 0,             color: '#DC6803' },
  ].filter(r => r.count > 0 || ['Active (paid)','Trial'].includes(r.label));

  const billingRows = [
    { label: 'Flat fee',     value: flatSubs,        color: '#059669' },
    { label: 'Per resident', value: perResidentSubs, color: '#2E90FA' },
  ];
  const billingTotal = Math.max(subs.length, 1);

  const EmptyRow = ({ icon: Icon, title, hint }) => (
    <div className="py-10 flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-2.5">
        <Icon size={17} className="text-[#98A2B3]" />
      </div>
      <p className="text-[13.5px] font-semibold text-[#101828]">{title}</p>
      {hint && <p className="text-[12.5px] text-[#98A2B3] mt-0.5">{hint}</p>}
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Revenue"
        description="Financial performance, gifted MRR foregone, and renewal risk."
        actions={
          <button onClick={load} className="btn-outline">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {/* KPIs — paid vs comp MRR split first */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Paid MRR" value={fmt(paidMrr)} icon={TrendingUp} color="green"
          hint={`${paying} paying estate${paying === 1 ? '' : 's'} · ARR ${fmt(arr)}`} />
        <StatCard label="Comp MRR foregone" value={fmt(compMrr)} icon={Gift} color="amber"
          hint={`${activeComp} live comp${activeComp === 1 ? '' : 's'} · would-be ARR ${fmt(compArr)}`} />
        <StatCard label="Trial pipeline" value={fmt(trialMrr)} icon={Zap} color="blue"
          hint={`${trial} estate${trial === 1 ? '' : 's'} on trial`} />
        <StatCard label="Renewals due" value={stats?.renewalsDue7d ?? 0} icon={Calendar} color="blue"
          hint="Next 7 days" />
        <StatCard label="Failed renewals" value={stats?.failedRenewalCount ?? 0} icon={AlertTriangle}
          color={stats?.failedRenewalCount ? 'red' : 'amber'} hint="Card declined / no auth" />
        <StatCard label="Churn 30d" value={stats?.cancelled30d ?? 0} icon={Users} color="red"
          hint="Cancelled or expired" />
      </div>

      {/* Failed renewals — ACTIONABLE QUEUE */}
      {failed.length > 0 && (
        <div className="card overflow-hidden mt-4 !border-[#FECDCA]">
          <div className="card-header bg-[#FEF3F2] !border-[#FECDCA]">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={15} className="text-[#D92D20] flex-shrink-0" />
              <div className="min-w-0">
                <h2 className="card-title !text-[#B42318]">Failed auto-renewals</h2>
                <p className="text-[12px] text-[#B42318]/80">Needs attention — retry the card or contact the estate</p>
              </div>
            </div>
            <span className="badge badge-red tabular-nums">{failed.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-left">Estate</th>
                  <th className="text-left">Error</th>
                  <th className="text-left">Last attempt</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {failed.slice(0, 10).map(sub => (
                  <tr key={sub._id}>
                    <td>
                      <Link to={`/estates/${sub.estateId?._id || sub.estateId}`} className="cell-strong hover:text-[#059669]">
                        {sub.estateId?.name || 'Unknown'}
                      </Link>
                    </td>
                    <td className="max-w-[360px]">
                      <span className="block truncate text-[#B42318]" title={sub.lastRenewalError || ''}>
                        {sub.lastRenewalError || 'Unknown error'}
                      </span>
                      {sub.renewalAttempts > 1 && (
                        <span className="text-[11.5px] text-[#98A2B3]">{sub.renewalAttempts} attempts</span>
                      )}
                    </td>
                    <td className="text-[12px] text-[#98A2B3] whitespace-nowrap">
                      {sub.lastRenewalAttemptAt ? formatDistanceToNow(new Date(sub.lastRenewalAttemptAt), { addSuffix: true }) : '—'}
                    </td>
                    <td>
                      <Link to={`/estates/${sub.estateId?._id || sub.estateId}`} className="text-[#98A2B3] hover:text-[#101828]">
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        {/* Plan mix — paid vs comp */}
        <div className="card flex flex-col">
          <div className="card-header">
            <div>
              <h2 className="card-title">Plan mix</h2>
              <p className="card-sub">Paid vs comp subscriptions per plan</p>
            </div>
            <Link to="/plans" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#059669] hover:text-[#047857]">
              Manage plans <ArrowRight size={12} />
            </Link>
          </div>
          <div className="p-5 flex-1">
            <div className="flex items-center gap-4 mb-4 text-[11.5px] text-[#475467]">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#059669]" />Paid</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#F79009]" />Comp</span>
            </div>
            {planRevenue.length ? (
              <div className="space-y-4">
                {planRevenue.map(plan => {
                  const paidPct = Math.round(((plan.paid || 0) / maxPlanCount) * 100);
                  const compPct = Math.round(((plan.comp || 0) / maxPlanCount) * 100);
                  return (
                    <div key={plan.planId}>
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: plan.color }} />
                          <span className="text-[13px] font-medium text-[#101828] truncate">{plan.name}</span>
                        </div>
                        <div className="text-[12px] text-[#98A2B3] tabular-nums whitespace-nowrap">
                          <span className="text-[#067647] font-medium">{plan.paid || 0} paid</span>
                          {plan.comp ? <> · <span className="text-[#B54708] font-medium">{plan.comp} comp</span></> : null}
                          <> · {plan.count} total</>
                        </div>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden bg-[#F2F4F7]">
                        <div className="h-full" style={{ width: `${paidPct}%`, background: '#059669' }} />
                        {plan.comp ? <div className="h-full" style={{ width: `${compPct}%`, background: '#F79009' }} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyRow icon={CreditCard} title="No plan data yet" hint="Plan mix appears once estates subscribe." />
            )}
          </div>
          <div className="px-5 py-3 border-t border-[#E4E7EC] flex items-center justify-between gap-3 text-[12.5px]">
            <span className="text-[#475467]">Total active MRR <span className="text-[#98A2B3]">(paid + comp foregone)</span></span>
            <span className="font-semibold text-[#101828] tabular-nums">{fmt(totalMrr)}</span>
          </div>
        </div>

        {/* Status mix + billing model */}
        <div className="card flex flex-col">
          <div className="card-header">
            <div>
              <h2 className="card-title">Subscription status mix</h2>
              <p className="card-sub">Share of all tracked subscriptions</p>
            </div>
          </div>
          <div className="p-5 space-y-3 flex-1">
            {statusRows.map(({ label, count, color }) => {
              const pct = Math.round((count / subTotal) * 100);
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-24 text-[12px] text-[#475467] shrink-0">{label}</div>
                  <div className="flex-1 h-2 rounded-full overflow-hidden bg-[#F2F4F7]">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className="w-8 text-[12px] font-semibold text-right text-[#101828] tabular-nums">{count}</div>
                  <div className="w-10 text-[12px] text-right text-[#98A2B3] tabular-nums">{pct}%</div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 border-t border-[#E4E7EC] divide-x divide-[#E4E7EC]">
            <div className="px-5 py-3">
              <div className="text-[11.5px] text-[#98A2B3]">Paid conversion</div>
              <div className="text-[18px] font-semibold text-[#101828] tabular-nums">
                {Math.round(((((stats?.active ?? 0) - activeComp)) / subTotal) * 100)}%
              </div>
            </div>
            <div className="px-5 py-3">
              <div className="text-[11.5px] text-[#98A2B3]">Total tracked</div>
              <div className="text-[18px] font-semibold text-[#101828] tabular-nums">{stats?.total ?? 0}</div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-[#E4E7EC]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-semibold text-[#101828]">Billing model</span>
              <span className="text-[11.5px] text-[#98A2B3] tabular-nums">{subs.length} subscriptions</span>
            </div>
            <div className="flex h-2 rounded-full overflow-hidden bg-[#F2F4F7]">
              {billingRows.map(r => (
                <div key={r.label} className="h-full" style={{ width: `${(r.value / billingTotal) * 100}%`, background: r.color }} />
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
              {billingRows.map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-[12px]">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  <span className="text-[#475467]">{label}</span>
                  <span className="font-semibold text-[#101828] tabular-nums">{value}</span>
                  <span className="text-[#98A2B3] tabular-nums">
                    ({subs.length > 0 ? Math.round((value / subs.length) * 100) : 0}% of all)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming renewals (next 7 days) */}
      {renewals.length > 0 && (
        <div className="card overflow-hidden mt-4">
          <div className="card-header">
            <div>
              <h2 className="card-title">Renewals in the next 7 days</h2>
              <p className="card-sub">Auto-charge runs against the saved card</p>
            </div>
            <span className="badge badge-gray tabular-nums">{renewals.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Estate</th>
                  <th className="text-left">Plan</th>
                  <th className="text-left">Payment method</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Renews</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {renewals.slice(0, 10).map(sub => {
                  const price = sub.cycle === 'annual'
                    ? Math.round((sub.planId?.price?.annual ?? 0) / 12)
                    : (sub.planId?.price?.monthly ?? 0);
                  const hasCard = !!sub.paystackAuth?.authorizationCode;
                  return (
                    <tr key={sub._id}>
                      <td>
                        <Link to={`/estates/${sub.estateId?._id || sub.estateId}`} className="cell-strong hover:text-[#059669]">
                          {sub.estateId?.name}
                        </Link>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sub.planId?.color || '#98A2B3' }} />
                          <span className="text-[#101828]">{sub.planId?.name}</span>
                          <span className="text-[#98A2B3] capitalize">· {sub.cycle}</span>
                        </div>
                      </td>
                      <td>
                        {hasCard
                          ? <span className="badge badge-green">Card on file ••{sub.paystackAuth?.cardLast4 || ''}</span>
                          : <span className="badge badge-red">No card — will expire</span>}
                      </td>
                      <td className="text-right font-semibold text-[#101828] tabular-nums">{fmt(price)}</td>
                      <td className="text-right text-[12px] text-[#475467] whitespace-nowrap">
                        {format(new Date(sub.nextBillingDate), 'MMM d')}
                      </td>
                      <td>
                        <Link to={`/estates/${sub.estateId?._id || sub.estateId}`} className="text-[#98A2B3] hover:text-[#101828]">
                          <ArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top revenue estates (paid only) */}
      {topRevenue.length > 0 && (
        <div className="card overflow-hidden mt-4">
          <div className="card-header">
            <div>
              <h2 className="card-title">Top revenue estates</h2>
              <p className="card-sub">Paid, sorted by monthly value — comps excluded</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Estate</th>
                  <th className="text-left">Plan</th>
                  <th className="text-left hidden md:table-cell">Cycle</th>
                  <th className="text-left hidden lg:table-cell">Next billing</th>
                  <th className="text-right">Monthly value</th>
                </tr>
              </thead>
              <tbody>
                {topRevenue.map((sub, idx) => (
                  <tr key={sub._id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 tabular-nums ${idx < 3 ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#F2F4F7] text-[#98A2B3]'}`}>
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="cell-strong truncate">{sub.estateId?.name || '—'}</div>
                          <div className="text-[11.5px] text-[#98A2B3]">{sub.estateId?.estateCode}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {sub.planId && (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sub.planId.color }} />
                          <span className="text-[#101828]">{sub.planId.name}</span>
                        </div>
                      )}
                    </td>
                    <td className="hidden md:table-cell capitalize">{sub.cycle}</td>
                    <td className="hidden lg:table-cell text-[12px] text-[#98A2B3]">
                      {sub.nextBillingDate ? format(new Date(sub.nextBillingDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <span className="font-semibold text-[#101828] tabular-nums">{fmt(sub.monthlyValue)}</span>
                      <span className="text-[11.5px] ml-1 text-[#98A2B3]">/mo</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent activity — filterable by comp */}
      <div className="card overflow-hidden mt-4">
        <div className="card-header flex-wrap">
          <div>
            <h2 className="card-title">Recent subscription activity</h2>
            <p className="card-sub">Last 15 updated subscriptions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="tabs">
              <button onClick={() => setCompOnly(false)} className={`tab ${!compOnly ? 'active' : ''}`}>All</button>
              <button onClick={() => setCompOnly(true)} className={`tab inline-flex items-center gap-1 ${compOnly ? 'active' : ''}`}>
                <Gift size={12} /> Comp
              </button>
            </div>
            <Link to="/subscriptions" className="hidden sm:inline-flex items-center gap-1 text-[12.5px] font-medium text-[#059669] hover:text-[#047857]">
              All subscriptions <ArrowRight size={12} />
            </Link>
          </div>
        </div>
        {recentSubs.length ? (
          <div className="overflow-x-auto">
            <table className="table min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left">Estate</th>
                  <th className="text-left">Plan</th>
                  <th className="text-right">Price</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentSubs.map(sub => {
                  const price = sub.cycle === 'annual' ? sub.planId?.price?.annual : sub.planId?.price?.monthly;
                  const compLive = isCompLive(sub);
                  return (
                    <tr key={sub._id}>
                      <td>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="cell-strong truncate">{sub.estateId?.name || 'Unknown'}</span>
                          {compLive && (
                            <span className="badge badge-yellow"><Gift size={10} /> Comp</span>
                          )}
                        </div>
                        {compLive && sub.comp?.reason && (
                          <div className="text-[11.5px] text-[#98A2B3] truncate">{sub.comp.reason}</div>
                        )}
                      </td>
                      <td>
                        <span className="text-[#101828]">{sub.planId?.name || '—'}</span>
                        <span className="text-[#98A2B3]"> · <span className="capitalize">{sub.cycle}</span> · {sub.billingModel || 'flat'}</span>
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums">
                        {compLive
                          ? <span className="font-semibold text-[#B54708] text-[12px]">FREE</span>
                          : price > 0
                            ? <span className="text-[#101828]">₦{price?.toLocaleString()}<span className="text-[#98A2B3]">/{sub.cycle === 'annual' ? 'yr' : 'mo'}</span></span>
                            : <span className="text-[#D0D5DD]">—</span>}
                      </td>
                      <td><span className={`badge capitalize ${STATUS_BADGE[sub.status] || 'badge-gray'}`}>{sub.status}</span></td>
                      <td className="text-right text-[12px] text-[#98A2B3] whitespace-nowrap">
                        {new Date(sub.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyRow icon={compOnly ? Gift : CreditCard}
            title={compOnly ? 'No comp subscriptions yet' : 'No subscription activity yet'}
            hint={compOnly ? 'Granted comps will appear here.' : 'Activity appears as estates subscribe.'} />
        )}
      </div>
    </div>
  );
}
