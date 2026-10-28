import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  Mic, Radio, Pencil, Copy, Trash2, Bell, UserPlus, Mail, Link2, XCircle, RefreshCw, Search, Check, CalendarClock, Clock,
  Globe2, Building2, ListOrdered, StickyNote, Play, Users, Crown, Briefcase, GraduationCap, User, ChevronLeft, Send,
} from 'lucide-react';
import { podcastAPI } from '../../api';
import { Drawer, Section } from '../billing/BillingDrawers';
import { CategoryPill, Cover, ROLES, ROLE, GUEST_STATUS, fmtDur } from './shared';

const ROLE_ICON = { co_host: Crown, estate_leader: Briefcase, expert: GraduationCap, guest: User };

/* ── Invite people: estate leaders, residents, or anyone by email ──── */
function InviteForm({ show, onDone, onBack }) {
  const [tab, setTab] = useState('leaders');
  const [q, setQ] = useState('');
  const [people, setPeople] = useState(null);
  const [f, setF] = useState({ name: '', email: '', phone: '', estate: '', userId: '', role: 'estate_leader', title: '', topic: '', sendEmail: true });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (tab === 'new') return undefined;
    const t = setTimeout(() => {
      setPeople(null);
      podcastAPI.people({ q: q || undefined, role: tab === 'leaders' ? 'estate_manager' : 'resident' })
        .then(({ data }) => setPeople(data.data || [])).catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, tab]);

  const choose = (p) => setF((x) => ({ ...x, name: p.name, email: p.email || '', phone: p.phone || '', estate: p.estate || '', userId: p._id, role: tab === 'leaders' ? 'estate_leader' : x.role }));

  const submit = async () => {
    if (!f.name.trim()) return toast.error('Choose someone or enter a name');
    setSaving(true);
    try {
      const { data } = await podcastAPI.invite(show._id, f);
      if (data.data.emailed) toast.success(`Invite emailed to ${f.name}`);
      else { navigator.clipboard?.writeText(data.data.link); toast.success('Invited — join link copied'); }
      onDone();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not invite'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-[12.5px] text-[#475467] hover:text-[#101828]"><ChevronLeft size={14} /> Back to guests</button>
      <div className="flex p-0.5 rounded-lg bg-[#F2F4F7] mb-3">
        {[['leaders', 'Estate leaders'], ['residents', 'Residents'], ['new', 'Someone new']].map(([v, l]) => (
          <button key={v} onClick={() => { setTab(v); setF((x) => ({ ...x, userId: '', name: v === 'new' ? x.name : '' })); }} className={`flex-1 h-8 rounded-md text-[12.5px] ${tab === v ? 'bg-white shadow-sm font-semibold text-[#101828]' : 'text-[#667085]'}`}>{l}</button>
        ))}
      </div>

      {tab !== 'new' ? (
        <div className="rounded-xl border border-[#E4E7EC] overflow-hidden mb-4">
          <div className="flex items-center gap-2 px-3 h-10 border-b border-[#F2F4F7] bg-[#F9FAFB]">
            <Search size={14} className="text-[#98A2B3]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'leaders' ? 'Search estate managers' : 'Search residents'} className="flex-1 bg-transparent outline-none text-[13px]" />
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-[#F2F4F7]">
            {people === null && <p className="p-3 text-[12px] text-[#98A2B3]">Searching…</p>}
            {people?.length === 0 && <p className="p-3 text-[12px] text-[#98A2B3]">No one found.</p>}
            {people?.map((p) => {
              const on = f.userId === p._id;
              return (
                <button key={p._id} onClick={() => choose(p)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
                  {p.photo ? <img src={p.photo} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-[#F2F4F7] text-[#475467] text-[12px] font-semibold flex items-center justify-center">{p.name?.[0]?.toUpperCase()}</span>}
                  <span className="flex-1 min-w-0"><span className="block text-[13px] font-medium text-[#101828] truncate">{p.name}</span><span className="block text-[11.5px] text-[#98A2B3] truncate">{p.estate || 'No estate'} · {p.email}</span></span>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>{on && <Check size={10} className="text-white" />}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <label className="col-span-2"><span className="field-label">Name *</span><input className="input-field" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Dr. Ngozi Okafor" /></label>
          <label><span className="field-label">Email</span><input type="email" className="input-field" value={f.email} onChange={(e) => set('email', e.target.value)} /></label>
          <label><span className="field-label">Phone</span><input className="input-field" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></label>
          <label className="col-span-2"><span className="field-label">Estate or organisation</span><input className="input-field" value={f.estate} onChange={(e) => set('estate', e.target.value)} /></label>
        </div>
      )}

      <p className="field-label">Their role on the show</p>
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {ROLES.map((r) => {
          const I = ROLE_ICON[r.v];
          return (
            <button key={r.v} type="button" onClick={() => set('role', r.v)}
              className={`rounded-xl border py-2 flex flex-col items-center gap-1 text-[11.5px] font-medium ${f.role === r.v ? 'text-white border-transparent' : 'border-[#E4E7EC] text-[#475467]'}`}
              style={f.role === r.v ? { background: r.color } : undefined}><I size={15} />{r.label}</button>
          );
        })}
      </div>
      <div className="grid gap-2.5">
        <label><span className="field-label">Title shown on air</span><input className="input-field" placeholder="e.g. Chairman, Residents' Association" value={f.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label><span className="field-label">What they'll talk about</span><input className="input-field" placeholder="e.g. New security levy and gate hours" value={f.topic} onChange={(e) => set('topic', e.target.value)} /></label>
        <label className="flex items-center gap-2 text-[12.5px] text-[#344054]"><input type="checkbox" className="accent-[#059669]" checked={f.sendEmail} onChange={(e) => set('sendEmail', e.target.checked)} disabled={!f.email} /> Email the invite with their join link {!f.email && <span className="text-[#98A2B3]">(no email)</span>}</label>
      </div>
      <button onClick={submit} disabled={saving || !f.name.trim()} className="btn-primary w-full justify-center mt-4">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />} Invite {f.name ? f.name.split(' ')[0] : 'guest'}</button>
    </div>
  );
}

export default function ShowPanel({ showId, onClose, onEdit, onChanged, onGoLive, onOpenStudio }) {
  const [show, setShow] = useState(null);
  const [mode, setMode] = useState('view');
  const [busy, setBusy] = useState('');

  const load = () => podcastAPI.getShow(showId).then(({ data }) => setShow(data.data)).catch(() => toast.error('Could not load show'));
  useEffect(() => { load(); }, [showId]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (key, fn, ok, after) => {
    setBusy(key);
    try { const r = await fn(); if (ok) toast.success(ok); await load(); onChanged?.(); after?.(r); }
    catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setBusy(''); }
  };

  if (!show) return <Drawer title="Loading show…" icon={Mic} onClose={onClose}><div className="p-6 space-y-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16" />)}</div></Drawer>;

  const guests = show.guests || [];
  const active = guests.filter((g) => g.status !== 'revoked');
  const total = (show.segments || []).reduce((t, s) => t + (s.minutes || 0), 0);
  const isLive = show.status === 'live', isEnded = show.status === 'ended';

  return (
    <Drawer title={show.title} subtitle={show.seriesName ? `${show.seriesName}${show.episodeNumber ? ` · Episode ${show.episodeNumber}` : ''}` : `Hosted by ${show.hostName}`} icon={isLive ? Radio : Mic} onClose={onClose} width={640}
      footer={mode === 'view' && !isEnded ? (
        <>
          <button onClick={() => onEdit(show)} disabled={isLive} className="btn-outline"><Pencil size={14} /> Edit</button>
          {show.status === 'scheduled' && <button disabled={busy === 'remind'} onClick={() => act('remind', () => podcastAPI.remind(show._id), 'Reminder sent to listeners')} className="btn-outline"><Bell size={14} /> Remind</button>}
          <span className="mr-auto" />
          {isLive
            ? <button onClick={() => onOpenStudio(show)} className="btn-primary !bg-[#D92D20]"><Radio size={14} /> Open live studio</button>
            : <button onClick={() => onGoLive(show)} className="btn-primary !bg-[#D92D20] hover:!bg-[#B42318]"><Radio size={14} /> Go live now</button>}
        </>
      ) : null}>
      {/* Hero */}
      <div className="px-6 py-5 border-b border-[#F2F4F7] flex gap-4">
        <Cover src={show.coverImage} title={show.title} size={88} radius={16} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryPill v={show.category} />
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isLive ? 'bg-[#D92D20] text-white' : isEnded ? 'bg-[#F2F4F7] text-[#475467]' : 'bg-[#EFF8FF] text-[#175CD3]'}`}>{isLive ? '● LIVE' : isEnded ? 'Ended' : 'Scheduled'}</span>
            {show.isRecurring && <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F4F3FF] text-[#5925DC]">{show.recurrence || 'Recurring'}</span>}
          </div>
          <p className="mt-1.5 text-[13px] text-[#475467] line-clamp-3">{show.description || 'No description yet.'}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#667085]">
            <span className="flex items-center gap-1"><CalendarClock size={12} />{show.scheduledAt ? format(new Date(show.scheduledAt), 'EEE d MMM yyyy, HH:mm') : 'Not scheduled'}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{show.durationMins || 45} min</span>
            <span className="flex items-center gap-1">{show.audience?.scope === 'estates' ? <Building2 size={12} /> : <Globe2 size={12} />}{show.audience?.scope === 'estates' ? `${show.audience.estateIds?.length || 0} estates` : 'All estates'}</span>
            {show.remindedAt && <span className="flex items-center gap-1"><Bell size={12} />Reminded {formatDistanceToNowStrict(new Date(show.remindedAt))} ago</span>}
          </div>
        </div>
      </div>

      {mode === 'invite' ? (
        <div className="px-6 py-5"><InviteForm show={show} onBack={() => setMode('view')} onDone={() => { setMode('view'); load(); onChanged?.(); }} /></div>
      ) : (
        <>
          {/* Guests */}
          <Section icon={Users} title={`Guests & estate leaders · ${active.length}`} hint="Everyone gets a private link to join the broadcast from their phone">
            {!active.length && <p className="text-[12.5px] text-[#98A2B3] mb-3">No one invited yet. Bring estate chairmen, managers or experts on air.</p>}
            <div className="space-y-2">
              {guests.map((g) => {
                const r = ROLE[g.role] || ROLE.guest; const I = ROLE_ICON[g.role] || User;
                const [st, stCls] = GUEST_STATUS[g.status] || GUEST_STATUS.pending;
                return (
                  <div key={g._id} className={`flex items-start gap-3 rounded-xl border border-[#EAECF0] p-3 ${g.status === 'revoked' ? 'opacity-50' : ''}`}>
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ background: r.color }}><I size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13.5px] font-semibold text-[#101828]">{g.name}</p>
                        <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${r.color}14`, color: r.color }}>{r.label}</span>
                        <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${stCls}`}>{st}</span>
                      </div>
                      <p className="text-[12px] text-[#667085] truncate">{[g.title, g.estate].filter(Boolean).join(' · ') || g.email || '—'}</p>
                      {g.topic && <p className="text-[12px] text-[#475467] mt-0.5">Topic: {g.topic}</p>}
                      <p className="text-[11px] text-[#98A2B3] mt-0.5">{g.emailedAt ? `Emailed ${formatDistanceToNowStrict(new Date(g.emailedAt))} ago${g.emailCount > 1 ? ` · ${g.emailCount}×` : ''}` : g.email ? 'Not emailed' : 'Link only'}{g.joinedAt ? ` · joined ${format(new Date(g.joinedAt), 'd MMM HH:mm')}` : ''}</p>
                    </div>
                    {g.status !== 'revoked' && !isEnded && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button title="Copy join link" onClick={() => { navigator.clipboard?.writeText(g.link); toast.success('Join link copied'); }} className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]"><Link2 size={14} /></button>
                        {g.email && <button title="Email invite again" disabled={busy === g._id} onClick={() => act(g._id, () => podcastAPI.resendInvite(show._id, g._id), `Invite re-sent to ${g.name}`)} className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]">{busy === g._id ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />}</button>}
                        <button title="Revoke" onClick={() => act(g._id, () => podcastAPI.revokeInvite(show._id, g._id), 'Invite revoked')} className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#B42318] hover:bg-[#FEF3F2]"><XCircle size={14} /></button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {!isEnded && <button onClick={() => setMode('invite')} className="btn-outline mt-3 w-full justify-center"><UserPlus size={14} /> Invite guest or estate leader</button>}
          </Section>

          {/* Run of show */}
          <Section icon={ListOrdered} title="Run of show" hint={total ? `${total} of ${show.durationMins || 45} minutes planned` : 'No segments planned'}>
            {(show.segments || []).length ? (
              <ol className="relative border-l-2 border-[#EAECF0] ml-2 space-y-3">
                {show.segments.map((s, i) => (
                  <li key={i} className="pl-4 relative">
                    <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-white border-2 border-[#7A5AF8]" />
                    <p className="text-[13px] font-semibold text-[#101828]">{s.title} <span className="font-normal text-[#98A2B3]">· {s.minutes} min{s.speaker ? ` · ${s.speaker}` : ''}</span></p>
                    {s.notes && <p className="text-[12px] text-[#667085]">{s.notes}</p>}
                  </li>
                ))}
              </ol>
            ) : <button onClick={() => onEdit(show)} className="btn-ghost text-[12.5px]">Plan segments</button>}
          </Section>

          {show.audience?.scope === 'estates' && (
            <Section icon={Building2} title="Audience estates">
              <div className="flex flex-wrap gap-1.5">{(show.audience.estateIds || []).map((e) => <span key={e._id || e} className="text-[12px] px-2 py-1 rounded-lg bg-[#F2F4F7] text-[#344054]">{e.name || 'Estate'}</span>)}</div>
            </Section>
          )}

          {show.notes && <Section icon={StickyNote} title="Producer notes"><p className="text-[13px] text-[#475467] whitespace-pre-line">{show.notes}</p></Section>}

          {isEnded && (
            <Section icon={Play} title="Recording">
              {show.episode?.audioUrl ? (
                <div className="space-y-2">
                  <audio src={show.episode.audioUrl} controls className="w-full" />
                  <p className="text-[12px] text-[#667085]">{fmtDur(show.episode.durationSec)} · {show.episode.playCount || 0} plays · peak {show.episode.peakListeners || 0} live listeners</p>
                </div>
              ) : <p className="text-[12.5px] text-[#98A2B3]">This show wasn’t recorded. You can upload a recording from the Episodes tab.</p>}
            </Section>
          )}

          <Section icon={Copy} title="More">
            <div className="flex flex-wrap gap-2">
              <button disabled={busy === 'dup'} onClick={() => act('dup', () => podcastAPI.duplicateShow(show._id), 'Show duplicated — find it under Upcoming')} className="btn-outline"><Copy size={14} /> Duplicate {show.isRecurring ? 'as next week' : ''}</button>
              {!isLive && <button disabled={busy === 'del'} onClick={() => { if (window.confirm(`Delete "${show.title}"? This can’t be undone.`)) act('del', () => podcastAPI.deleteShow(show._id), 'Show deleted', () => onClose()); }} className="btn-outline !text-[#B42318] hover:!bg-[#FEF3F2]"><Trash2 size={14} /> Delete show</button>}
            </div>
          </Section>
        </>
      )}
    </Drawer>
  );
}
