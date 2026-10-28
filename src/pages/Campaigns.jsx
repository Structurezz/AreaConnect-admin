import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  Megaphone, Plus, Play, Pause, Trash2, Copy, Pencil, Search, BarChart3, LayoutList, BookOpen, Eye, MousePointerClick,
  Users, Mail, BellRing, Radio, AlertTriangle, CalendarClock, TrendingUp, TrendingDown, ArrowRight, Sparkles, Target, RefreshCw,
} from 'lucide-react';
import { campaignAPI } from '../api';
import CampaignPanel from '../components/campaigns/CampaignPanel';
import {
  GOALS, GOAL, CHANNELS, CHANNEL, PHASE, PLAYBOOKS, PhaseBadge, GoalPill, ChannelIcons, TrendChart, CtrBar, nf, pct, audienceSummary,
} from '../components/campaigns/shared';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'campaigns', label: 'Campaigns', icon: LayoutList },
  { id: 'playbooks', label: 'Playbooks', icon: BookOpen },
];
const PHASE_FILTERS = ['', 'live', 'scheduled', 'draft', 'paused', 'expired', 'ended'];

function Kpi({ icon: Icon, label, value, sub, color, delta }) {
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-3">
      <p className="text-[11px] text-white/55 flex items-center gap-1.5"><Icon size={12} style={{ color }} />{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold text-white tabular-nums flex items-baseline gap-2">
        {value}
        {delta != null && Number.isFinite(delta) && (
          <span className={`text-[11px] font-medium inline-flex items-center gap-0.5 ${delta >= 0 ? 'text-[#6CE9A6]' : 'text-[#FDA29B]'}`}>
            {delta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{Math.abs(delta)}%
          </span>
        )}
      </p>
      {sub && <p className="text-[10.5px] text-white/40 truncate">{sub}</p>}
    </div>
  );
}

const change = (now, before) => (before ? Math.round(((now - before) / before) * 100) : null);

export default function Campaigns() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || (params.get('channel') ? 'campaigns' : 'overview'));
  const [days, setDays] = useState(30);
  const [ov, setOv] = useState(null);
  const [list, setList] = useState(null);
  const [q, setQ] = useState('');
  const [phase, setPhase] = useState('');
  const [channel, setChannel] = useState(params.get('channel') || '');
  const [goal, setGoal] = useState('');
  const [openId, setOpenId] = useState(null);

  const loadList = () => campaignAPI.list().then(({ data }) => setList(data.data || [])).catch(() => { setList([]); toast.error('Could not load campaigns'); });
  const loadOv = () => campaignAPI.overview(days).then(({ data }) => setOv(data.data)).catch(() => setOv(null));
  const reload = () => { loadList(); loadOv(); };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { loadOv(); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (id) => { setTab(id); const p = new URLSearchParams(params); p.set('tab', id); p.delete('channel'); setParams(p, { replace: true }); };

  const counts = useMemo(() => {
    const c = {};
    (list || []).forEach((x) => { c[x.phase] = (c[x.phase] || 0) + 1; });
    return c;
  }, [list]);

  const rows = useMemo(() => (list || []).filter((c) => {
    if (phase && c.phase !== phase) return false;
    if (channel && !(c.placements || []).includes(channel)) return false;
    if (goal && c.goal !== goal) return false;
    if (q && !`${c.name} ${c.content?.headline || ''} ${c.email?.subject || ''}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [list, phase, channel, goal, q]);

  const setStatus = async (c, status) => {
    try { await campaignAPI.setStatus(c._id, status); toast.success(status === 'active' ? 'Campaign is live' : `Campaign ${status}`); reload(); }
    catch { toast.error('Could not update status'); }
  };
  const duplicate = async (c) => {
    try { const { data } = await campaignAPI.duplicate(c._id); toast.success('Duplicated as draft'); navigate(`/campaigns/${data.data._id}`); }
    catch { toast.error('Could not duplicate'); }
  };
  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}" and its stats? This can’t be undone.`)) return;
    try { await campaignAPI.remove(c._id); toast.success('Deleted'); setOpenId(null); reload(); }
    catch { toast.error('Could not delete'); }
  };

  const period = ov?.period || {};
  const live = counts.live || 0;
  const iconBtn = 'w-7 h-7 inline-flex items-center justify-center rounded-md border border-[#E4E7EC] bg-white text-[#475467] hover:bg-[#F9FAFB] hover:text-[#101828]';

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pb-12 animate-fade-in">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'radial-gradient(110% 140% at 100% 0%, #047857 0%, #0B3B2E 42%, #0B1220 80%)' }}>
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute right-28 bottom-[-70px] w-48 h-48 rounded-full border border-white/10 pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] text-white/55 flex items-center gap-1.5"><Megaphone size={13} /> Growth · residents & estate managers</p>
            <h2 className="mt-3 text-[24px] font-semibold tracking-tight" style={{ color: '#fff' }}>
              {live ? `${live} campaign${live === 1 ? '' : 's'} live right now` : 'No campaigns are live'}
            </h2>
            <p className="text-[13px] text-white/60">
              {ov ? `${nf(ov.addressable.residents)} residents · ${nf(ov.addressable.managers)} estate managers · ${nf(ov.addressable.push)} with push enabled` : 'Loading audience…'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => go('playbooks')} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-[13px] font-semibold hover:bg-white/15"><BookOpen size={15} /> Playbooks</button>
            <button onClick={() => navigate('/campaigns/new')} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-[#0B3B2E] text-[13px] font-semibold hover:bg-slate-100"><Plus size={15} /> New campaign</button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Kpi icon={Radio} label="Live" value={live} sub={`${counts.scheduled || 0} scheduled · ${counts.draft || 0} drafts`} color="#6CE9A6" />
          <Kpi icon={Eye} label={`Impressions · ${days}d`} value={nf(period.impressions)} delta={change(period.impressions, ov?.prev?.impressions)} sub="in-app views" color="#6CE9A6" />
          <Kpi icon={MousePointerClick} label={`Clicks · ${days}d`} value={nf(period.clicks)} delta={change(period.clicks, ov?.prev?.clicks)} sub={`CTR ${pct(period.clicks, period.impressions)}`} color="#84CAFF" />
          <Kpi icon={Users} label="Unique reach" value={nf(ov?.lifetime?.reach)} sub="members who saw a campaign" color="#FDB022" />
          <Kpi icon={Mail} label="Emails sent" value={nf(ov?.lifetime?.emails)} sub={`${nf(period.emails)} in last ${days}d`} color="#FD6F8E" />
          <Kpi icon={BellRing} label="Push sent" value={nf(ov?.lifetime?.pushes)} sub={`${nf(period.pushes)} in last ${days}d`} color="#B692F6" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-[#E4E7EC] w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: I }) => (
          <button key={id} onClick={() => go(id)} className={`flex items-center gap-2 px-3.5 h-9 rounded-lg text-[13px] font-semibold whitespace-nowrap ${tab === id ? 'bg-[#0B1220] text-white' : 'text-[#475467] hover:bg-[#F9FAFB]'}`}>
            <I size={14} />{label}
            {id === 'campaigns' && list && <span className={`text-[11px] px-1.5 rounded-full ${tab === id ? 'bg-white/15' : 'bg-[#F2F4F7]'}`}>{list.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-[#101828]">Performance</h3>
                  <p className="text-[12px] text-[#667085]">Daily in-app impressions and clicks across all campaigns</p>
                </div>
                <div className="flex gap-1 p-0.5 rounded-lg bg-[#F2F4F7]">
                  {[7, 30, 90].map((d) => (
                    <button key={d} onClick={() => setDays(d)} className={`h-7 px-2.5 rounded-md text-[12px] font-semibold ${days === d ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085]'}`}>{d}d</button>
                  ))}
                </div>
              </div>
              {ov ? <TrendChart series={ov.series} height={200} /> : <div className="skeleton h-[200px]" />}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-[#F2F4F7]">
                {[
                  ['Impressions', nf(period.impressions)],
                  ['Clicks', nf(period.clicks)],
                  ['Click-through', pct(period.clicks, period.impressions)],
                  ['Dismissed', pct(period.dismissals, period.impressions)],
                  ['Emails + push', nf((period.emails || 0) + (period.pushes || 0))],
                ].map(([l, v]) => (
                  <div key={l}><p className="text-[11.5px] text-[#667085]">{l}</p><p className="text-[16px] font-semibold text-[#101828] tabular-nums">{v}</p></div>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-[#101828] flex items-center gap-2"><AlertTriangle size={15} className="text-[#F79009]" /> Needs attention</h3>
              <p className="text-[12px] text-[#667085] mb-3">Campaigns that could be doing better</p>
              {!ov ? <div className="skeleton h-40" /> : ov.attention.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-[#667085]">All campaigns look healthy 👌</div>
              ) : (
                <div className="space-y-2">
                  {ov.attention.map((c) => (
                    <button key={c._id} onClick={() => setOpenId(c._id)} className="w-full text-left rounded-xl border border-[#EAECF0] p-3 hover:border-[#D0D5DD] hover:bg-[#FCFCFD]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold text-[#101828] truncate">{c.name}</p>
                        <PhaseBadge phase={c.phase} />
                      </div>
                      <p className="text-[12px] text-[#B54708] mt-1">{c.reason}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-[#101828]">Channels</h3>
              <p className="text-[12px] text-[#667085] mb-3">Where campaigns are delivered and how they perform (lifetime)</p>
              <div className="divide-y divide-[#F2F4F7]">
                {CHANNELS.map((ch) => {
                  const s = ov?.channels?.[ch.v] || { campaigns: 0, live: 0, impressions: 0, clicks: 0 };
                  const inApp = !['email', 'push'].includes(ch.v);
                  return (
                    <button key={ch.v} onClick={() => { setChannel(ch.v); setPhase(''); go('campaigns'); }} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-[#FCFCFD]">
                      <span className="w-9 h-9 rounded-lg bg-[#F2F4F7] text-[#344054] flex items-center justify-center"><ch.Icon size={16} /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#101828]">{ch.label}</p>
                        <p className="text-[11.5px] text-[#98A2B3] truncate">{ch.hint}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold tabular-nums text-[#101828]">{s.live} live <span className="text-[#98A2B3] font-normal">/ {s.campaigns}</span></p>
                        <p className="text-[11.5px] text-[#667085] tabular-nums">{inApp ? `${nf(s.impressions)} views · ${pct(s.clicks, s.impressions)} CTR` : 'sent on demand'}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-[#101828]">Goals</h3>
              <p className="text-[12px] text-[#667085] mb-3">What your campaigns are driving across AreaConnect</p>
              {(() => {
                const g = ov?.goals || {};
                const max = Math.max(1, ...Object.values(g).map((x) => x.impressions));
                const used = GOALS.filter((x) => g[x.v]);
                if (!used.length) return <p className="py-10 text-center text-[13px] text-[#667085]">No campaigns yet — start from a playbook.</p>;
                return (
                  <div className="space-y-2.5">
                    {used.map((x) => (
                      <button key={x.v} onClick={() => { setGoal(x.v); setPhase(''); go('campaigns'); }} className="w-full text-left">
                        <div className="flex items-center justify-between text-[12.5px] mb-1">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#344054]"><x.Icon size={13} style={{ color: x.color }} />{x.label}<span className="text-[#98A2B3] font-normal">· {g[x.v].campaigns}</span></span>
                          <span className="tabular-nums text-[#667085]">{nf(g[x.v].impressions)} views · {pct(g[x.v].clicks, g[x.v].impressions)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (g[x.v].impressions / max) * 100)}%`, background: x.color }} /></div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-[#101828] flex items-center gap-2"><Target size={15} className="text-[#059669]" /> Top performers</h3>
              <p className="text-[12px] text-[#667085] mb-3">Best click-through (10+ impressions)</p>
              {!ov?.top?.length ? <p className="py-8 text-center text-[13px] text-[#667085]">Not enough data yet.</p> : (
                <div className="space-y-1">
                  {ov.top.map((c, i) => (
                    <button key={c._id} onClick={() => setOpenId(c._id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB] text-left">
                      <span className="w-6 text-[12px] font-semibold text-[#98A2B3]">#{i + 1}</span>
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.content?.theme?.primaryColor || '#059669' }} />
                      <span className="flex-1 min-w-0 text-[13px] font-medium text-[#101828] truncate">{c.name}</span>
                      <span className="text-[12px] text-[#667085] tabular-nums">{nf(c.metrics?.impressions)} views</span>
                      <span className="w-14 text-right text-[13px] font-semibold text-[#067647] tabular-nums">{c.ctr}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <h3 className="text-[14px] font-semibold text-[#101828] flex items-center gap-2"><CalendarClock size={15} className="text-[#2E90FA]" /> Coming up</h3>
              <p className="text-[12px] text-[#667085] mb-3">Scheduled to go live automatically</p>
              {!ov?.upcoming?.length ? (
                <div className="py-8 text-center">
                  <p className="text-[13px] text-[#667085]">Nothing scheduled.</p>
                  <button onClick={() => navigate('/campaigns/new')} className="mt-2 text-[12.5px] font-semibold text-[#059669] inline-flex items-center gap-1">Plan a campaign <ArrowRight size={13} /></button>
                </div>
              ) : (
                <div className="space-y-1">
                  {ov.upcoming.map((c) => (
                    <button key={c._id} onClick={() => setOpenId(c._id)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB] text-left">
                      <span className="w-11 text-center rounded-lg border border-[#EAECF0] py-1">
                        <span className="block text-[10px] uppercase text-[#98A2B3]">{format(new Date(c.schedule.startAt), 'MMM')}</span>
                        <span className="block text-[15px] font-semibold text-[#101828] leading-none">{format(new Date(c.schedule.startAt), 'd')}</span>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-medium text-[#101828] truncate">{c.name}</span>
                        <span className="block text-[11.5px] text-[#667085]">starts in {formatDistanceToNowStrict(new Date(c.schedule.startAt))}</span>
                      </span>
                      <ChannelIcons list={c.placements} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Campaigns ── */}
      {tab === 'campaigns' && (
        <div className="card overflow-hidden">
          <div className="flex flex-col gap-3 px-4 py-3 border-b border-[#E4E7EC]">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="relative w-full sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, headline or subject" className="input-field !pl-9" />
              </div>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input-field sm:!w-44">
                <option value="">All channels</option>
                {CHANNELS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
              </select>
              <select value={goal} onChange={(e) => setGoal(e.target.value)} className="input-field sm:!w-48">
                <option value="">All goals</option>
                {GOALS.map((g) => <option key={g.v} value={g.v}>{g.label}</option>)}
              </select>
              <button onClick={reload} className="btn-outline sm:ml-auto"><RefreshCw size={14} /> Refresh</button>
            </div>
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="tabs">
                {PHASE_FILTERS.map((p) => (
                  <button key={p} onClick={() => setPhase(p)} className={`tab ${phase === p ? 'active' : ''}`}>
                    {p ? PHASE[p].label : 'All'} <span className="ml-1 text-[#98A2B3]">{p ? counts[p] || 0 : (list || []).length}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {list === null ? (
            <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-11 h-11 rounded-full bg-[#ECFDF3] text-[#059669] flex items-center justify-center mx-auto mb-3"><Megaphone size={18} /></div>
              <h3 className="text-[14px] font-semibold text-[#101828]">{(list || []).length ? 'No campaigns match these filters' : 'No campaigns yet'}</h3>
              <p className="text-[13px] text-[#475467] mt-1 mb-4">Start from a proven playbook — dues, visitor passes, SOS, upgrades and more.</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => go('playbooks')} className="btn-outline"><BookOpen size={14} /> Browse playbooks</button>
                <button onClick={() => navigate('/campaigns/new')} className="btn-primary"><Plus size={14} /> New campaign</button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Goal</th>
                    <th>Channels</th>
                    <th>Status</th>
                    <th className="text-right">Reach</th>
                    <th className="text-right">Views</th>
                    <th>CTR</th>
                    <th className="text-right">Sent</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c._id} className="cursor-pointer" onClick={() => setOpenId(c._id)}>
                      <td className="min-w-[260px]">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1 w-2.5 h-2.5 rounded-sm flex-shrink-0 border border-black/5" style={{ background: c.content?.theme?.primaryColor || '#059669' }} />
                          <div className="min-w-0">
                            <p className="cell-strong truncate max-w-[300px]">{c.name}</p>
                            <p className="text-[11.5px] text-[#98A2B3] truncate max-w-[300px]">{audienceSummary(c.audience)}</p>
                          </div>
                        </div>
                      </td>
                      <td><GoalPill v={c.goal} /></td>
                      <td><ChannelIcons list={c.placements} /></td>
                      <td>
                        <PhaseBadge phase={c.phase} />
                        {c.phase === 'scheduled' && <p className="text-[11px] text-[#667085] mt-0.5">{format(new Date(c.schedule.startAt), 'd MMM, HH:mm')}</p>}
                        {c.phase === 'live' && c.schedule?.endAt && <p className="text-[11px] text-[#667085] mt-0.5">ends {format(new Date(c.schedule.endAt), 'd MMM')}</p>}
                      </td>
                      <td className="text-right tabular-nums">{nf(c.reach)}</td>
                      <td className="text-right tabular-nums">{nf(c.metrics?.impressions)}</td>
                      <td><CtrBar ctr={c.ctr} /></td>
                      <td className="text-right tabular-nums text-[12px] text-[#475467]">
                        {(c.metrics?.emailsSent || 0) + (c.metrics?.pushesSent || 0) ? (
                          <span className="inline-flex flex-col items-end">
                            {c.metrics?.emailsSent ? <span className="inline-flex items-center gap-1"><Mail size={11} />{nf(c.metrics.emailsSent)}</span> : null}
                            {c.metrics?.pushesSent ? <span className="inline-flex items-center gap-1"><BellRing size={11} />{nf(c.metrics.pushesSent)}</span> : null}
                          </span>
                        ) : '—'}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => navigate(`/campaigns/${c._id}`)} title="Edit" className={iconBtn}><Pencil size={13} /></button>
                          {c.status === 'active'
                            ? <button onClick={() => setStatus(c, 'paused')} title="Pause" className={`${iconBtn} hover:!text-[#B54708]`}><Pause size={13} /></button>
                            : <button onClick={() => setStatus(c, 'active')} title="Go live" className={`${iconBtn} hover:!text-[#067647]`}><Play size={13} /></button>}
                          <button onClick={() => duplicate(c)} title="Duplicate" className={iconBtn}><Copy size={13} /></button>
                          <button onClick={() => remove(c)} title="Delete" className={`${iconBtn} hover:!text-[#B42318]`}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Playbooks ── */}
      {tab === 'playbooks' && (
        <div className="space-y-3">
          <div className="card p-4 flex flex-wrap items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#ECFDF3] border border-[#ABEFC6] text-[#059669] flex items-center justify-center"><Sparkles size={17} /></span>
            <div className="flex-1 min-w-[220px]">
              <p className="text-[14px] font-semibold text-[#101828]">Playbooks built around AreaConnect</p>
              <p className="text-[12.5px] text-[#667085]">Each one targets the right people, opens the right screen in the app and comes with copy you can edit.</p>
            </div>
            <button onClick={() => navigate('/campaigns/new')} className="btn-outline"><Plus size={14} /> Start from blank</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {PLAYBOOKS.map((p) => {
              const g = GOAL[p.goal];
              const used = (list || []).filter((c) => c.goal === p.goal).length;
              return (
                <div key={p.key} className="card p-4 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <GoalPill v={p.goal} />
                    {used > 0 && <span className="text-[11px] text-[#98A2B3]">{used} running in this goal</span>}
                  </div>
                  <div className="mt-3 rounded-xl p-3.5 relative overflow-hidden" style={{ background: p.content.theme?.backgroundColor || '#0B1220' }}>
                    <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full" style={{ background: `radial-gradient(circle, ${(p.content.theme?.primaryColor || g.color)}66 0%, transparent 70%)` }} />
                    {p.content.badge && <p className="relative text-[9.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: p.content.theme?.accentColor || '#34D399' }}>{p.content.badge}</p>}
                    <p className="relative text-[15px] font-bold leading-snug" style={{ color: p.content.theme?.textColor || '#fff' }}>{p.content.headline}</p>
                    <p className="relative text-[11.5px] mt-0.5 opacity-70 line-clamp-1" style={{ color: p.content.theme?.textColor || '#fff' }}>{p.content.subheadline}</p>
                  </div>
                  <p className="mt-3 text-[13.5px] font-semibold text-[#101828]">{p.name}</p>
                  <p className="text-[12.5px] text-[#667085] mt-0.5 flex-1">{p.why}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <ChannelIcons list={p.placements} />
                      <p className="text-[11px] text-[#98A2B3] mt-1 truncate">{audienceSummary(p.audience)}</p>
                    </div>
                    <button onClick={() => navigate(`/campaigns/new?playbook=${p.key}`)} className="btn-primary !h-8 text-[12.5px] whitespace-nowrap">Use <ArrowRight size={13} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {openId && (
        <CampaignPanel id={openId} onClose={() => setOpenId(null)} onChanged={reload}
          onEdit={(id) => navigate(`/campaigns/${id}`)} onDuplicate={duplicate} onDelete={remove} onStatus={setStatus} />
      )}
    </div>
  );
}
