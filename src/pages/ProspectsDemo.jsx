import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Clock, MessageCircle, Monitor, TrendingUp,
  HelpCircle, ShieldCheck, CheckCircle2, Lightbulb, AlertTriangle, Calculator,
} from 'lucide-react';

// Admin's guide for hosting a live demo with a prospect. Each slide pairs what to
// say with what to show and the business value behind it.

const SECTORS = {
  estate:     { label: 'Estate',     site: 'estate',     member: 'resident', members: 'residents', unit: 'unit',      fee: 'service charge / levy',  lead: 'estate manager or chairman' },
  school:     { label: 'School',     site: 'school',     member: 'parent',   members: 'parents',   unit: 'class',     fee: 'school fees & levies',   lead: 'proprietor or principal' },
  university: { label: 'University', site: 'campus',     member: 'student',  members: 'students',  unit: 'hostel room', fee: 'hostel & accommodation fees', lead: 'Dean of Students or Head of Security' },
  hotel:      { label: 'Hotel',      site: 'hotel',      member: 'guest',    members: 'guests',    unit: 'room',      fee: 'folio charges',          lead: 'general manager' },
  industrial: { label: 'Industrial', site: 'site',       member: 'staff member', members: 'staff', unit: 'department', fee: 'charges',               lead: 'facility or HSE manager' },
  hospital:   { label: 'Hospital',   site: 'hospital',   member: 'patient',  members: 'patients',  unit: 'ward bed',  fee: 'bills',                  lead: 'hospital administrator' },
};

const SECTOR_ANGLE = {
  estate: {
    pains: ['Levies collected late or never, with no clear record of who owes what', 'Gatemen using paper logbooks, so nobody can prove who came in', 'Announcements lost in noisy WhatsApp groups'],
    show: ['Payments → schedules and Payment History', 'Visitors → a resident creates a pass, the guard verifies it', 'Households: the head resident adds family with limited permissions', 'Dues enforcement: notice → grace period → manager-confirmed pause'],
    hook: 'Most estates we speak to have between 20% and 40% of levies outstanding at any time. Ask them for their number.',
  },
  school: {
    pains: ['Strangers claiming to pick up children', 'Fee reminders chased by phone and paper', 'Parents not reading circulars sent home in bags'],
    show: ['Pickup passes: the server links the pass to the student from the household', 'Announcements with read status for parents', 'Payments for fees and levies with automatic receipts'],
    hook: 'Child safety at pickup is the top concern. Open with the pickup pass and how the gate verifies it.',
  },
  university: {
    pains: ['Unregistered visitors in hostels after hours', 'Porters keeping paper registers for each hall', 'No quick way to know who is in which hall during an emergency'],
    show: ['Hostel visiting hours and ID check at the gate', 'Porters assigned to a hall (porter post on AreaGuards)', 'Site map with Google Maps directions to each hall', 'Roll call for emergencies'],
    hook: 'Talk about student safety and accountability for the institution. Hostel visiting rules are enforced by the system, not by memory.',
  },
  hotel: {
    pains: ['Guest visitors walking straight to rooms', 'No link between check-out and access being removed', 'Front desk, housekeeping and maintenance requests handled by phone'],
    show: ['Stays: guest access starts at check-in and ends at check-out automatically', 'Room board for the front desk', 'Service requests routed to housekeeping or maintenance'],
    hook: 'When a guest checks out, their passes are cancelled and the room is freed. Nobody has to remember to do it.',
  },
  industrial: {
    pains: ['Contractors on site without safety induction', 'No live headcount during an incident', 'Deliveries and vehicles logged by hand'],
    show: ['Contractor/supplier passes that need the induction accepted at check-in', 'Shifts and gate staff check', 'Gate log for deliveries and vehicles', 'Roll call and alerts routed to safety officers and first aiders'],
    hook: 'Frame it as HSE compliance: every contractor inducted, every person accounted for in an emergency.',
  },
  hospital: {
    pains: ['Too many visitors per patient, outside visiting hours', 'Restricted wards with no approval step', 'Urgent alerts not reaching the right nurse or doctor'],
    show: ['Patient-visit passes with visiting hours and a per-patient limit (guard can override with a reason)', 'Restricted units: care-team approval of passes', 'Alerts routed to assigned and on-call staff, escalating after 2 minutes'],
    hook: 'Infection control and patient rest are the business case. Visiting rules enforced at the gate protect both.',
  },
};

const PHASES = [
  { key: 'prepare', label: 'Prepare',  color: '#64748B' },
  { key: 'open',    label: 'Open',     color: '#0EA5E9' },
  { key: 'discover',label: 'Discover', color: '#8B5CF6' },
  { key: 'demo',    label: 'Demo',     color: '#10B981' },
  { key: 'close',   label: 'Close',    color: '#F59E0B' },
];

const fmt = (n) => '₦' + Math.round(n || 0).toLocaleString('en-NG');

// Slide content uses {site}, {member}, {members}, {unit}, {fee}, {lead} placeholders.
const SLIDES = [
  {
    phase: 'prepare', time: 'Before the call', title: 'Prepare for the demo',
    goal: 'Walk in knowing their size, their pain and who makes the decision.',
    checklist: [
      'Look up the {site}: location, rough number of {unit}s and {members}, and who booked (their role).',
      'Check the booking notes in the demo email for anything they already told us.',
      'Log in to the demo accounts in separate tabs: Manager dashboard, AreaMates ({member} app) and AreaGuards (security).',
      'Have a test visitor pass ready so you can verify it live at the gate screen.',
      'Pick the sector at the top of this page so the talk track uses their words.',
      'Have the pricing ready (Plans & pricing). Decide in advance what you can and cannot offer.',
      'Quiet room, camera on, screen share tested, notifications muted.',
    ],
    tip: 'A demo is a conversation, not a tour. Plan to talk for 40% of the call and listen for 60%.',
  },
  {
    phase: 'open', time: '2 min', title: 'Open the call and set the agenda',
    goal: 'Build rapport, confirm time and get permission to ask questions first.',
    say: [
      '"Thanks for making the time. I\'m Michael, founder of AreaConnector."',
      '"We have 30 minutes. My plan: a few questions about how you run the {site} today, then I\'ll show you the parts that matter to you, then we talk about next steps. Does that work?"',
      '"Before we start: what made you book this call?"',
    ],
    why: 'Their answer to "what made you book" tells you which module to show first. Write it down word for word.',
    ask: ['Who else should be on this decision? Are they on the call?'],
  },
  {
    phase: 'discover', time: '5–7 min', title: 'Discovery: understand their business',
    goal: 'Find the 2–3 problems that cost them money, time or safety. Everything you demo should tie back to these.',
    questions: [
      { q: 'How many {unit}s and {members} do you have?', why: 'Sizing and plan choice.' },
      { q: 'How do you collect {fee} today? Roughly what share is paid on time?', why: 'The money conversation. Note the percentage for the cost calculator.' },
      { q: 'How do visitors get in today? What happens when something goes wrong?', why: 'Security and accountability.' },
      { q: 'How do you reach all {members} with an important message?', why: 'Communication pain (usually WhatsApp).' },
      { q: 'What takes up most of your week that you wish it didn\'t?', why: 'Manager time saved.' },
      { q: 'Have you tried any software before? What happened?', why: 'Surface objections early.' },
      { q: 'Who signs off on a decision like this, and when do you budget for it?', why: 'Decision process and timing.' },
    ],
    tip: 'Repeat their answers back: "So the biggest issue is X, because Y. Did I get that right?" It shows you listened and anchors the demo.',
  },
  {
    phase: 'discover', time: '2 min', title: 'The cost of doing nothing',
    goal: 'Turn their answers into a number. Pricing is easy to accept when it is small next to what they lose today.',
    calculator: true,
    say: [
      '"Using your numbers, about {outstanding} in {fee} is outstanding every month."',
      '"If AreaConnector helps you collect even a fifth of that, it pays for itself many times over before we count security or your time."',
    ],
    why: 'Don\'t claim a guaranteed result. Let them do the maths with their own numbers. It is their conclusion, not our promise.',
  },
  {
    phase: 'demo', time: '1 min', title: 'The platform in one picture',
    goal: 'Show that everyone on the {site} is connected, before going into detail.',
    apps: [
      { name: 'Manager dashboard', who: 'You and your team', what: '{members}, {unit}s, payments, visitors, announcements, reports.' },
      { name: 'AreaMates', who: '{members}', what: 'Pay, invite visitors, get announcements, request help, community.' },
      { name: 'AreaGuards', who: 'Security / porters', what: 'Verify passes, log deliveries and vehicles, raise and answer alerts.' },
    ],
    say: ['"Three apps, one system. When a {member} creates a pass, the gate sees it instantly. When someone pays, you see it instantly. Nothing is retyped."'],
    show: ['Landing page or the Manager dashboard home screen.'],
  },
  {
    phase: 'demo', time: '3 min', title: 'Manager dashboard: see everything in one place',
    goal: 'Show control and visibility.',
    show: ['Dashboard home: occupancy, payments, visitors at a glance', 'Residents (or members): search, profile, household, payment history', 'Units: who lives where', 'Onboarding: invite {members} by email in bulk'],
    say: ['"This is your {site} on one screen. Instead of asking around or scrolling WhatsApp, you can see who owes, who visited and what is open."'],
    value: ['Fewer hours spent chasing information', 'One record if the manager or committee changes', 'Proof for the committee or board at meetings'],
  },
  {
    phase: 'demo', time: '5 min', title: 'Payments: collect more, chase less',
    goal: 'This is usually the strongest business case. Spend time here.',
    show: ['Payments (Growth plan and above) → create a schedule (e.g. monthly service charge)', 'What the {member} sees: the bill and paying with Paystack (card or transfer)', 'Automatic invoice and receipt by email', 'Payment History: who has paid, who has not', 'Payouts go straight to the {site}\'s bank account via Paystack'],
    say: [
      '"Every {member} gets the bill on their phone, with reminders. They pay in two taps and get a receipt. You see it immediately."',
      '"For persistent non-payers there is dues enforcement. It follows your rules: written notice, grace period, and you confirm each step. It can pause convenience services like visitor passes or the lounge. It never touches access to their home or emergency services."',
    ],
    value: ['Higher on-time collection', 'No manual receipts or reconciliation', 'A fair, documented process for defaulters that protects the committee'],
    ask: ['"What would it mean for your budget if collection improved this quarter?"'],
  },
  {
    phase: 'demo', time: '5 min', title: 'Visitors and the gate: know who is on the {site}',
    goal: 'Show accountability and safety.',
    show: ['AreaMates: a {member} creates a visitor pass and shares it (SMS/WhatsApp/email)', 'AreaGuards: the guard verifies the pass and checks the visitor in', 'Gate log: deliveries and vehicles', 'Manager: full visitor history, searchable'],
    say: ['"Every person who enters is linked to the {member} who invited them, with a time stamp. If something happens, you have the record in seconds, not a torn logbook."'],
    value: ['Accountability for every entry', 'Guards work faster with less arguing at the gate', 'Evidence after an incident'],
    sector: true,
  },
  {
    phase: 'demo', time: '3 min', title: 'Safety and emergencies',
    goal: 'Show that the system helps when it matters most.',
    show: ['SOS / alerts from a {member}, seen by guards and managers in real time', 'Alerts routed to the right staff, escalating after 2 minutes if nobody responds', 'Roll call: account for everyone during an incident', 'In-app calls between {members}, guards and managers'],
    say: ['"When someone presses for help, the right people are alerted immediately. If nobody responds within two minutes, it escalates."'],
    value: ['Faster response', 'Clear record of who responded and when', 'Duty-of-care evidence for the {site}'],
  },
  {
    phase: 'demo', time: '3 min', title: 'Communication and community',
    goal: 'Replace noisy WhatsApp groups with something official.',
    show: ['Announcements and emergency broadcasts', 'Polls and voting (e.g. AGM decisions)', 'Service requests: report a problem, track it to done', 'Courtroom: structured dispute resolution between {members}', 'Households: the head adds family members with limited permissions', 'Community lounge, events and marketplace'],
    say: ['"Official notices go here and everyone receives them. WhatsApp can stay for chatting; decisions and notices live in one place with a record."'],
    value: ['Higher engagement and fewer complaints', 'Transparent decisions the committee can point to', 'A {site} people want to live in or use'],
  },
  {
    phase: 'demo', time: '3 min', title: 'Made for your sector',
    goal: 'Prove that we understand their world, not just estates.',
    sectorSlide: true,
  },
  {
    phase: 'demo', time: '2 min', title: 'Data protection and trust',
    goal: 'Answer the security question before they ask it.',
    say: [
      '"Your data is yours. Each {site} is kept separate, and only your team sees your {members}\' details."',
      '"We follow Nigeria\'s Data Protection Act 2023. Debts are never shown to other {members}, and guards are never told why a pass is held."',
      '"We don\'t share client details. If you want a reference, we can arrange a call with a client who has agreed to it."',
    ],
    value: ['Low risk for the committee or board', 'Respect for {members}\' privacy', 'Fewer disputes about who saw what'],
  },
  {
    phase: 'close', time: '3 min', title: 'Pricing',
    goal: 'Present price as an investment against the cost you calculated earlier.',
    pricing: true,
    say: [
      '"Based on your {unit}s and {members}, the plan that fits is ___. That\'s ___ a month, about ₦___ per {member}."',
      '"Compare that with the {outstanding} a month we calculated earlier."',
    ],
    tip: 'Never offer a discount unprompted. If they push back, go back to value first. Larger sites or special terms: agree them with Michael before quoting.',
  },
  {
    phase: 'close', time: 'As needed', title: 'Handling objections',
    goal: 'Acknowledge, ask a question, then answer. Never argue.',
    objections: [
      { o: '"Our {members} won\'t use another app."', a: 'They already use apps every day. AreaMates replaces things they find annoying (paper receipts, gate calls). Ask: "What if visitors only got in with a pass? Would they use it then?" We help with the rollout and invitations.' },
      { o: '"It\'s too expensive."', a: 'Go back to the cost calculator. "Compared with what? You told me about ___ outstanding each month." Break it down per {member} per month.' },
      { o: '"We already use WhatsApp."', a: 'WhatsApp is great for chatting, but it has no payments, no visitor records and no proof of who received a notice. Keep it for chat and use AreaConnector for running the {site}.' },
      { o: '"Our guards aren\'t tech-savvy."', a: 'AreaGuards is built for the gate: big buttons, one tap to verify. Offer to train the guards on site or by video.' },
      { o: '"Is our data safe?"', a: 'Go back to the data protection slide: separate data per {site}, NDPA 2023, and no sharing of client details.' },
      { o: '"I need to take it to the committee/board."', a: 'Good sign. Offer to join that meeting or send a short summary they can forward. Ask: "When is the meeting? What will they want to see?"' },
      { o: '"Let us think about it."', a: 'Ask: "Of course. What would you need to see to say yes?" Then agree a date for the follow-up.' },
    ],
  },
  {
    phase: 'close', time: '3 min', title: 'Close and agree next steps',
    goal: 'Never end a call without a clear next step and a date.',
    say: [
      '"From what you\'ve seen, does this solve the problems you mentioned: ___ and ___?"',
      '"What would you need to get started?"',
      '"Here is what onboarding looks like: we set up your {site} and {unit}s, invite your {members}, and train your guards. You can be live quickly."',
    ],
    checklist: [
      'Confirm the decision-maker and the decision date.',
      'Agree the plan and who signs.',
      'Book the next call before you hang up.',
      'Ask who you should send the summary to.',
    ],
    tip: 'Don\'t promise trials, discounts or timelines that haven\'t been agreed with Michael.',
  },
  {
    phase: 'close', time: 'Within 24 hours', title: 'After the call',
    goal: 'The follow-up is where most deals are won.',
    checklist: [
      'Send a follow-up email within 24 hours: their problems in their words, what you showed, the plan and price, and the next step with its date.',
      'Update the lead in Pitch deck & leads with notes, size and stage.',
      'Send anything you promised (data protection summary, pricing, references).',
      'Put the follow-up date in the calendar. If there is no reply in 3 working days, follow up once, briefly.',
      'When they say yes, start onboarding in Onboard sites.',
    ],
    tip: 'Sign prospect emails as Michael Orizu and keep pricing consistent with what was said on the call.',
  },
];

function fill(text, s, extra = {}) {
  return text
    .replace(/\{(site|member|members|unit|fee|lead)\}/g, (_, k) => s[k])
    .replace(/\{outstanding\}/g, extra.outstanding || '₦___');
}

function Block({ icon: Icon, label, color, children }) {
  return (
    <section className="rounded-xl border bg-white p-4" style={{ borderColor: '#EAECF0' }}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: color + '1A', color }}><Icon size={14} /></span>
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color }}>{label}</h3>
      </div>
      {children}
    </section>
  );
}

const List = ({ items, s, extra, dot = '#10B981' }) => (
  <ul className="space-y-2">
    {items.map((t, i) => (
      <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-[#344054]">
        <span className="mt-[9px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dot }} />
        <span>{fill(t, s, extra)}</span>
      </li>
    ))}
  </ul>
);

function CostCalculator({ calc, setCalc, s }) {
  const outstanding = calc.units * calc.levy * (calc.unpaid / 100);
  const field = (key, label, suffix) => (
    <label className="block">
      <span className="block text-[12px] font-medium text-[#475467] mb-1">{label}</span>
      <div className="flex items-center rounded-lg border bg-white" style={{ borderColor: '#D0D5DD' }}>
        <input type="number" min="0" value={calc[key]} onChange={(e) => setCalc({ ...calc, [key]: Number(e.target.value) || 0 })}
          className="w-full px-3 py-2 text-[14px] rounded-lg outline-none bg-transparent" />
        {suffix && <span className="pr-3 text-[12px] text-[#667085]">{suffix}</span>}
      </div>
    </label>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {field('units', `Number of ${s.unit}s`)}
      {field('levy', `Monthly ${s.fee} per ${s.unit}`, '₦')}
      {field('unpaid', 'Share unpaid', '%')}
      <div className="sm:col-span-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg p-3" style={{ background: '#FEF3F2' }}>
          <div className="text-[11.5px] font-medium text-[#B42318]">Outstanding per month</div>
          <div className="text-[20px] font-semibold text-[#B42318]">{fmt(outstanding)}</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: '#FFFAEB' }}>
          <div className="text-[11.5px] font-medium text-[#B54708]">Outstanding per year</div>
          <div className="text-[20px] font-semibold text-[#B54708]">{fmt(outstanding * 12)}</div>
        </div>
        <div className="rounded-lg p-3" style={{ background: '#ECFDF3' }}>
          <div className="text-[11.5px] font-medium text-[#047857]">If a fifth is recovered (monthly)</div>
          <div className="text-[20px] font-semibold text-[#047857]">{fmt(outstanding * 0.2)}</div>
        </div>
      </div>
    </div>
  );
}

const PLANS = [
  { name: 'Starter',    price: 20000, cap: 'Up to 50',  note: 'Core: {members}, {unit}s, visitors, announcements, security portal, emergency broadcast', color: '#64748B' },
  { name: 'Growth',     price: 47000, cap: 'Up to 200', note: 'Adds payments & invoices, community chat, marketplace, events, polls, full analytics', color: '#0EA5E9' },
  { name: 'Premium',    price: 80000, cap: 'Up to 500', note: 'Adds Nkechi AI, lounge & music, custom branding, priority support', color: '#10B981' },
  { name: 'Enterprise', price: null,  cap: 'Unlimited', note: 'Custom terms for large or multi-site clients, incl. API access and white-label', color: '#8B5CF6' },
];

export default function ProspectsDemo() {
  const [index, setIndex] = useState(0);
  const [sectorKey, setSectorKey] = useState(() => {
    try { return localStorage.getItem('demoSector') || 'estate'; } catch { return 'estate'; }
  });
  const [calc, setCalc] = useState({ units: 200, levy: 25000, unpaid: 30 });
  const [full, setFull] = useState(false);
  const rootRef = useRef(null);
  const s = SECTORS[sectorKey];
  const angle = SECTOR_ANGLE[sectorKey];
  const slide = SLIDES[index];
  const phase = PHASES.find((p) => p.key === slide.phase);
  const extra = { outstanding: fmt(calc.units * calc.levy * (calc.unpaid / 100)) };

  useEffect(() => { try { localStorage.setItem('demoSector', sectorKey); } catch { /* ignore */ } }, [sectorKey]);

  useEffect(() => {
    const onKey = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    const onFs = () => setFull(!!document.fullscreenElement);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, []);

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else rootRef.current?.requestFullscreen?.();
  };

  const grouped = useMemo(() => PHASES.map((p) => ({
    ...p, items: SLIDES.map((sl, i) => ({ ...sl, i })).filter((sl) => sl.phase === p.key),
  })), []);

  return (
    <div ref={rootRef} className={full ? 'bg-[#F8FAFC] h-screen overflow-y-auto p-6' : ''}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <p className="text-[13px] text-[#475467] flex-1 min-w-[220px]">
          Your script for live demos: what to say, what to show and why it matters to the client. Use ← → to move.
        </p>
        <div className="flex items-center gap-1 rounded-lg border bg-white p-1 overflow-x-auto" style={{ borderColor: '#EAECF0' }}>
          {Object.entries(SECTORS).map(([k, v]) => (
            <button key={k} onClick={() => setSectorKey(k)}
              className="px-2.5 py-1 rounded-md text-[12.5px] font-medium whitespace-nowrap transition-colors"
              style={k === sectorKey ? { background: '#10B981', color: '#fff' } : { color: '#475467' }}>
              {v.label}
            </button>
          ))}
        </div>
        <button onClick={toggleFull} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white text-[12.5px] font-medium text-[#344054]" style={{ borderColor: '#D0D5DD' }}>
          {full ? <Minimize2 size={14} /> : <Maximize2 size={14} />}{full ? 'Exit' : 'Present'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {/* Agenda */}
        <aside className="rounded-xl border bg-white p-3 h-fit lg:sticky lg:top-4" style={{ borderColor: '#EAECF0' }}>
          {grouped.map((p) => (
            <div key={p.key} className="mb-3 last:mb-0">
              <p className="px-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.08em]" style={{ color: p.color }}>{p.label}</p>
              {p.items.map((sl) => (
                <button key={sl.i} onClick={() => setIndex(sl.i)}
                  className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-[12.5px] transition-colors"
                  style={sl.i === index ? { background: p.color + '14', color: '#101828', fontWeight: 600 } : { color: '#475467' }}>
                  <span className="w-5 text-[11px] text-[#98A2B3]">{sl.i + 1}</span>
                  <span className="truncate">{fill(sl.title, s)}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Slide */}
        <main className="min-w-0">
          <div className="h-1.5 rounded-full bg-[#EAECF0] mb-4 overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${((index + 1) / SLIDES.length) * 100}%`, background: phase.color }} />
          </div>

          <div className="rounded-2xl border bg-white p-5 sm:p-6 mb-4" style={{ borderColor: '#EAECF0', borderTop: `4px solid ${phase.color}` }}>
            <div className="flex flex-wrap items-center gap-2 mb-2 text-[12px] font-medium">
              <span className="px-2 py-0.5 rounded-full" style={{ background: phase.color + '1A', color: phase.color }}>{phase.label}</span>
              <span className="flex items-center gap-1 text-[#667085]"><Clock size={12} />{slide.time}</span>
              <span className="text-[#98A2B3]">Slide {index + 1} of {SLIDES.length}</span>
            </div>
            <h2 className="text-[24px] sm:text-[26px] leading-tight font-semibold tracking-tight text-[#101828]">{fill(slide.title, s)}</h2>
            <p className="mt-2 text-[15px] text-[#475467] leading-relaxed">{fill(slide.goal, s)}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {slide.checklist && (
              <div className="xl:col-span-2">
                <Block icon={CheckCircle2} label="Checklist" color="#10B981">
                  <ul className="space-y-2">
                    {slide.checklist.map((t, i) => (
                      <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-[#344054]">
                        <CheckCircle2 size={16} className="mt-[3px] flex-shrink-0 text-[#10B981]" /><span>{fill(t, s, extra)}</span>
                      </li>
                    ))}
                  </ul>
                </Block>
              </div>
            )}

            {slide.calculator && (
              <div className="xl:col-span-2">
                <Block icon={Calculator} label="Cost calculator — fill in with their answers" color="#EF4444">
                  <CostCalculator calc={calc} setCalc={setCalc} s={s} />
                </Block>
              </div>
            )}

            {slide.questions && (
              <div className="xl:col-span-2">
                <Block icon={HelpCircle} label="Questions to ask" color="#8B5CF6">
                  <div className="divide-y" style={{ borderColor: '#F2F4F7' }}>
                    {slide.questions.map((q, i) => (
                      <div key={i} className="py-2.5 first:pt-0 last:pb-0 sm:flex sm:gap-4">
                        <p className="text-[14px] font-medium text-[#101828] sm:flex-1">{fill(q.q, s)}</p>
                        <p className="text-[12.5px] text-[#667085] sm:w-56 sm:flex-shrink-0">{q.why}</p>
                      </div>
                    ))}
                  </div>
                </Block>
              </div>
            )}

            {slide.apps && (
              <div className="xl:col-span-2 grid gap-3 sm:grid-cols-3">
                {slide.apps.map((a, i) => (
                  <div key={i} className="rounded-xl border p-4" style={{ borderColor: '#EAECF0', background: ['#ECFDF3', '#EFF8FF', '#F4F3FF'][i] }}>
                    <p className="text-[15px] font-semibold text-[#101828]">{a.name}</p>
                    <p className="text-[12px] font-medium text-[#475467] mb-1.5">For: {fill(a.who, s)}</p>
                    <p className="text-[13.5px] text-[#344054] leading-relaxed">{fill(a.what, s)}</p>
                  </div>
                ))}
              </div>
            )}

            {slide.say && (
              <Block icon={MessageCircle} label="What to say" color="#0EA5E9">
                <div className="space-y-2.5">
                  {slide.say.map((t, i) => (
                    <p key={i} className="text-[14.5px] leading-relaxed text-[#101828] pl-3 border-l-2" style={{ borderColor: '#B9E6FE' }}>{fill(t, s, extra)}</p>
                  ))}
                </div>
              </Block>
            )}

            {slide.show && (
              <Block icon={Monitor} label="Show on screen" color="#10B981">
                <List items={slide.show} s={s} extra={extra} />
              </Block>
            )}

            {slide.value && (
              <Block icon={TrendingUp} label="Business value" color="#F59E0B">
                <List items={slide.value} s={s} extra={extra} dot="#F59E0B" />
              </Block>
            )}

            {slide.ask && (
              <Block icon={HelpCircle} label="Ask" color="#8B5CF6">
                <List items={slide.ask} s={s} extra={extra} dot="#8B5CF6" />
              </Block>
            )}

            {slide.why && (
              <Block icon={Lightbulb} label="Why this matters" color="#64748B">
                <p className="text-[14px] leading-relaxed text-[#344054]">{fill(slide.why, s, extra)}</p>
              </Block>
            )}

            {(slide.sector || slide.sectorSlide) && (
              <div className={slide.sectorSlide ? 'xl:col-span-2 grid gap-4 xl:grid-cols-2' : ''}>
                {slide.sectorSlide && (
                  <Block icon={AlertTriangle} label={`What hurts in a ${s.label.toLowerCase()}`} color="#EF4444">
                    <List items={angle.pains} s={s} dot="#EF4444" />
                  </Block>
                )}
                <Block icon={Monitor} label={`${s.label} features to show`} color="#10B981">
                  <List items={angle.show} s={s} />
                  <p className="mt-3 text-[13.5px] leading-relaxed text-[#475467] rounded-lg p-3" style={{ background: '#F9FAFB' }}>
                    <strong className="text-[#101828]">Angle: </strong>{angle.hook}
                  </p>
                </Block>
                {slide.sectorSlide && (
                  <Block icon={ShieldCheck} label="Who you are talking to" color="#0EA5E9">
                    <p className="text-[14px] leading-relaxed text-[#344054]">
                      Usually the {s.lead}. Speak about {s.members}, {s.unit}s and {s.fee}, not "residents and levies", unless that is their language.
                    </p>
                  </Block>
                )}
              </div>
            )}

            {slide.pricing && (
              <div className="xl:col-span-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {PLANS.map((p) => (
                  <div key={p.name} className="rounded-xl border bg-white p-4" style={{ borderColor: '#EAECF0', borderTop: `3px solid ${p.color}` }}>
                    <p className="text-[14px] font-semibold text-[#101828]">{p.name}</p>
                    <p className="text-[20px] font-semibold mt-1" style={{ color: p.color }}>{p.price ? fmt(p.price) : 'Custom'}<span className="text-[12px] font-medium text-[#667085]">{p.price ? '/month' : ''}</span></p>
                    <p className="text-[12px] font-medium text-[#475467] mt-1">{p.cap} {s.members}</p>
                    <p className="text-[12.5px] text-[#667085] mt-2 leading-relaxed">{fill(p.note, s)}</p>
                  </div>
                ))}
                <p className="sm:col-span-2 xl:col-span-4 text-[12.5px] text-[#667085]">Annual billing is about 20% cheaper than paying monthly. Check Plans &amp; pricing for the current limits before the call.</p>
              </div>
            )}

            {slide.objections && (
              <div className="xl:col-span-2 grid gap-3 md:grid-cols-2">
                {slide.objections.map((o, i) => (
                  <div key={i} className="rounded-xl border bg-white p-4" style={{ borderColor: '#EAECF0' }}>
                    <p className="text-[14px] font-semibold text-[#B42318] mb-1.5">{fill(o.o, s)}</p>
                    <p className="text-[13.5px] leading-relaxed text-[#344054]">{fill(o.a, s)}</p>
                  </div>
                ))}
              </div>
            )}

            {slide.tip && (
              <div className="xl:col-span-2 flex gap-2.5 rounded-xl p-4 text-[13.5px] leading-relaxed" style={{ background: '#FFFAEB', color: '#7A2E0E' }}>
                <Lightbulb size={16} className="mt-[2px] flex-shrink-0 text-[#F79009]" />
                <span><strong>Tip: </strong>{fill(slide.tip, s, extra)}</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-5">
            <button disabled={index === 0} onClick={() => setIndex(index - 1)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border bg-white text-[13px] font-medium text-[#344054] disabled:opacity-40" style={{ borderColor: '#D0D5DD' }}>
              <ChevronLeft size={15} />Previous
            </button>
            <button disabled={index === SLIDES.length - 1} onClick={() => setIndex(index + 1)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-medium text-white disabled:opacity-40" style={{ background: '#10B981' }}>
              {index < SLIDES.length - 1 ? fill(SLIDES[index + 1].title, s) : 'Done'}<ChevronRight size={15} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
