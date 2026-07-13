import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Save, ArrowLeft, Eye, Mail, Megaphone, Sparkles, X,
  Monitor, Smartphone, Wand2, Loader2,
} from 'lucide-react';
import { campaignAPI } from '../api';

const PLACEMENTS = [
  { key: 'modal',            label: 'In-App Modal',    hint: 'One-time modal shown after login' },
  { key: 'email',            label: 'Email',            hint: 'Send an email blast or auto-send on signup' },
  { key: 'login_sidebar',    label: 'Login Sidebar',    hint: 'Ad panel on the login page' },
  { key: 'lounge_feed',      label: 'Lounge Feed',      hint: 'Promoted card inside the Lounge' },
  { key: 'dashboard_banner', label: 'Dashboard Banner', hint: 'Dismissible top banner on the dashboard' },
];

const APPS = [
  { key: 'residents',     label: 'Residents' },
  { key: 'estatemanager', label: 'Estate Managers' },
  { key: 'both',          label: 'Both' },
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
    app: 'residents',
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
        setForm({
          ...empty,
          ...c,
          audience: { ...empty.audience, ...(c.audience || {}) },
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
    return <div className="p-8 text-center text-sm" style={{ color: '#94A3B8' }}>Loading campaign…</div>;
  }

  return (
    <>
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <button
            onClick={() => navigate(initialType === 'email' ? '/email-campaigns' : '/campaigns')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: '#F1F5F9', color: '#475569' }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#0F172A', color: '#fff' }}
            >
              <Wand2 size={14} /> Generate with AI
            </button>
            <button
              onClick={() => submit('draft')}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: '#F1F5F9', color: '#0F172A' }}
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              onClick={() => submit('active')}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#EC4899 0%,#F472B6 100%)' }}
            >
              <Sparkles size={14} /> {isEdit ? 'Save & Activate' : 'Create & Launch'}
            </button>
          </div>
        </div>

        {aiOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16, backdropFilter: 'blur(6px)' }} onClick={() => !aiLoading && setAiOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)' }}>
                  <Wand2 size={16} color="#fff" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>Generate with Gemini</h3>
                  <p className="text-xs" style={{ color: '#64748B' }}>Uses your theme colors and AreaConnect logo automatically.</p>
                </div>
              </div>

              <Field label="What is this campaign about?">
                <textarea
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  rows={3}
                  placeholder="Welcome new residents and show them how to book a visitor, pay dues, and join the Lounge."
                  className="input"
                  autoFocus
                />
              </Field>
              <Field label="Tone">
                <input value={aiTone} onChange={e => setAiTone(e.target.value)} className="input" />
              </Field>

              <label className="inline-flex items-center gap-2 text-sm mt-2" style={{ color: '#0F172A' }}>
                <input type="checkbox" checked={aiOverwriteAd} onChange={e => setAiOverwriteAd(e.target.checked)} />
                Also overwrite the ad copy (headline, badge, body, CTA)
              </label>

              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={() => setAiOpen(false)}
                  disabled={aiLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: '#F1F5F9', color: '#475569' }}
                >
                  Cancel
                </button>
                <button
                  onClick={runAI}
                  disabled={aiLoading}
                  className="flex-[2] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)' }}
                >
                  {aiLoading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate</>}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
          {/* ─── Form ─── */}
          <div className="space-y-5">
            {/* Basics */}
            <Section title="Basics" icon={Megaphone}>
              <Field label="Campaign name" required>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Welcome New Members"
                  className="input"
                />
              </Field>

              <Field label="Status">
                <select value={form.status} onChange={e => set('status', e.target.value)} className="input">
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
                      className="text-left p-3 rounded-xl transition"
                      style={{
                        background: active ? '#FDF2F8' : '#F8FAFC',
                        border: `1.5px solid ${active ? '#EC4899' : '#E2E8F0'}`,
                      }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-bold" style={{ color: '#0F172A' }}>{p.label}</span>
                        {active && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: '#EC4899', color: '#fff' }}>ON</span>}
                      </div>
                      <p className="text-xs" style={{ color: '#64748B' }}>{p.hint}</p>
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Audience */}
            <Section title="Who sees it?" icon={Sparkles}>
              <Field label="App">
                <div className="flex gap-2">
                  {APPS.map(a => (
                    <button
                      key={a.key}
                      onClick={() => set('audience.app', a.key)}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                      style={{
                        background: form.audience.app === a.key ? '#0F172A' : '#F1F5F9',
                        color: form.audience.app === a.key ? '#fff' : '#475569',
                      }}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Audience segment">
                <div className="grid gap-1.5">
                  {SEGMENTS.map(s => (
                    <label key={s.key} className="flex items-start gap-2 p-2.5 rounded-lg cursor-pointer" style={{ background: form.audience.segment === s.key ? '#FDF2F8' : '#F8FAFC', border: `1px solid ${form.audience.segment === s.key ? '#EC4899' : '#E2E8F0'}` }}>
                      <input
                        type="radio"
                        checked={form.audience.segment === s.key}
                        onChange={() => set('audience.segment', s.key)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>{s.label}</div>
                        <div className="text-xs" style={{ color: '#64748B' }}>{s.hint}</div>
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
                      className="input w-24"
                    />
                    <span className="text-sm" style={{ color: '#64748B' }}>days</span>
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
                      className="input w-24"
                    />
                    <span className="text-sm" style={{ color: '#64748B' }}>days</span>
                  </div>
                </Field>
              )}

              {form.audience.segment === 'by_role' && (
                <Field label="Roles">
                  {['resident', 'estate_manager'].map(r => (
                    <label key={r} className="inline-flex items-center gap-2 mr-4 text-sm" style={{ color: '#0F172A' }}>
                      <input
                        type="checkbox"
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
                <input value={form.content.badge} onChange={e => set('content.badge', e.target.value)} placeholder="NEW HERE?" className="input" />
              </Field>
              <Field label="Headline" required>
                <input value={form.content.headline} onChange={e => set('content.headline', e.target.value)} placeholder="Welcome to AreaConnect" className="input" />
              </Field>
              <Field label="Subheadline">
                <input value={form.content.subheadline} onChange={e => set('content.subheadline', e.target.value)} placeholder="Your estate, together." className="input" />
              </Field>
              <Field label="Body">
                <textarea value={form.content.body} onChange={e => set('content.body', e.target.value)} rows={4} className="input" />
              </Field>
              <Field label="Image URL (optional)">
                <input value={form.content.imageUrl} onChange={e => set('content.imageUrl', e.target.value)} placeholder="https://…" className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA text"><input value={form.content.ctaText} onChange={e => set('content.ctaText', e.target.value)} className="input" /></Field>
                <Field label="CTA URL / route"><input value={form.content.ctaUrl} onChange={e => set('content.ctaUrl', e.target.value)} placeholder="/profile" className="input" /></Field>
              </div>

              {/* Theme */}
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  ['primaryColor', 'Primary'],
                  ['accentColor', 'Accent'],
                  ['backgroundColor', 'Background'],
                  ['textColor', 'Text'],
                ].map(([k, label]) => (
                  <div key={k}>
                    <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>{label}</label>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="color"
                        value={form.content.theme[k]}
                        onChange={e => set(`content.theme.${k}`, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <input
                        value={form.content.theme[k]}
                        onChange={e => set(`content.theme.${k}`, e.target.value)}
                        className="input text-xs px-2 py-1 flex-1"
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
                  <input value={form.email.subject} onChange={e => set('email.subject', e.target.value)} className="input" />
                </Field>
                <Field label="Preheader (preview text)">
                  <input value={form.email.preheader} onChange={e => set('email.preheader', e.target.value)} className="input" />
                </Field>
                <Field label="HTML body" required>
                  <textarea value={form.email.htmlBody} onChange={e => set('email.htmlBody', e.target.value)} rows={10} className="input font-mono text-xs" />
                </Field>
                <label className="inline-flex items-center gap-2 text-sm" style={{ color: '#0F172A' }}>
                  <input type="checkbox" checked={form.email.sendOnUserSignup} onChange={e => set('email.sendOnUserSignup', e.target.checked)} />
                  Auto-send to matching users the moment they sign up
                </label>
              </Section>
            )}

            {/* Schedule */}
            <Section title="Schedule (optional)" icon={Eye}>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start"><input type="datetime-local" value={form.schedule.startAt} onChange={e => set('schedule.startAt', e.target.value)} className="input" /></Field>
                <Field label="End"><input type="datetime-local" value={form.schedule.endAt} onChange={e => set('schedule.endAt', e.target.value)} className="input" /></Field>
              </div>
            </Section>
          </div>

          {/* ─── Live preview ─── */}
          <div className="lg:sticky lg:top-6 self-start">
            <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center justify-between p-3" style={{ borderBottom: '1px solid #F1F5F9' }}>
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: '#0F172A' }}>
                  <Eye size={14} /> LIVE PREVIEW
                </div>
                <div className="flex items-center gap-1">
                  {form.placements.map(p => (
                    <button
                      key={p}
                      onClick={() => setPreviewTab(p)}
                      className="text-[10px] px-2 py-1 rounded font-semibold"
                      style={{
                        background: previewTab === p ? '#0F172A' : '#F1F5F9',
                        color: previewTab === p ? '#fff' : '#475569',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4" style={{ background: '#F8FAFC', minHeight: 480 }}>
                {previewTab === 'email' ? (
                  <EmailPreview form={form} />
                ) : (
                  <AdPreview form={form} placement={previewTab} mode={previewMode} />
                )}
              </div>

              {previewTab !== 'email' && (
                <div className="flex items-center justify-center gap-2 p-2" style={{ borderTop: '1px solid #F1F5F9' }}>
                  <button
                    onClick={() => setPreviewMode('desktop')}
                    className="p-1.5 rounded"
                    style={{ background: previewMode === 'desktop' ? '#0F172A' : 'transparent', color: previewMode === 'desktop' ? '#fff' : '#94A3B8' }}
                  >
                    <Monitor size={14} />
                  </button>
                  <button
                    onClick={() => setPreviewMode('mobile')}
                    className="p-1.5 rounded"
                    style={{ background: previewMode === 'mobile' ? '#0F172A' : 'transparent', color: previewMode === 'mobile' ? '#fff' : '#94A3B8' }}
                  >
                    <Smartphone size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          padding: 9px 12px;
          border-radius: 10px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          font-size: 14px;
          color: #0F172A;
          outline: none;
        }
        .input:focus { border-color: #EC4899; background: #fff; }
      `}</style>
    </>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: '#fff', border: '1px solid #E2E8F0' }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} style={{ color: '#EC4899' }} />
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: '#0F172A' }}>{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#475569' }}>
        {label} {required && <span style={{ color: '#EC4899' }}>*</span>}
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
