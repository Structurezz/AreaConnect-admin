import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  ArrowLeft, Save, Rocket, Wand2, Sparkles, Loader2, Target, Users, Radio, PenLine, Mail, BellRing, CalendarClock, Check,
  Building2, MapPin, CreditCard, Activity, Ban, CircleCheck, CircleAlert, Smartphone, UserRound, Briefcase, Layers,
} from 'lucide-react';
import { campaignAPI } from '../api';
import { Drawer, Section as DrawerSection } from '../components/billing/BillingDrawers';
import { MediaUpload, EstateMultiPicker } from '../components/podcast/shared';
import Preview from '../components/campaigns/Preview';
import { GOALS, GOAL, CHANNELS, CHANNEL, DESTINATIONS, THEMES, PLAYBOOKS, PhaseBadge, nf } from '../components/campaigns/shared';

const DEFAULT_THEME = THEMES[0];
const empty = () => ({
  name: '',
  status: 'draft',
  goal: 'onboarding',
  priority: 2,
  frequency: 'until_dismissed',
  notes: '',
  placements: ['modal'],
  audience: {
    app: 'resident', segment: 'all', newUserWithinDays: 7, existingUserBeyondDays: 7, roles: [], estateIds: [],
    excludeEstateIds: [], states: [], subscriptionStatuses: [], activeWithinDays: 0,
  },
  content: { badge: '', headline: '', subheadline: '', body: '', imageUrl: '', ctaText: 'Open', ctaUrl: '/dashboard', theme: { ...DEFAULT_THEME } },
  email: { subject: '', preheader: '', htmlBody: '', sendOnUserSignup: false },
  push: { title: '', body: '', url: '' },
  schedule: { startAt: '', endAt: '' },
});

const SEGMENTS = [
  { v: 'all', label: 'Everyone', hint: 'All members of the chosen app' },
  { v: 'new_users', label: 'New members', hint: 'Joined in the last N days' },
  { v: 'existing_users', label: 'Established', hint: 'Members for more than N days' },
  { v: 'by_estate', label: 'Specific estates', hint: 'Only people in chosen estates' },
];
const APPS = [
  { v: 'resident', label: 'Residents', Icon: UserRound },
  { v: 'estate_manager', label: 'Estate managers', Icon: Briefcase },
  { v: 'both', label: 'Both', Icon: Layers },
];
const SUBS = [['trial', 'On trial'], ['active', 'Paying'], ['expired', 'Expired'], ['cancelled', 'Cancelled'], ['suspended', 'Suspended'], ['none', 'No plan']];
const FREQS = [
  { v: 'until_dismissed', label: 'Until dismissed', hint: 'Keeps showing until they close it' },
  { v: 'once', label: 'Show once', hint: 'One view per person' },
  { v: 'until_clicked', label: 'Until clicked', hint: 'Stops once they tap the button' },
];

const toLocal = (d) => (d ? format(new Date(d), "yyyy-MM-dd'T'HH:mm") : '');
const merge = (base, over = {}) => {
  const out = { ...base };
  Object.entries(over).forEach(([k, v]) => { out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? merge(base[k], v) : v; });
  return out;
};

function Card({ n, icon: Icon, title, hint, children, right }) {
  return (
    <section className="card p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-8 h-8 rounded-lg bg-[#0B1220] text-white flex items-center justify-center text-[12.5px] font-semibold flex-shrink-0">{n}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14.5px] font-semibold text-[#101828] flex items-center gap-1.5"><Icon size={14} className="text-[#98A2B3]" />{title}</h3>
          {hint && <p className="text-[12px] text-[#667085]">{hint}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

const Label = ({ children, count, max }) => (
  <span className="flex items-center justify-between text-[12.5px] font-medium text-[#344054] mb-1.5">
    <span>{children}</span>
    {max && <span className={`text-[11px] tabular-nums ${count > max ? 'text-[#D92D20]' : 'text-[#98A2B3]'}`}>{count}/{max}</span>}
  </span>
);

const Chip = ({ on, onClick, children, color = '#059669' }) => (
  <button type="button" onClick={onClick} className={`h-8 px-3 rounded-full border text-[12.5px] font-medium inline-flex items-center gap-1.5 ${on ? 'text-white border-transparent' : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F9FAFB]'}`} style={on ? { background: color } : undefined}>
    {on && <Check size={12} />}{children}
  </button>
);

export default function CampaignBuilder() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => {
    const pb = PLAYBOOKS.find((p) => p.key === params.get('playbook'));
    if (pb) { const { key, why, ...rest } = pb; return merge(empty(), rest); } // eslint-disable-line no-unused-vars
    if (params.get('type') === 'email') return merge(empty(), { placements: ['email'] });
    return empty();
  });
  const [phase, setPhase] = useState('draft');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState(form.placements[0] || 'modal');
  const [reach, setReach] = useState(null);
  const [reachLoading, setReachLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [statesText, setStatesText] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    campaignAPI.get(id).then(({ data }) => {
      const c = data.data;
      const a = { ...(c.audience || {}) };
      if (a.app === 'residents') a.app = 'resident';
      if (a.app === 'estatemanager') a.app = 'estate_manager';
      if (a.segment === 'by_role') { a.app = (a.roles || []).length === 1 ? a.roles[0] : 'both'; a.segment = 'all'; }
      a.estateIds = (a.estateIds || []).map((e) => String(e._id || e));
      a.excludeEstateIds = (a.excludeEstateIds || []).map((e) => String(e._id || e));
      const next = merge(empty(), {
        ...c, audience: a,
        placements: (c.placements || []).filter((p) => p !== 'login_sidebar'),
        schedule: { startAt: toLocal(c.schedule?.startAt), endAt: toLocal(c.schedule?.endAt) },
      });
      setForm(next);
      setStatesText((a.states || []).join(', '));
      setPhase(c.phase || c.status);
      setView(next.placements[0] || 'modal');
    }).catch(() => toast.error('Could not load campaign')).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (path, value) => setForm((f) => {
    const next = structuredClone(f);
    const keys = path.split('.');
    let cur = next;
    keys.slice(0, -1).forEach((k) => { cur[k] = cur[k] ?? {}; cur = cur[k]; });
    cur[keys[keys.length - 1]] = value;
    return next;
  });
  const a = form.audience;
  const k = form.content;
  const app = a.app === 'estate_manager' ? 'estate_manager' : 'resident';

  // Lounge is a residents-only surface.
  useEffect(() => {
    if (a.app === 'estate_manager' && form.placements.includes('lounge_feed')) set('placements', form.placements.filter((p) => p !== 'lounge_feed'));
  }, [a.app]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!form.placements.includes(view) && form.placements[0]) setView(form.placements[0]); }, [form.placements.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live reach estimate (debounced)
  const audienceKey = JSON.stringify(a);
  const timer = useRef();
  useEffect(() => {
    clearTimeout(timer.current);
    setReachLoading(true);
    timer.current = setTimeout(() => {
      campaignAPI.estimate(a).then(({ data }) => setReach(data.data)).catch(() => setReach(null)).finally(() => setReachLoading(false));
    }, 450);
    return () => clearTimeout(timer.current);
  }, [audienceKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleChannel = (v) => set('placements', form.placements.includes(v) ? form.placements.filter((p) => p !== v) : [...form.placements, v]);

  const checks = useMemo(() => {
    const has = (p) => form.placements.includes(p);
    return [
      [!!form.name.trim(), 'Campaign name'],
      [!!k.headline.trim(), 'Headline'],
      [form.placements.length > 0, 'At least one channel'],
      [!k.ctaText || !!k.ctaUrl, 'Button has a destination'],
      ...(has('email') ? [[!!form.email.subject.trim() && !!form.email.htmlBody.trim(), 'Email subject and body']] : []),
      ...(has('push') ? [[!!(form.push.title || k.headline).trim(), 'Push title']] : []),
      [!form.schedule.endAt || !form.schedule.startAt || new Date(form.schedule.endAt) > new Date(form.schedule.startAt), 'End date after start'],
      [(reach?.total ?? 1) > 0, 'Audience is not empty'],
    ];
  }, [form, k, reach]);
  const ready = checks.every(([ok]) => ok);

  const submit = async (status) => {
    const firstBad = checks.find(([ok]) => !ok);
    if (status === 'active' && firstBad) return toast.error(`Missing: ${firstBad[1]}`);
    if (!form.name.trim()) return toast.error('Give the campaign a name');
    if (!k.headline.trim()) return toast.error('Add a headline');
    const payload = {
      ...form,
      status,
      audience: { ...a, segment: a.segment === 'by_role' ? 'all' : a.segment, roles: [], states: statesText.split(',').map((s) => s.trim()).filter(Boolean) },
      schedule: { startAt: form.schedule.startAt ? new Date(form.schedule.startAt) : null, endAt: form.schedule.endAt ? new Date(form.schedule.endAt) : null },
    };
    if (payload.audience.segment !== 'by_estate') payload.audience.estateIds = [];
    setSaving(true);
    try {
      const { data } = isEdit ? await campaignAPI.update(id, payload) : await campaignAPI.create(payload);
      const future = payload.schedule.startAt && payload.schedule.startAt > new Date();
      toast.success(status === 'active' ? (future ? 'Scheduled — it goes live automatically' : 'Campaign is live') : 'Draft saved');
      if (!isEdit) navigate(`/campaigns/${data.data._id}`, { replace: true });
      else setPhase(status === 'active' ? (future ? 'scheduled' : 'live') : status);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="max-w-[1400px] mx-auto space-y-3"><div className="skeleton h-14" /><div className="skeleton h-64" /><div className="skeleton h-64" /></div>;

  const g = GOAL[form.goal];
  const destinations = DESTINATIONS[app];
  const customUrl = k.ctaUrl && !destinations.some((d) => d.v === k.ctaUrl);

  return (
    <div className="max-w-[1400px] mx-auto pb-16 animate-fade-in">
      {/* ── Action bar ── */}
      <div className="sticky top-0 z-30 -mx-1 px-1 pb-3 pt-1 bg-[#F9FAFB]/90 backdrop-blur">
        <div className="card px-4 py-3 flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/campaigns?tab=campaigns')} className="w-9 h-9 rounded-lg border border-[#E4E7EC] flex items-center justify-center text-[#475467] hover:bg-[#F9FAFB]" aria-label="Back"><ArrowLeft size={16} /></button>
          <div className="flex-1 min-w-[200px]">
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Name this campaign (only admins see it)" className="w-full bg-transparent outline-none text-[16px] font-semibold text-[#101828] placeholder:text-[#98A2B3]" />
            <div className="flex items-center gap-2 mt-0.5">
              <PhaseBadge phase={isEdit ? phase : 'draft'} />
              <span className="text-[11.5px] text-[#98A2B3]">{reach ? `${nf(reach.total)} people in audience` : 'Estimating audience…'}</span>
            </div>
          </div>
          <button onClick={() => setAiOpen(true)} className="btn-outline"><Wand2 size={14} /> Write with AI</button>
          <button onClick={() => submit(isEdit && form.status !== 'active' ? form.status : 'draft')} disabled={saving} className="btn-outline"><Save size={14} /> Save{isEdit && form.status === 'active' ? ' as draft' : ''}</button>
          <button onClick={() => submit('active')} disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
            {form.schedule.startAt && new Date(form.schedule.startAt) > new Date() ? 'Schedule' : isEdit && phase === 'live' ? 'Update live' : 'Launch'}
          </button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-4 min-w-0">
          {/* 1. Goal */}
          <Card n="1" icon={Target} title="Goal" hint="What should this campaign move? Playbook copy and analytics group by goal.">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {GOALS.map((x) => {
                const on = form.goal === x.v;
                return (
                  <button key={x.v} type="button" onClick={() => set('goal', x.v)} className={`text-left rounded-xl border p-3 transition-colors ${on ? 'bg-white shadow-sm' : 'border-[#EAECF0] hover:border-[#D0D5DD]'}`} style={on ? { borderColor: x.color, boxShadow: `0 0 0 3px ${x.color}1A` } : undefined}>
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-[#101828]"><span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${x.color}14`, color: x.color }}><x.Icon size={14} /></span>{x.label}</span>
                    <span className="block text-[11.5px] text-[#667085] mt-1.5 leading-snug">{x.desc}</span>
                  </button>
                );
              })}
            </div>
            <label className="block mt-3">
              <Label>Internal notes</Label>
              <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className="input-field" placeholder="Why we’re running this, success target, owner…" />
            </label>
          </Card>

          {/* 2. Audience */}
          <Card n="2" icon={Users} title="Audience" hint="Who should see it. The reach estimate updates as you change filters.">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {APPS.map(({ v, label, Icon }) => (
                <button key={v} type="button" onClick={() => set('audience.app', v)} className={`flex items-center justify-center gap-2 h-11 rounded-xl border text-[13px] font-medium ${a.app === v ? 'border-[#059669] bg-[#F6FEF9] text-[#067647]' : 'border-[#E4E7EC] text-[#475467] hover:bg-[#F9FAFB]'}`}><Icon size={15} />{label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SEGMENTS.map((s) => (
                <button key={s.v} type="button" onClick={() => set('audience.segment', s.v)} className={`text-left rounded-xl border p-3 ${a.segment === s.v ? 'border-[#059669] bg-[#F6FEF9]' : 'border-[#E4E7EC] hover:bg-[#F9FAFB]'}`}>
                  <span className="block text-[13px] font-semibold text-[#101828]">{s.label}</span>
                  <span className="block text-[11.5px] text-[#667085] mt-0.5">{s.hint}</span>
                </button>
              ))}
            </div>
            {a.segment === 'new_users' && (
              <label className="flex items-center gap-2 mt-3 text-[13px] text-[#344054]">Joined in the last <input type="number" min="1" max="365" value={a.newUserWithinDays} onChange={(e) => set('audience.newUserWithinDays', Number(e.target.value) || 1)} className="input-field !w-20 !h-9" /> days</label>
            )}
            {a.segment === 'existing_users' && (
              <label className="flex items-center gap-2 mt-3 text-[13px] text-[#344054]">Members for more than <input type="number" min="1" max="365" value={a.existingUserBeyondDays} onChange={(e) => set('audience.existingUserBeyondDays', Number(e.target.value) || 1)} className="input-field !w-20 !h-9" /> days</label>
            )}
            {a.segment === 'by_estate' && <div className="mt-3"><EstateMultiPicker value={a.estateIds} onChange={(v) => set('audience.estateIds', v)} /></div>}

            <div className="mt-4 pt-4 border-t border-[#F2F4F7] space-y-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#98A2B3]">Refine</p>
              <div>
                <Label><span className="inline-flex items-center gap-1.5"><CreditCard size={13} /> Estate plan status</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {SUBS.map(([v, l]) => <Chip key={v} on={a.subscriptionStatuses.includes(v)} onClick={() => set('audience.subscriptionStatuses', a.subscriptionStatuses.includes(v) ? a.subscriptionStatuses.filter((x) => x !== v) : [...a.subscriptionStatuses, v])}>{l}</Chip>)}
                </div>
                <p className="text-[11px] text-[#98A2B3] mt-1">Leave empty for any plan. Use “On trial” with estate managers for upgrade campaigns.</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <Label><span className="inline-flex items-center gap-1.5"><MapPin size={13} /> States</span></Label>
                  <input value={statesText} onChange={(e) => setStatesText(e.target.value)} onBlur={() => set('audience.states', statesText.split(',').map((s) => s.trim()).filter(Boolean))} className="input-field" placeholder="e.g. Lagos, Abuja (FCT) — empty for all" />
                </label>
                <label className="block">
                  <Label><span className="inline-flex items-center gap-1.5"><Activity size={13} /> Recently active</span></Label>
                  <select value={a.activeWithinDays} onChange={(e) => set('audience.activeWithinDays', Number(e.target.value))} className="input-field">
                    <option value={0}>Anyone</option>
                    <option value={1}>Active today</option>
                    <option value={7}>Active in last 7 days</option>
                    <option value={30}>Active in last 30 days</option>
                    <option value={90}>Active in last 90 days</option>
                  </select>
                </label>
              </div>
              <details className="group">
                <summary className="cursor-pointer text-[12.5px] font-medium text-[#344054] inline-flex items-center gap-1.5"><Ban size={13} /> Exclude estates {a.excludeEstateIds.length > 0 && <span className="text-[#B42318]">({a.excludeEstateIds.length})</span>}</summary>
                <div className="mt-2"><EstateMultiPicker value={a.excludeEstateIds} onChange={(v) => set('audience.excludeEstateIds', v)} /></div>
              </details>
            </div>
          </Card>

          {/* 3. Channels */}
          <Card n="3" icon={Radio} title="Channels" hint="Pick every place this should appear. In-app channels show automatically while live; email and push send when you choose.">
            <div className="grid sm:grid-cols-2 gap-2">
              {CHANNELS.map((c) => {
                const on = form.placements.includes(c.v);
                const disabled = a.app === 'estate_manager' && !c.apps.includes('estate_manager');
                return (
                  <button key={c.v} type="button" disabled={disabled} onClick={() => toggleChannel(c.v)} className={`flex items-start gap-3 rounded-xl border p-3 text-left disabled:opacity-40 ${on ? 'border-[#059669] bg-[#F6FEF9]' : 'border-[#E4E7EC] hover:bg-[#F9FAFB]'}`}>
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${on ? 'bg-[#059669] text-white' : 'bg-[#F2F4F7] text-[#475467]'}`}><c.Icon size={16} /></span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-[#101828]">{c.label}</span>
                      <span className="block text-[11.5px] text-[#667085]">{disabled ? 'Residents only' : c.hint}</span>
                    </span>
                    <span className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>{on && <Check size={10} className="text-white" />}</span>
                  </button>
                );
              })}
            </div>
            {reach && (
              <p className="text-[11.5px] text-[#667085] mt-3">
                Deliverable: <b>{nf(reach.total)}</b> in-app · <b>{nf(reach.withEmail)}</b> by email · <b>{nf(reach.withPush)}</b> have push turned on
              </p>
            )}
          </Card>

          {/* 4. Message */}
          <Card n="4" icon={PenLine} title="Message" hint="Used by the pop-up, banner and Lounge card — and as the fallback for push.">
            <div className="grid sm:grid-cols-[160px_minmax(0,1fr)] gap-3">
              <label className="block"><Label count={k.badge.length} max={24}>Badge</Label><input value={k.badge} onChange={(e) => set('content.badge', e.target.value)} className="input-field" placeholder={g?.label.toUpperCase()} /></label>
              <label className="block"><Label count={k.headline.length} max={60}>Headline</Label><input value={k.headline} onChange={(e) => set('content.headline', e.target.value)} className="input-field !font-semibold" placeholder="Pay your estate dues in 30 seconds" /></label>
            </div>
            <label className="block mt-3"><Label count={k.subheadline.length} max={90}>Sub-headline</Label><input value={k.subheadline} onChange={(e) => set('content.subheadline', e.target.value)} className="input-field" placeholder="One line that makes the benefit concrete" /></label>
            <label className="block mt-3"><Label count={k.body.length} max={400}>Body</Label><textarea value={k.body} onChange={(e) => set('content.body', e.target.value)} rows={4} className="input-field" placeholder="2–3 short sentences. Blank lines become paragraphs." /></label>
            <div className="mt-3"><MediaUpload kind="image" label="Image (optional)" value={k.imageUrl} onDone={(url) => set('content.imageUrl', url)} hint="JPG/PNG · wide images work best" /></div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <label className="block"><Label count={k.ctaText.length} max={24}>Button text</Label><input value={k.ctaText} onChange={(e) => set('content.ctaText', e.target.value)} className="input-field" placeholder="Pay now" /></label>
              <label className="block">
                <Label>Button opens</Label>
                <select value={customUrl ? '__custom' : k.ctaUrl} onChange={(e) => set('content.ctaUrl', e.target.value === '__custom' ? 'https://' : e.target.value)} className="input-field">
                  {destinations.map((d) => <option key={d.v} value={d.v}>{d.label} ({d.v})</option>)}
                  <option value="__custom">Custom link…</option>
                </select>
              </label>
            </div>
            {customUrl && <input value={k.ctaUrl} onChange={(e) => set('content.ctaUrl', e.target.value)} className="input-field mt-2" placeholder="https://… or /path" />}
            {a.app === 'both' && <p className="text-[11px] text-[#98A2B3] mt-1">Sent to both apps — pick a path that exists in each (e.g. /dashboard, /payments, /lounge, /podcasts).</p>}

            <div className="mt-4">
              <Label>Colour theme</Label>
              <div className="flex flex-wrap gap-2">
                {THEMES.map((t) => {
                  const on = k.theme.primaryColor === t.primaryColor && k.theme.backgroundColor === t.backgroundColor;
                  return (
                    <button key={t.name} type="button" onClick={() => set('content.theme', { primaryColor: t.primaryColor, accentColor: t.accentColor, backgroundColor: t.backgroundColor, textColor: t.textColor })} className={`flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border text-[12.5px] ${on ? 'border-[#101828] font-semibold' : 'border-[#E4E7EC] text-[#475467]'}`}>
                      <span className="w-6 h-6 rounded-full border border-black/10" style={{ background: `linear-gradient(135deg, ${t.backgroundColor} 50%, ${t.primaryColor} 50%)` }} />{t.name}
                    </button>
                  );
                })}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-[12px] text-[#667085]">Custom colours</summary>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {[['primaryColor', 'Primary'], ['accentColor', 'Accent'], ['backgroundColor', 'Background'], ['textColor', 'Text']].map(([key, l]) => (
                    <label key={key} className="flex items-center gap-2 rounded-lg border border-[#E4E7EC] px-2 h-10">
                      <input type="color" value={k.theme[key]} onChange={(e) => set(`content.theme.${key}`, e.target.value)} className="w-6 h-6 rounded border-0 p-0 bg-transparent" />
                      <span className="text-[12px] text-[#475467]">{l}</span>
                    </label>
                  ))}
                </div>
              </details>
            </div>
          </Card>

          {/* 5. Email */}
          {form.placements.includes('email') && (
            <Card n="5" icon={Mail} title="Email" hint="Wrapped in the AreaConnect email template. Use {{name}} for the first name."
              right={<button type="button" onClick={() => setAiOpen(true)} className="btn-outline !h-8 text-[12.5px]"><Sparkles size={13} /> Generate</button>}>
              <label className="block"><Label count={form.email.subject.length} max={60}>Subject</Label><input value={form.email.subject} onChange={(e) => set('email.subject', e.target.value)} className="input-field" /></label>
              <label className="block mt-3"><Label count={form.email.preheader.length} max={90}>Preview text</Label><input value={form.email.preheader} onChange={(e) => set('email.preheader', e.target.value)} className="input-field" placeholder="Shown next to the subject in the inbox" /></label>
              <label className="block mt-3"><Label>Body (HTML)</Label><textarea value={form.email.htmlBody} onChange={(e) => set('email.htmlBody', e.target.value)} rows={8} className="input-field font-mono !text-[12px]" placeholder="<p>Hi {{name}},</p>…" /></label>
              <label className="mt-3 flex items-start gap-2.5 rounded-xl border border-[#E4E7EC] p-3 cursor-pointer">
                <input type="checkbox" className="accent-[#059669] mt-0.5" checked={form.email.sendOnUserSignup} onChange={(e) => set('email.sendOnUserSignup', e.target.checked)} />
                <span><span className="block text-[13px] font-medium text-[#101828]">Auto-send when someone signs up</span><span className="block text-[11.5px] text-[#667085]">While live, every new member who matches the audience gets this email.</span></span>
              </label>
              {isEdit && <p className="text-[11.5px] text-[#667085] mt-2">Send the blast or a test to yourself from the campaign panel after saving.</p>}
            </Card>
          )}

          {/* 6. Push */}
          {form.placements.includes('push') && (
            <Card n={form.placements.includes('email') ? '6' : '5'} icon={BellRing} title="Push & bell notification" hint="Appears on phones with notifications enabled and in the in-app bell.">
              <label className="block"><Label count={(form.push.title || '').length} max={65}>Title</Label><input value={form.push.title} onChange={(e) => set('push.title', e.target.value)} className="input-field" placeholder={k.headline || 'Defaults to the headline'} /></label>
              <label className="block mt-3"><Label count={(form.push.body || '').length} max={120}>Message</Label><input value={form.push.body} onChange={(e) => set('push.body', e.target.value)} className="input-field" placeholder={k.subheadline || 'Defaults to the sub-headline'} /></label>
              <p className="text-[11.5px] text-[#667085] mt-2 flex items-center gap-1.5"><Smartphone size={12} /> Tapping opens <span className="font-mono">{form.push.url || k.ctaUrl || '/'}</span> · {reach ? `${nf(reach.withPush)} people have push on` : ''}</p>
            </Card>
          )}

          {/* Schedule */}
          <Card n={String(5 + ['email', 'push'].filter((p) => form.placements.includes(p)).length)} icon={CalendarClock} title="Schedule & delivery" hint="Leave the start empty to go live as soon as you launch.">
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block"><Label>Starts</Label><input type="datetime-local" value={form.schedule.startAt} onChange={(e) => set('schedule.startAt', e.target.value)} className="input-field" /></label>
              <label className="block"><Label>Ends</Label><input type="datetime-local" value={form.schedule.endAt} onChange={(e) => set('schedule.endAt', e.target.value)} className="input-field" /></label>
            </div>
            <div className="mt-4">
              <Label>How often (in-app)</Label>
              <div className="grid sm:grid-cols-3 gap-2">
                {FREQS.map((x) => (
                  <button key={x.v} type="button" onClick={() => set('frequency', x.v)} className={`text-left rounded-xl border p-3 ${form.frequency === x.v ? 'border-[#059669] bg-[#F6FEF9]' : 'border-[#E4E7EC] hover:bg-[#F9FAFB]'}`}>
                    <span className="block text-[13px] font-semibold text-[#101828]">{x.label}</span>
                    <span className="block text-[11.5px] text-[#667085]">{x.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Label>Priority</Label>
              <div className="flex gap-1.5">
                {[[1, 'High'], [2, 'Normal'], [3, 'Low']].map(([v, l]) => <Chip key={v} on={form.priority === v} onClick={() => set('priority', v)} color={v === 1 ? '#D92D20' : '#059669'}>{l}</Chip>)}
              </div>
              <p className="text-[11px] text-[#98A2B3] mt-1">When several campaigns compete for the same slot, higher priority shows first.</p>
            </div>
          </Card>
        </div>

        {/* ── Right rail ── */}
        <aside className="space-y-4 lg:sticky lg:top-[92px] self-start">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13.5px] font-semibold text-[#101828]">Live preview</h3>
              <span className="text-[11px] text-[#98A2B3]">{app === 'estate_manager' ? 'Manager app' : 'Residents app'}</span>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {(form.placements.length ? form.placements : ['modal']).map((p) => CHANNEL[p] && (
                <button key={p} onClick={() => setView(p)} className={`h-7 px-2.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 ${view === p ? 'bg-[#0B1220] text-white' : 'bg-[#F2F4F7] text-[#475467]'}`}>
                  {(() => { const I = CHANNEL[p].Icon; return <I size={12} />; })()}{CHANNEL[p].short}
                </button>
              ))}
            </div>
            <Preview channel={view} form={form} />
          </div>

          <div className="card p-4">
            <h3 className="text-[13.5px] font-semibold text-[#101828] flex items-center gap-2"><Users size={14} className="text-[#059669]" /> Estimated reach {reachLoading && <Loader2 size={12} className="animate-spin text-[#98A2B3]" />}</h3>
            {!reach ? <div className="skeleton h-20 mt-3" /> : (
              <>
                <p className="text-[28px] font-semibold text-[#101828] tabular-nums mt-1">{nf(reach.total)}<span className="text-[13px] font-normal text-[#667085]"> people</span></p>
                <div className="grid grid-cols-2 gap-2 mt-2 text-[12px]">
                  {[
                    ['Residents', reach.byRole.resident], ['Managers', reach.byRole.estate_manager],
                    ['Estates', reach.estates], ['Active 30d', reach.active30],
                    ['Email', reach.withEmail], ['Push on', reach.withPush],
                  ].map(([l, v]) => <div key={l} className="flex justify-between rounded-lg bg-[#F9FAFB] px-2.5 py-1.5"><span className="text-[#667085]">{l}</span><span className="font-semibold tabular-nums text-[#101828]">{nf(v)}</span></div>)}
                </div>
                {reach.topEstates.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wide text-[#98A2B3] mb-1">Biggest estates in audience</p>
                    {reach.topEstates.map((e) => (
                      <div key={e._id} className="flex items-center gap-2 py-1 text-[12px]"><Building2 size={12} className="text-[#98A2B3]" /><span className="flex-1 truncate text-[#344054]">{e.name}</span><span className="tabular-nums text-[#667085]">{nf(e.users)}</span></div>
                    ))}
                  </div>
                )}
                {reach.total === 0 && <p className="mt-2 text-[12px] text-[#B42318]">Nobody matches — loosen the filters.</p>}
              </>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-[13.5px] font-semibold text-[#101828] mb-2">Launch checklist</h3>
            <ul className="space-y-1.5">
              {checks.map(([ok, l]) => (
                <li key={l} className="flex items-center gap-2 text-[12.5px]">{ok ? <CircleCheck size={14} className="text-[#12B76A]" /> : <CircleAlert size={14} className="text-[#F79009]" />}<span className={ok ? 'text-[#344054]' : 'text-[#B54708]'}>{l}</span></li>
              ))}
            </ul>
            <button onClick={() => submit('active')} disabled={saving || !ready} className="btn-primary w-full justify-center mt-3 disabled:opacity-50"><Rocket size={14} /> {ready ? 'Ready to launch' : 'Finish the checklist'}</button>
          </div>
        </aside>
      </div>

      {aiOpen && <AiDrawer form={form} setForm={setForm} onClose={() => setAiOpen(false)} />}
    </div>
  );
}

function AiDrawer({ form, setForm, onClose }) {
  const g = GOAL[form.goal];
  const [brief, setBrief] = useState(() => `${g.desc}.${form.content.headline ? ` Angle: ${form.content.headline}.` : ''}`);
  const [tone, setTone] = useState('warm, confident, clear — Nigerian estate residents');
  const [overwrite, setOverwrite] = useState(!form.content.headline);
  const [busy, setBusy] = useState(false);
  const app = form.audience.app === 'estate_manager' ? 'estate_manager' : 'resident';

  const run = async () => {
    if (!brief.trim()) return toast.error('Describe what the campaign should say');
    setBusy(true);
    try {
      const { data } = await campaignAPI.generateEmail({
        goal: `${g.label}: ${brief}`,
        audience: app === 'estate_manager' ? 'estate managers running estates on AreaConnect' : 'residents of estates on AreaConnect',
        tone, app,
        theme: form.content.theme,
        ctaText: form.content.ctaText,
        ctaUrl: form.content.ctaUrl,
        includeAd: true,
      });
      const { email, ad } = data.data || {};
      setForm((f) => {
        const next = structuredClone(f);
        if (email) {
          next.email = { ...f.email, subject: email.subject || f.email.subject, preheader: email.preheader || f.email.preheader, htmlBody: email.htmlBody || f.email.htmlBody };
          if (!next.placements.includes('email')) next.placements.push('email');
        }
        if (ad && overwrite) {
          next.content = { ...f.content, badge: ad.badge || f.content.badge, headline: ad.headline || f.content.headline, subheadline: ad.subheadline || f.content.subheadline, body: ad.body || f.content.body, ctaText: ad.ctaText || f.content.ctaText };
          next.push = { ...f.push, title: f.push.title || ad.headline || '', body: f.push.body || ad.subheadline || '' };
        }
        return next;
      });
      toast.success('Copy generated — review it before launching');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setBusy(false); }
  };

  return (
    <Drawer title="Write with AI" subtitle="Grounded in what AreaConnect actually offers — no invented features or discounts." icon={Wand2} onClose={() => !busy && onClose()} width={520}
      footer={<>
        <span className="mr-auto" />
        <button onClick={onClose} disabled={busy} className="btn-outline">Cancel</button>
        <button onClick={run} disabled={busy} className="btn-primary">{busy ? <><Loader2 size={14} className="animate-spin" /> Writing…</> : <><Sparkles size={14} /> Generate</>}</button>
      </>}>
      <DrawerSection step="1" icon={Target} title="Brief">
        <div className="mb-2"><span className="inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11.5px] font-medium" style={{ background: `${g.color}14`, color: g.color }}><g.Icon size={12} />{g.label}</span></div>
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} className="input-field" autoFocus placeholder="e.g. Remind residents of Q4 service charge, mention card/transfer/wallet and instant receipts." />
      </DrawerSection>
      <DrawerSection step="2" icon={PenLine} title="Tone">
        <input value={tone} onChange={(e) => setTone(e.target.value)} className="input-field" />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {['warm and reassuring', 'urgent but calm', 'celebratory', 'professional, for estate managers'].map((t) => <button key={t} type="button" onClick={() => setTone(t)} className="h-7 px-2.5 rounded-full border border-[#E4E7EC] text-[12px] text-[#475467] hover:bg-[#F9FAFB]">{t}</button>)}
        </div>
      </DrawerSection>
      <DrawerSection step="3" icon={Layers} title="What to fill">
        <p className="text-[12.5px] text-[#475467]">Always writes the email (subject, preview text, body).</p>
        <label className="mt-2 flex items-center gap-2 text-[13px] text-[#344054]"><input type="checkbox" className="accent-[#059669]" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Also replace the in-app message and push copy</label>
      </DrawerSection>
    </Drawer>
  );
}
