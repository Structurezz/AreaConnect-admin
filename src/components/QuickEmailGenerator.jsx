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
  { key: 'resident',       label: 'Residents' },
  { key: 'estate_manager', label: 'Managers' },
  { key: 'both',           label: 'Both' },
];

const THEMES = [
  { name: 'Residents Indigo',    forApp: 'resident',       primaryColor: '#6366F1', accentColor: '#818CF8', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
  { name: 'Managers Green',      forApp: 'estate_manager', primaryColor: '#10B981', accentColor: '#34D399', backgroundColor: '#FFFFFF', textColor: '#0F172A' },
  { name: 'Tribely Pink',        primaryColor: '#EC4899', accentColor: '#F472B6', backgroundColor: '#0F172A', textColor: '#FFFFFF' },
  { name: 'Sunset',              primaryColor: '#F59E0B', accentColor: '#FBBF24', backgroundColor: '#7C2D12', textColor: '#FFFFFF' },
  { name: 'Ocean',               primaryColor: '#0EA5E9', accentColor: '#38BDF8', backgroundColor: '#0C4A6E', textColor: '#FFFFFF' },
];

const APP_DEFAULT_THEME_IDX = { resident: 0, estate_manager: 1, both: 0 };

export default function QuickEmailGenerator({ onClose, onPublished }) {
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [tone, setTone] = useState('warm, confident, briefly witty');
  const [segment, setSegment] = useState('new_users');
  const [days, setDays] = useState(7);
  const [roles, setRoles] = useState([]);
  const [app, setApp] = useState('resident');
  const [themeIdx, setThemeIdx] = useState(APP_DEFAULT_THEME_IDX.resident);
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
      style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.5)', backdropFilter: 'blur(2px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={() => !generating && !publishing && onClose?.()}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="border border-[#E4E7EC]"
        style={{ width: '100%', maxWidth: 980, maxHeight: '92vh', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 20px 48px rgba(16,24,40,0.18)', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E7EC]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#ECFDF3] border border-[#ABEFC6] text-[#059669]">
              <Wand2 size={15} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-[#101828] leading-tight">Generate campaign email</h2>
              <p className="text-[12px] text-[#98A2B3] truncate">Describe it, pick who sees it, publish. Gemini writes the rest.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#475467]">
            <X size={17} />
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" style={{ overflow: 'hidden', flex: 1 }}>
          {/* ─── Left: inputs ─── */}
          <div className="p-5 space-y-4 overflow-y-auto md:border-r border-[#E4E7EC]">
            <Field label="What is this email about?" required>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={3}
                placeholder="Welcome new residents and show them how to book a visitor, pay dues, and join the Lounge."
                className="input-field"
                autoFocus
              />
            </Field>

            <Field label="Campaign name (used for filing)">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Welcome New Members" className="input-field" />
            </Field>

            {/* Audience */}
            <div className="rounded-lg p-3.5 bg-[#F9FAFB] border border-[#E4E7EC]">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Users size={13} className="text-[#667085]" />
                <span className="text-[12px] font-semibold text-[#344054]">Who sees it?</span>
              </div>

              <div className="tabs w-full mb-2.5">
                {APPS.map(a => (
                  <button
                    key={a.key}
                    onClick={() => setApp(a.key)}
                    className={`tab flex-1 ${app === a.key ? 'active' : ''}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="grid gap-1.5">
                {SEGMENTS.map(s => (
                  <label
                    key={s.key}
                    className={`flex items-start gap-2 p-2 rounded-md cursor-pointer border bg-white ${segment === s.key ? 'border-[#059669] ring-1 ring-[#059669]/20' : 'border-[#E4E7EC]'}`}
                  >
                    <input type="radio" checked={segment === s.key} onChange={() => setSegment(s.key)} className="mt-0.5 accent-[#059669]" />
                    <div>
                      <div className="text-[13px] font-medium text-[#101828]">{s.label}</div>
                      <div className="text-[11.5px] text-[#98A2B3]">{s.hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              {(segment === 'new_users' || segment === 'existing_users') && (
                <div className="flex items-center gap-2 mt-2.5">
                  <span className="text-[12px] text-[#475467]">Days:</span>
                  <input type="number" min={1} max={365} value={days} onChange={e => setDays(parseInt(e.target.value) || 7)} className="input-field !w-20 !py-1" />
                </div>
              )}

              {segment === 'by_role' && (
                <div className="flex gap-3 mt-2.5 text-[12px]">
                  {['resident', 'estate_manager'].map(r => (
                    <label key={r} className="inline-flex items-center gap-1.5 text-[#344054]">
                      <input type="checkbox" className="accent-[#059669]" checked={roles.includes(r)} onChange={e => setRoles(e.target.checked ? [...roles, r] : roles.filter(x => x !== r))} />
                      {r}
                    </label>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 mt-3 text-[12px] text-[#344054]">
                <input type="checkbox" className="accent-[#059669]" checked={sendOnSignup} onChange={e => setSendOnSignup(e.target.checked)} />
                Auto-send to matching users the moment they sign up
              </label>
            </div>

            {/* Theme */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Palette size={13} className="text-[#667085]" />
                <span className="text-[12px] font-semibold text-[#344054]">Theme</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {THEMES.map((t, i) => (
                  <button
                    key={t.name}
                    onClick={() => { setThemeManual(true); setThemeIdx(i); }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium border ${themeIdx === i ? 'border-[#059669] bg-[#ECFDF3] text-[#047857]' : 'border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]'}`}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: `linear-gradient(135deg, ${t.primaryColor}, ${t.accentColor})`, display: 'inline-block' }} />
                    {t.name}
                  </button>
                ))}
              </div>
              {!themeManual && (
                <p className="field-hint mt-1.5">Auto-selected to match audience app. Pick another to override.</p>
              )}
            </div>

            {/* Tone */}
            <Field label="Tone">
              <input value={tone} onChange={e => setTone(e.target.value)} className="input-field" />
            </Field>
          </div>

          {/* ─── Right: preview ─── */}
          <div className="overflow-y-auto bg-[#F9FAFB] border-t md:border-t-0 border-[#E4E7EC]">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-semibold text-[#344054]">Live preview</span>
                {generated && (
                  <button onClick={generate} disabled={generating} className="btn-outline !py-1 !px-2.5 !text-[12px]">
                    <RefreshCw size={12} /> Regenerate
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-[#E4E7EC] bg-[#F9FAFB]">
          <div className="text-[12px] text-[#98A2B3]">
            {generated ? 'Review the preview then publish. You can edit it later from Email Campaigns.' : 'Fill in the prompt and audience, then generate.'}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-outline">Cancel</button>
            {!generated ? (
              <button
                onClick={generate}
                disabled={generating || !prompt.trim()}
                className="btn-primary"
                style={{ opacity: (generating || !prompt.trim()) ? 0.5 : 1 }}
              >
                {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate</>}
              </button>
            ) : (
              <button
                onClick={publish}
                disabled={publishing}
                className="btn-primary"
              >
                {publishing ? <><Loader2 size={14} className="animate-spin" /> Publishing…</> : <><Send size={14} /> Publish campaign</>}
              </button>
            )}
          </div>
        </div>
      </div>
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

function EmptyPreview({ generating, onGenerate, disabled }) {
  return (
    <div className="rounded-lg p-8 text-center bg-white border border-dashed border-[#D0D5DD]">
      <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center bg-[#F2F4F7]">
        <Sparkles size={18} className="text-[#98A2B3]" />
      </div>
      <h3 className="text-[14px] font-semibold text-[#101828] mb-1">No preview yet</h3>
      <p className="text-[12.5px] text-[#475467] mb-4">Describe your campaign on the left, then hit generate to see the email here.</p>
      <button
        onClick={onGenerate}
        disabled={disabled}
        className="btn-primary !py-1.5 !text-[12px]"
        style={{ opacity: disabled ? 0.5 : 1 }}
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
  const appLabel = app === 'resident' ? 'residents' : app === 'estate_manager' ? 'estate managers' : 'members';
  if (segment === 'new_users') return `${appLabel} whose accounts are less than ${days} days old on AreaConnect`;
  if (segment === 'existing_users') return `${appLabel} who have been on AreaConnect for at least ${days} days`;
  if (segment === 'by_role') return `AreaConnect ${appLabel} in specific roles`;
  return `all AreaConnect ${appLabel}`;
}
