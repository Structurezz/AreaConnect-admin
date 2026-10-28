import { useState } from 'react';
import toast from 'react-hot-toast';
import { Mic, CalendarClock, Users, ListOrdered, StickyNote, Plus, Trash2, ArrowUp, ArrowDown, Globe2, Building2, Check, RefreshCw, Repeat } from 'lucide-react';
import { podcastAPI } from '../../api';
import { Drawer, Section } from '../billing/BillingDrawers';
import { CATEGORIES, MediaUpload, EstateMultiPicker } from './shared';

const toLocal = (d) => {
  if (!d) return '';
  const x = new Date(d); const off = x.getTimezoneOffset();
  return new Date(x.getTime() - off * 60000).toISOString().slice(0, 16);
};
const SEGMENT_TEMPLATES = [
  [{ title: 'Intro & welcome', minutes: 3 }, { title: 'Estate news roundup', minutes: 10 }, { title: 'Guest conversation', minutes: 20 }, { title: 'Listener questions', minutes: 10 }, { title: 'Wrap-up', minutes: 2 }],
  [{ title: 'Intro', minutes: 2 }, { title: 'Interview', minutes: 30 }, { title: 'Q&A', minutes: 10 }, { title: 'Outro', minutes: 3 }],
];

export default function ShowEditor({ show, onClose, onSaved }) {
  const [f, setF] = useState(() => ({
    title: show?.title || '', description: show?.description || '', coverImage: show?.coverImage || '', hostName: show?.hostName || '',
    category: show?.category || 'community', tags: (show?.tags || []).join(', '), language: show?.language || 'English',
    seriesName: show?.seriesName || '', episodeNumber: show?.episodeNumber || '',
    scheduledAt: toLocal(show?.scheduledAt), durationMins: show?.durationMins || 45, isRecurring: !!show?.isRecurring, recurrence: show?.recurrence || '',
    scope: show?.audience?.scope || 'all', estateIds: (show?.audience?.estateIds || []).map((e) => String(e._id || e)),
    segments: (show?.segments || []).map(({ title, minutes, notes, speaker }) => ({ title, minutes, notes: notes || '', speaker: speaker || '' })),
    notes: show?.notes || '',
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const total = f.segments.reduce((t, s) => t + (Number(s.minutes) || 0), 0);
  const setSeg = (i, k, v) => set('segments', f.segments.map((s, j) => (j === i ? { ...s, [k]: v } : s)));
  const move = (i, d) => { const a = [...f.segments]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set('segments', a); };

  const save = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return toast.error('Give the show a title');
    if (f.scope === 'estates' && !f.estateIds.length) return toast.error('Pick at least one estate, or choose all estates');
    setSaving(true);
    const payload = {
      title: f.title.trim(), description: f.description, coverImage: f.coverImage, hostName: f.hostName || undefined,
      category: f.category, tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean), language: f.language,
      seriesName: f.seriesName.trim(), episodeNumber: Number(f.episodeNumber) || 0,
      scheduledAt: f.scheduledAt ? new Date(f.scheduledAt).toISOString() : null, durationMins: Number(f.durationMins) || 45,
      isRecurring: f.isRecurring, recurrence: f.isRecurring ? f.recurrence : '',
      audience: { scope: f.scope, estateIds: f.scope === 'estates' ? f.estateIds : [] },
      segments: f.segments.filter((s) => s.title.trim()).map((s) => ({ ...s, minutes: Number(s.minutes) || 0 })), notes: f.notes,
    };
    try {
      const { data } = show?._id ? await podcastAPI.updateShow(show._id, payload) : await podcastAPI.createShow(payload);
      toast.success(show?._id ? 'Show updated' : 'Show created');
      onSaved?.(data.data);
      onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not save the show'); }
    finally { setSaving(false); }
  };

  return (
    <Drawer title={show?._id ? 'Edit show' : 'New show'} subtitle="Plan an AreaConnect FM broadcast — what it is, when it airs, who hears it and how it runs." icon={Mic} onClose={onClose} width={640}
      footer={<>
        <span className="text-[12px] text-[#667085] mr-auto">{f.scope === 'all' ? 'All estates' : `${f.estateIds.length} estate${f.estateIds.length === 1 ? '' : 's'}`} · {total ? `${total} min planned` : `${f.durationMins} min`}</span>
        <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
        <button type="submit" form="show-form" disabled={saving} className="btn-primary">{saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><Check size={14} /> {show?._id ? 'Save changes' : 'Create show'}</>}</button>
      </>}>
      <form id="show-form" onSubmit={save}>
        <Section step="1" icon={Mic} title="The show" hint="What listeners see in the app">
          <div className="space-y-3">
            <input className="input-field !text-[15px] !font-semibold" placeholder="Show title, e.g. Friday Night with the Chairman" value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus />
            <textarea className="input-field min-h-[80px]" placeholder="What is this episode about?" value={f.description} onChange={(e) => set('description', e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.v} type="button" onClick={() => set('category', c.v)}
                  className={`h-8 px-3 rounded-full border text-[12.5px] font-medium transition-colors ${f.category === c.v ? 'text-white border-transparent' : 'border-[#E4E7EC] text-[#475467] hover:border-[#D0D5DD]'}`}
                  style={f.category === c.v ? { background: c.color } : undefined}>{c.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label><span className="field-label">Series <span className="text-[#98A2B3] font-normal">optional</span></span><input className="input-field" placeholder="e.g. The Estate Hour" value={f.seriesName} onChange={(e) => set('seriesName', e.target.value)} /></label>
              <label><span className="field-label">Episode no.</span><input type="number" min="0" className="input-field" value={f.episodeNumber} onChange={(e) => set('episodeNumber', e.target.value)} /></label>
              <label><span className="field-label">Host name on air</span><input className="input-field" placeholder="AreaConnect FM" value={f.hostName} onChange={(e) => set('hostName', e.target.value)} /></label>
              <label><span className="field-label">Language</span>
                <select className="input-field" value={f.language} onChange={(e) => set('language', e.target.value)}>{['English', 'Pidgin', 'Yoruba', 'Igbo', 'Hausa'].map((l) => <option key={l}>{l}</option>)}</select>
              </label>
            </div>
            <label className="block"><span className="field-label">Tags</span><input className="input-field" placeholder="security, dues, festive season" value={f.tags} onChange={(e) => set('tags', e.target.value)} /></label>
            <MediaUpload kind="image" label="Cover art" hint="Square image, at least 800×800" value={f.coverImage} onDone={(url) => set('coverImage', url)} />
          </div>
        </Section>

        <Section step="2" icon={CalendarClock} title="Schedule">
          <div className="grid grid-cols-2 gap-2.5">
            <label><span className="field-label">Date & time</span><input type="datetime-local" className="input-field" value={f.scheduledAt} onChange={(e) => set('scheduledAt', e.target.value)} /></label>
            <label><span className="field-label">Length</span>
              <select className="input-field" value={f.durationMins} onChange={(e) => set('durationMins', e.target.value)}>{[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}</select>
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2.5 rounded-xl border border-[#E4E7EC] px-3 py-2.5 cursor-pointer">
            <input type="checkbox" className="accent-[#059669]" checked={f.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)} />
            <Repeat size={15} className="text-[#667085]" /><span className="text-[13px] text-[#344054] flex-1">Recurring show</span>
            {f.isRecurring && <input className="input-field !h-8 !w-44 text-[12.5px]" placeholder="e.g. Every Friday 7pm" value={f.recurrence} onChange={(e) => set('recurrence', e.target.value)} onClick={(e) => e.stopPropagation()} />}
          </label>
        </Section>

        <Section step="3" icon={Users} title="Audience" hint="Who gets notified and can find it in the app">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[['all', 'All estates', 'Platform-wide broadcast', Globe2], ['estates', 'Selected estates', 'Only residents of chosen estates', Building2]].map(([v, l, h, I]) => (
              <button key={v} type="button" onClick={() => set('scope', v)}
                className={`text-left rounded-xl border px-3 py-2.5 ${f.scope === v ? 'border-[#059669] bg-[#F6FEF9] ring-2 ring-[#059669]/10' : 'border-[#E4E7EC]'}`}>
                <I size={16} className={f.scope === v ? 'text-[#059669]' : 'text-[#98A2B3]'} />
                <span className="block mt-1 text-[13px] font-semibold text-[#101828]">{l}</span><span className="block text-[11.5px] text-[#667085]">{h}</span>
              </button>
            ))}
          </div>
          {f.scope === 'estates' && <EstateMultiPicker value={f.estateIds} onChange={(v) => set('estateIds', v)} />}
        </Section>

        <Section step="4" icon={ListOrdered} title="Run of show" hint={total ? `${total} of ${f.durationMins} minutes planned` : 'Plan the segments so the host and guests know the flow'}>
          {!f.segments.length && (
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={() => set('segments', SEGMENT_TEMPLATES[0].map((s) => ({ ...s, notes: '', speaker: '' })))} className="btn-outline !py-1.5 text-[12.5px]">Use talk-show template</button>
              <button type="button" onClick={() => set('segments', SEGMENT_TEMPLATES[1].map((s) => ({ ...s, notes: '', speaker: '' })))} className="btn-outline !py-1.5 text-[12.5px]">Use interview template</button>
            </div>
          )}
          <div className="space-y-2">
            {f.segments.map((s, i) => (
              <div key={i} className="rounded-xl border border-[#E4E7EC] p-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#F2F4F7] text-[11.5px] font-semibold text-[#475467] flex items-center justify-center">{i + 1}</span>
                  <input className="input-field !h-9 flex-1" placeholder="Segment" value={s.title} onChange={(e) => setSeg(i, 'title', e.target.value)} />
                  <input type="number" min="1" className="input-field !h-9 !w-16 text-center" value={s.minutes} onChange={(e) => setSeg(i, 'minutes', e.target.value)} />
                  <span className="text-[11.5px] text-[#98A2B3]">min</span>
                  <button type="button" onClick={() => move(i, -1)} className="p-1 text-[#98A2B3] hover:text-[#101828]"><ArrowUp size={14} /></button>
                  <button type="button" onClick={() => move(i, 1)} className="p-1 text-[#98A2B3] hover:text-[#101828]"><ArrowDown size={14} /></button>
                  <button type="button" onClick={() => set('segments', f.segments.filter((_, j) => j !== i))} className="p-1 text-[#98A2B3] hover:text-[#D92D20]"><Trash2 size={14} /></button>
                </div>
                <div className="mt-2 grid grid-cols-[140px_minmax(0,1fr)] gap-2 pl-8">
                  <input className="input-field !h-8 text-[12px]" placeholder="Speaker" value={s.speaker} onChange={(e) => setSeg(i, 'speaker', e.target.value)} />
                  <input className="input-field !h-8 text-[12px]" placeholder="Talking points / notes" value={s.notes} onChange={(e) => setSeg(i, 'notes', e.target.value)} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set('segments', [...f.segments, { title: '', minutes: 5, notes: '', speaker: '' }])} className="mt-2 btn-ghost text-[12.5px]"><Plus size={13} /> Add segment</button>
          {total > 0 && <div className="mt-2 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, (total / (Number(f.durationMins) || 45)) * 100)}%`, background: total > f.durationMins ? '#F04438' : '#059669' }} /></div>}
        </Section>

        <Section icon={StickyNote} title="Producer notes" hint="Private — only admins see this">
          <textarea className="input-field min-h-[70px]" placeholder="Sponsors to mention, questions to ask, things to avoid…" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </Section>
      </form>
    </Drawer>
  );
}
