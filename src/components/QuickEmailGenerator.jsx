import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wand2, Loader2, Sparkles, X, RefreshCw, Send, Users, Palette } from 'lucide-react';
import { campaignAPI } from '../api';

const SEGMENTS = [
  { key: 'all',            label: 'Everyone',       hint: 'All active users' },
  { key: 'new_users',      label: 'New members',    hint: 'Joined within N days' },
  { key: 'existing_users', label: 'Existing members', hint: 'Older than N days' },
  { key: 'by_role',        label: 'By role',        hint: 'Residents or managers' },
];

const APPS = [
  { key: 'residents',     label: 'Residents' },
  { key: 'estatemanager', label: 'Managers' },
  { key: 'both',          label: 'Both' },
];

const THEMES = [
  { name: 'Residents Indigo',    forApp: 'residents',     primaryColor: '#6366F1', accentColor: '#818CF8', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
  { name: 'Managers Green',      forApp: 'estatemanager', primaryColor: '#10B981', accentColor: '#34D399', backgroundColor: '#FFFFFF', textColor: '#0F172A' },
  { name: 'Tribely Pink',        primaryColor: '#EC4899', accentColor: '#F472B6', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
  { name: 'Sunset',              primaryColor: '#F59E0B', accentColor: '#FBBF24', backgroundColor: '#7C2D12', textColor: '#FFFFFF' },
  { name: 'Ocean',               primaryColor: '#0EA5E9', accentColor: '#38BDF8', backgroundColor: '#0C4A6E', textColor: '#FFFFFF' },
];

const APP_DEFAULT_THEME_IDX = { residents: 0, estatemanager: 1, both: 0 };

export default function QuickEmailGenerator({ onClose, onPublished }) {
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [tone, setTone] = useState('warm, confident, briefly witty');
  const [segment, setSegment] = useState('new_users');
  const [days, setDays] = useState(7);
  const [roles, setRoles] = useState([]);
  const [app, setApp] = useState('residents');
  const [themeIdx, setThemeIdx] = useState(APP_DEFAULT_THEME_IDX.residents);
  const [themeManual, setThemeManual] = useState(false);

  useEffect(() => {
    if (themeManual) return;
    const idx = APP_DEFAULT_THEME_IDX[app];
    if (idx != null) setThemeIdx(idx);
  }, [app, themeManual]);
  const [sendOnSignup, setSendOnSignup] = useState(true);

  const [generated, setGenerated] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const theme = THEMES[themeIdx];

  const generate = async () => {
    if (!prompt.trim()) return toast.error('Describe what this email should be about');
    setGenerating(true);
    try {
      const res = await campaignAPI.generateEmail({
        goal: prompt,
        audience: segmentToAudienceString(segment, app, days),
        tone,
        theme,
        brand: { name: 'AreaConnect', logoUrl: '' },
        ctaText: '',
        ctaUrl: '',
        includeAd: true,
      });
      const { email, ad } = res.data?.data || {};
      if (!email) throw new Error('No email in response');
      setGenerated({ email, ad });
      if (!name.trim() && ad?.headline) setName(ad.headline.slice(0, 60));
      toast.success('Email generated');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const publish = async () => {
    if (!generated) return;
    if (!name.trim()) return toast.error('Give this campaign a name');

    setPublishing(true);
    try {
      const payload = {
        name: name.trim(),
        status: 'active',
        placements: ['email'],
        audience: {
          segment,
          newUserWithinDays: days,
          existingUserBeyondDays: days,
          roles,
          estateIds: [],
          app,
        },
        content: {
          badge: generated.ad?.badge || '',
          headline: generated.ad?.headline || name.trim(),
          subheadline: generated.ad?.subheadline || '',
          body: generated.ad?.body || '',
          ctaText: generated.ad?.ctaText || 'Get Started',
          ctaUrl: '',
          theme,
        },
        email: {
          subject: generated.email.subject || '',
          preheader: generated.email.preheader || '',
          htmlBody: generated.email.htmlBody || '',
          sendOnUserSignup: sendOnSignup,
        },
      };

      await campaignAPI.create(payload);
      toast.success('Campaign published');
      onPublished?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !generating && !publishing && onClose?.()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 980, maxHeight: '92vh', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid #F1F5F9' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)' }}>
              <Wand2 size={16} color="#fff" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>Generate Campaign Email</h2>
              <p className="text-xs" style={{ color: '#64748B' }}>Describe it, pick who sees it, publish. Gemini writes the rest.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg" style={{ background: '#F1F5F9', color: '#475569' }}>
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" style={{ overflow: 'hidden', flex: 1 }}>
          {/* ─── Left: inputs ─── */}
          <div className="p-5 space-y-4 overflow-y-auto" style={{ borderRight: '1px solid #F1F5F9' }}>
            <Field label="What is this email about?" required>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
                placeholder="Welcome new residents and show them how to book a visitor, pay dues, and join the Lounge."
                className="input"
                autoFocus
              />
            </Field>

            <Field label="Campaign name (used for filing)">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Welcome New Members" className="input" />
            </Field>

            {/* Audience */}
            <div className="rounded-xl p-3.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="flex items-center gap-1.5 mb-2.5">
                <Users size={13} style={{ color: '#EC4899' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#0F172A' }}>Who sees it?</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {APPS.map(a => (
                  <button
                    key={a.key}
                    onClick={() => setApp(a.key)}
                    className="px-2 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: app === a.key ? '#0F172A' : '#fff', color: app === a.key ? '#fff' : '#475569', border: '1px solid #E2E8F0' }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-1.5">
                {SEGMENTS.map(s => (
                  <label key={s.key} className="flex items-start gap-2 p-2 rounded-lg cursor-pointer" style={{ background: segment === s.key ? '#FDF2F8' : '#fff', border: `1px solid ${segment === s.key ? '#EC4899' : '#E2E8F0'}` }}>
                    <input type="radio" checked={segment === s.key} onChange={() => setSegment(s.key)} className="mt-0.5" />
                    <div>
                      <div className="text-xs font-bold" style={{ color: '#0F172A' }}>{s.label}</div>
                      <div className="text-[11px]" style={{ color: '#64748B' }}>{s.hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              {(segment === 'new_users' || segment === 'existing_users') && (
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-xs" style={{ color: '#475569' }}>Days:</span>
                  <input type="number" min={1} max={365} value={days} onChange={e => setDays(parseInt(e.target.value) || 7)} className="input py-1 px-2 w-20 text-sm" />
                </div>
              )}

              {segment === 'by_role' && (
                <div className="flex gap-3 mt-2.5 text-xs">
                  {['resident', 'estate_manager'].map(r => (
                    <label key={r} className="inline-flex items-center gap-1.5" style={{ color: '#0F172A' }}>
                      <input type="checkbox" checked={roles.includes(r)} onChange={e => setRoles(e.target.checked ? [...roles, r] : roles.filter(x => x !== r))} />
                      {r}
                    </label>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 mt-3 text-xs" style={{ color: '#0F172A' }}>
                <input type="checkbox" checked={sendOnSignup} onChange={e => setSendOnSignup(e.target.checked)} />
                Auto-send to matching users the moment they sign up
              </label>
            </div>

            {/* Theme */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Palette size={13} style={{ color: '#EC4899' }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#0F172A' }}>Theme</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => { setThemeManual(true); setThemeIdx(i); }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                    style={{ background: themeIdx === i ? '#0F172A' : '#fff', color: themeIdx === i ? '#fff' : '#475569', border: '1px solid #E2E8F0' }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(135deg, ${t.primaryColor}, ${t.accentColor})`, display: 'inline-block' }} />
                    {t.name}
                  </button>
                ))}
              </div>
              {!themeManual && (
                <p className="text-[11px] mt-1.5" style={{ color: '#94A3B8' }}>Auto-selected to match audience app. Pick another to override.</p>
              )}
            </div>

            {/* Tone */}
            <Field label="Tone">
              <input value={tone} onChange={e => setTone(e.target.value)} className="input" />
            </Field>
          </div>

          {/* ─── Right: preview ─── */}
          <div className="overflow-y-auto" style={{ background: '#F8FAFC' }}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Live preview</span>
                {generated && (
                  <button onClick={generate} disabled={generating} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ background: '#fff', color: '#475569', border: '1px solid #E2E8F0' }}>
                    <RefreshCw size={11} /> Regenerate
                  </button>
                )}
              </div>

              {!generated ? (
                <EmptyPreview generating={generating} onGenerate={generate} disabled={generating || !prompt.trim()} />
              ) : (
                <EmailPreview theme={theme} email={generated.email} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4" style={{ borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
          <div className="text-xs" style={{ color: '#64748B' }}>
            {generated ? 'Review the preview then publish. You can edit it later from Email Campaigns.' : 'Fill in the prompt and audience, then generate.'}
          </div>
          <div className="flex items-center gap-2">
            {!generated ? (
              <button
                onClick={generate}
                disabled={generating || !prompt.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)', opacity: (generating || !prompt.trim()) ? 0.5 : 1 }}
              >
                {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate</>}
              </button>
            ) : (
              <button
                onClick={publish}
                disabled={publishing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)' }}
              >
                {publishing ? <><Loader2 size={14} className="animate-spin" /> Publishing…</> : <><Send size={14} /> Publish Campaign</>}
              </button>
            )}
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

function EmptyPreview({ generating, onGenerate, disabled }) {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: '#fff', border: '1px dashed #CBD5E1' }}>
      <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)' }}>
        <Sparkles size={22} color="#fff" />
      </div>
      <h3 className="text-sm font-bold mb-1" style={{ color: '#0F172A' }}>No preview yet</h3>
      <p className="text-xs mb-4" style={{ color: '#64748B' }}>Describe your campaign on the left, then hit generate to see the email here.</p>
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white"
        style={{ background: 'linear-gradient(135deg,#EC4899,#F472B6)', opacity: disabled ? 0.5 : 1 }}
      >
        {generating ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={12} /> Generate</>}
      </button>
    </div>
  );
}

function EmailPreview({ theme, email }) {
  return (
    <div style={{ background: '#F0F4F8', padding: 10, borderRadius: 14 }}>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {/* From / subject */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 3 }}>FROM: AreaConnect &lt;noreply@areaconnect.pro&gt;</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{email.subject || '(subject)'}</div>
          {email.preheader && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 3 }}>{email.preheader}</div>}
        </div>

        {/* Email body (mirrors sendCampaignEmail scaffold) */}
        <div style={{ background: '#F8FAFC', padding: 18 }}>
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>
            Area<span style={{ color: theme.primaryColor }}>Connect</span>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.06)', borderTop: `4px solid ${theme.primaryColor}`, padding: 22 }}>
            <div
              style={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: (email.htmlBody || '').replace(/\{\{name\}\}/g, 'Sarah') }}
            />
          </div>
          <p style={{ textAlign: 'center', fontSize: 10, color: '#94A3B8', marginTop: 12 }}>
            Powered by Area Connector Technologies · RC 9607864
          </p>
        </div>
      </div>
    </div>
  );
}

function segmentToAudienceString(segment, app, days) {
  const appLabel = app === 'residents' ? 'residents' : app === 'estatemanager' ? 'estate managers' : 'members';
  if (segment === 'new_users') return `${appLabel} whose accounts are less than ${days} days old on AreaConnect`;
  if (segment === 'existing_users') return `${appLabel} who have been on AreaConnect for at least ${days} days`;
  if (segment === 'by_role') return `AreaConnect ${appLabel} in specific roles`;
  return `all AreaConnect ${appLabel}`;
}
