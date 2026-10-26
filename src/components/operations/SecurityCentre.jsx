import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  ShieldCheck, ShieldAlert, Siren, Users, DoorOpen, Timer, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight,
  Megaphone, Send, MapPin, UserX, Lock, Building2, Search, Check, Flame, HeartPulse, Volume2, CircleHelp, Clock,
  TrendingUp, Target, Sparkles, Radio, Ban, ArrowRight, RefreshCw, Eye,
} from 'lucide-react';
import { securityAPI } from '../../api';
import { Drawer, Section } from '../billing/BillingDrawers';

const TYPE = {
  security: { label: 'Security', icon: ShieldAlert, color: '#D92D20' },
  medical:  { label: 'Medical',  icon: HeartPulse,  color: '#DD2590' },
  fire:     { label: 'Fire',     icon: Flame,       color: '#F79009' },
  noise:    { label: 'Noise',    icon: Volume2,     color: '#7A5AF8' },
  other:    { label: 'Other',    icon: CircleHelp,  color: '#667085' },
};
const GAP_ICON = { no_guards: Users, guards_idle: Clock, no_visitor_logs: DoorOpen, approval_off: Lock, slow_response: Timer, open_alerts: Siren, no_manager: UserX, no_pin: MapPin, no_security_plan: ShieldCheck };
const SEV = { high: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]', medium: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]', low: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]' };
const grade = (s) => (s >= 85 ? ['A', '#079455'] : s >= 70 ? ['B', '#16B364'] : s >= 55 ? ['C', '#F79009'] : s >= 40 ? ['D', '#EF6820'] : ['E', '#D92D20']);
const mins = (m) => (m == null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);

const TEMPLATES = [
  { title: 'Gate safety reminder', body: 'Please send a visitor pass from the AreaMates app for every guest. Guards will only admit visitors with a valid pass or after calling you. Never share your gate code with strangers.' },
  { title: 'Verify delivery riders', body: 'Delivery riders must wait at the gate. Confirm the order in your app before the guard lets them in, and meet them at the gate where possible.' },
  { title: 'Know your emergency button', body: 'In an emergency, open AreaMates and press the alert button. Security and the estate manager are notified instantly with your unit number. Use it for security, fire or medical emergencies.' },
  { title: 'Festive season security', body: 'The festive season brings more visitors and deliveries. Please register every guest in advance, keep your doors locked, and report anything suspicious using the alert button.' },
  { title: 'Share your trip with security', body: 'Coming home late? Use “Share live location” in AreaMates so the gate team can watch out for you until you’re in.' },
];

function Ring({ value, size = 92, stroke = 8, color }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
    </svg>
  );
}

function Meter({ label, value, total, icon: Icon, hint }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const color = pct >= 80 ? '#079455' : pct >= 50 ? '#F79009' : '#D92D20';
  return (
    <div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-1.5 text-[#344054]"><Icon size={13} className="text-[#98A2B3]" />{label}</span>
        <span className="font-semibold tabular-nums" style={{ color }}>{pct}%</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} /></div>
      <p className="mt-1 text-[11px] text-[#98A2B3]">{value} of {total} estates{hint ? ` · ${hint}` : ''}</p>
    </div>
  );
}

export default function SecurityCentre({ liveFeed, reloadKey }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('score');
  const [busy, setBusy] = useState({});
  const [notice, setNotice] = useState(null);
  const [sending, setSending] = useState(false);

  const load = (silent) => {
    if (!silent) setLoading(true);
    securityAPI.overview(days).then(({ data: r }) => setData(r.data)).catch(() => toast.error('Could not load security data')).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (reloadKey) load(true); }, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = data?.totals || {};
  const estates = useMemo(() => {
    const list = (data?.estates || []).filter((e) => !q || `${e.name} ${e.estateCode} ${e.city || ''}`.toLowerCase().includes(q.toLowerCase()));
    const by = { score: (a, b) => a.score - b.score, alerts: (a, b) => b.alerts.total - a.alerts.total, guards: (a, b) => a.guards.total - b.guards.total, response: (a, b) => (b.alerts.avgAckMins ?? -1) - (a.alerts.avgAckMins ?? -1), name: (a, b) => a.name.localeCompare(b.name) };
    return [...list].sort(by[sort]);
  }, [data, q, sort]);

  const act = async (id, fn, ok) => {
    setBusy((b) => ({ ...b, [id]: true }));
    try { await fn(); toast.success(ok); load(true); } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
    finally { setBusy((b) => ({ ...b, [id]: false })); }
  };

  const sendNotice = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const { data: r } = await securityAPI.notice({ title: notice.title, body: notice.body, estateIds: notice.scope === 'all' ? [] : notice.estateIds, pin: notice.pin });
      toast.success(`Safety notice sent to ${r.data.sent} estate${r.data.sent === 1 ? '' : 's'}`);
      setNotice(null);
    } catch (err) { toast.error(err?.response?.data?.message || 'Could not send'); }
    finally { setSending(false); }
  };
  const openNotice = (preset = {}) => setNotice({ title: '', body: '', scope: preset.estateIds?.length ? 'some' : 'all', estateIds: preset.estateIds || [], pin: true, ...preset });

  if (loading && !data) return <div className="space-y-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-40 rounded-2xl" />)}</div>;
  if (!data) return null;

  const [g, gColor] = grade(t.score || 0);
  const maxDay = Math.max(1, ...data.daily.map((d) => d.n));
  const maxHour = Math.max(1, ...data.hourly);
  const typeTotal = Math.max(1, Object.values(data.byType).reduce((a, b) => a + b, 0));
  const ringColor = t.score >= 70 ? '#34D399' : t.score >= 50 ? '#FBBF24' : '#F87171';

  return (
    <div className="space-y-4">
      {/* ── Security hero ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'radial-gradient(120% 160% at 100% 0%, #7A271A 0%, #1A0F14 45%, #0B1220 75%)' }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="relative w-[92px] h-[92px] flex-shrink-0">
            <Ring value={t.score || 0} color={ringColor} />
            <span className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[26px] font-semibold leading-none tabular-nums">{t.score || 0}</span>
              <span className="text-[10px] text-white/50 mt-0.5">grade {g}</span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-white/55 flex items-center gap-1.5"><ShieldCheck size={13} /> Security across {t.estates} estates · last {data.days} days</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-tight" style={{ color: '#fff' }}>Average security score <span style={{ color: ringColor }}>{t.score}/100</span></h2>
            <p className="mt-1 text-[12.5px] text-white/55">{t.estatesWithGuards} of {t.estates} estates have guards on the app · {t.approvalOn} use visitor approval · {t.open} alert{t.open === 1 ? '' : 's'} still open</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-0.5 rounded-lg bg-white/[0.07] border border-white/10">
              {[7, 30, 90].map((d) => <button key={d} onClick={() => setDays(d)} className={`px-2.5 h-8 rounded-md text-[12px] ${days === d ? 'bg-white text-[#0B1220] font-semibold' : 'text-white/70 hover:text-white'}`}>{d}d</button>)}
            </div>
            <button onClick={() => openNotice()} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-[#0B1220] text-[12.5px] font-semibold hover:bg-slate-100"><Megaphone size={14} /> Safety notice</button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            ['Guards on the app', t.guards, `${t.guardsNow} active now · ${t.guards24h} in 24h`, Users],
            ['Alerts', t.alerts, `${t.critical} high/critical · ${t.broadcasts} broadcasts`, Siren, t.critical ? 'text-red-300' : ''],
            ['Response time', mins(t.avgAckMins), 'average to acknowledge', Timer, t.avgAckMins > 15 ? 'text-red-300' : t.avgAckMins > 5 ? 'text-amber-200' : 'text-emerald-300'],
            ['Time to resolve', mins(t.avgResolveMins), `${t.resolved} resolved`, CheckCircle2],
            ['Visitors', t.visitorsWeek, `${t.visitorsToday} today · ${t.insideNow} inside now`, DoorOpen],
            ['Safety incidents', t.incidents, `${t.denied} access denied`, Ban, t.incidents ? 'text-amber-200' : ''],
          ].map(([l, v, h, Icon, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5">
              <p className="text-[11px] text-white/55 flex items-center gap-1"><Icon size={11} />{l}</p>
              <p className={`mt-0.5 text-[18px] font-semibold tabular-nums ${c || 'text-white'}`}>{v ?? 0}</p>
              <p className="text-[10.5px] text-white/40 truncate">{h}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12 items-start">
        <div className="lg:col-span-8 space-y-4">
          {/* ── Trends ── */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div><div className="card-title flex items-center gap-2"><TrendingUp size={15} className="text-[#D92D20]" /> Alert trend</div><div className="card-sub">Last 14 days · red is high or critical</div></div>
              <span className="text-[12px] text-[#667085] tabular-nums">{data.daily.reduce((a, d) => a + d.n, 0)} alerts</span>
            </div>
            <div className="px-5 pt-4 pb-3">
              <div className="h-[120px] flex items-end gap-1.5">
                {data.daily.map((d) => (
                  <div key={d.date} className="flex-1 h-full flex flex-col justify-end group relative">
                    <div className="rounded-t-[3px] bg-[#FDA29B]" style={{ height: `${((d.n - d.critical) / maxDay) * 100}%`, minHeight: d.n - d.critical ? 3 : 0 }} />
                    <div className="bg-[#D92D20]" style={{ height: `${(d.critical / maxDay) * 100}%`, minHeight: d.critical ? 3 : 0, borderRadius: d.n === d.critical ? '3px 3px 0 0' : 0 }} />
                    {!d.n && <div className="h-[2px] rounded bg-[#F2F4F7]" />}
                    <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-md bg-[#101828] text-white text-[11px] px-2 py-1 z-10">{format(new Date(d.date), 'EEE d MMM')} · {d.n} ({d.critical} critical)</span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[10.5px] text-[#98A2B3]"><span>{format(new Date(data.daily[0].date), 'd MMM')}</span><span>Today</span></div>
            </div>
            <div className="grid sm:grid-cols-2 border-t border-[#F2F4F7]">
              <div className="px-5 py-4 sm:border-r border-[#F2F4F7]">
                <p className="text-[12px] font-semibold text-[#344054] mb-2.5">By type</p>
                <div className="space-y-2">
                  {Object.entries(TYPE).map(([k, m]) => {
                    const n = data.byType[k] || 0;
                    return (
                      <div key={k} className="flex items-center gap-2.5 text-[12.5px]">
                        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${m.color}14`, color: m.color }}><m.icon size={12} /></span>
                        <span className="w-16 text-[#344054]">{m.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(n / typeTotal) * 100}%`, background: m.color }} /></div>
                        <span className="w-6 text-right font-semibold tabular-nums text-[#101828]">{n}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-[12px] font-semibold text-[#344054] mb-1">When alerts happen</p>
                <p className="text-[11px] text-[#98A2B3] mb-2.5">Hour of day (Lagos time) — plan guard shifts around the dark cells</p>
                <div className="grid grid-cols-12 gap-1">
                  {data.hourly.map((n, h) => (
                    <div key={h} title={`${String(h).padStart(2, '0')}:00 · ${n} alert${n === 1 ? '' : 's'}`}
                      className="aspect-square rounded-[4px] flex items-center justify-center text-[9px] font-medium"
                      style={{ background: n ? `rgba(217,45,32,${0.12 + (n / maxHour) * 0.8})` : '#F2F4F7', color: n / maxHour > 0.5 ? '#fff' : '#98A2B3' }}>
                      {h}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[#667085]">Busiest: <b className="text-[#101828]">{String(data.hourly.indexOf(Math.max(...data.hourly))).padStart(2, '0')}:00</b> · {Math.max(...data.hourly)} alerts</p>
              </div>
            </div>
          </div>

          {/* ── Estate scorecards ── */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div><div className="card-title flex items-center gap-2"><Building2 size={15} className="text-[#475467]" /> Estate security scorecards</div><div className="card-sub">Weakest first · click an estate to see what to fix</div></div>
            </div>
            <div className="px-4 py-2.5 border-b border-[#F2F4F7] flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#D0D5DD] flex-1 max-w-xs">
                <Search size={14} className="text-[#98A2B3]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search estates" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" />
              </div>
              <select className="input-field !w-auto !h-9 !py-0" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="score">Weakest score</option><option value="alerts">Most alerts</option><option value="guards">Fewest guards</option><option value="response">Slowest response</option><option value="name">Name</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px] min-w-[860px]">
                <thead>
                  <tr className="text-left text-[11.5px] text-[#667085] bg-[#F9FAFB] border-b border-[#F2F4F7]">
                    <th className="font-medium px-4 py-2.5">Estate</th><th className="font-medium px-3 py-2.5 w-[150px]">Score</th>
                    <th className="font-medium px-3 py-2.5">Guards</th><th className="font-medium px-3 py-2.5">Visitors 7d</th>
                    <th className="font-medium px-3 py-2.5">Alerts</th><th className="font-medium px-3 py-2.5">Response</th>
                    <th className="font-medium px-3 py-2.5">Controls</th><th className="font-medium px-3 py-2.5">Top fix</th><th />
                  </tr>
                </thead>
                <tbody>
                  {estates.map((e) => {
                    const [eg, ec] = grade(e.score);
                    const isOpen = open === e._id;
                    const top = e.gaps[0];
                    return [
                      <tr key={e._id} onClick={() => setOpen(isOpen ? null : e._id)} className={`border-b border-[#F9FAFB] cursor-pointer ${isOpen ? 'bg-[#F9FAFB]' : 'hover:bg-[#FCFCFD]'}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[#101828] truncate max-w-[200px]">{e.name}</p>
                          <p className="text-[11px] text-[#98A2B3]">{[e.city, e.state].filter(Boolean).join(', ') || e.estateCode} · {e.residents} residents</p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md text-[11px] font-bold text-white flex items-center justify-center" style={{ background: ec }}>{eg}</span>
                            <div className="flex-1"><div className="h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${e.score}%`, background: ec }} /></div></div>
                            <span className="font-semibold tabular-nums w-7 text-right">{e.score}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {e.guards.total ? <><b className="text-[#101828]">{e.guards.total}</b><span className="text-[#98A2B3]"> · {e.guards.activeNow} on now</span></> : <span className="text-[#B42318] font-medium">None</span>}
                        </td>
                        <td className="px-3 py-3 tabular-nums">{e.visitors.week}<span className="text-[#98A2B3]"> · {e.visitors.insideNow} in</span></td>
                        <td className="px-3 py-3 tabular-nums">{e.alerts.total}{e.alerts.open > 0 && <span className="ml-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-[#FEF3F2] text-[#B42318]">{e.alerts.open} open</span>}</td>
                        <td className="px-3 py-3 tabular-nums">{mins(e.alerts.avgAckMins)}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {[[Lock, e.settings.requireVisitorApproval, 'Visitor approval'], [ShieldCheck, e.plan.securityPortal, 'Security portal plan'], [Radio, e.plan.emergencyBroadcast, 'Emergency broadcast'], [MapPin, e.hasPin, 'Map pin'], [UserX, e.hasManager, 'Manager']].map(([I, on, label]) => (
                              <span key={label} title={`${label}: ${on ? 'yes' : 'no'}`} className={`w-6 h-6 rounded-md flex items-center justify-center ${on ? 'bg-[#ECFDF3] text-[#079455]' : 'bg-[#F2F4F7] text-[#D0D5DD]'}`}><I size={12} /></span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">{top ? <span className={`inline-block max-w-[180px] truncate text-[11px] font-medium px-1.5 py-0.5 rounded border ${SEV[top.severity]}`}>{top.title}</span> : <span className="text-[#079455] text-[11.5px] font-medium">All good</span>}</td>
                        <td className="px-3 py-3 text-[#98A2B3]">{isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</td>
                      </tr>,
                      isOpen && (
                        <tr key={`${e._id}-x`} className="bg-[#F9FAFB] border-b border-[#F2F4F7]">
                          <td colSpan={9} className="px-4 pb-4 pt-1">
                            <div className="grid md:grid-cols-[minmax(0,1fr)_260px] gap-4">
                              <div className="space-y-2">
                                {!e.gaps.length && <p className="text-[12.5px] text-[#079455] flex items-center gap-1.5"><CheckCircle2 size={14} /> This estate ticks every box.</p>}
                                {e.gaps.map((gp) => {
                                  const I = GAP_ICON[gp.key] || AlertTriangle;
                                  return (
                                    <div key={gp.key} className="flex items-start gap-3 rounded-xl bg-white border border-[#EAECF0] px-3 py-2.5">
                                      <span className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-shrink-0 ${SEV[gp.severity]}`}><I size={14} /></span>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-[12.5px] font-semibold text-[#101828]">{gp.title}</p>
                                        <p className="text-[12px] text-[#475467]">{gp.action}</p>
                                      </div>
                                      <span className="text-[11px] font-semibold text-[#079455] whitespace-nowrap">+{gp.points} pts</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="rounded-xl bg-white border border-[#EAECF0] p-3 text-[12px] space-y-1.5">
                                <p className="font-semibold text-[#101828]">Details</p>
                                <p className="text-[#475467]">Manager: <b className="text-[#101828]">{e.manager?.name || 'None'}</b>{e.manager?.phone ? ` · ${e.manager.phone}` : ''}</p>
                                <p className="text-[#475467]">Plan: <b className="text-[#101828]">{e.plan.name || 'No plan'}</b></p>
                                <p className="text-[#475467]">Guards active 24h: <b className="text-[#101828]">{e.guards.active24h}/{e.guards.total}</b></p>
                                <p className="text-[#475467]">Resolve time: <b className="text-[#101828]">{mins(e.alerts.avgResolveMins)}</b></p>
                                <p className="text-[#475467]">Critical alerts: <b className="text-[#101828]">{e.alerts.critical}</b> · broadcasts <b className="text-[#101828]">{e.alerts.broadcasts}</b></p>
                                <p className="text-[#475467]">Safety incidents: <b className="text-[#101828]">{e.incidents.total}</b></p>
                                <div className="pt-1.5 flex gap-1.5">
                                  <Link to={`/estates/${e._id}`} className="btn-outline !h-8 !px-2.5 !text-[12px] flex-1 justify-center" style={{ textDecoration: 'none' }}>Open <ArrowRight size={12} /></Link>
                                  <button onClick={(ev) => { ev.stopPropagation(); openNotice({ estateIds: [e._id] }); }} className="btn-primary !h-8 !px-2.5 !text-[12px] flex-1 justify-center"><Megaphone size={12} /> Notice</button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Recent alerts ── */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div><div className="card-title flex items-center gap-2"><Siren size={15} className="text-[#D92D20]" /> Recent alerts</div><div className="card-sub">Latest {data.recent.length} across all estates</div></div>
            </div>
            <div className="divide-y divide-[#F2F4F7] max-h-[520px] overflow-y-auto">
              {data.recent.map((a) => {
                const m = TYPE[a.type] || TYPE.other;
                const crit = a.severity === 'high' || a.severity === 'critical' || a.isEmergencyBroadcast;
                const stCls = a.status === 'resolved' ? 'bg-[#ECFDF3] text-[#067647]' : a.status === 'acknowledged' ? 'bg-[#EFF8FF] text-[#175CD3]' : 'bg-[#FEF3F2] text-[#B42318]';
                return (
                  <div key={a._id} className="flex items-start gap-3 px-4 py-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${m.color}14`, color: m.color }}><m.icon size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-[#101828]">{a.title || `${m.label} alert`}</p>
                        {a.estate && <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#F2F4F7] text-[#475467]">{a.estate.name}</span>}
                        <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded capitalize ${stCls}`}>{a.status}</span>
                        {crit && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded bg-[#D92D20] text-white uppercase">{a.isEmergencyBroadcast ? 'broadcast' : a.severity}</span>}
                      </div>
                      {(a.note || a.location) && <p className="text-[12px] text-[#475467] line-clamp-2">{[a.note, a.location && `📍 ${a.location}`].filter(Boolean).join(' · ')}</p>}
                      <p className="text-[11px] text-[#98A2B3] mt-0.5">
                        {formatDistanceToNowStrict(new Date(a.createdAt))} ago · by {a.raisedBy || 'unknown'}{a.raisedByRole && a.raisedByRole !== 'resident' ? ` (${a.raisedByRole.replace('_', ' ')})` : ''}
                        {a.acknowledgedAt && ` · acknowledged in ${mins(Math.round((new Date(a.acknowledgedAt) - new Date(a.createdAt)) / 60000))}`}
                        {a.resolvedAt && ` · resolved${a.resolvedBy ? ` by ${a.resolvedBy}` : ''}`}
                      </p>
                    </div>
                    {a.status !== 'resolved' && (
                      <div className="flex gap-1.5 flex-shrink-0 self-center">
                        {a.status === 'open' && <button disabled={busy[a._id]} onClick={() => act(a._id, () => securityAPI.acknowledge(a._id), 'Alert acknowledged')} className="btn-outline !h-8 !px-2.5 !text-[12px]">Ack</button>}
                        <button disabled={busy[a._id]} onClick={() => act(a._id, () => securityAPI.resolve(a._id), 'Alert resolved')} className="btn-primary !h-8 !px-2.5 !text-[12px] gap-1">{busy[a._id] ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />} Resolve</button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!data.recent.length && <p className="px-4 py-8 text-center text-[12.5px] text-[#98A2B3]">No alerts in this period.</p>}
            </div>
          </div>
        </div>

        {/* ── Side rail ── */}
        <div className="lg:col-span-4 space-y-4">
          {liveFeed}

          <div className="card overflow-hidden">
            <div className="card-header">
              <div><div className="card-title flex items-center gap-2"><Target size={15} className="text-[#079455]" /> Security playbook</div><div className="card-sub">The biggest wins across the platform</div></div>
            </div>
            <div className="divide-y divide-[#F2F4F7]">
              {data.playbook.slice(0, 7).map((p) => {
                const I = GAP_ICON[p.key] || AlertTriangle;
                return (
                  <div key={p.key} className="px-4 py-3">
                    <div className="flex items-start gap-2.5">
                      <span className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${SEV[p.severity]}`}><I size={13} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-semibold text-[#101828]">{p.title}</p>
                        <p className="text-[11.5px] text-[#667085]">{p.action}</p>
                        <p className="mt-1 text-[11px] text-[#98A2B3]">{p.estates.length} estate{p.estates.length === 1 ? '' : 's'} · up to +{p.points} pts each</p>
                      </div>
                    </div>
                    <div className="mt-2 pl-[38px] flex flex-wrap gap-1.5">
                      <button onClick={() => openNotice({ estateIds: p.estates.map((x) => x._id), ...(p.key === 'approval_off' || p.key === 'no_visitor_logs' ? TEMPLATES[0] : p.key === 'open_alerts' || p.key === 'slow_response' ? TEMPLATES[2] : {}) })}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold px-2 h-7 rounded-md bg-[#ECFDF3] text-[#067647] hover:bg-[#D1FADF]"><Megaphone size={11} /> Notify these estates</button>
                      {(p.key === 'no_guards' || p.key === 'no_manager') && <Link to="/onboarding?method=portfolio" className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 h-7 rounded-md border border-[#E4E7EC] text-[#475467]" style={{ textDecoration: 'none' }}>Assign people</Link>}
                      {p.key === 'no_security_plan' && <Link to="/finance?tab=billing" className="inline-flex items-center gap-1 text-[11.5px] font-medium px-2 h-7 rounded-md border border-[#E4E7EC] text-[#475467]" style={{ textDecoration: 'none' }}>Upgrade plans</Link>}
                    </div>
                  </div>
                );
              })}
              {!data.playbook.length && <p className="px-4 py-6 text-center text-[12.5px] text-[#079455]">Every estate ticks every box.</p>}
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <p className="card-title flex items-center gap-2"><Eye size={15} className="text-[#475467]" /> Adoption</p>
            <Meter label="Guards on the app" value={t.estatesWithGuards} total={t.estates} icon={Users} />
            <Meter label="Visitor approval on" value={t.approvalOn} total={t.estates} icon={Lock} />
            <Meter label="Security portal plan" value={t.securityPlans} total={t.estates} icon={ShieldCheck} />
            <Meter label="Estates on the map" value={(data.estates || []).filter((e) => e.hasPin).length} total={t.estates} icon={MapPin} />
            <Meter label="Estates with a manager" value={(data.estates || []).filter((e) => e.hasManager).length} total={t.estates} icon={UserX} />
          </div>

          <div className="card p-4">
            <p className="card-title flex items-center gap-2"><Sparkles size={15} className="text-[#F79009]" /> Safety notice templates</p>
            <p className="card-sub mb-3">Pinned to every resident’s notice board</p>
            <div className="space-y-1.5">
              {TEMPLATES.map((tp) => (
                <button key={tp.title} onClick={() => openNotice(tp)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#EAECF0] text-left hover:border-[#D0D5DD] hover:bg-[#F9FAFB]">
                  <Megaphone size={13} className="text-[#98A2B3]" /><span className="flex-1 text-[12.5px] text-[#344054] truncate">{tp.title}</span><Send size={12} className="text-[#D0D5DD]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Safety notice side panel ── */}
      {notice && (
        <Drawer title="Send a safety notice" subtitle="Posts an urgent notice to residents’ notice boards and notifies them instantly." icon={Megaphone} onClose={() => setNotice(null)}
          footer={<>
            <span className="text-[12px] text-[#667085] mr-auto">{notice.scope === 'all' ? `All ${t.estates} estates` : `${notice.estateIds.length} estate${notice.estateIds.length === 1 ? '' : 's'}`}</span>
            <button type="button" onClick={() => setNotice(null)} className="btn-outline">Cancel</button>
            <button type="submit" form="notice-form" disabled={sending || !notice.title.trim() || !notice.body.trim() || (notice.scope !== 'all' && !notice.estateIds.length)} className="btn-primary">
              {sending ? <><RefreshCw size={14} className="animate-spin" /> Sending…</> : <><Send size={14} /> Send notice</>}
            </button>
          </>}>
          <form id="notice-form" onSubmit={sendNotice}>
            <Section step="1" icon={Sparkles} title="Start from a template" hint="Or write your own below">
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tp) => (
                  <button key={tp.title} type="button" onClick={() => setNotice((n) => ({ ...n, title: tp.title, body: tp.body }))}
                    className={`px-2.5 h-8 rounded-full border text-[12px] font-medium ${notice.title === tp.title ? 'border-[#059669] bg-[#F6FEF9] text-[#067647]' : 'border-[#E4E7EC] text-[#475467] hover:border-[#D0D5DD]'}`}>{tp.title}</button>
                ))}
              </div>
            </Section>
            <Section step="2" icon={Megaphone} title="Message">
              <input className="input-field" placeholder="Title" value={notice.title} onChange={(e) => setNotice((n) => ({ ...n, title: e.target.value }))} maxLength={140} />
              <textarea className="input-field mt-2.5 min-h-[140px]" placeholder="What should residents know or do?" value={notice.body} onChange={(e) => setNotice((n) => ({ ...n, body: e.target.value }))} maxLength={4000} />
              <label className="mt-2.5 flex items-center gap-2 text-[12.5px] text-[#344054]"><input type="checkbox" className="accent-[#059669]" checked={notice.pin} onChange={(e) => setNotice((n) => ({ ...n, pin: e.target.checked }))} /> Pin to the top of the notice board</label>
            </Section>
            <Section step="3" icon={Building2} title="Which estates?">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[['all', 'All estates', `${t.estates} estates`], ['some', 'Choose estates', `${notice.estateIds.length} selected`]].map(([v, l, h]) => (
                  <button key={v} type="button" onClick={() => setNotice((n) => ({ ...n, scope: v }))}
                    className={`text-left rounded-xl border px-3 py-2.5 ${notice.scope === v ? 'border-[#059669] bg-[#F6FEF9] ring-2 ring-[#059669]/10' : 'border-[#E4E7EC]'}`}>
                    <span className="block text-[13px] font-medium text-[#101828]">{l}</span><span className="block text-[11px] text-[#98A2B3]">{h}</span>
                  </button>
                ))}
              </div>
              {notice.scope === 'some' && (
                <div className="rounded-xl border border-[#E4E7EC] max-h-[260px] overflow-y-auto divide-y divide-[#F2F4F7]">
                  {(data.estates || []).map((e) => {
                    const on = notice.estateIds.includes(e._id);
                    const [eg, ec] = grade(e.score);
                    return (
                      <button key={e._id} type="button" onClick={() => setNotice((n) => ({ ...n, estateIds: on ? n.estateIds.filter((x) => x !== e._id) : [...n.estateIds, e._id] }))}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>{on && <Check size={10} className="text-white" />}</span>
                        <span className="flex-1 text-[12.5px] text-[#101828] truncate">{e.name}</span>
                        <span className="text-[10.5px] font-bold text-white w-5 h-5 rounded flex items-center justify-center" style={{ background: ec }}>{eg}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>
            {notice.title && notice.body && (
              <Section icon={Eye} title="Preview">
                <div className="rounded-xl border border-[#FECDCA] bg-[#FFFBFA] p-4">
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#B42318]">Urgent{notice.pin ? ' · pinned' : ''}</span>
                  <p className="mt-1 text-[14px] font-semibold text-[#101828]">{notice.title}</p>
                  <p className="mt-1 text-[12.5px] text-[#475467] whitespace-pre-line">{notice.body}</p>
                  <p className="mt-2 text-[11px] text-[#98A2B3]">From AreaConnect</p>
                </div>
              </Section>
            )}
          </form>
        </Drawer>
      )}
    </div>
  );
}
