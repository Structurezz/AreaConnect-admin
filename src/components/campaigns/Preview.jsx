import { X, ArrowRight, Megaphone, Heart, MessageCircle, BellRing, ShieldCheck } from 'lucide-react';

// Mirrors how residents/estatemanager render each slot (components/campaigns/CampaignSlots.jsx).

const themeOf = (k) => {
  const t = k?.theme || {};
  return { primary: t.primaryColor || '#059669', accent: t.accentColor || '#34D399', bg: t.backgroundColor || '#0B1220', text: t.textColor || '#FFFFFF' };
};

function AppChrome({ children, app }) {
  return (
    <div className="rounded-[22px] border border-[#E4E7EC] bg-[#F8FAFC] overflow-hidden shadow-sm">
      <div className="h-9 px-3 flex items-center justify-between bg-white border-b border-[#EAECF0]">
        <span className="text-[11px] font-semibold text-[#101828]">{app === 'estate_manager' ? 'AreaConnector · Manager' : 'AreaMates · Greenfield Estate'}</span>
        <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#D0D5DD]" />)}</span>
      </div>
      <div className="p-3 space-y-2.5">{children}</div>
    </div>
  );
}

const Ghost = ({ h = 44 }) => <div className="rounded-xl bg-white border border-[#EAECF0]" style={{ height: h }} />;

export function ModalPreview({ content: k = {} }) {
  const t = themeOf(k);
  return (
    <div className="rounded-[22px] p-4 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.55)' }}>
      <div className="w-full max-w-[340px] rounded-[18px] overflow-hidden bg-white shadow-2xl">
        <div className="relative px-5 pt-5 pb-4 overflow-hidden" style={{ background: t.bg, color: t.text }}>
          <div className="absolute -right-14 -top-14 w-44 h-44 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}66 0%, transparent 70%)` }} />
          <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/15 flex items-center justify-center"><X size={12} /></span>
          {k.badge && <span className="relative inline-block text-[9px] font-extrabold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full mb-2" style={{ background: t.primary, color: t.text }}>{k.badge}</span>}
          <p className="relative text-[19px] font-extrabold leading-tight tracking-tight" style={{ color: t.text }}>{k.headline || 'Your headline'}</p>
          {k.subheadline && <p className="relative text-[12px] opacity-80 mt-1">{k.subheadline}</p>}
        </div>
        {k.imageUrl && <img src={k.imageUrl} alt="" className="w-full max-h-36 object-cover" />}
        <div className="px-5 py-4">
          {k.body && <p className="text-[12px] text-[#475569] leading-relaxed whitespace-pre-wrap mb-3 line-clamp-6">{k.body}</p>}
          <div className="flex gap-2">
            {k.ctaText && <span className="flex-1 h-9 rounded-xl text-white text-[12.5px] font-bold inline-flex items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}>{k.ctaText}<ArrowRight size={12} /></span>}
            <span className="h-9 px-3 rounded-xl border border-[#E2E8F0] text-[12px] font-semibold text-[#475569] inline-flex items-center">Not now</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BannerPreview({ content: k = {}, app }) {
  const t = themeOf(k);
  return (
    <AppChrome app={app}>
      <div className="rounded-xl bg-white border border-[#EAECF0] p-3"><p className="text-[12px] font-semibold text-[#101828]">Good morning, Ada 👋</p><p className="text-[10.5px] text-[#98A2B3]">Block C · Flat 4</p></div>
      <div className="relative flex items-center gap-2.5 rounded-xl p-3 pr-8 overflow-hidden" style={{ background: t.bg, color: t.text }}>
        <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}55 0%, transparent 70%)` }} />
        {k.imageUrl ? <img src={k.imageUrl} alt="" className="relative w-9 h-9 rounded-lg object-cover" /> : <span className="relative w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: t.primary }}><Megaphone size={15} color="#fff" /></span>}
        <div className="relative flex-1 min-w-0">
          {k.badge && <p className="text-[8.5px] font-extrabold uppercase tracking-[0.12em]" style={{ color: t.accent }}>{k.badge}</p>}
          <p className="text-[12.5px] font-bold leading-tight" style={{ color: t.text }}>{k.headline || 'Your headline'}</p>
          {k.subheadline && <p className="text-[10.5px] opacity-75 truncate">{k.subheadline}</p>}
        </div>
        {k.ctaText && <span className="relative h-7 px-2.5 rounded-lg bg-white text-[#0F172A] text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap">{k.ctaText}</span>}
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/15 flex items-center justify-center"><X size={10} /></span>
      </div>
      <div className="grid grid-cols-4 gap-2">{[0, 1, 2, 3].map((i) => <Ghost key={i} h={46} />)}</div>
      <Ghost h={70} />
    </AppChrome>
  );
}

export function LoungePreview({ content: k = {} }) {
  const t = themeOf(k);
  return (
    <AppChrome app="resident">
      <div className="rounded-xl bg-white border border-[#EAECF0] p-3 flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-[#E0EAFF]" /><span className="flex-1 h-6 rounded-full bg-[#F2F4F7]" /></div>
      <div className="rounded-xl bg-white border border-[#EAECF0] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: t.primary }}><Megaphone size={12} color="#fff" /></span>
          <div className="flex-1"><p className="text-[11.5px] font-semibold text-[#101828]">AreaConnect</p><p className="text-[9.5px] text-[#98A2B3]">Sponsored</p></div>
          <X size={12} className="text-[#98A2B3]" />
        </div>
        {k.imageUrl ? <img src={k.imageUrl} alt="" className="w-full max-h-40 object-cover" /> : (
          <div className="relative px-4 py-5 overflow-hidden" style={{ background: t.bg, color: t.text }}>
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full" style={{ background: `radial-gradient(circle, ${t.primary}66 0%, transparent 70%)` }} />
            {k.badge && <p className="relative text-[8.5px] font-extrabold uppercase tracking-[0.14em]" style={{ color: t.accent }}>{k.badge}</p>}
            <p className="relative text-[16px] font-extrabold leading-tight" style={{ color: t.text }}>{k.headline || 'Your headline'}</p>
          </div>
        )}
        <div className="px-3 py-2.5">
          {k.imageUrl && <p className="text-[12.5px] font-bold text-[#101828]">{k.headline}</p>}
          {(k.subheadline || k.body) && <p className="text-[11px] text-[#475467] line-clamp-3">{k.subheadline || k.body}</p>}
          {k.ctaText && <span className="mt-2 w-full h-8 rounded-lg text-white text-[11.5px] font-semibold inline-flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}>{k.ctaText}</span>}
        </div>
      </div>
      <div className="rounded-xl bg-white border border-[#EAECF0] p-3">
        <div className="flex items-center gap-2"><span className="w-7 h-7 rounded-full bg-[#FCE7F6]" /><span className="text-[11px] font-semibold text-[#101828]">Chidi · Block A</span></div>
        <div className="mt-2 h-16 rounded-lg bg-[#F2F4F7]" />
        <div className="mt-2 flex gap-3 text-[#98A2B3]"><Heart size={13} /><MessageCircle size={13} /></div>
      </div>
    </AppChrome>
  );
}

export function PushPreview({ push = {}, content: k = {} }) {
  const title = push.title || k.headline || 'Notification title';
  const body = push.body || k.subheadline || '';
  return (
    <div className="rounded-[22px] p-4 space-y-3" style={{ background: 'linear-gradient(160deg, #1D2939, #0B1220)' }}>
      <p className="text-center text-white/80 text-[34px] font-light tabular-nums leading-none mt-2">09:41</p>
      <p className="text-center text-white/50 text-[11px] -mt-1">Tuesday</p>
      <div className="rounded-2xl bg-white/90 backdrop-blur p-3 flex gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-[#059669] flex items-center justify-center flex-shrink-0"><ShieldCheck size={15} color="#fff" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-[10px] text-[#667085]"><span className="font-semibold uppercase tracking-wide">AreaConnect</span><span>now</span></div>
          <p className="text-[12.5px] font-semibold text-[#101828] leading-snug">{title}</p>
          {body && <p className="text-[11.5px] text-[#344054] leading-snug line-clamp-2">{body}</p>}
        </div>
      </div>
      <div className="rounded-xl bg-white p-2.5 flex gap-2 items-start">
        <span className="w-7 h-7 rounded-lg bg-[#ECFDF3] text-[#059669] flex items-center justify-center"><BellRing size={13} /></span>
        <div className="min-w-0"><p className="text-[11px] font-semibold text-[#101828]">{title}</p><p className="text-[10px] text-[#667085] truncate">{body || 'In-app bell'}</p><span className="text-[9px] px-1.5 rounded-full bg-[#ECFDF3] text-[#059669] font-semibold">AreaConnect</span></div>
      </div>
    </div>
  );
}

export function EmailPreview({ email = {}, content: k = {} }) {
  const t = themeOf(k);
  return (
    <div className="rounded-[14px] border border-[#E4E7EC] overflow-hidden bg-[#F2F4F7]">
      <div className="bg-white px-4 py-2.5 border-b border-[#EAECF0]">
        <p className="text-[12px] font-semibold text-[#101828] truncate">{email.subject || 'Subject line'}</p>
        <p className="text-[11px] text-[#667085] truncate">AreaConnect · {email.preheader || 'Preview text shown in the inbox'}</p>
      </div>
      <div className="p-3">
        <div className="bg-white rounded-xl overflow-hidden">
          <div className="h-1" style={{ background: `linear-gradient(90deg, ${t.primary}, ${t.accent})` }} />
          <div className="px-5 py-3 border-b border-[#F2F4F7] text-[15px] font-extrabold tracking-tight text-[#0F172A]">Area<span style={{ color: t.primary }}>Connect</span></div>
          <div className="px-5 py-4 text-[12.5px] max-h-[380px] overflow-y-auto">
            {email.htmlBody
              ? <div dangerouslySetInnerHTML={{ __html: email.htmlBody.replace(/\{\{name\}\}/g, 'Ada') }} />
              : <p className="text-[#98A2B3]">Write the email body or generate it with AI.</p>}
            {k.ctaText && k.ctaUrl && <div className="text-center mt-4"><span className="inline-block px-5 py-2.5 rounded-xl text-white font-bold text-[12.5px]" style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.accent})` }}>{k.ctaText}</span></div>}
          </div>
          <div className="px-5 py-3 bg-[#F9FAFB] text-[10px] text-[#98A2B3] text-center">Powered by Area Connector Technologies</div>
        </div>
      </div>
    </div>
  );
}

export default function Preview({ channel, form }) {
  const app = form.audience?.app === 'estate_manager' ? 'estate_manager' : 'resident';
  if (channel === 'dashboard_banner') return <BannerPreview content={form.content} app={app} />;
  if (channel === 'lounge_feed') return <LoungePreview content={form.content} />;
  if (channel === 'email') return <EmailPreview email={form.email} content={form.content} />;
  if (channel === 'push') return <PushPreview push={form.push} content={form.content} />;
  return <ModalPreview content={form.content} />;
}
