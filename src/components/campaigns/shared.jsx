import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Rocket, Wallet, DoorOpen, ShieldCheck, Users, ShoppingBag, Radio, Crown, UserPlus, Megaphone, HeartHandshake,
  Maximize2, PanelTop, Rss, Mail, BellRing,
} from 'lucide-react';

/* ── What a campaign is for — each maps to a real AreaConnect feature ── */
export const GOALS = [
  { v: 'onboarding',   label: 'Onboarding',       Icon: Rocket,         color: '#059669', desc: 'Welcome new members and get profiles completed' },
  { v: 'payments',     label: 'Dues & payments',  Icon: Wallet,         color: '#0E9384', desc: 'Move residents to paying dues and levies online' },
  { v: 'visitors',     label: 'Visitor passes',   Icon: DoorOpen,       color: '#2E90FA', desc: 'Get residents booking gate codes instead of calling' },
  { v: 'security',     label: 'Security & SOS',   Icon: ShieldCheck,    color: '#D92D20', desc: 'Promote SOS alerts, safety check-ins and gate security' },
  { v: 'community',    label: 'Lounge & community', Icon: Users,        color: '#6172F3', desc: 'Grow posts, polls, events and neighbour chat' },
  { v: 'marketplace',  label: 'Marketplace',      Icon: ShoppingBag,    color: '#DD2590', desc: 'Drive listings and escrow-protected purchases' },
  { v: 'podcast',      label: 'AreaConnect FM',   Icon: Radio,          color: '#7A5AF8', desc: 'Promote live shows and podcast episodes' },
  { v: 'upgrade',      label: 'Plan upgrade',     Icon: Crown,          color: '#F79009', desc: 'Convert estate managers from trial to paid plans' },
  { v: 'referral',     label: 'Invite & referral', Icon: UserPlus,      color: '#12B76A', desc: 'Get residents to invite neighbours, managers to onboard estates' },
  { v: 'retention',    label: 'Re-engagement',    Icon: HeartHandshake, color: '#EF6820', desc: 'Win back members who have gone quiet' },
  { v: 'announcement', label: 'Platform news',    Icon: Megaphone,      color: '#475467', desc: 'New features, maintenance, policy updates' },
];
export const GOAL = Object.fromEntries(GOALS.map((g) => [g.v, g]));

/* ── Channels that actually deliver ── */
export const CHANNELS = [
  { v: 'modal',            label: 'In-app pop-up',   short: 'Pop-up',  Icon: Maximize2, hint: 'Shown once on the dashboard after sign-in', apps: ['resident', 'estate_manager'] },
  { v: 'dashboard_banner', label: 'Dashboard banner', short: 'Banner', Icon: PanelTop,  hint: 'Dismissible card at the top of the dashboard', apps: ['resident', 'estate_manager'] },
  { v: 'lounge_feed',      label: 'Lounge feed card', short: 'Lounge', Icon: Rss,       hint: 'Sponsored card inside the residents’ Lounge feed', apps: ['resident'] },
  { v: 'email',            label: 'Email',            short: 'Email',  Icon: Mail,      hint: 'Branded email — send now or auto-send on signup', apps: ['resident', 'estate_manager'] },
  { v: 'push',             label: 'Push & bell',      short: 'Push',   Icon: BellRing,  hint: 'Phone push + in-app bell notification', apps: ['resident', 'estate_manager'] },
];
export const CHANNEL = Object.fromEntries(CHANNELS.map((c) => [c.v, c]));
CHANNEL.login_sidebar = { v: 'login_sidebar', label: 'Login sidebar (retired)', short: 'Login', Icon: PanelTop };

export const PHASE = {
  live:      { label: 'Live',      cls: 'bg-[#ECFDF3] text-[#067647] border-[#ABEFC6]', dot: '#12B76A' },
  scheduled: { label: 'Scheduled', cls: 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]', dot: '#2E90FA' },
  draft:     { label: 'Draft',     cls: 'bg-[#F9FAFB] text-[#344054] border-[#EAECF0]', dot: '#98A2B3' },
  paused:    { label: 'Paused',    cls: 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]', dot: '#F79009' },
  expired:   { label: 'Expired',   cls: 'bg-[#FEF3F2] text-[#B42318] border-[#FECDCA]', dot: '#F04438' },
  ended:     { label: 'Ended',     cls: 'bg-[#F2F4F7] text-[#475467] border-[#EAECF0]', dot: '#667085' },
};

export function PhaseBadge({ phase }) {
  const p = PHASE[phase] || PHASE.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full border text-[11.5px] font-medium ${p.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${phase === 'live' ? 'animate-pulse' : ''}`} style={{ background: p.dot }} />{p.label}
    </span>
  );
}

export function GoalPill({ v, size = 'sm' }) {
  const g = GOAL[v] || GOAL.onboarding;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${size === 'sm' ? 'h-6 px-2 text-[11.5px]' : 'h-7 px-2.5 text-[12.5px]'}`} style={{ background: `${g.color}14`, color: g.color }}>
      <g.Icon size={size === 'sm' ? 12 : 13} />{g.label}
    </span>
  );
}

export function ChannelIcons({ list = [] }) {
  return (
    <div className="flex items-center gap-1">
      {list.map((p) => {
        const c = CHANNEL[p]; if (!c) return null;
        return <span key={p} title={c.label} className="w-6 h-6 rounded-md bg-[#F2F4F7] text-[#475467] flex items-center justify-center"><c.Icon size={12} /></span>;
      })}
    </div>
  );
}

/* ── In-app destinations a CTA can open (real routes in each app) ── */
export const DESTINATIONS = {
  resident: [
    { v: '/dashboard', label: 'Home dashboard' },
    { v: '/settings', label: 'Profile & settings' },
    { v: '/payments', label: 'Pay dues & levies' },
    { v: '/visitors/new', label: 'Book a visitor pass' },
    { v: '/visitors', label: 'My visitors' },
    { v: '/alerts', label: 'Security & SOS alerts' },
    { v: '/safety', label: 'Safety centre' },
    { v: '/lounge', label: 'The Lounge' },
    { v: '/marketplace', label: 'Marketplace' },
    { v: '/podcasts', label: 'AreaConnect FM' },
    { v: '/events', label: 'Event board' },
    { v: '/polls', label: 'Polls & voting' },
    { v: '/neighbours', label: 'Neighbours' },
    { v: '/announcements', label: 'Announcements' },
  ],
  estate_manager: [
    { v: '/dashboard', label: 'Manager dashboard' },
    { v: '/upgrade', label: 'Plans & upgrade' },
    { v: '/payments', label: 'Payments & dues' },
    { v: '/residents', label: 'Residents' },
    { v: '/units', label: 'Units' },
    { v: '/visitors', label: 'Visitors' },
    { v: '/alerts', label: 'Alerts' },
    { v: '/announcements', label: 'Announcements' },
    { v: '/guards', label: 'Security guards' },
    { v: '/team', label: 'Team' },
    { v: '/lounge', label: 'Lounge' },
    { v: '/podcasts', label: 'AreaConnect FM' },
    { v: '/marketplace', label: 'Marketplace' },
    { v: '/settings', label: 'Estate settings' },
  ],
};

/* ── Colour themes (AreaConnect-first) ── */
export const THEMES = [
  { name: 'AreaConnect', primaryColor: '#059669', accentColor: '#34D399', backgroundColor: '#0B1220', textColor: '#FFFFFF' },
  { name: 'Trust blue',  primaryColor: '#2E90FA', accentColor: '#84CAFF', backgroundColor: '#0B1A33', textColor: '#FFFFFF' },
  { name: 'Security',    primaryColor: '#D92D20', accentColor: '#FDA29B', backgroundColor: '#1F0B0A', textColor: '#FFFFFF' },
  { name: 'FM purple',   primaryColor: '#7A5AF8', accentColor: '#BDB4FE', backgroundColor: '#1E1240', textColor: '#FFFFFF' },
  { name: 'Gold',        primaryColor: '#F79009', accentColor: '#FEC84B', backgroundColor: '#1D1305', textColor: '#FFFFFF' },
  { name: 'Light',       primaryColor: '#059669', accentColor: '#12B76A', backgroundColor: '#ECFDF3', textColor: '#053321' },
];

/* ── Playbooks: ready-made campaigns for what AreaConnect actually does ── */
const P = (o) => ({ status: 'draft', priority: 2, frequency: 'until_dismissed', ...o });
export const PLAYBOOKS = [
  P({ key: 'welcome', goal: 'onboarding', name: 'Welcome new residents', why: 'First-week residents who finish their profile are far more likely to stay active.',
    placements: ['modal', 'email'], audience: { segment: 'new_users', newUserWithinDays: 7, app: 'resident' }, frequency: 'once',
    content: { badge: 'Welcome', headline: 'Your estate, now in your pocket', subheadline: 'Gate passes, dues and neighbours — all in one app.', body: 'Book visitor codes in seconds, pay dues without paperwork and get alerted the moment something happens at your gate.\n\nStart by completing your profile so your guards and neighbours know it’s you.', ctaText: 'Complete my profile', ctaUrl: '/settings' },
    email: { subject: 'Welcome to AreaConnect — here’s your first step', preheader: 'Visitor passes, dues and your neighbours in one app.', sendOnUserSignup: true } }),
  P({ key: 'dues', goal: 'payments', name: 'Pay dues online', why: 'Online dues collection is the #1 reason estates stay on AreaConnect.',
    placements: ['dashboard_banner', 'push'], audience: { segment: 'all', app: 'resident' }, frequency: 'until_clicked',
    content: { badge: 'Dues', headline: 'Pay your estate dues in 30 seconds', subheadline: 'Card, transfer or wallet — receipt lands instantly.', body: 'No more bank queues or chasing receipts. Every payment is recorded in your history.', ctaText: 'Pay now', ctaUrl: '/payments' },
    push: { title: 'Your estate dues, sorted in 30 seconds', body: 'Pay by card, transfer or wallet — receipt included.' } }),
  P({ key: 'visitors', goal: 'visitors', name: 'Book visitors with a code', why: 'Residents who use passes create a smoother gate for guards and fewer phone calls.',
    placements: ['dashboard_banner', 'lounge_feed'], audience: { segment: 'existing_users', existingUserBeyondDays: 7, app: 'resident' }, frequency: 'until_clicked',
    content: { badge: 'Gate passes', headline: 'Expecting someone? Send a gate code', subheadline: 'Your guest shows the code, the guard verifies — done.', body: 'Create a one-time code and share it on WhatsApp. You’ll be notified the moment they arrive.', ctaText: 'Book a visitor', ctaUrl: '/visitors/new' } }),
  P({ key: 'sos', goal: 'security', name: 'Know your SOS button', why: 'Make sure every resident knows how to reach security in one tap.',
    placements: ['modal', 'push'], audience: { segment: 'all', app: 'resident' }, priority: 1, frequency: 'once',
    content: { badge: 'Safety first', headline: 'Help is one tap away', subheadline: 'The SOS button alerts your estate security instantly.', body: 'Hold SOS on your home screen and security sees who you are and where you live. Use it for any emergency — fire, break-in or medical.', ctaText: 'See how it works', ctaUrl: '/alerts', theme: THEMES[2] },
    push: { title: 'Do you know where your SOS button is?', body: 'One tap alerts your estate security instantly.' } }),
  P({ key: 'lounge', goal: 'community', name: 'Meet your neighbours', why: 'Active Lounges keep residents opening the app daily.',
    placements: ['dashboard_banner'], audience: { segment: 'all', app: 'resident' },
    content: { badge: 'The Lounge', headline: 'See what’s happening on your street', subheadline: 'Posts, polls and events from your neighbours.', body: '', ctaText: 'Open the Lounge', ctaUrl: '/lounge', theme: THEMES[1] } }),
  P({ key: 'market', goal: 'marketplace', name: 'Escrow-protected marketplace', why: 'Escrow builds trust — buyers pay, sellers get paid when delivery is confirmed.',
    placements: ['lounge_feed', 'dashboard_banner'], audience: { segment: 'all', app: 'resident' },
    content: { badge: 'Marketplace', headline: 'Buy and sell safely with neighbours', subheadline: 'Your money is held in escrow until you confirm delivery.', body: 'List items in minutes. Buyers pay through AreaConnect and sellers are paid once the buyer confirms — no awkward money chases.', ctaText: 'Browse the marketplace', ctaUrl: '/marketplace' } }),
  P({ key: 'fm', goal: 'podcast', name: 'Tune in to AreaConnect FM', why: 'Live shows with estate leaders drive platform-wide engagement.',
    placements: ['dashboard_banner', 'push'], audience: { segment: 'all', app: 'both' },
    content: { badge: 'AreaConnect FM', headline: 'Estate leaders, live on air', subheadline: 'Listen live or catch up on episodes.', body: '', ctaText: 'Listen now', ctaUrl: '/podcasts', theme: THEMES[3] },
    push: { title: 'AreaConnect FM — new episode out', body: 'Estate leaders on security, dues and community. Tap to listen.' } }),
  P({ key: 'upgrade', goal: 'upgrade', name: 'Trial → paid upgrade', why: 'Remind managers on trial what they keep by upgrading before it ends.',
    placements: ['modal', 'email', 'dashboard_banner'], audience: { segment: 'all', app: 'estate_manager', subscriptionStatuses: ['trial'] }, priority: 1,
    content: { badge: 'Your trial', headline: 'Keep your estate running smoothly', subheadline: 'Upgrade to keep dues collection, gate security and the Lounge.', body: 'Your residents are already using AreaConnect. Upgrade to make sure nothing switches off when your trial ends.', ctaText: 'See plans', ctaUrl: '/upgrade', theme: THEMES[4] },
    email: { subject: 'Your AreaConnect trial is ending soon', preheader: 'Keep dues collection, gate security and the Lounge switched on.' } }),
  P({ key: 'expired', goal: 'upgrade', name: 'Win back expired estates', why: 'Estates whose plan expired still have residents waiting.',
    placements: ['modal', 'email'], audience: { segment: 'all', app: 'estate_manager', subscriptionStatuses: ['expired', 'cancelled'] }, priority: 1,
    content: { badge: 'We miss you', headline: 'Your residents are still here', subheadline: 'Reactivate to switch dues, gate passes and alerts back on.', body: '', ctaText: 'Reactivate', ctaUrl: '/upgrade', theme: THEMES[4] },
    email: { subject: 'Your estate is paused on AreaConnect', preheader: 'Reactivate in two minutes — everything is where you left it.' } }),
  P({ key: 'invite', goal: 'referral', name: 'Invite your neighbours', why: 'Estates with more residents onboarded see higher dues collection.',
    placements: ['dashboard_banner'], audience: { segment: 'existing_users', existingUserBeyondDays: 14, app: 'resident' },
    content: { badge: 'Invite', headline: 'Is your neighbour on AreaConnect yet?', subheadline: 'Share your estate code — it takes them a minute to join.', body: '', ctaText: 'Find neighbours', ctaUrl: '/neighbours' } }),
  P({ key: 'winback', goal: 'retention', name: 'Re-engage quiet residents', why: 'Nudge residents who haven’t opened the app recently.',
    placements: ['email', 'push'], audience: { segment: 'existing_users', existingUserBeyondDays: 30, app: 'resident' },
    content: { headline: 'Here’s what you missed in your estate', subheadline: 'New posts, events and announcements are waiting.', ctaText: 'Catch up', ctaUrl: '/dashboard' },
    email: { subject: 'Here’s what you missed in your estate', preheader: 'New posts, events and announcements are waiting.' },
    push: { title: 'Your estate has been busy', body: 'New posts, events and announcements are waiting.' } }),
  P({ key: 'feature', goal: 'announcement', name: 'New feature launch', why: 'Tell everyone about something new in one go.',
    placements: ['modal', 'push'], audience: { segment: 'all', app: 'both' },
    content: { badge: 'New', headline: 'Something new just landed', subheadline: 'Describe the feature in one line.', body: '', ctaText: 'Try it', ctaUrl: '/dashboard' } }),
];

/* ── Formatting ── */
export const nf = (n) => Number(n || 0).toLocaleString();
export const pct = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
export const appLabel = (a) => ({ resident: 'Residents', residents: 'Residents', estate_manager: 'Estate managers', estatemanager: 'Estate managers', both: 'Residents & managers' }[a] || 'Residents');

export function audienceSummary(a = {}) {
  const parts = [appLabel(a.app)];
  if (a.segment === 'new_users') parts.push(`joined ≤ ${a.newUserWithinDays || 7}d`);
  if (a.segment === 'existing_users') parts.push(`members > ${a.existingUserBeyondDays || 7}d`);
  if (a.segment === 'by_estate') parts.push(`${(a.estateIds || []).length} estate${(a.estateIds || []).length === 1 ? '' : 's'}`);
  if ((a.states || []).length) parts.push(a.states.join(', '));
  if ((a.subscriptionStatuses || []).length) parts.push(`plan: ${a.subscriptionStatuses.join('/')}`);
  if (a.activeWithinDays) parts.push(`active ≤ ${a.activeWithinDays}d`);
  return parts.join(' · ');
}

/* ── Trend chart (dependency-free SVG) ── */
export function TrendChart({ series = [], height = 180, keys = [['impressions', '#059669', 'Impressions'], ['clicks', '#2E90FA', 'Clicks']] }) {
  const W = 640;
  const H = height;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const max = useMemo(() => Math.max(4, ...series.flatMap((r) => keys.map(([k]) => r[k] || 0))), [series, keys]);
  if (!series.length) return null;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, series.length - 1);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];
  const every = Math.ceil(series.length / 6);
  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        {keys.map(([k, c, l]) => <span key={k} className="inline-flex items-center gap-1.5 text-[12px] text-[#475467]"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}</span>)}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#F2F4F7" />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#98A2B3">{t}</text>
          </g>
        ))}
        {keys.map(([k, c], idx) => {
          const pts = series.map((r, i) => `${x(i)},${y(r[k] || 0)}`).join(' ');
          return (
            <g key={k}>
              {idx === 0 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(series.length - 1)},${y(0)}`} fill={c} opacity="0.08" />}
              <polyline points={pts} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
        {series.map((r, i) => (i % every === 0 || i === series.length - 1) && (
          <text key={r.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#98A2B3">{format(new Date(r.day), 'd MMM')}</text>
        ))}
      </svg>
    </div>
  );
}

export function CtrBar({ ctr }) {
  const w = Math.min(100, (ctr || 0) * 5); // 20% CTR fills the bar
  const color = ctr >= 8 ? '#12B76A' : ctr >= 3 ? '#2E90FA' : ctr > 0 ? '#F79009' : '#D0D5DD';
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} /></div>
      <span className="text-[12px] tabular-nums text-[#344054] w-10 text-right">{ctr ? `${ctr}%` : '—'}</span>
    </div>
  );
}
