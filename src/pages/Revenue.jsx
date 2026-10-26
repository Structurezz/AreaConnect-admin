import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday, formatDistanceToNowStrict, startOfDay, subDays } from 'date-fns';
import {
  RefreshCw, ArrowDownLeft, ArrowUpRight, Wallet, Receipt, Landmark, CreditCard, Eye, EyeOff,
  CalendarClock, AlertTriangle, TrendingUp, Gift, ShieldCheck, Building2, ChevronRight, Search,
} from 'lucide-react';
import { planAPI, withdrawalAPI, adminPaymentAPI } from '../api';

const fmt = (n, dp = 0) => `₦${Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
const split = (n) => {
  const [w, d] = Number(n || 0).toFixed(2).split('.');
  return [Number(w).toLocaleString('en-NG'), d];
};
const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMM'));
const monthlyOf = (s) => (s.cycle === 'annual' ? Math.round((s.planId?.price?.annual ?? 0) / 12) : (s.planId?.price?.monthly ?? 0));
const isCompLive = (s) => !!(s?.comp?.isActive && s?.comp?.planId && (!s.comp.expiresAt || new Date(s.comp.expiresAt) > new Date()));

function Money({ value, size = 40, light }) {
  const [w, d] = split(value);
  return (
    <span className={`font-semibold tracking-tight tabular-nums ${light ? 'text-white' : 'text-[#101828]'}`} style={{ fontSize: size, lineHeight: 1 }}>
      <span style={{ fontSize: size * 0.6 }} className="align-top mr-0.5 opacity-80">₦</span>{w}<span style={{ fontSize: size * 0.5 }} className="opacity-60">.{d}</span>
    </span>
  );
}

function QuickAction({ to, onClick, icon: Icon, label }) {
  const inner = (
    <>
      <span className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors"><Icon size={17} /></span>
      <span className="text-[11.5px] text-white/80">{label}</span>
    </>
  );
  const cls = 'group flex flex-col items-center gap-1.5 text-white';
  return to ? <Link to={to} className={cls} style={{ textDecoration: 'none' }}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

function SideCard({ title, icon: Icon, count, action, children, tone }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F2F4F7]">
        <Icon size={15} className={tone || 'text-[#667085]'} />
        <h3 className="text-[13.5px] font-semibold text-[#101828]">{title}</h3>
        {count != null && <span className="text-[12px] text-[#98A2B3] tabular-nums">{count}</span>}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Revenue() {
  const [stats, setStats] = useState(null);
  const [subs, setSubs] = useState([]);
  const [renewals, setRenewals] = useState([]);
  const [failed, setFailed] = useState([]);
  const [balance, setBalance] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem('ac_rev_hidden') === '1'; } catch { return false; } });
  const [flow, setFlow] = useState('all');
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true);
    Promise.allSettled([
      planAPI.getSubscriptionStats(),
      planAPI.getSubscriptions(),
      planAPI.getUpcomingRenewals({ days: 7 }),
      planAPI.getFailedRenewals(),
      withdrawalAPI.balance(),
      adminPaymentAPI.paystackLedger({ limit: 100 }),
      withdrawalAPI.list({ limit: 100 }),
    ]).then(([ss, sl, up, fl, bal, led, wd]) => {
      if (ss.status === 'rejected') toast.error('Failed to load revenue data');
      setStats(ss.value?.data.data || null);
      setSubs(sl.value?.data.data || []);
      setRenewals(up.value?.data.data || []);
      setFailed(fl.value?.data.data || []);
      setBalance(bal.value?.data.data || null);
      setLedger(led.status === 'fulfilled' ? (led.value.data.data || []) : []);
      setPayouts(wd.value?.data.data?.withdrawals || []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { try { localStorage.setItem('ac_rev_hidden', hidden ? '1' : '0'); } catch { /* ignore */ } }, [hidden]);

  // Unified statement: Paystack receipts in, manager payouts out
  const feed = useMemo(() => {
    const ins = (ledger || []).map((t) => {
      const p = t.payment;
      const isSub = /subscri|plan|renew/i.test(JSON.stringify(t.metadata || {}));
      return {
        id: `in-${t.reference}`, dir: 'in', amount: t.amount, at: new Date(t.paidAt || t.createdAt),
        title: p?.estateId?.name ? `Dues · ${p.estateId.name}` : isSub ? 'Subscription payment' : (t.customer?.name || t.customer?.email || 'Paystack payment'),
        sub: [p?.residentId?.name || t.customer?.email, t.channel, t.reference].filter(Boolean).join(' · '),
        status: t.status === 'success' ? 'Received' : t.status,
        kind: p ? 'dues' : isSub ? 'subscription' : 'other',
      };
    });
    const outs = payouts.map((w) => ({
      id: `out-${w._id}`, dir: 'out', amount: w.amount, at: new Date(w.createdAt),
      title: `Payout · ${w.estateId?.name || w.userId?.name || 'Manager'}`,
      sub: [w.bankName, w.accountName, w.reference].filter(Boolean).join(' · '),
      status: w.status === 'success' ? 'Sent' : w.status === 'pending' ? 'Processing' : 'Failed',
      kind: 'payout',
    }));
    return [...ins, ...outs].filter((x) => !Number.isNaN(x.at.getTime())).sort((a, b) => b.at - a.at);
  }, [ledger, payouts]);

  const shown = feed.filter((x) => (flow === 'all' || x.dir === flow) && (!q || `${x.title} ${x.sub}`.toLowerCase().includes(q.toLowerCase())));
  const grouped = shown.slice(0, 60).reduce((m, x) => {
    const k = startOfDay(x.at).toISOString();
    (m[k] ||= []).push(x); return m;
  }, {});

  // 30-day cash flow
  const days = 30;
  const flowSeries = useMemo(() => Array.from({ length: days }, (_, i) => {
    const d = startOfDay(subDays(new Date(), days - 1 - i));
    const same = (x) => startOfDay(x.at).getTime() === d.getTime();
    return {
      d,
      in: feed.filter((x) => x.dir === 'in' && x.status === 'Received' && same(x)).reduce((s, x) => s + x.amount, 0),
      out: feed.filter((x) => x.dir === 'out' && x.status !== 'Failed' && same(x)).reduce((s, x) => s + x.amount, 0),
    };
  }), [feed]);
  const flowMax = Math.max(1, ...flowSeries.map((x) => Math.max(x.in, x.out)));
  const in30 = flowSeries.reduce((s, x) => s + x.in, 0);
  const out30 = flowSeries.reduce((s, x) => s + x.out, 0);

  const paidMrr = stats?.mrrPaid ?? stats?.mrr ?? 0;
  const compMrr = stats?.mrrComp ?? 0;
  const trialMrr = stats?.trialPipelineMrr ?? 0;
  const paying = subs.filter((s) => s.status === 'active' && !isCompLive(s) && monthlyOf(s) > 0);
  const topAccounts = paying.map((s) => ({ ...s, mv: monthlyOf(s) })).sort((a, b) => b.mv - a.mv).slice(0, 6);
  const byPlan = stats?.byPlan || [];
  const planTotal = Math.max(1, byPlan.reduce((s, p) => s + (p.count || 0), 0));
  const mask = (node) => (hidden ? <span className="tracking-[0.2em]">••••••</span> : node);

  if (loading && !stats) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="grid gap-4 lg:grid-cols-3"><div className="skeleton h-[250px] rounded-2xl lg:col-span-2" /><div className="skeleton h-[250px] rounded-2xl" /></div>
        <div className="grid gap-4 lg:grid-cols-3"><div className="skeleton h-[480px] rounded-xl lg:col-span-2" /><div className="skeleton h-[480px] rounded-xl" /></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-4 animate-fade-in">
      {/* ── Account hero + recurring revenue ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: 'radial-gradient(120% 140% at 100% 0%, #065F46 0%, #0B1220 55%)' }}>
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10" />
          <div className="absolute -right-4 -top-4 w-40 h-40 rounded-full border border-white/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[12px] text-white/60">
                <Landmark size={13} /> AreaConnect · Paystack NGN
                {balance?.testMode && <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10.5px] font-semibold">TEST MODE</span>}
              </div>
              <p className="mt-4 text-[12.5px] text-white/70">Available balance</p>
              <div className="mt-1.5 flex items-center gap-3">
                {balance?.paystack ? mask(<Money value={balance.paystack.balance} light size={42} />) : <span className="text-[22px] text-white/60">{balance?.paystackError || 'Unavailable'}</span>}
                <button onClick={() => setHidden((h) => !h)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10" aria-label="Toggle balance">
                  {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>
            <button onClick={load} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10" title="Refresh"><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /></button>
          </div>

          <div className="relative mt-6 grid grid-cols-3 gap-3 max-w-xl">
            {[
              ['Ours to keep', balance?.surplus, 'Balance minus what we owe', balance?.surplus < 0 ? 'text-red-300' : 'text-emerald-300'],
              ['Held for managers', balance?.walletBalances, 'Online dues not yet paid out'],
              ['Payouts queued', balance?.queued?.total, `${balance?.queued?.count || 0} pending`],
            ].map(([l, v, h, c]) => (
              <div key={l} className="rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2.5">
                <p className="text-[11px] text-white/55">{l}</p>
                <p className={`mt-0.5 text-[16px] font-semibold tabular-nums ${c || 'text-white'}`}>{v == null ? '—' : mask(fmt(v))}</p>
                <p className="text-[10.5px] text-white/40 truncate">{h}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-6 flex gap-6 sm:gap-8">
            <QuickAction to="/finance?tab=payouts" icon={ArrowUpRight} label="Payouts" />
            <QuickAction to="/finance?tab=transactions" icon={Receipt} label="Statement" />
            <QuickAction to="/subscriptions" icon={CreditCard} label="Billing" />
            <QuickAction to="/plans" icon={Wallet} label="Plans" />
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-[12.5px] font-medium text-[#475467] flex items-center gap-1.5"><TrendingUp size={14} className="text-[#059669]" /> Monthly recurring revenue</p>
            <span className="badge badge-green">{paying.length} paying</span>
          </div>
          <div className="mt-3">{mask(<Money value={paidMrr} size={32} />)}</div>
          <p className="mt-1 text-[12px] text-[#667085]">{mask(fmt(paidMrr * 12))} annual run-rate</p>

          <div className="mt-4 h-2 rounded-full bg-[#F2F4F7] overflow-hidden flex">
            {byPlan.map((p) => <div key={p.planId} style={{ width: `${(p.count / planTotal) * 100}%`, background: p.color || '#059669' }} title={`${p.name}: ${p.count}`} />)}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {byPlan.map((p) => <span key={p.planId} className="inline-flex items-center gap-1 text-[11.5px] text-[#475467]"><span className="w-2 h-2 rounded-full" style={{ background: p.color || '#059669' }} />{p.name} <span className="text-[#98A2B3]">{p.count}</span></span>)}
          </div>

          <dl className="mt-auto pt-4 space-y-2 text-[12.5px]">
            <div className="flex justify-between"><dt className="text-[#667085] flex items-center gap-1.5"><CalendarClock size={12} /> Trial pipeline</dt><dd className="font-medium text-[#101828] tabular-nums">{mask(fmt(trialMrr))}<span className="text-[#98A2B3] font-normal"> · {stats?.trial ?? 0}</span></dd></div>
            <div className="flex justify-between"><dt className="text-[#667085] flex items-center gap-1.5"><Gift size={12} /> Comp foregone</dt><dd className="font-medium text-[#B54708] tabular-nums">{mask(fmt(compMrr))}<span className="text-[#98A2B3] font-normal"> · {stats?.activeComp ?? 0}</span></dd></div>
            <div className="flex justify-between"><dt className="text-[#667085] flex items-center gap-1.5"><AlertTriangle size={12} /> Churned · 30 days</dt><dd className="font-medium text-[#101828] tabular-nums">{stats?.cancelled30d ?? 0}</dd></div>
          </dl>
        </div>
      </div>

      {/* ── Statement + side rail ── */}
      <div className="grid gap-4 lg:grid-cols-3 items-start">
        <div className="lg:col-span-2 card overflow-hidden">
          {/* Cash flow */}
          <div className="px-5 pt-4 pb-3 border-b border-[#F2F4F7]">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold text-[#101828]">Cash flow</h3>
                <p className="text-[12px] text-[#667085]">Last 30 days through Paystack</p>
              </div>
              <div className="flex gap-5">
                <div><p className="text-[11px] text-[#667085] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#10B981]" /> Money in</p><p className="text-[15px] font-semibold text-[#067647] tabular-nums">+{mask(fmt(in30))}</p></div>
                <div><p className="text-[11px] text-[#667085] flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#98A2B3]" /> Money out</p><p className="text-[15px] font-semibold text-[#344054] tabular-nums">−{mask(fmt(out30))}</p></div>
                <div className="hidden sm:block"><p className="text-[11px] text-[#667085]">Net</p><p className={`text-[15px] font-semibold tabular-nums ${in30 - out30 >= 0 ? 'text-[#101828]' : 'text-[#B42318]'}`}>{mask(fmt(in30 - out30))}</p></div>
              </div>
            </div>
            <div className="mt-4 h-[110px] flex items-end gap-[3px]">
              {flowSeries.map((x) => (
                <div key={x.d.toISOString()} className="flex-1 h-full flex flex-col justify-end gap-[2px] group relative">
                  <div className="rounded-t-[3px] bg-[#10B981] group-hover:bg-[#059669] transition-colors" style={{ height: `${(x.in / flowMax) * 100}%`, minHeight: x.in ? 3 : 0 }} />
                  <div className="rounded-b-[3px] bg-[#D0D5DD]" style={{ height: `${(x.out / flowMax) * 45}%`, minHeight: x.out ? 3 : 0 }} />
                  {!x.in && !x.out && <div className="h-[2px] rounded bg-[#F2F4F7]" />}
                  <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-md bg-[#101828] text-white text-[11px] px-2 py-1 z-10">
                    {format(x.d, 'd MMM')} · +{fmt(x.in)}{x.out ? ` / −${fmt(x.out)}` : ''}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10.5px] text-[#98A2B3]"><span>{format(flowSeries[0].d, 'd MMM')}</span><span>Today</span></div>
          </div>

          {/* Statement */}
          <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-[#F2F4F7]">
            <h3 className="text-[14px] font-semibold text-[#101828]">Transactions</h3>
            <div className="tabs">
              {[['all', 'All'], ['in', 'Money in'], ['out', 'Money out']].map(([k, l]) => <button key={k} className={`tab ${flow === k ? 'active' : ''}`} onClick={() => setFlow(k)}>{l}</button>)}
            </div>
            <div className="sm:ml-auto flex items-center gap-2 h-8 px-2.5 rounded-lg border border-[#D0D5DD] w-full sm:w-56">
              <Search size={13} className="text-[#98A2B3]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px]" />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {ledger === null && <div className="p-5 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>}
            {ledger !== null && !shown.length && (
              <div className="py-14 text-center">
                <span className="mx-auto w-11 h-11 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center"><Receipt size={18} /></span>
                <p className="mt-3 text-[13.5px] font-semibold text-[#101828]">No transactions</p>
                <p className="text-[12.5px] text-[#667085]">Paystack receipts and manager payouts will appear here.</p>
              </div>
            )}
            {Object.entries(grouped).map(([day, rows]) => {
              const net = rows.reduce((s, x) => s + (x.dir === 'in' ? x.amount : -x.amount), 0);
              return (
                <div key={day}>
                  <div className="sticky top-0 z-[1] flex justify-between px-5 py-1.5 bg-[#F9FAFB] border-y border-[#F2F4F7] text-[11.5px]">
                    <span className="font-semibold text-[#475467]">{dayLabel(new Date(day))}</span>
                    <span className="text-[#98A2B3] tabular-nums">{mask(`${net >= 0 ? '+' : '−'}${fmt(Math.abs(net), 2)}`)}</span>
                  </div>
                  {rows.map((x) => (
                    <div key={x.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FCFCFD] border-b border-[#F9FAFB] last:border-0">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${x.dir === 'in' ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#F2F4F7] text-[#475467]'}`}>
                        {x.dir === 'in' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#101828] truncate">{x.title}</p>
                        <p className="text-[11.5px] text-[#98A2B3] truncate">{format(x.at, 'HH:mm')} · {x.sub}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[13.5px] font-semibold tabular-nums ${x.dir === 'in' ? 'text-[#067647]' : 'text-[#101828]'} ${x.status === 'Failed' ? 'line-through opacity-50' : ''}`}>
                          {mask(`${x.dir === 'in' ? '+' : '−'}${fmt(x.amount, 2)}`)}
                        </p>
                        <p className={`text-[11px] ${x.status === 'Failed' ? 'text-[#B42318]' : x.status === 'Processing' ? 'text-[#B54708]' : 'text-[#98A2B3]'}`}>{x.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          <Link to="/finance?tab=transactions" className="flex items-center justify-center gap-1 py-2.5 border-t border-[#F2F4F7] text-[12.5px] font-medium text-[#059669] hover:bg-[#F6FEF9]" style={{ textDecoration: 'none' }}>
            Full statement <ChevronRight size={13} />
          </Link>
        </div>

        <div className="space-y-4">
          <SideCard title="Scheduled charges" icon={CalendarClock} count={renewals.length} tone="text-[#2E90FA]"
            action={<span className="text-[11.5px] text-[#98A2B3]">next 7 days</span>}>
            {!renewals.length ? <p className="px-4 py-6 text-center text-[12.5px] text-[#98A2B3]">Nothing due this week</p> : (
              <div className="divide-y divide-[#F2F4F7]">
                {renewals.slice(0, 6).map((s) => {
                  const due = s.nextBillingDate ? new Date(s.nextBillingDate) : null;
                  return (
                    <div key={s._id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="w-10 text-center flex-shrink-0 rounded-lg border border-[#E4E7EC] py-1 leading-none">
                        <span className="block text-[9.5px] uppercase text-[#98A2B3]">{due ? format(due, 'MMM') : '—'}</span>
                        <span className="block text-[14px] font-semibold text-[#101828]">{due ? format(due, 'd') : ''}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-[#101828] truncate">{s.estateId?.name || 'Estate'}</p>
                        <p className="text-[11px] text-[#98A2B3] truncate">{s.planId?.name} · {s.paystackAuth?.authorizationCode ? 'Auto-debit card' : 'No card — invoice'}</p>
                      </div>
                      <span className="text-[12.5px] font-semibold text-[#101828] tabular-nums">{mask(fmt(s.cycle === 'annual' ? s.planId?.price?.annual : s.planId?.price?.monthly))}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SideCard>

          <SideCard title="Declined charges" icon={AlertTriangle} count={failed.length} tone="text-[#D92D20]">
            {!failed.length ? (
              <p className="px-4 py-6 text-center text-[12.5px] text-[#98A2B3] flex items-center justify-center gap-1.5"><ShieldCheck size={14} className="text-[#059669]" /> All renewals went through</p>
            ) : (
              <div className="divide-y divide-[#F2F4F7]">
                {failed.slice(0, 6).map((s) => (
                  <Link key={s._id} to={s.estateId?._id ? `/estates/${s.estateId._id}` : '/subscriptions'} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[#FFFBFA]" style={{ textDecoration: 'none' }}>
                    <span className="w-8 h-8 rounded-full bg-[#FEF3F2] text-[#D92D20] flex items-center justify-center flex-shrink-0"><CreditCard size={14} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-[#101828] truncate">{s.estateId?.name || 'Estate'}</p>
                      <p className="text-[11px] text-[#B42318] truncate">{s.lastRenewalError || 'Card declined'}</p>
                      <p className="text-[10.5px] text-[#98A2B3]">{s.renewalAttempts || 0} attempt{s.renewalAttempts === 1 ? '' : 's'}{s.lastRenewalAttemptAt ? ` · ${formatDistanceToNowStrict(new Date(s.lastRenewalAttemptAt))} ago` : ''}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SideCard>

          <SideCard title="Top accounts" icon={Building2} count={paying.length}>
            {!topAccounts.length ? <p className="px-4 py-6 text-center text-[12.5px] text-[#98A2B3]">No paying estates yet</p> : (
              <div className="divide-y divide-[#F2F4F7]">
                {topAccounts.map((s, i) => (
                  <Link key={s._id} to={s.estateId?._id ? `/estates/${s.estateId._id}` : '/subscriptions'} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F9FAFB]" style={{ textDecoration: 'none' }}>
                    <span className="w-6 text-[12px] font-semibold text-[#98A2B3] tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-[#101828] truncate">{s.estateId?.name || 'Estate'}</p>
                      <p className="text-[11px] text-[#98A2B3]">{s.planId?.name} · {s.cycle}</p>
                    </div>
                    <span className="text-[12.5px] font-semibold text-[#067647] tabular-nums">{mask(fmt(s.mv))}<span className="text-[10.5px] text-[#98A2B3] font-normal">/mo</span></span>
                  </Link>
                ))}
              </div>
            )}
          </SideCard>
        </div>
      </div>
    </div>
  );
}
