import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Save, ArrowLeft, Eye, Mail, Megaphone, Sparkles, X,
  Monitor, Smartphone, Wand2, Loader2,
} from 'lucide-react';
import { campaignAPI } from '../api';
import PageHeader from '../components/ui/PageHeader';

const PLACEMENTS = [
  { key: 'modal',            label: 'In-App Modal',    hint: 'One-time modal shown after login' },
  { key: 'email',            label: 'Email',            hint: 'Send an email blast or auto-send on signup' },
  { key: 'login_sidebar',    label: 'Login Sidebar',    hint: 'Ad panel on the login page' },
  { key: 'lounge_feed',      label: 'Lounge Feed',      hint: 'Promoted card inside the Lounge' },
  { key: 'dashboard_banner', label: 'Dashboard Banner', hint: 'Dismissible top banner on the dashboard' },
];

const APPS = [
  { key: 'resident',       label: 'Residents' },
  { key: 'estate_manager', label: 'Estate Managers' },
  { key: 'both',           label: 'Both' },
];

const SEGMENTS = [
  { key: 'all',             label: 'All users',          hint: 'Shows to everyone matching the app filter' },
  { key: 'new_users',       label: 'New users',           hint: 'Users whose account is younger than N days' },
  { key: 'existing_users',  label: 'Existing users',      hint: 'Users whose account is older than N days' },
  { key: 'by_role',         label: 'By role',             hint: 'Target specific roles (resident, estate_manager)' },
  { key: 'by_estate',       label: 'Specific estates',    hint: 'Only members of the chosen estates' },
];

const empty = {
  name: '',
  status: 'draft',
  placements: ['modal'],
  audience: {
    segment: 'new_users',
    newUserWithinDays: 7,
    existingUserBeyondDays: 7,
    roles: [],
    estateIds: [],
    app: 'resident',
  },
  content: {
    badge: '',
    headline: '',
    subheadline: '',
    body: '',
    imageUrl: '',
    ctaText: 'Get Started',
    ctaUrl: '',
    theme: {
      primaryColor: '#EC4899',
      accentColor: '#F472B6',
      textColor: '#FFFFFF',
      backgroundColor: '#0F172A',
    },
  },
  email: {
    subject: '',
    preheader: '',
    htmlBody: '',
    sendOnUserSignup: false,
  },
  schedule: { startAt: '', endAt: '' },
};

const setDeep = (obj, path, value) => {
  const next = JSON.parse(JSON.stringify(obj));
  const keys = path.split('.');
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] == null) cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
};

export default function CampaignBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const initialType = searchParams.get('type');
  const [form, setForm] = useState(() => {
    if (!isEdit && initialType === 'email') {
      return { ...empty, placements: ['email'] };
    }
    return empty;
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewTab, setPreviewTab] = useState('modal');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('warm, confident, briefly witty');
  const [aiOverwriteAd, setAiOverwriteAd] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await campaignAPI.get(id);
        const c = res.data?.data;
        if (!c) throw new Error();
        const audience = { ...empty.audience, ...(c.audience || {}) };
        // Normalize legacy app keys to the role-aligned values used by the UI.
        if (audience.app === 'residents') audience.app = 'resident';
        else if (audience.app === 'estatemanager') audience.app = 'estate_manager';
        setForm({
          ...empty,
          ...c,
          audience,
          content: { ...empty.content, ...(c.content || {}), theme: { ...empty.content.theme, ...(c.content?.theme || {}) } },
          email: { ...empty.email, ...(c.email || {}) },
          schedule: {
            startAt: c.schedule?.startAt ? new Date(c.schedule.startAt).toISOString().slice(0, 16) : '',
            endAt:   c.schedule?.endAt   ? new Date(c.schedule.endAt).toISOString().slice(0, 16)   : '',
          },
        });
      } catch {
        toast.error('Failed to load campaign');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (form.placements[0]) setPreviewTab(form.placements[0]);
  }, [form.placements.join(',')]);

  const set = (path, value) => setForm(f => setDeep(f, path, value));

  const togglePlacement = (p) => {
    setForm(f => {
      const has = f.placements.includes(p);
      return { ...f, placements: has ? f.placements.filter(x => x !== p) : [...f.placements, p] };
    });
  };

  const runAI = async () => {
    if (!aiPrompt.trim()) return toast.error('Describe what the campaign should say');
    setAiLoading(true);
    try {
      const res = await campaignAPI.generateEmail({
        goal: aiPrompt,
        audience: form.audience.segment === 'new_users' ? 'new residents on AreaConnect' : 'residents on AreaConnect',
        tone: aiTone,
        theme: form.content.theme,
        brand: { name: 'AreaConnect', logoUrl: '' },
        ctaText: form.content.ctaText,
        ctaUrl: form.content.ctaUrl,
        includeAd: true,
      });

      const { email, ad } = res.data?.data || {};
      if (!email) throw new Error('No email in response');

      setForm(f => {
        const next = { ...f };
        next.email = {
          ...f.email,
          subject: email.subject || f.email.subject,
          preheader: email.preheader || f.email.preheader,
          htmlBody: email.htmlBody || f.email.htmlBody,
        };
        if (!f.placements.includes('email')) next.placements = [...f.placements, 'email'];

        if (ad && (aiOverwriteAd || !f.content.headline)) {
          next.content = {
            ...f.content,
            badge:       ad.badge       || f.content.badge,
            headline:    ad.headline    || f.content.headline,
            subheadline: ad.subheadline || f.content.subheadline,
            body:        ad.body        || f.content.body,
            ctaText:     ad.ctaText     || f.content.ctaText,
          };
        }
        return next;
      });

      toast.success('Content generated');
      setAiOpen(false);
      setPreviewTab('email');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async (nextStatus) => {
    if (!form.name.trim()) return toast.error('Name is required');
    if (!form.content.headline.trim()) return toast.error('Headline is required');
    if (form.placements.length === 0) return toast.error('Pick at least one placement');
    if (form.placements.includes('email')) {
      if (!form.email.subject.trim()) return toast.error('Email subject is required');
      if (!form.email.htmlBody.trim()) return toast.error('Email body is required');
    }

    const payload = {
      ...form,
      status: nextStatus || form.status,
      schedule: {
        startAt: form.schedule.startAt ? new Date(form.schedule.startAt) : null,
        endAt:   form.schedule.endAt   ? new Date(form.schedule.endAt)   : null,
      },
    };

    setSaving(true);
    try {
      if (isEdit) {
        await campaignAPI.update(id, payload);
        toast.success('Campaign updated');
      } else {
        await campaignAPI.create(payload);
        toast.success('Campaign created');
        navigate(initialType === 'email' ? '/email-campaigns' : '/campaigns');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-3">
        <div className="skeleton h-7 w-56" />
        <div className="skeleton h-40" />
        <div className="skeleton h-40" />
      </div>
    );
  }

  const backTo = initialType === 'email' ? '/email-campaigns' : '/campaigns';

  return (
    <div className="max-w-[1400px] mx-auto">
        <button
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#475467] hover:text-[#101828] mb-3"
        >
          <ArrowLeft size={14} /> {initialType === 'email' ? 'Email campaigns' : 'Campaigns'}
        </button>

        <PageHeader
          heading title={isEdit ? (form.name || 'Edit campaign') : 'New campaign'}
          description="Configure placements, audience and content. The preview updates as you type."
          actions={
            <>
              <button onClick={() => setAiOpen(true)} className="btn-outline">
                <Wand2 size={14} /> Generate with AI
              </button>
              <button onClick={() => submit('draft')} disabled={saving} className="btn-outline">
                {saving ? 'Saving…' : 'Save draft'}
              </button>
              <button onClick={() => submit('active')} disabled={saving} className="btn-primary">
                <Sparkles size={14} /> {isEdit ? 'Save & activate' : 'Create & launch'}
              </button>
            </>
          }
        />

        {aiOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, backdropFilter: 'blur(2px)' }} onClick={() => !aiLoading && setAiOpen(false)}>
            <div onClick={e => e.stopPropagation()} className="border border-[#E4E7EC] space-y-3" style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 20px 48px rgba(16,24,40,0.18)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#ECFDF3] border border-[#ABEFC6] text-[#059669]">
                  <Wand2 size={15} />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-[#101828] leading-tight">Generate with Gemini</h3>
                  <p className="text-[12px] text-[#98A2B3]">Uses your theme colors and AreaConnect logo automatically.</p>
                </div>
              </div>

              <Field label="What is this campaign about?">
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="Welcome new residents and show them how to book a visitor, pay dues, and join the Lounge."
                  className="input-field"
                  autoFocus
                />
              </Field>
              <Field label="Tone">
                <input value={aiTone} onChange={e => setAiTone(e.target.value)} className="input-field" />
              </Field>

              <label className="inline-flex items-center gap-2 text-[13px] mt-1 text-[#344054]">
                <input type="checkbox" className="accent-[#059669]" checked={aiOverwriteAd} onChange={e => setAiOverwriteAd(e.target.checked)} />
                Also overwrite the ad copy (headline, badge, body, CTA)
              </label>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  onClick={() => setAiOpen(false)}
                  disabled={aiLoading}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={runAI}
                  disabled={aiLoading}
                  className="btn-primary"
                >
                  {aiLoading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate</>}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_460px]">
          {/* ─── Form ─── */}
          <div className="space-y-4 min-w-0">
            {/* Basics */}
            <Section title="Basics" icon={Megaphone}>
              <Field label="Campaign name" required>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Welcome New Members"
                  className="input-field"
                />
              </Field>

              <Field label="Status">
                <select value={form.status} onChange={e => set('status', e.target.value)} className="input-field">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="ended">Ended</option>
                </select>
              </Field>
            </Section>

            {/* Placement */}
            <Section title="Where does it show?" icon={Eye}>
              <div className="grid gap-2 md:grid-cols-2">
                {PLACEMENTS.map(p => {
                  const active = form.placements.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => togglePlacement(p.key)}
                      className={`text-left p-3 rounded-lg border transition-colors ${active ? 'border-[#059669] bg-[#ECFDF3]/50 ring-1 ring-[#059669]/20' : 'border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <span className="text-[13px] font-semibold text-[#101828]">{p.label}</span>
                        {active && <span className="badge badge-green">On</span>}
                      </div>
                      <p className="text-[12px] text-[#98A2B3]">{p.hint}</p>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Audience */}
            <Section title="Who sees it?" icon={Sparkles}>
              <Field label="App">
                <div className="tabs w-full">
                  {APPS.map(a => (
                    <button
                      key={a.key}
                      onClick={() => set('audience.app', a.key)}
                      className={`tab flex-1 ${form.audience.app === a.key ? 'active' : ''}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Audience segment">
                <div className="grid gap-1.5">
                  {SEGMENTS.map(s => (
                    <label key={s.key} className={`flex items-start gap-2 p-2.5 rounded-md cursor-pointer border ${form.audience.segment === s.key ? 'border-[#059669] bg-[#ECFDF3]/50 ring-1 ring-[#059669]/20' : 'border-[#E4E7EC] bg-white hover:bg-[#F9FAFB]'}`}>
                      <input
                        type="radio"
                        checked={form.audience.segment === s.key}
                        onChange={() => set('audience.segment', s.key)}
                        className="mt-0.5 accent-[#059669]"
                      />
                      <div>
                        <div className="text-[13px] font-medium text-[#101828]">{s.label}</div>
                        <div className="text-[12px] text-[#98A2B3]">{s.hint}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              {form.audience.segment === 'new_users' && (
                <Field label="New = account age up to">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} max={365}
                      value={form.audience.newUserWithinDays}
                      onChange={e => set('audience.newUserWithinDays', parseInt(e.target.value) || 7)}
                      className="input-field !w-24"
                    />
                    <span className="text-[13px] text-[#475467]">days</span>
                  </div>
                </Field>
              )}

              {form.audience.segment === 'existing_users' && (
                <Field label="Existing = account age at least">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={1} max={365}
                      value={form.audience.existingUserBeyondDays}
                      onChange={e => set('audience.existingUserBeyondDays', parseInt(e.target.value) || 7)}
                      className="input-field !w-24"
                    />
                    <span className="text-[13px] text-[#475467]">days</span>
                  </div>
                </Field>
              )}

              {form.audience.segment === 'by_role' && (
                <Field label="Roles">
                  {['resident', 'estate_manager'].map(r => (
                    <label key={r} className="inline-flex items-center gap-2 mr-4 text-[13px] text-[#344054]">
                      <input
                        type="checkbox"
                        className="accent-[#059669]"
                        checked={form.audience.roles.includes(r)}
                        onChange={e => {
                          const roles = e.target.checked
                            ? [...form.audience.roles, r]
                            : form.audience.roles.filter(x => x !== r);
                          set('audience.roles', roles);
                        }}
                      />
                      {r}
                    </label>
                  ))}
                </Field>
              )}
            </Section>

            {/* Content */}
            <Section title="Ad content" icon={Megaphone}>
              <Field label="Badge (optional)">
                <input value={form.content.badge} onChange={e => set('content.badge', e.target.value)} placeholder="NEW HERE?" className="input-field" />
              </Field>
              <Field label="Headline" required>
                <input value={form.content.headline} onChange={e => set('content.headline', e.target.value)} placeholder="Welcome to AreaConnect" className="input-field" />
              </Field>
              <Field label="Subheadline">
                <input value={form.content.subheadline} onChange={e => set('content.subheadline', e.target.value)} placeholder="Your estate, together." className="input-field" />
              </Field>
              <Field label="Body">
                <textarea value={form.content.body} onChange={e => set('content.body', e.target.value)} rows={4} className="input-field" />
              </Field>
              <Field label="Image URL (optional)">
                <input value={form.content.imageUrl} onChange={e => set('content.imageUrl', e.target.value)} placeholder="https://…" className="input-field" />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="CTA text"><input value={form.content.ctaText} onChange={e => set('content.ctaText', e.target.value)} className="input-field" /></Field>
                <Field label="CTA URL / route"><input value={form.content.ctaUrl} onChange={e => set('content.ctaUrl', e.target.value)} placeholder="/profile" className="input-field" /></Field>
              </div>

              {/* Theme */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {[
                  ['primaryColor', 'Primary'],
                  ['accentColor', 'Accent'],
                  ['backgroundColor', 'Background'],
                  ['textColor', 'Text'],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label className="field-label !mb-0">{label}</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="color"
                        value={form.content.theme[k]}
                        onChange={e => set(`content.theme.${k}`, e.target.value)}
                        className="w-8 h-8 flex-shrink-0 rounded-md cursor-pointer border border-[#D0D5DD] p-0.5 bg-white"
                      />
                      <input
                        value={form.content.theme[k]}
                        onChange={e => set(`content.theme.${k}`, e.target.value)}
                        className="input-field !text-[12px] !px-2 !py-1 flex-1 min-w-0 font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Email */}
            {form.placements.includes('email') && (
              <Section title="Email content" icon={Mail}>
                <Field label="Subject" required>
                  <input value={form.email.subject} onChange={e => set('email.subject', e.target.value)} className="input-field" />
                </Field>
                <Field label="Preheader (preview text)">
                  <input value={form.email.preheader} onChange={e => set('email.preheader', e.target.value)} className="input-field" />
                </Field>
                <Field label="HTML body" required>
                  <textarea value={form.email.htmlBody} onChange={e => set('email.htmlBody', e.target.value)} rows={10} className="input-field font-mono !text-[12px]" />
                </Field>
                <label className="inline-flex items-center gap-2 text-[13px] text-[#344054]">
                  <input type="checkbox" className="accent-[#059669]" checked={form.email.sendOnUserSignup} onChange={e => set('email.sendOnUserSignup', e.target.checked)} />
                  Auto-send to matching users the moment they sign up
                </label>
              </Section>
            )}

            {/* Schedule */}
            <Section title="Schedule (optional)" icon={Eye}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Start"><input type="datetime-local" value={form.schedule.startAt} onChange={e => set('schedule.startAt', e.target.value)} className="input-field" /></Field>
                <Field label="End"><input type="datetime-local" value={form.schedule.endAt} onChange={e => set('schedule.endAt', e.target.value)} className="input-field" /></Field>
              </div>
            </Section>
          </div>

          {/* ─── Live preview ─── */}
          <div className="lg:sticky lg:top-6 self-start min-w-0">
            <div className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[#E4E7EC]">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-[#101828]">
                  <Eye size={14} className="text-[#667085]" /> Live preview
                </div>
                {form.placements.length > 0 && (
                  <div className="tabs max-w-full overflow-x-auto">
                    {form.placements.map(p => (
                      <button
                        key={p}
                        onClick={() => setPreviewTab(p)}
                        className={`tab !text-[11.5px] !px-2 !py-1 ${previewTab === p ? 'active' : ''}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#F9FAFB]" style={{ minHeight: 480 }}>
                {previewTab === 'email' ? (
                  <EmailPreview form={form} />
                ) : (
                  <AdPreview form={form} placement={previewTab} mode={previewMode} />
                )}
              </div>

              {previewTab !== 'email' && (
                <div className="flex items-center justify-center p-2 border-t border-[#E4E7EC]">
                  <div className="tabs">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      title="Desktop"
                      className={`tab !px-2 ${previewMode === 'desktop' ? 'active' : ''}`}
                    >
                      <Monitor size={14} />
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      title="Mobile"
                      className={`tab !px-2 ${previewMode === 'mobile' ? 'active' : ''}`}
                    >
                      <Smartphone size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#E4E7EC]">
        <Icon size={15} className="text-[#667085]" />
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="field-label">
        {label} {required && <span className="text-[#D92D20]">*</span>}
      </label>
      {children}
    </div>
  );
}

function AdPreview({ form, placement, mode }) {
  const c = form.content;
  const theme = c.theme;

  const wrapperStyle = mode === 'mobile'
    ? { width: 280, margin: '0 auto' }
    : { width: '100%' };

  if (placement === 'login_sidebar') {
    return (
      <div style={wrapperStyle}>
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: `linear-gradient(160deg, ${theme.backgroundColor} 0%, ${theme.primaryColor} 200%)`, color: theme.textColor, padding: 24 }}
        >
          {c.badge && <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.14)' }}>{c.badge}</span>}
          <h2 style={{ fontSize: 22, fontWeight: 800, marginTop: 12, letterSpacing: '-0.02em' }}>{c.headline || 'Your headline'}</h2>
          {c.subheadline && <p style={{ fontSize: 13, opacity: 0.8, marginTop: 6 }}>{c.subheadline}</p>}
          {c.body && <p style={{ fontSize: 12, opacity: 0.7, marginTop: 14, whiteSpace: 'pre-wrap' }}>{c.body}</p>}
          {c.ctaText && (
            <button style={{ marginTop: 20, padding: '10px 18px', background: theme.accentColor, color: theme.textColor, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
              {c.ctaText}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (placement === 'lounge_feed') {
    return (
      <div style={wrapperStyle}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
          <div style={{ background: `linear-gradient(135deg, ${theme.backgroundColor}, ${theme.primaryColor})`, color: theme.textColor, padding: 20 }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.16)' }}>SPONSORED</span>
              {c.badge && <span className="text-[10px] font-bold tracking-wider">{c.badge}</span>}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>{c.headline}</h3>
            {c.subheadline && <p style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{c.subheadline}</p>}
          </div>
          <div style={{ padding: 16 }}>
            {c.body && <p style={{ fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', marginBottom: 12 }}>{c.body}</p>}
            {c.ctaText && (
              <button style={{ width: '100%', padding: '10px 16px', background: theme.primaryColor, color: theme.textColor, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                {c.ctaText}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (placement === 'dashboard_banner') {
    return (
      <div style={wrapperStyle}>
        <div
          className="rounded-xl flex items-center justify-between"
          style={{ background: `linear-gradient(90deg, ${theme.backgroundColor}, ${theme.primaryColor})`, color: theme.textColor, padding: '14px 18px' }}
        >
          <div>
            {c.badge && <div className="text-[10px] font-bold tracking-wider opacity-80">{c.badge}</div>}
            <div style={{ fontSize: 14, fontWeight: 700 }}>{c.headline}</div>
            {c.subheadline && <div style={{ fontSize: 12, opacity: 0.85 }}>{c.subheadline}</div>}
          </div>
          <button style={{ padding: '7px 14px', background: theme.accentColor, color: theme.textColor, borderRadius: 8, fontWeight: 700, fontSize: 12, border: 'none' }}>
            {c.ctaText}
          </button>
          <button style={{ marginLeft: 8, background: 'transparent', color: theme.textColor, opacity: 0.6, border: 'none' }}><X size={16} /></button>
        </div>
      </div>
    );
  }

  // Default: modal
  return (
    <div style={wrapperStyle}>
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ background: theme.backgroundColor, color: theme.textColor, minHeight: 380 }}
      >
        {/* Decorative glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `radial-gradient(circle, ${theme.primaryColor}88 0%, transparent 70%)` }} />
        <button style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(255,255,255,0.08)', color: theme.textColor, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer' }}>
          <X size={14} />
        </button>
        <div style={{ padding: 28, position: 'relative' }}>
          {c.badge && (
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: theme.primaryColor, background: `${theme.primaryColor}22`, padding: '4px 10px', borderRadius: 6, display: 'inline-block', marginBottom: 14 }}>
              {c.badge}
            </span>
          )}
          {c.imageUrl && (
            <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.05)' }}>
              <img src={c.imageUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 140, objectFit: 'cover' }} />
            </div>
          )}
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 8 }}>{c.headline || 'Your headline'}</h2>
          {c.subheadline && <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 16 }}>{c.subheadline}</p>}
          {c.body && <p style={{ fontSize: 13, opacity: 0.8, whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 20 }}>{c.body}</p>}
          {c.ctaText && (
            <button style={{ width: '100%', padding: '13px 20px', background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.accentColor})`, color: theme.textColor, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, letterSpacing: '-0.01em', cursor: 'pointer' }}>
              {c.ctaText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailPreview({ form }) {
  const { email, content } = form;
  return (
    <div style={{ background: '#F0F4F8', padding: 12, borderRadius: 12 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <div style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>FROM: AreaConnect &lt;noreply@areaconnect.pro&gt;</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{email.subject || '(subject)'}</div>
          {email.preheader && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{email.preheader}</div>}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 20, fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em' }}>
          Area<span style={{ color: '#EC4899' }}>Connect</span>
        </div>
        <p style={{ fontSize: 14, color: '#475569', marginBottom: 14 }}>Hi Sarah,</p>
        <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: email.htmlBody || '<p style="color:#94A3B8">(email body will render here)</p>' }} />
        {content.ctaUrl && content.ctaText && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <span style={{ display: 'inline-block', padding: '12px 26px', background: 'linear-gradient(135deg,#EC4899,#F472B6)', color: '#fff', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
              {content.ctaText}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
