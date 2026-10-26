import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatDistanceToNowStrict, format } from 'date-fns';
import {
  AlertTriangle, KeyRound, RefreshCw, Wallet, Gift, CreditCard, Clock, Check, X, ArrowRight, Siren, ShieldAlert,
  Building2, UserX, MapPinOff, Receipt, ShoppingBag, Undo2, Users, Mail, Search, Activity, CheckCircle2, XCircle,
  CircleAlert, Landmark, Radar, Pause, Play, Hourglass, Link2, TrendingUp,
} from 'lucide-react';
import {
  planAPI, passwordResetAPI, alertAPI, withdrawalAPI, estateAPI, adminPaymentAPI, marketplaceAdminAPI, onboardingAPI, userAPI, securityAPI,
} from '../api';
import { useSocket } from '../context/SocketContext';
import LiveFeed, { describe } from '../components/operations/LiveFeed';
import SecurityCentre from '../components/operations/SecurityCentre';

const naira = (n) => `₦${Math.round(Number(n || 0)).toLocaleString()}`;
const ago = (d) => (d ? `${formatDistanceToNowStrict(new Date(d))} ago` : '');
const hoursSince = (d) => (d ? (Date.now() - new Date(d).getTime()) / 3600000 : 0);

const SEV = {
  critical: { label: 'Critical',     dot: '#F04438', text: 'text-[#B42318]', bg: 'bg-[#FEF3F2]', ring: 'border-[#FECDCA]' },
  action:   { label: 'Needs action', dot: '#F79009', text: 'text-[#B54708]', bg: 'bg-[#FFFAEB]', ring: 'border-[#FEDF89]' },
  watch:    { label: 'Watchlist',    dot: '#2E90FA', text: 'text-[#175CD3]', bg: 'bg-[#EFF8FF]', ring: 'border-[#B2DDFF]' },
};
const SEV_ORDER = { critical: 0, action: 1, watch: 2 };

const CATS = [
  { id: 'all',         label: 'All',         icon: Radar },
  { id: 'security',    label: 'Security',    icon: Siren },
  { id: 'billing',     label: 'Billing',     icon: CreditCard },
  { id: 'payouts',     label: 'Payouts',     icon: Wallet },
  { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
  { id: 'accounts',    label: 'Accounts',    icon: Users },
  { id: 'estates',     label: 'Estates',     icon: Building2 },
];

const empty = { data: { data: null } };
const arr = (v) => (Array.isArray(v) ? v : Array.isArray(v?.withdrawals) ? v.withdrawals : []);

export default function Operations() {
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState({});
  const [checkedAt, setCheckedAt] = useState(null);
  const [auto, setAuto] = useState(true);
  const [cat, setCat] = useState('all');
  const [sev, setSev] = useState('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState({});
  const [done, setDone] = useState({});
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'security' ? 'security' : 'command';
  const { subscribe, connected } = useSocket() || {};
  const [feed, setFeed] = useState([]);
  const [feedPaused, setFeedPaused] = useState(false);
  const [securityKey, setSecurityKey] = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [fr, pr, pw, al, ss, subs, bal, ov, ps, disp, rf, ob, us, up] = await Promise.all([
      planAPI.getFailedRenewals().catch(() => empty),
      passwordResetAPI.listPending().catch(() => empty),
      withdrawalAPI.list({ status: 'pending' }).catch(() => empty),
      alertAPI.listAdmin({ status: 'open' }).catch(() => empty),
      planAPI.getSubscriptionStats().catch(() => empty),
      planAPI.getSubscriptions().catch(() => empty),
      withdrawalAPI.balance().catch(() => empty),
      estateAPI.getOverview().catch(() => empty),
      adminPaymentAPI.stats().catch(() => empty),
      marketplaceAdminAPI.orders({ status: 'disputed' }).catch(() => empty),
      marketplaceAdminAPI.orders({ status: 'refunded', refundFailed: 1 }).catch(() => empty),
      onboardingAPI.summary().catch(() => empty),
      userAPI.getStats().catch(() => empty),
      planAPI.getUpcomingRenewals({ days: 7 }).catch(() => empty),
    ]);
    setD({
      failed: arr(fr.data.data), resets: arr(pr.data.data), payouts: arr(pw.data.data), alerts: arr(al.data.data),
      subStats: ss.data.data, subs: arr(subs.data.data), balance: bal.data.data, estates: arr(ov.data.data),
      payStats: ps.data.data, disputes: arr(disp.data.data), refundFails: arr(rf.data.data), onboarding: ob.data.data,
      userStats: us.data.data, renewals: arr(up.data.data),
    });
    setDone({});
    setCheckedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!auto) return undefined;
    const t = setInterval(() => load(true), 60000);
    return () => clearInterval(t);
  }, [auto, load]);

  // Live platform events → feed, toasts for serious ones, quiet refresh of the queues
  const estateNames = useMemo(() => Object.fromEntries((d.estates || []).map((e) => [String(e._id), e.name])), [d.estates]);
  const namesRef = useRef(estateNames); namesRef.current = estateNames;
  const pausedRef = useRef(feedPaused); pausedRef.current = feedPaused;
  const refreshTimer = useRef(null);
  useEffect(() => {
    if (!subscribe) return undefined;
    return subscribe('platform:event', (ev) => {
      if (!ev || pausedRef.current) return;
      const entry = { ...ev, at: ev.at || new Date().toISOString(), _key: `${ev.kind}-${ev.id || ''}-${Date.now()}-${Math.random()}`, _fresh: true };
      setFeed((f) => [entry, ...f.map((x) => ({ ...x, _fresh: false }))].slice(0, 80));
      const m = describe(ev, namesRef.current[ev.estateId]);
      if (ev.kind === 'alert' && ev.status !== 'resolved' && ev.status !== 'acknowledged') {
        (m.critical ? toast.error : toast)(`${m.title}${m.body ? ` — ${m.body}` : ''}`, { duration: m.critical ? 10000 : 5000, icon: m.critical ? '🚨' : '🔔' });
      } else if (['withdrawal', 'password_reset', 'estate_signup'].includes(ev.kind)) {
        toast(m.title, { icon: ev.kind === 'estate_signup' ? '🎉' : '🔔' });
      }
      if (ev.kind !== 'visitor') {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = setTimeout(() => { load(true); setSecurityKey((k) => k + 1); }, 2500);
      }
    });
  }, [subscribe, load]);

  const run = async (id, fn, ok) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try { await fn(); toast.success(ok); setDone((x) => ({ ...x, [id]: true })); }
    catch (err) { toast.error(err?.response?.data?.message || 'Action failed'); }
    finally { setBusy((b) => ({ ...b, [id]: false })); }
  };

  // ── Build one unified queue ────────────────────────────────────────────
  const items = useMemo(() => {
    const out = [];
    const now = Date.now();
    const { failed = [], resets = [], payouts = [], alerts = [], subs = [], balance, estates = [], payStats, disputes = [], refundFails = [], onboarding, userStats } = d;

    if (balance?.surplus != null && balance.surplus < 0) {
      out.push({ id: 'paystack-short', sev: 'critical', cat: 'payouts', icon: Landmark, title: 'Paystack balance is short',
        detail: `${naira(-balance.surplus)} less than managers can withdraw — some payouts will fail until it's topped up.`, to: '/finance?tab=payouts', cta: 'Review payouts' });
    }
    alerts.forEach((a) => {
      const crit = a.severity === 'critical' || a.severity === 'high' || a.isEmergencyBroadcast || a.type === 'emergency';
      out.push({ id: `alert-${a._id}`, sev: crit ? 'critical' : 'action', cat: 'security', icon: crit ? ShieldAlert : Siren,
        title: a.title || `${String(a.type || 'Security').replace(/_/g, ' ')} alert`, estate: a.estateId?.name, at: a.createdAt,
        detail: [a.note || a.message, a.location, a.residentId?.name && `raised by ${a.residentId.name}`].filter(Boolean).join(' · ') || 'No details given',
        tags: [a.severity && a.severity !== 'medium' ? a.severity : null, a.isEmergencyBroadcast ? 'broadcast' : null].filter(Boolean),
        actions: [
          { label: 'Ack', kind: 'outline', run: () => securityAPI.acknowledge(a._id), ok: 'Alert acknowledged' },
          { label: 'Resolve', kind: 'primary', icon: Check, run: () => securityAPI.resolve(a._id), ok: 'Alert resolved' },
        ] });
    });
    failed.forEach((s) => out.push({ id: `renew-${s._id}`, sev: 'critical', cat: 'billing', icon: CreditCard, title: 'Auto-renewal failed',
      estate: s.estateId?.name, at: s.lastRenewalAttemptAt, detail: `${s.lastRenewalError || 'Card declined'} · ${s.renewalAttempts || 1} attempt${s.renewalAttempts === 1 ? '' : 's'}`,
      to: `/estates/${s.estateId?._id || s.estateId}`, cta: 'Open estate' }));
    disputes.forEach((o) => out.push({ id: `disp-${o._id}`, sev: 'critical', cat: 'marketplace', icon: ShoppingBag, title: 'Marketplace dispute',
      estate: o.estateId?.name, at: o.disputedAt || o.updatedAt, detail: `${o.buyerId?.name || 'Buyer'} vs ${o.sellerId?.name || 'seller'} · ${naira(o.amount || o.total)} held in escrow${o.disputeReason ? ` · “${o.disputeReason}”` : ''}`,
      to: '/marketplace', cta: 'Review' }));
    refundFails.forEach((o) => out.push({ id: `refund-${o._id}`, sev: 'critical', cat: 'marketplace', icon: Undo2, title: 'Refund failed to send',
      estate: o.estateId?.name, at: o.updatedAt, detail: `${naira(o.amount || o.total)} to ${o.buyerId?.name || 'buyer'} · ${o.refund?.error || 'Paystack error'}`,
      actions: [{ label: 'Retry refund', kind: 'primary', icon: RefreshCw, run: () => marketplaceAdminAPI.retryRefund(o._id), ok: 'Refund sent' }] }));
    payouts.forEach((w) => out.push({ id: `wd-${w._id}`, sev: hoursSince(w.createdAt) > 24 ? 'critical' : 'action', cat: 'payouts', icon: Wallet,
      title: `Payout request · ${naira(w.amount)}`, estate: w.estateId?.name, at: w.createdAt,
      detail: `${w.userId?.name || 'Manager'} → ${w.bankName || 'bank'} ${w.accountName ? `· ${w.accountName}` : ''}${hoursSince(w.createdAt) > 24 ? ' · waiting over 24h' : ''}`,
      to: '/finance?tab=payouts', cta: 'Process' }));
    resets.forEach((r) => out.push({ id: `reset-${r._id}`, sev: 'action', cat: 'accounts', icon: KeyRound, title: 'Password reset request',
      estate: r.estateId?.name, at: r.requestedAt, detail: `${r.requesterName || r.userId?.name || 'User'} · ${r.requesterEmail || ''}${r.requesterUnit ? ` · ${r.requesterUnit}` : ''}`,
      tags: [r.requesterRole].filter(Boolean),
      actions: [
        { label: 'Deny', kind: 'outline', icon: X, run: async () => { const reason = window.prompt('Reason for denying (optional)', ''); if (reason === null) throw Object.assign(new Error('cancel'), { silent: true }); return passwordResetAPI.deny(r._id, { reason }); }, ok: 'Request denied' },
        { label: 'Approve', kind: 'primary', icon: Check, run: () => passwordResetAPI.approve(r._id), ok: 'Temporary password emailed' },
      ] }));
    if (payStats?.pendingWithPaystackRef > 0) {
      out.push({ id: 'reconcile', sev: 'action', cat: 'billing', icon: Link2, title: `${payStats.pendingWithPaystackRef} dues payment${payStats.pendingWithPaystackRef === 1 ? '' : 's'} to reconcile`,
        detail: 'Residents started paying on Paystack but the payment never confirmed. Reconcile or attach them.', to: '/finance?tab=transactions', cta: 'Reconcile' });
    }
    subs.forEach((s) => {
      if (s.status === 'trial' && s.trialEndsAt) {
        const left = (new Date(s.trialEndsAt).getTime() - now) / 86400000;
        if (left >= 0 && left <= 3) out.push({ id: `trial-${s._id}`, sev: 'watch', cat: 'billing', icon: Hourglass, title: `Trial ends ${left < 1 ? 'today' : `in ${Math.ceil(left)} day${Math.ceil(left) === 1 ? '' : 's'}`}`,
          estate: s.estateId?.name, at: s.trialEndsAt, future: true, detail: `${s.planId?.name || 'Plan'} trial · ${s.paystackAuth?.authorizationCode ? 'card on file' : 'no card yet — follow up'}`,
          to: `/estates/${s.estateId?._id || s.estateId}`, cta: 'Open estate' });
      }
      if (s.comp?.isActive && s.comp?.expiresAt) {
        const left = (new Date(s.comp.expiresAt).getTime() - now) / 86400000;
        if (left > 0 && left <= 7) out.push({ id: `comp-${s._id}`, sev: 'watch', cat: 'billing', icon: Gift, title: `Comp access ends in ${Math.ceil(left)} day${Math.ceil(left) === 1 ? '' : 's'}`,
          estate: s.estateId?.name, at: s.comp.expiresAt, future: true, detail: `${s.comp.planId?.name || 'Plan'} · ${s.comp.reason || 'no reason'} — extend or let billing resume`, to: '/finance?tab=billing', cta: 'Billing' });
      }
    });
    estates.filter((e) => e.isActive !== false).forEach((e) => {
      if (!e.managerId) out.push({ id: `nomgr-${e._id}`, sev: 'watch', cat: 'estates', icon: UserX, title: 'Estate has no manager', estate: e.name, at: e.createdAt,
        detail: `${e.counts?.residents || 0} residents with nobody managing them`, to: '/onboarding?method=portfolio', cta: 'Assign' });
      if (!e.subscription) out.push({ id: `nosub-${e._id}`, sev: 'watch', cat: 'billing', icon: Receipt, title: 'No subscription', estate: e.name, at: e.createdAt,
        detail: 'Active estate without any plan — it isn’t being billed', to: '/finance?tab=billing', cta: 'Assign plan' });
      if (!e.location?.lat) out.push({ id: `nomap-${e._id}`, sev: 'watch', cat: 'estates', icon: MapPinOff, title: 'Not on the map', estate: e.name, at: e.createdAt,
        detail: `Address “${e.address || '—'}” couldn’t be placed — set a pin`, to: `/estates/${e._id}`, cta: 'Fix' });
    });
    if (userStats?.noEstate > 0) out.push({ id: 'noestate', sev: 'watch', cat: 'accounts', icon: Users, title: `${userStats.noEstate} user${userStats.noEstate === 1 ? '' : 's'} not linked to an estate`,
      detail: 'Signed up but never joined an estate — they can’t use the apps.', to: '/users', cta: 'View users' });
    if (onboarding?.pendingInvites > 0) out.push({ id: 'invites', sev: 'watch', cat: 'accounts', icon: Mail, title: `${onboarding.pendingInvites} invitation${onboarding.pendingInvites === 1 ? '' : 's'} awaiting sign-up`,
      detail: 'Managers you invited haven’t finished setting up yet — resend to nudge them.', to: '/onboarding?method=invite', cta: 'Invitations' });

    return out.filter((x) => !done[x.id]).sort((a, b) => SEV_ORDER[a.sev] - SEV_ORDER[b.sev] || (new Date(a.at || 0) - new Date(b.at || 0)));
  }, [d, done]);

  const counts = items.reduce((m, x) => { m[x.sev] = (m[x.sev] || 0) + 1; m[x.cat] = (m[x.cat] || 0) + 1; return m; }, {});
  const shown = items.filter((x) => (cat === 'all' || x.cat === cat) && (sev === 'all' || x.sev === sev)
    && (!q || `${x.title} ${x.estate || ''} ${x.detail || ''}`.toLowerCase().includes(q.toLowerCase())));
  const score = Math.max(0, Math.min(100, 100 - (counts.critical || 0) * 12 - (counts.action || 0) * 4 - (counts.watch || 0) * 1));
  const scoreColor = score >= 85 ? '#34D399' : score >= 60 ? '#FBBF24' : '#F87171';
  const scoreLabel = score >= 85 ? 'Healthy' : score >= 60 ? 'Needs attention' : 'At risk';

  // ── System checks ────────────────────────────────────────────────────
  const est = (d.estates || []).filter((e) => e.isActive !== false);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 100);
  const oldestAlert = (d.alerts || []).reduce((m, a) => (!m || new Date(a.createdAt) < new Date(m) ? a.createdAt : m), null);
  const oldestPayout = (d.payouts || []).reduce((m, w) => (!m || new Date(w.createdAt) < new Date(m) ? w.createdAt : m), null);
  const due = d.subStats?.renewalsDue7d || 0;
  const checks = [
    { label: 'Paystack balance', icon: Landmark,
      status: !d.balance?.paystack ? 'warn' : d.balance.surplus < 0 ? 'fail' : 'ok',
      value: d.balance?.paystack ? naira(d.balance.paystack.balance) : (d.balance?.paystackError || 'Unavailable'),
      hint: d.balance?.surplus != null ? (d.balance.surplus < 0 ? `${naira(-d.balance.surplus)} short of manager wallets` : `${naira(d.balance.surplus)} above what's owed`) : '' },
    { label: 'Card renewals', icon: CreditCard, status: (d.failed || []).length ? 'fail' : 'ok',
      value: `${(d.failed || []).length} failed`, hint: `${due} due in the next 7 days` },
    { label: 'Alert response', icon: Siren, status: !oldestAlert ? 'ok' : hoursSince(oldestAlert) > 2 ? 'fail' : 'warn',
      value: oldestAlert ? `Oldest open ${ago(oldestAlert)}` : 'No open alerts', hint: `${(d.alerts || []).length} open across estates` },
    { label: 'Payout queue', icon: Wallet, status: !oldestPayout ? 'ok' : hoursSince(oldestPayout) > 24 ? 'fail' : 'warn',
      value: oldestPayout ? `Oldest ${ago(oldestPayout)}` : 'Empty', hint: d.balance?.queued ? `${naira(d.balance.queued.total)} queued` : '' },
    { label: 'Dues reconciliation', icon: Link2, status: (d.payStats?.pendingWithPaystackRef || 0) ? 'warn' : 'ok',
      value: `${d.payStats?.pendingWithPaystackRef || 0} stuck`, hint: `${d.payStats?.overdue || 0} overdue dues platform-wide` },
    { label: 'Manager coverage', icon: UserX, status: pct(est.filter((e) => e.managerId).length, est.length) === 100 ? 'ok' : 'warn',
      value: `${pct(est.filter((e) => e.managerId).length, est.length)}%`, hint: `${est.filter((e) => !e.managerId).length} estates unmanaged` },
    { label: 'Billing coverage', icon: Receipt, status: pct(est.filter((e) => e.subscription).length, est.length) === 100 ? 'ok' : 'warn',
      value: `${pct(est.filter((e) => e.subscription).length, est.length)}%`, hint: `${est.filter((e) => !e.subscription).length} estates without a plan` },
    { label: 'Map coverage', icon: MapPinOff, status: pct(est.filter((e) => e.location?.lat).length, est.length) >= 90 ? 'ok' : 'warn',
      value: `${pct(est.filter((e) => e.location?.lat).length, est.length)}%`, hint: `${est.filter((e) => !e.location?.lat).length} estates without a pin` },
  ];
  const STATUS = { ok: [CheckCircle2, 'text-[#067647]', 'OK'], warn: [CircleAlert, 'text-[#B54708]', 'Check'], fail: [XCircle, 'text-[#B42318]', 'Failing'] };
  const checksOk = checks.filter((c) => c.status === 'ok').length;

  // ── Estates needing attention ─────────────────────────────────────────
  const hot = est.map((e) => {
    const issues = [];
    if (e.counts?.openAlerts) issues.push([`${e.counts.openAlerts} alert${e.counts.openAlerts === 1 ? '' : 's'}`, 3 * e.counts.openAlerts, 'red']);
    if (e.subscription?.renewalIssue) issues.push(['renewal failed', 5, 'red']);
    if (!e.managerId) issues.push(['no manager', 3, 'amber']);
    if (!e.subscription) issues.push(['no plan', 2, 'amber']);
    if (!e.location?.lat) issues.push(['no pin', 1, 'blue']);
    if (e.subscription?.status === 'expired') issues.push(['expired', 4, 'red']);
    return { e, issues, score: issues.reduce((t, [, w]) => t + w, 0) };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);

  const ring = 2 * Math.PI * 34;

  const feedEl = (
    <LiveFeed events={feed} connected={!!connected} estateNames={estateNames} paused={feedPaused}
      onTogglePause={() => setFeedPaused((p) => !p)} onClear={() => setFeed([])} />
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-12 space-y-4 animate-fade-in">
      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-[#E4E7EC] w-full sm:w-fit">
        {[
          { id: 'command', label: 'Command centre', hint: `${items.length} in queue`, icon: Radar },
          { id: 'security', label: 'Security', hint: 'Scorecards & playbook', icon: ShieldAlert },
        ].map(({ id, label, hint, icon: Icon }) => {
          const on = tab === id;
          return (
            <button key={id} onClick={() => setParams(id === 'command' ? {} : { tab: id }, { replace: true })}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-left transition-colors flex-1 sm:flex-none ${on ? 'bg-[#0B1220] text-white' : 'text-[#475467] hover:bg-[#F9FAFB]'}`}>
              <Icon size={16} className={on ? 'text-[#34D399]' : 'text-[#98A2B3]'} />
              <span className="leading-tight whitespace-nowrap">
                <span className="block text-[13px] font-semibold">{label}</span>
                <span className={`block text-[11px] ${on ? 'text-white/55' : 'text-[#98A2B3]'}`}>{hint}</span>
              </span>
              {id === 'command' && (counts.critical || 0) > 0 && <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#F04438] text-white text-[11px] font-semibold flex items-center justify-center">{counts.critical}</span>}
            </button>
          );
        })}
      </div>

      {tab === 'security' ? <SecurityCentre liveFeed={feedEl} reloadKey={securityKey} /> : (<>
      {/* ── Command bar ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'radial-gradient(120% 160% at 100% 0%, #13315C 0%, #0B1220 55%)' }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="relative w-[84px] h-[84px] flex-shrink-0">
            <svg width="84" height="84" className="-rotate-90">
              <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="7" />
              <circle cx="42" cy="42" r="34" fill="none" stroke={scoreColor} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={ring} strokeDashoffset={ring * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
            </svg>
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-semibold tabular-nums leading-none">{loading && !checkedAt ? '–' : score}</span>
              <span className="text-[9.5px] text-white/50 mt-0.5">/ 100</span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-white/55 flex items-center gap-1.5"><Activity size={13} /> Operations centre · all estates</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight" style={{ color: '#fff' }}>
              {score >= 85 ? <>Platform is <span style={{ color: scoreColor }}>healthy</span></> : score >= 60 ? <>Platform <span style={{ color: scoreColor }}>needs attention</span></> : <>Platform is <span style={{ color: scoreColor }}>at risk</span></>}
            </h2>
            <p className="mt-1 text-[12.5px] text-white/55">
              {items.length ? `${items.length} item${items.length === 1 ? '' : 's'} in the queue · ${checksOk}/${checks.length} system checks passing` : 'Nothing needs you right now'}
              {checkedAt && <> · checked {format(checkedAt, 'HH:mm:ss')}</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAuto((a) => !a)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/[0.07] border border-white/10 text-[12.5px] text-white/80 hover:bg-white/10">
              {auto ? <><span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-70" /><span className="relative w-2 h-2 rounded-full bg-emerald-400" /></span> Live · 60s <Pause size={12} /></> : <><Play size={12} /> Auto-refresh off</>}
            </button>
            <button onClick={() => load()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-[#0B1220] text-[12.5px] font-semibold hover:bg-slate-100">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {['critical', 'action', 'watch'].map((k) => {
            const on = sev === k;
            return (
              <button key={k} onClick={() => setSev(on ? 'all' : k)}
                className={`text-left rounded-xl px-4 py-3 border transition-colors ${on ? 'bg-white/[0.14] border-white/30' : 'bg-white/[0.05] border-white/10 hover:bg-white/[0.09]'}`}>
                <p className="text-[11.5px] text-white/60 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: SEV[k].dot }} />{SEV[k].label}</p>
                <p className="mt-1 text-[26px] font-semibold tabular-nums leading-none">{counts[k] || 0}</p>
                <p className="mt-1 text-[11px] text-white/40">{k === 'critical' ? 'Fix now — money or safety at risk' : k === 'action' ? 'Waiting on an admin decision' : 'Keep an eye on these'}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 items-start">
        {/* ── Action queue ── */}
        <div className="lg:col-span-8 card overflow-hidden">
          <div className="px-4 pt-3 border-b border-[#F2F4F7]">
            <div className="flex items-center gap-1 overflow-x-auto">
              {CATS.map(({ id, label, icon: Icon }) => {
                const n = id === 'all' ? items.length : counts[id] || 0;
                const on = cat === id;
                return (
                  <button key={id} onClick={() => setCat(id)}
                    className={`flex items-center gap-1.5 px-3 pb-2.5 pt-1 border-b-2 -mb-px text-[13px] whitespace-nowrap ${on ? 'border-[#059669] text-[#101828] font-semibold' : 'border-transparent text-[#667085] hover:text-[#344054]'}`}>
                    <Icon size={14} /> {label}
                    <span className={`text-[11px] tabular-nums px-1.5 rounded-full ${n ? (on ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#F2F4F7] text-[#475467]') : 'text-[#D0D5DD]'}`}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-4 py-2.5 border-b border-[#F2F4F7] flex items-center gap-2">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#D0D5DD] flex-1 max-w-sm">
              <Search size={14} className="text-[#98A2B3]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the queue" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" />
            </div>
            {sev !== 'all' && <button onClick={() => setSev('all')} className="text-[12px] text-[#475467] inline-flex items-center gap-1 px-2 h-8 rounded-lg bg-[#F2F4F7]">{SEV[sev].label} <X size={12} /></button>}
            <span className="ml-auto text-[12px] text-[#98A2B3]">{shown.length} item{shown.length === 1 ? '' : 's'}</span>
          </div>

          {loading && !checkedAt ? (
            <div className="p-5 space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14" />)}</div>
          ) : !shown.length ? (
            <div className="py-16 text-center">
              <span className="mx-auto w-12 h-12 rounded-full bg-[#ECFDF3] text-[#059669] flex items-center justify-center"><CheckCircle2 size={22} /></span>
              <p className="mt-3 text-[14px] font-semibold text-[#101828]">{items.length ? 'Nothing matches these filters' : 'All clear'}</p>
              <p className="mt-1 text-[12.5px] text-[#667085]">{items.length ? 'Try another category or clear the search.' : 'No queues need admin action right now.'}</p>
            </div>
          ) : (
            <div className="max-h-[78vh] overflow-y-auto">
              {['critical', 'action', 'watch'].map((k) => {
                const rows = shown.filter((x) => x.sev === k);
                if (!rows.length) return null;
                return (
                  <div key={k}>
                    <div className="sticky top-0 z-[1] flex items-center gap-2 px-4 py-1.5 bg-[#F9FAFB] border-y border-[#F2F4F7] text-[11.5px] font-semibold text-[#475467]">
                      <span className="w-2 h-2 rounded-full" style={{ background: SEV[k].dot }} />{SEV[k].label}<span className="text-[#98A2B3] font-normal">{rows.length}</span>
                    </div>
                    {rows.map((x) => {
                      const S = SEV[x.sev];
                      return (
                        <div key={x.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#F9FAFB] last:border-0 hover:bg-[#FCFCFD]">
                          <span className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${S.bg} ${S.ring} ${S.text}`}><x.icon size={16} /></span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-[13.5px] font-semibold text-[#101828] capitalize-first">{x.title}</p>
                              {x.estate && <span className="inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-[#F2F4F7] text-[#475467]"><Building2 size={10} />{x.estate}</span>}
                              {(x.tags || []).map((t) => <span key={t} className={`text-[10.5px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${S.bg} ${S.text}`}>{t}</span>)}
                            </div>
                            <p className="mt-0.5 text-[12.5px] text-[#475467] line-clamp-2">{x.detail}</p>
                            {x.at && <p className="mt-0.5 text-[11px] text-[#98A2B3] flex items-center gap-1"><Clock size={10} />{x.future ? `on ${format(new Date(x.at), 'd MMM, HH:mm')}` : ago(x.at)}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0 self-center">
                            {(x.actions || []).map((a) => (
                              <button key={a.label} disabled={busy[x.id]}
                                onClick={() => { setBusy((b) => ({ ...b, [x.id]: true })); Promise.resolve().then(a.run).then(() => { toast.success(a.ok); setDone((dd) => ({ ...dd, [x.id]: true })); }).catch((err) => { if (!err?.silent) toast.error(err?.response?.data?.message || 'Action failed'); }).finally(() => setBusy((b) => ({ ...b, [x.id]: false }))); }}
                                className={`${a.kind === 'primary' ? 'btn-primary' : 'btn-outline'} !h-8 !px-2.5 !text-[12px] gap-1`}>
                                {busy[x.id] ? <RefreshCw size={12} className="animate-spin" /> : a.icon && <a.icon size={12} />}{a.label}
                              </button>
                            ))}
                            {x.to && (
                              <Link to={x.to} className="btn-outline !h-8 !px-2.5 !text-[12px] gap-1" style={{ textDecoration: 'none' }}>
                                {x.cta || 'Open'} <ArrowRight size={12} />
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Side rail ── */}
        <div className="lg:col-span-4 space-y-4">
          {feedEl}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div><div className="card-title flex items-center gap-2"><Radar size={15} className="text-[#059669]" /> System checks</div><div className="card-sub">{checksOk} of {checks.length} passing</div></div>
            </div>
            <div className="divide-y divide-[#F2F4F7]">
              {checks.map((c) => {
                const [Icon, cls, word] = STATUS[c.status];
                return (
                  <div key={c.label} className="flex items-start gap-3 px-4 py-2.5">
                    <span className="w-7 h-7 rounded-lg bg-[#F9FAFB] border border-[#EAECF0] text-[#667085] flex items-center justify-center flex-shrink-0 mt-0.5"><c.icon size={13} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-medium text-[#344054]">{c.label}</p>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${cls}`}><Icon size={12} />{word}</span>
                      </div>
                      <p className="text-[12.5px] font-semibold text-[#101828] tabular-nums truncate">{c.value}</p>
                      {c.hint && <p className="text-[11px] text-[#98A2B3] truncate">{c.hint}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="card-header">
              <div><div className="card-title flex items-center gap-2"><AlertTriangle size={15} className="text-[#F79009]" /> Estates needing attention</div><div className="card-sub">Ranked by open issues</div></div>
            </div>
            {!hot.length ? <p className="px-4 py-6 text-center text-[12.5px] text-[#98A2B3]">Every estate is in good shape.</p> : (
              <div className="divide-y divide-[#F2F4F7]">
                {hot.map(({ e, issues }) => (
                  <Link key={e._id} to={`/estates/${e._id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#F9FAFB]" style={{ textDecoration: 'none' }}>
                    <span className="w-8 h-8 rounded-lg bg-[#F2F4F7] text-[#475467] text-[12px] font-semibold flex items-center justify-center flex-shrink-0">{e.name?.[0]?.toUpperCase()}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium text-[#101828] truncate">{e.name}</span>
                      <span className="flex flex-wrap gap-1 mt-0.5">
                        {issues.map(([t, , c]) => <span key={t} className={`text-[10.5px] font-medium px-1.5 rounded ${c === 'red' ? 'bg-[#FEF3F2] text-[#B42318]' : c === 'amber' ? 'bg-[#FFFAEB] text-[#B54708]' : 'bg-[#EFF8FF] text-[#175CD3]'}`}>{t}</span>)}
                      </span>
                    </span>
                    <ArrowRight size={13} className="text-[#D0D5DD]" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="card-header">
              <div><div className="card-title flex items-center gap-2"><TrendingUp size={15} className="text-[#059669]" /> Revenue health</div><div className="card-sub">From subscriptions</div></div>
              <Link to="/finance" className="text-[12px] font-medium text-[#059669] inline-flex items-center gap-1">Finance <ArrowRight size={12} /></Link>
            </div>
            <dl className="divide-y divide-[#F2F4F7] text-[12.5px]">
              {[
                ['Paid MRR', naira(d.subStats?.mrrPaid ?? d.subStats?.mrr), 'text-[#067647]'],
                ['Trial pipeline', `${naira(d.subStats?.trialPipelineMrr)} · ${d.subStats?.trial || 0} trials`, 'text-[#175CD3]'],
                ['Comp given away', `${naira(d.subStats?.mrrComp)} · ${d.subStats?.activeComp || 0} estates`, 'text-[#B54708]'],
                ['Renewals this week', `${(d.renewals || []).length} due`, 'text-[#101828]'],
                ['Cancelled · 30 days', `${d.subStats?.cancelled30d || 0}`, 'text-[#101828]'],
              ].map(([k, v, c]) => (
                <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5"><dt className="text-[#667085]">{k}</dt><dd className={`font-semibold tabular-nums ${c}`}>{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </div>
      </>)}
    </div>
  );
}
