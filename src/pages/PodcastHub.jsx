import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict, isToday, isTomorrow } from 'date-fns';
import {
  Radio, Mic, Plus, Upload, Headphones, CalendarClock, Users, Play, Pause, Star, Eye, EyeOff, Search, Globe2, Building2,
  TrendingUp, Clock, ArrowRight, Link2, Mail, Crown, Briefcase, GraduationCap, User, Sparkles, BarChart3, ListMusic,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { podcastAPI } from '../api';
import { LiveStudio } from './PodcastStudio';
import ShowEditor from '../components/podcast/ShowEditor';
import ShowPanel from '../components/podcast/ShowPanel';
import EpisodeEditor from '../components/podcast/EpisodeEditor';
import { CategoryPill, Cover, CAT, ROLE, GUEST_STATUS, fmtDur } from '../components/podcast/shared';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'shows', label: 'Shows', icon: Mic },
  { id: 'episodes', label: 'Episodes', icon: ListMusic },
  { id: 'guests', label: 'Guests & leaders', icon: Users },
];
const ROLE_ICON = { co_host: Crown, estate_leader: Briefcase, expert: GraduationCap, guest: User };
const when = (d) => {
  if (!d) return 'Not scheduled';
  const x = new Date(d);
  return `${isToday(x) ? 'Today' : isTomorrow(x) ? 'Tomorrow' : format(x, 'EEE d MMM')} · ${format(x, 'HH:mm')}`;
};

function Kpi({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-3">
      <p className="text-[11px] text-white/55 flex items-center gap-1.5"><Icon size={12} style={{ color }} />{label}</p>
      <p className="mt-0.5 text-[20px] font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[10.5px] text-white/40 truncate">{sub}</p>}
    </div>
  );
}

export default function PodcastHub() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [shows, setShows] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [guests, setGuests] = useState(null);
  const [editShow, setEditShow] = useState(null);     // {} for new
  const [openShowId, setOpenShowId] = useState(null);
  const [editEpisode, setEditEpisode] = useState(null); // {} for new
  const [studio, setStudio] = useState(null);
  const [showFilter, setShowFilter] = useState('upcoming');
  const [q, setQ] = useState('');
  const [epQ, setEpQ] = useState('');
  const [playing, setPlaying] = useState(null);

  const load = async () => {
    const [st, sh, ep, gu] = await Promise.allSettled([podcastAPI.stats(), podcastAPI.listShows(), podcastAPI.adminEpisodes(), podcastAPI.guests()]);
    if (st.status === 'fulfilled') setStats(st.value.data.data);
    if (sh.status === 'fulfilled') {
      const list = sh.value.data.data || [];
      setShows(list);
      const live = list.find((s) => s.status === 'live');
      if (live && String(live.hostUserId) === String(user?._id) && !studio) setStudio(live);
    } else setShows([]);
    setEpisodes(ep.status === 'fulfilled' ? ep.value.data.data || [] : []);
    setGuests(gu.status === 'fulfilled' ? gu.value.data.data || [] : []);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goLive = async (show) => {
    if (!window.confirm(`Go live with "${show.title}" now? ${show.audience?.scope === 'estates' ? 'The chosen estates' : 'Every estate'} will be notified.`)) return;
    try {
      const { data } = await podcastAPI.goLive(show._id);
      setOpenShowId(null);
      setStudio(data.data);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not go live'); }
  };

  const filteredShows = useMemo(() => (shows || []).filter((s) => {
    if (showFilter === 'upcoming' && s.status !== 'scheduled') return false;
    if (showFilter === 'live' && s.status !== 'live') return false;
    if (showFilter === 'past' && s.status !== 'ended') return false;
    return !q || `${s.title} ${s.seriesName || ''} ${s.hostName}`.toLowerCase().includes(q.toLowerCase());
  }).sort((a, b) => (showFilter === 'past' ? new Date(b.endedAt || b.scheduledAt || 0) - new Date(a.endedAt || a.scheduledAt || 0) : new Date(a.scheduledAt || 8.64e15) - new Date(b.scheduledAt || 8.64e15))), [shows, showFilter, q]);
  const counts = { upcoming: (shows || []).filter((s) => s.status === 'scheduled').length, live: (shows || []).filter((s) => s.status === 'live').length, past: (shows || []).filter((s) => s.status === 'ended').length, all: (shows || []).length };
  const eps = (episodes || []).filter((e) => !epQ || `${e.title} ${e.seriesName || ''} ${(e.guestNames || []).join(' ')}`.toLowerCase().includes(epQ.toLowerCase()));

  const toggleEpisode = async (e, k) => {
    try { await podcastAPI.updateEpisode(e._id, { [k]: !(k === 'isPublished' ? e.isPublished !== false : e[k]) }); load(); }
    catch { toast.error('Could not update'); }
  };

  if (studio) {
    return <LiveStudio show={studio} onBack={() => { setStudio(null); load(); }} onEnded={() => { setStudio(null); load(); }} />;
  }

  const live = stats?.live || (shows || []).find((s) => s.status === 'live');
  const next = (stats?.upcoming || [])[0];

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pb-12 animate-fade-in">
      {/* ── Station hero ── */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'radial-gradient(110% 140% at 100% 0%, #5925DC 0%, #1E1240 45%, #0B1220 80%)' }}>
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute right-24 bottom-[-60px] w-48 h-48 rounded-full border border-white/10 pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[12px] text-white/55 flex items-center gap-1.5"><Radio size={13} /> AreaConnect FM · platform-wide station</p>
            {live ? (
              <>
                <p className="mt-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full bg-[#D92D20]"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />On air now</p>
                <h2 className="mt-2 text-[24px] font-semibold tracking-tight" style={{ color: '#fff' }}>{live.title}</h2>
                <p className="text-[13px] text-white/60">{live.hostName} · started {live.startedAt ? formatDistanceToNowStrict(new Date(live.startedAt)) : ''} ago · peak {live.peakListeners || 0} listeners</p>
              </>
            ) : (
              <>
                <h2 className="mt-3 text-[24px] font-semibold tracking-tight" style={{ color: '#fff' }}>{next ? 'Next on air' : 'The station is quiet'}</h2>
                <p className="text-[13px] text-white/60">{next ? `${next.title} · ${when(next.scheduledAt)}` : 'Schedule a show for residents across every estate.'}</p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {live && <button onClick={() => setStudio(live)} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#D92D20] text-[13px] font-semibold hover:bg-[#B42318]"><Radio size={15} /> Open live studio</button>}
            <button onClick={() => setEditEpisode({})} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-[13px] font-semibold hover:bg-white/15"><Upload size={15} /> Upload episode</button>
            <button onClick={() => setEditShow({})} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-[#1E1240] text-[13px] font-semibold hover:bg-slate-100"><Plus size={15} /> New show</button>
          </div>
        </div>
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Kpi icon={Mic} label="Shows" value={stats?.shows ?? '—'} sub={`${counts.upcoming} upcoming`} color="#B692F6" />
          <Kpi icon={ListMusic} label="Episodes" value={stats?.episodes ?? '—'} sub={`${stats?.hoursAired ?? 0} hours aired`} color="#B692F6" />
          <Kpi icon={Headphones} label="Total plays" value={(stats?.plays ?? 0).toLocaleString()} sub="on-demand listens" color="#6CE9A6" />
          <Kpi icon={TrendingUp} label="Peak live" value={stats?.peakEver ?? 0} sub={`avg ${stats?.avgPeak ?? 0} per show`} color="#FDB022" />
          <Kpi icon={Users} label="Guests" value={Object.values(stats?.guests || {}).reduce((a, b) => a + b, 0)} sub={`${stats?.guests?.joined || 0} have joined on air`} color="#53B1FD" />
          <Kpi icon={CalendarClock} label="Last 30 days" value={stats?.showsLast30 ?? 0} sub="shows broadcast" color="#FD6F8E" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-[#E4E7EC] w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-2 px-3.5 h-9 rounded-lg text-[13px] font-semibold whitespace-nowrap ${tab === id ? 'bg-[#0B1220] text-white' : 'text-[#475467] hover:bg-[#F9FAFB]'}`}>
            <Icon size={15} className={tab === id ? 'text-[#B692F6]' : 'text-[#98A2B3]'} />{label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 card overflow-hidden">
            <div className="card-header"><div><div className="card-title flex items-center gap-2"><CalendarClock size={15} className="text-[#7A5AF8]" /> Upcoming schedule</div><div className="card-sub">What’s going out next</div></div>
              <button onClick={() => setTab('shows')} className="text-[12.5px] font-medium text-[#7A5AF8] inline-flex items-center gap-1">All shows <ArrowRight size={12} /></button></div>
            {!(stats?.upcoming || []).length ? (
              <div className="py-12 text-center">
                <span className="mx-auto w-12 h-12 rounded-full bg-[#F4F3FF] text-[#7A5AF8] flex items-center justify-center"><Mic size={20} /></span>
                <p className="mt-3 text-[14px] font-semibold text-[#101828]">Nothing scheduled</p>
                <button onClick={() => setEditShow({})} className="btn-primary mt-3 inline-flex"><Plus size={14} /> Plan a show</button>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F4F7]">
                {stats.upcoming.map((s) => (
                  <button key={s._id} onClick={() => setOpenShowId(s._id)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[#FCFCFD]">
                    <span className="w-14 text-center rounded-xl border border-[#EAECF0] py-1.5 leading-none flex-shrink-0">
                      <span className="block text-[10px] uppercase font-semibold text-[#7A5AF8]">{s.scheduledAt ? format(new Date(s.scheduledAt), 'MMM') : '—'}</span>
                      <span className="block text-[18px] font-semibold text-[#101828]">{s.scheduledAt ? format(new Date(s.scheduledAt), 'd') : ''}</span>
                      <span className="block text-[10px] text-[#98A2B3]">{s.scheduledAt ? format(new Date(s.scheduledAt), 'HH:mm') : ''}</span>
                    </span>
                    <Cover src={s.coverImage} title={s.title} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-[#101828] truncate">{s.title}</p>
                      <div className="flex items-center gap-2 mt-0.5"><CategoryPill v={s.category} /><span className="text-[11.5px] text-[#98A2B3]">{(s.guests || []).filter((g) => g.status !== 'revoked').length} guests · {s.audience?.scope === 'estates' ? `${s.audience.estateIds?.length || 0} estates` : 'All estates'}</span></div>
                    </div>
                    <ArrowRight size={15} className="text-[#D0D5DD]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="card overflow-hidden">
              <div className="card-header"><div><div className="card-title flex items-center gap-2"><TrendingUp size={15} className="text-[#059669]" /> Top episodes</div><div className="card-sub">Most played on demand</div></div></div>
              {!(stats?.topEpisodes || []).length ? <p className="px-5 py-8 text-center text-[12.5px] text-[#98A2B3]">Episodes appear here after a recorded show or an upload.</p> : (
                <div className="divide-y divide-[#F2F4F7]">
                  {stats.topEpisodes.map((e, i) => (
                    <div key={e._id} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="w-5 text-[12px] font-semibold text-[#98A2B3] tabular-nums">{i + 1}</span>
                      <Cover src={e.coverImage} title={e.title} size={36} radius={8} />
                      <div className="min-w-0 flex-1"><p className="text-[13px] font-medium text-[#101828] truncate">{e.title}</p><p className="text-[11px] text-[#98A2B3]">{fmtDur(e.durationSec)} · {format(new Date(e.publishedAt), 'd MMM')}</p></div>
                      <span className="text-[12.5px] font-semibold text-[#101828] tabular-nums flex items-center gap-1"><Headphones size={12} className="text-[#98A2B3]" />{e.playCount || 0}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="card p-4">
              <p className="card-title flex items-center gap-2 mb-3"><Sparkles size={15} className="text-[#F79009]" /> Topics</p>
              {!(stats?.byCategory || []).length ? <p className="text-[12.5px] text-[#98A2B3]">No episodes yet.</p> : (
                <div className="space-y-2">
                  {stats.byCategory.sort((a, b) => b.episodes - a.episodes).map((c) => {
                    const m = CAT[c.category] || CAT.community;
                    const max = Math.max(...stats.byCategory.map((x) => x.episodes), 1);
                    return (
                      <div key={c.category} className="flex items-center gap-2.5 text-[12.5px]">
                        <span className="w-24 text-[#344054]">{m.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(c.episodes / max) * 100}%`, background: m.color }} /></div>
                        <span className="w-24 text-right text-[#667085] tabular-nums whitespace-nowrap">{c.episodes} ep · {c.plays} plays</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="card p-4">
              <p className="card-title flex items-center gap-2 mb-3"><Users size={15} className="text-[#2E90FA]" /> Guest pipeline</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Invited', stats?.guests?.pending || 0, '#B54708'], ['Joined', stats?.guests?.joined || 0, '#067647'], ['Left', stats?.guests?.left || 0, '#475467']].map(([l, v, c]) => (
                  <div key={l} className="rounded-xl bg-[#F9FAFB] py-2.5"><p className="text-[18px] font-semibold tabular-nums" style={{ color: c }}>{v}</p><p className="text-[11px] text-[#667085]">{l}</p></div>
                ))}
              </div>
              <button onClick={() => setTab('guests')} className="mt-3 w-full btn-outline justify-center text-[12.5px]">Manage guests</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shows ── */}
      {tab === 'shows' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F2F4F7] flex flex-col lg:flex-row gap-2 lg:items-center">
            <div className="tabs">
              {[['upcoming', 'Upcoming'], ['live', 'Live'], ['past', 'Past'], ['all', 'All']].map(([v, l]) => (
                <button key={v} className={`tab ${showFilter === v ? 'active' : ''}`} onClick={() => setShowFilter(v)}>{l} <span className="text-[#98A2B3] font-normal">{counts[v]}</span></button>
              ))}
            </div>
            <div className="lg:ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#D0D5DD] w-64"><Search size={14} className="text-[#98A2B3]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shows" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" /></div>
              <button onClick={() => setEditShow({})} className="btn-primary"><Plus size={14} /> New show</button>
            </div>
          </div>
          {shows === null ? <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div> : !filteredShows.length ? (
            <p className="py-14 text-center text-[13px] text-[#98A2B3]">No shows here.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table min-w-[900px]">
                <thead><tr><th>Show</th><th>Topic</th><th>When</th><th>Guests</th><th>Audience</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {filteredShows.map((s) => {
                    const g = (s.guests || []).filter((x) => x.status !== 'revoked');
                    return (
                      <tr key={s._id} onClick={() => setOpenShowId(s._id)} className="cursor-pointer">
                        <td><div className="flex items-center gap-3"><Cover src={s.coverImage} title={s.title} size={40} radius={10} /><div className="min-w-0"><p className="cell-strong truncate max-w-[260px]">{s.title}</p><p className="text-[11.5px] text-[#98A2B3]">{s.seriesName ? `${s.seriesName}${s.episodeNumber ? ` · Ep ${s.episodeNumber}` : ''}` : s.hostName}</p></div></div></td>
                        <td><CategoryPill v={s.category} /></td>
                        <td className="whitespace-nowrap text-[12.5px]">{s.status === 'ended' ? `Aired ${s.endedAt ? format(new Date(s.endedAt), 'd MMM') : ''}` : when(s.scheduledAt)}{s.isRecurring && <span className="block text-[11px] text-[#7A5AF8]">{s.recurrence || 'Recurring'}</span>}</td>
                        <td>{g.length ? <div className="flex items-center gap-1.5"><div className="flex -space-x-1.5">{g.slice(0, 4).map((x) => { const r = ROLE[x.role] || ROLE.guest; return <span key={x._id} title={`${x.name} · ${r.label}`} className="w-6 h-6 rounded-full border-2 border-white text-white text-[10px] font-bold flex items-center justify-center" style={{ background: r.color }}>{x.name?.[0]?.toUpperCase()}</span>; })}</div><span className="text-[12px] text-[#667085]">{g.length}</span></div> : <span className="text-[#D0D5DD]">—</span>}</td>
                        <td className="text-[12.5px]">{s.audience?.scope === 'estates' ? <span className="inline-flex items-center gap-1"><Building2 size={12} />{s.audience.estateIds?.length || 0} estates</span> : <span className="inline-flex items-center gap-1"><Globe2 size={12} />All</span>}</td>
                        <td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.status === 'live' ? 'bg-[#D92D20] text-white' : s.status === 'ended' ? 'bg-[#F2F4F7] text-[#475467]' : 'bg-[#EFF8FF] text-[#175CD3]'}`}>{s.status === 'live' ? '● Live' : s.status === 'ended' ? 'Ended' : 'Scheduled'}</span></td>
                        <td className="text-right"><ArrowRight size={14} className="text-[#D0D5DD] inline" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Episodes ── */}
      {tab === 'episodes' && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F2F4F7] flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#D0D5DD] w-72"><Search size={14} className="text-[#98A2B3]" /><input value={epQ} onChange={(e) => setEpQ(e.target.value)} placeholder="Search episodes, series or guests" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" /></div>
            <span className="text-[12px] text-[#98A2B3]">{eps.length} episode{eps.length === 1 ? '' : 's'}</span>
            <button onClick={() => setEditEpisode({})} className="btn-primary ml-auto"><Upload size={14} /> Upload episode</button>
          </div>
          {episodes === null ? <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div> : !eps.length ? (
            <div className="py-14 text-center"><span className="mx-auto w-12 h-12 rounded-full bg-[#F4F3FF] text-[#7A5AF8] flex items-center justify-center"><Headphones size={20} /></span><p className="mt-3 text-[14px] font-semibold text-[#101828]">No episodes yet</p><p className="text-[12.5px] text-[#667085]">Recorded live shows land here automatically, or upload a recording.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table min-w-[960px]">
                <thead><tr><th /><th>Episode</th><th>Topic</th><th>Length</th><th className="!text-right">Plays</th><th className="!text-right">Peak live</th><th>Published</th><th>Audience</th><th>Visibility</th><th /></tr></thead>
                <tbody>
                  {eps.map((e) => (
                    <tr key={e._id}>
                      <td className="w-10"><button onClick={() => setPlaying(playing?._id === e._id ? null : e)} className={`w-8 h-8 rounded-full flex items-center justify-center ${playing?._id === e._id ? 'bg-[#7A5AF8] text-white' : 'bg-[#F4F3FF] text-[#6938EF] hover:bg-[#EBE9FE]'}`}>{playing?._id === e._id ? <Pause size={13} /> : <Play size={13} />}</button></td>
                      <td><div className="flex items-center gap-3"><Cover src={e.coverImage} title={e.title} size={38} radius={8} /><div className="min-w-0"><p className="cell-strong truncate max-w-[240px]">{e.featured && <Star size={12} className="inline -mt-0.5 mr-1 text-[#F79009] fill-[#F79009]" />}{e.title}</p><p className="text-[11.5px] text-[#98A2B3] truncate max-w-[240px]">{[e.hostName, ...(e.guestNames || [])].filter(Boolean).join(' · ')}</p></div></div></td>
                      <td><CategoryPill v={e.category} /></td>
                      <td className="tabular-nums text-[12.5px]">{fmtDur(e.durationSec)}</td>
                      <td className="text-right tabular-nums font-semibold">{e.playCount || 0}</td>
                      <td className="text-right tabular-nums">{e.peakListeners || 0}</td>
                      <td className="text-[12.5px] whitespace-nowrap">{format(new Date(e.publishedAt), 'd MMM yyyy')}</td>
                      <td className="text-[12.5px]">{e.audience?.scope === 'estates' ? `${e.audience.estateIds?.length || 0} estates` : 'All'}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button title={e.isPublished !== false ? 'Unpublish' : 'Publish'} onClick={() => toggleEpisode(e, 'isPublished')} className={`text-[11px] font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1 ${e.isPublished !== false ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#F2F4F7] text-[#667085]'}`}>{e.isPublished !== false ? <><Eye size={11} /> Live</> : <><EyeOff size={11} /> Hidden</>}</button>
                          <button title="Feature" onClick={() => toggleEpisode(e, 'featured')} className={`p-1 rounded-md ${e.featured ? 'text-[#F79009]' : 'text-[#D0D5DD] hover:text-[#F79009]'}`}><Star size={14} className={e.featured ? 'fill-[#F79009]' : ''} /></button>
                        </div>
                      </td>
                      <td className="text-right"><button onClick={() => setEditEpisode(e)} className="btn-outline !h-8 !px-2.5 !text-[12px]">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Guests ── */}
      {tab === 'guests' && (
        <div className="card overflow-hidden">
          <div className="card-header"><div><div className="card-title flex items-center gap-2"><Users size={15} className="text-[#2E90FA]" /> Guests & estate leaders</div><div className="card-sub">Everyone invited onto AreaConnect FM, across every show</div></div></div>
          {guests === null ? <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div> : !guests.length ? (
            <p className="py-14 text-center text-[13px] text-[#98A2B3]">No guests yet — open a show and invite estate leaders or experts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table min-w-[860px]">
                <thead><tr><th>Guest</th><th>Role</th><th>Show</th><th>Status</th><th>Invite</th><th /></tr></thead>
                <tbody>
                  {guests.map((g) => {
                    const r = ROLE[g.role] || ROLE.guest; const I = ROLE_ICON[g.role] || User;
                    const [st, stCls] = GUEST_STATUS[g.status] || GUEST_STATUS.pending;
                    return (
                      <tr key={g._id}>
                        <td><div className="flex items-center gap-2.5"><span className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: r.color }}><I size={14} /></span><div className="min-w-0"><p className="cell-strong">{g.name}</p><p className="text-[11.5px] text-[#98A2B3] truncate max-w-[220px]">{[g.title, g.estate].filter(Boolean).join(' · ') || g.email}</p></div></div></td>
                        <td><span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-md" style={{ background: `${r.color}14`, color: r.color }}>{r.label}</span></td>
                        <td><button onClick={() => setOpenShowId(g.show._id)} className="text-left"><p className="text-[13px] text-[#101828] hover:underline truncate max-w-[220px]">{g.show.title}</p><p className="text-[11px] text-[#98A2B3]">{g.show.status === 'ended' ? 'Aired' : when(g.show.scheduledAt)}</p></button></td>
                        <td><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stCls}`}>{st}</span></td>
                        <td className="text-[12px] text-[#667085]">{g.emailedAt ? <span className="inline-flex items-center gap-1"><Mail size={12} />{formatDistanceToNowStrict(new Date(g.emailedAt))} ago</span> : 'Link only'}</td>
                        <td className="text-right">{g.link && g.status !== 'revoked' && <button onClick={() => { navigator.clipboard?.writeText(g.link); toast.success('Join link copied'); }} className="btn-outline !h-8 !px-2.5 !text-[12px]"><Link2 size={12} /> Link</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Mini player */}
      {playing && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[min(560px,calc(100%-2rem))] rounded-2xl bg-[#0B1220] text-white shadow-2xl p-3 flex items-center gap-3">
          <Cover src={playing.coverImage} title={playing.title} size={42} radius={10} />
          <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold truncate">{playing.title}</p><audio src={playing.audioUrl} controls autoPlay className="w-full h-8 mt-1" /></div>
          <button onClick={() => setPlaying(null)} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"><Pause size={15} /></button>
        </div>
      )}

      {editShow && <ShowEditor show={editShow._id ? editShow : null} onClose={() => setEditShow(null)} onSaved={(s) => { load(); if (s?._id && !editShow._id) setOpenShowId(s._id); }} />}
      {openShowId && <ShowPanel showId={openShowId} onClose={() => setOpenShowId(null)} onChanged={load} onEdit={(s) => { setOpenShowId(null); setEditShow(s); }} onGoLive={goLive} onOpenStudio={(s) => { setOpenShowId(null); setStudio(s); }} />}
      {editEpisode && <EpisodeEditor episode={editEpisode._id ? editEpisode : null} onClose={() => setEditEpisode(null)} onSaved={load} />}
    </div>
  );
}
