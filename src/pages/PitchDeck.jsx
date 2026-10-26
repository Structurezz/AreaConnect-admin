import { useState, useEffect, useRef } from 'react';
import { pitchAPI } from '../api';
import toast from 'react-hot-toast';
import LeadSearchPanel from '../components/LeadSearchPanel';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { NIGERIA_STATES } from '../utils/nigeriaStates';
import {
  Send, Users, Building2, Shield, CreditCard, MessageSquare,
  BarChart2, Globe, ChevronLeft, ChevronRight, Search,
  CheckSquare, Square, Filter, RefreshCw, Mail, TrendingUp,
  Zap, Star, ArrowRight, Bell, ShoppingBag, Presentation,
  X, Check,
} from 'lucide-react';

// ─── Slide data ───────────────────────────────────────────────────────────────
const SLIDES = [
  {
    id: 1,
    type: 'cover',
    title: 'AreaConnect',
    subtitle: 'Smart Estate Management Platform',
    body: 'The all-in-one platform transforming how Nigerian estates manage residents, security, payments, and community — from a single dashboard.',
    badge: 'Pitch Deck 2026',
    accent: '#10B981',
  },
  {
    id: 2,
    type: 'problem',
    title: 'The Problem',
    subtitle: 'Estate management in Nigeria is broken',
    points: [
      { icon: '📋', text: 'Resident records kept in spreadsheets or paper files — no searchability, no backup' },
      { icon: '🚪', text: 'Security desks rely on logbooks for visitor management — no accountability, easy forgery' },
      { icon: '💸', text: 'Levy collection is manual, error-prone, and nearly impossible to track across hundreds of units' },
      { icon: '📣', text: 'Announcements sent via WhatsApp groups — messages get lost, no record of who received what' },
      { icon: '🔧', text: 'Facility managers have no real-time visibility into estate operations or complaints' },
    ],
    stat: { value: '73%', label: 'of Nigerian estate managers still use paper or WhatsApp for day-to-day operations' },
  },
  {
    id: 3,
    type: 'solution',
    title: 'The Solution',
    subtitle: 'One platform, five apps, every stakeholder covered',
    apps: [
      { icon: '🏢', name: 'Estate Manager',  desc: 'Full management dashboard — residents, payments, announcements, analytics' },
      { icon: '📱', name: 'AreaMates',        desc: 'Resident app — community feed, levy payments, visitor bookings, announcements' },
      { icon: '🔐', name: 'Guard Station',    desc: 'Security guard app — visitor check-in/out, QR code scanning, incident logging' },
      { icon: '⚙️', name: 'Super Admin',      desc: 'Platform dashboard — estate onboarding, subscription management, analytics' },
      { icon: '🔌', name: 'REST API',          desc: 'Full API access for enterprise integrations and white-label deployments' },
    ],
  },
  {
    id: 4,
    type: 'features',
    title: 'Core Features',
    subtitle: 'Everything an estate needs — nothing it doesn\'t',
    features: [
      { icon: Users,          label: 'Resident Management',    desc: 'Digital directory, unit assignment, lease tracking, occupancy stats' },
      { icon: Shield,         label: 'Security & Access',      desc: 'Pre-registered visitors, QR codes, guard dashboard, security logs' },
      { icon: CreditCard,     label: 'Levy & Payment',         desc: 'Payment schedules, automated invoices, receipts sent by email' },
      { icon: Bell,           label: 'Announcements & Alerts', desc: 'Broadcast messages, emergency alerts, threaded announcements' },
      { icon: MessageSquare,  label: 'Community Lounge',       desc: 'Social feed, polls, direct messages, community board' },
      { icon: ShoppingBag,    label: 'Marketplace',            desc: 'Resident-to-resident listings, classifieds within the estate' },
      { icon: BarChart2,      label: 'Analytics Dashboard',    desc: 'Occupancy, payment trends, visitor patterns, subscription health' },
      { icon: Zap,            label: 'Real-time Notifications', desc: 'Socket.io push notifications across all apps, instantly' },
    ],
  },
  {
    id: 5,
    type: 'tech',
    title: 'Technology',
    subtitle: 'Built for scale, security, and speed',
    stack: [
      { layer: 'Frontend',  tech: 'React 18 + Vite + TailwindCSS',  desc: 'Three separate SPAs — estate manager, resident app, guard station' },
      { layer: 'Backend',   tech: 'Node.js + Express + MongoDB',     desc: 'RESTful API with JWT auth, estate-scoped middleware, Mongoose ODM' },
      { layer: 'Real-time', tech: 'Socket.io',                        desc: 'Bi-directional events — visitor updates, payment notifications, alerts' },
      { layer: 'Payments',  tech: 'Paystack Integration',             desc: 'Card payments, bank transfer, wallet system, automated receipts' },
      { layer: 'Email',     tech: 'Resend + HTML Templates',          desc: 'Visitor passes, invoices, subscription reminders, pitch emails' },
      { layer: 'Hosting',   tech: 'Railway + Cloudflare',             desc: 'Auto-deploy from GitHub, CDN edge caching, custom domains' },
    ],
    badges: ['MongoDB', 'Express', 'React', 'Node.js', 'Socket.io', 'Paystack', 'Resend', 'Railway', 'JWT', 'TailwindCSS'],
  },
  {
    id: 6,
    type: 'market',
    title: 'Market Opportunity',
    subtitle: 'Nigeria\'s real estate sector is massive and underserved',
    stats: [
      { value: '22M+',    label: 'Housing units in Nigeria',         sub: 'Source: NBS 2024' },
      { value: '5,000+',  label: 'Gated estates & residential parks', sub: 'Major cities alone' },
      { value: '₦45T',    label: 'Real estate sector GDP contribution', sub: '7% of GDP (2024)' },
      { value: '₦15B',    label: 'Addressable SaaS market',           sub: 'Estate management software' },
    ],
    insight: 'Less than 2% of Nigerian estate managers use dedicated software. The remaining 98% are our market.',
  },
  {
    id: 7,
    type: 'pricing',
    title: 'Pricing Plans',
    subtitle: 'Flexible pricing for estates of every size',
    plans: [
      { name: 'Starter',    price: '₦20,000',  cycle: '/month', color: '#941e36', residents: '50',  highlight: false, features: ['Resident & unit management', 'Visitor management', 'Announcements & alerts', 'Security portal', 'Custom branding'] },
      { name: 'Growth',     price: '₦47,000',  cycle: '/month', color: '#483bf7', residents: '150', highlight: true,  features: ['All Starter features', 'Payment system & invoices', 'Community chat & events', 'Polls & voting', 'Nkechi AI', 'Priority support'] },
      { name: 'Premium',    price: '₦80,000',  cycle: '/month', color: '#3baff7', residents: '300', highlight: false, features: ['All Growth features', 'Marketplace', 'Resident lounge', 'Music player', 'White-label', 'API access'] },
      { name: 'Enterprise', price: '₦100,000', cycle: '/month', color: '#f73b3b', residents: '500', highlight: false, features: ['All Premium features', 'Up to 500 residents', '1,000 visitors/month', 'Full API access', 'Priority support'] },
    ],
  },
  {
    id: 8,
    type: 'traction',
    title: 'Traction',
    subtitle: 'Real growth, real impact',
    metrics: [
      { value: '500+',    label: 'Active Estates',          icon: Building2,  color: '#10B981' },
      { value: '50,000+', label: 'Residents Managed',       icon: Users,      color: '#6366F1' },
      { value: '₦2.1B',   label: 'Levies Processed',        icon: CreditCard, color: '#F59E0B' },
      { value: '180,000+',label: 'Visitors Processed',      icon: Shield,     color: '#0EA5E9' },
      { value: '99.9%',   label: 'Platform Uptime',         icon: Zap,        color: '#10B981' },
      { value: '4.8★',    label: 'Avg. Manager Satisfaction', icon: Star,     color: '#F59E0B' },
    ],
    testimonials: [
      { quote: 'AreaConnect reduced our security incidents by 60% in the first month.', author: 'Estate Manager, Lekki Phase 1' },
      { quote: 'Collecting levies used to take weeks. Now it\'s automated and residents get receipts instantly.', author: 'Manager, Omole Phase 2, Lagos' },
      { quote: 'The visitor QR code system is a game changer. Our guards love it.', author: 'Facility Manager, Asokoro, Abuja' },
    ],
  },
  {
    id: 9,
    type: 'revenue',
    title: 'Revenue Model',
    subtitle: 'Multiple, compounding revenue streams',
    streams: [
      { name: 'SaaS Subscriptions', icon: '💳', desc: 'Monthly & annual plans per estate', pct: 70 },
      { name: 'Payment Processing',  icon: '💸', desc: '1.5% fee on levies processed via Paystack', pct: 18 },
      { name: 'Enterprise Licenses', icon: '🏢', desc: 'Custom white-label for property companies', pct: 8 },
      { name: 'API Access Fees',     icon: '🔌', desc: 'Third-party integrations and developer API', pct: 4 },
    ],
    projections: [
      { year: '2025', mrr: '₦4.5M',  estates: '200' },
      { year: '2026', mrr: '₦18M',   estates: '800' },
      { year: '2027', mrr: '₦55M',   estates: '2,500' },
    ],
  },
  {
    id: 10,
    type: 'team',
    title: 'Why AreaConnect Wins',
    subtitle: 'Unfair advantages we\'ve built',
    advantages: [
      { icon: '🇳🇬', title: 'Nigeria-first Design',  desc: 'Built for Nigerian infrastructure realities — mobile-first, works on 3G, Paystack-native' },
      { icon: '⚡',  title: 'Full-stack Platform',    desc: 'Not just a CRM — a complete operating system for estates across 5 interconnected apps' },
      { icon: '🔄',  title: 'Network Effects',        desc: 'Every resident on AreaMates increases value for the estate manager and other residents' },
      { icon: '📧',  title: 'Automated Communication', desc: 'Invoices, receipts, visitor passes, subscription reminders all delivered automatically' },
      { icon: '🔒',  title: 'Enterprise-grade Security', desc: 'JWT auth, estate-scoped data isolation, MongoDB injection protection, CORS lockdown' },
      { icon: '📈',  title: 'Rapid Iteration',        desc: 'Weekly releases, direct feedback loops with estate managers, feature-driven roadmap' },
    ],
  },
  {
    id: 11,
    type: 'cta',
    title: 'Let\'s Transform Your Estate',
    subtitle: 'Join hundreds of Nigerian estates running on AreaConnect',
    ctas: [
      { label: 'Get Started', href: 'https://area-connector.areaconnect.pro/register', primary: true },
      { label: 'Schedule a Demo',         href: 'mailto:hello@areaconnect.pro',                    primary: false },
    ],
    contact: {
      email: 'hello@areaconnect.pro',
      web:   'areaconnect.pro',
    },
  },
];

// ─── Welcome deck (for leads / new users) ─────────────────────────────────────
// Six slides engineered to welcome a brand-new sign-up and give the sales team
// a repeatable script. Each slide carries a `say` line — exact copy a rep can
// read verbatim to the lead to drive activation and retention.
const WELCOME_SLIDES = [
  {
    id: 'w1',
    type: 'w-cover',
    title: 'Welcome to AreaConnect',
    subtitle: 'You just made your estate smarter',
    body: 'In the next few minutes you\'ll have your estate live, residents invited, and your first visitor pass issued. We\'ll be with you every step.',
    say: '"Welcome aboard! You\'ve joined 500+ Nigerian estates running on AreaConnect. My job today is simple — get you to your first win in under 10 minutes. Ready?"',
    accent: '#10B981',
  },
  {
    id: 'w2',
    type: 'w-why',
    title: 'Why estates stay with us',
    subtitle: 'Three outcomes you\'ll see in week one',
    outcomes: [
      { icon: '⚡',  title: 'Collect levies 3× faster',       desc: 'Automated invoices + Paystack means residents pay the day they get the reminder — not weeks later.' },
      { icon: '🛡️', title: 'Zero logbook disputes',          desc: 'Every visitor is pre-registered with a QR pass. Guards verify in under a second. Full audit trail.' },
      { icon: '📣',  title: 'Residents actually read notices', desc: 'Push notifications + read receipts beat WhatsApp. Know who saw the water-outage memo and who didn\'t.' },
    ],
    say: '"Most of our managers tell us the same thing after month one — they can\'t go back. Levy collection jumps from 60% to 90%+, visitor disputes drop to zero, and residents stop missing announcements."',
  },
  {
    id: 'w3',
    type: 'w-step',
    stepNum: '01',
    title: 'Set up your estate',
    subtitle: '3 minutes · Required once',
    tasks: [
      'Add your estate name, address, and logo',
      'Create the units (bulk CSV or one-by-one)',
      'Set your service-charge amount and frequency',
    ],
    cta: { label: 'Open setup wizard', href: '/estate/setup' },
    say: '"Let\'s start with the shortest step — your estate profile. Pull up the setup wizard and I\'ll walk you through it. If you have a CSV of your units, we can import all of them in one click."',
    retentionTip: 'Pro tip: finish setup in the first session. Estates that complete setup same-day are 4× more likely to still be active in month 3.',
  },
  {
    id: 'w4',
    type: 'w-step',
    stepNum: '02',
    title: 'Invite your residents',
    subtitle: '5 minutes · The activation moment',
    tasks: [
      'Upload resident contact list (CSV template provided)',
      'Residents get a branded welcome email + app link automatically',
      'Track who has signed in from the dashboard',
    ],
    cta: { label: 'Go to Residents', href: '/residents' },
    say: '"This is the activation moment — once your residents are inside AreaMates, everything else compounds. Even if only 30% sign up on day one, they\'ll pull the rest in. Share the WhatsApp invite template with your residents\' chat group right after this call."',
    retentionTip: 'Retention anchor: >50% of residents active in month one correlates with 95% subscription renewal in year one.',
  },
  {
    id: 'w5',
    type: 'w-step',
    stepNum: '03',
    title: 'Collect your first dues',
    subtitle: '2 minutes · Where ROI shows up',
    tasks: [
      'Schedule the first levy cycle (e.g. ₦25,000 / month)',
      'Residents get the invoice in-app + email with pay-now button',
      'Payments land in your Paystack wallet, reconciled per unit',
    ],
    cta: { label: 'Create first invoice', href: '/payments' },
    say: '"This is where you\'ll feel the ROI first. Fire the first invoice cycle before we end this call — even one successful collection on day one shows the committee this is working. We\'ll keep an eye on the collection rate together."',
    retentionTip: 'Red flag: estates that don\'t run a collection cycle in week one churn 3× more often. Push for the first cycle today.',
  },
  {
    id: 'w6',
    type: 'w-close',
    title: 'You\'re never on your own',
    subtitle: 'Here\'s what happens next',
    checkins: [
      { icon: '💬', when: 'Within 24 hours', what: 'Your onboarding manager (me) checks in on setup progress and answers anything blocking you.' },
      { icon: '📊', when: 'End of week one',  what: 'We review your first collection cycle together and tune reminders to lift the rate.' },
      { icon: '🎯', when: 'Day 30 review',    what: 'Benchmark session — compare your numbers to similar estates and plan the next 90 days.' },
    ],
    guarantees: [
      '14-day money-back guarantee — no questions',
      'Direct WhatsApp line to your onboarding manager',
      'Free training session for your committee',
    ],
    say: '"You\'re not buying software — you\'re getting a partner. I\'ll be here, your residents will love this, and if at any point this doesn\'t work for your estate, we\'ll refund you within the first 14 days. No arguments. Let\'s make this win."',
    cta: { label: 'Book onboarding call', href: 'mailto:hello@areaconnect.pro' },
  },
];

const TYPE_COLORS = {
  developer:        { badge: 'blue',   label: 'Developer' },
  estate_manager:   { badge: 'green',  label: 'Est. Manager' },
  property_company: { badge: 'yellow', label: 'Prop. Company' },
  investment_firm:  { badge: 'purple', label: 'Investment' },
  government:       { badge: 'gray',   label: 'Government' },
  residents_assoc:  { badge: 'red',    label: 'Residents Assoc.' },
};

const STATUS_COLORS = {
  new:       { bg: '#F9FAFB', color: '#344054', border: '#EAECF0', label: 'New' },
  contacted: { bg: '#EFF8FF', color: '#175CD3', border: '#B2DDFF', label: 'Contacted' },
  interested:{ bg: '#FFFAEB', color: '#B54708', border: '#FEDF89', label: 'Interested' },
  converted: { bg: '#ECFDF3', color: '#067647', border: '#ABEFC6', label: 'Converted' },
  declined:  { bg: '#FEF3F2', color: '#B42318', border: '#FECDCA', label: 'Declined' },
};

// ─── Slide Renderer ───────────────────────────────────────────────────────────
function Slide({ slide }) {
  const s = slide;

  if (s.type === 'cover') return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E3A5F 55%,#064E3B 100%)' }}>
      <div style={{ display:'inline-block', background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.3)', color:'#34D399', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'5px 16px', borderRadius:20, marginBottom:24 }}>
        {s.badge}
      </div>
      <div style={{ fontSize:56, fontWeight:900, color:'#fff', letterSpacing:'-0.04em', lineHeight:1.1, marginBottom:8 }}>
        Area<span style={{ color:'#10B981' }}>Connect</span>
      </div>
      <div style={{ fontSize:18, fontWeight:600, color:'rgba(255,255,255,0.6)', marginBottom:28, letterSpacing:'-0.01em' }}>{s.subtitle}</div>
      <div style={{ maxWidth:520, fontSize:15, color:'rgba(255,255,255,0.5)', lineHeight:1.8 }}>{s.body}</div>
      <div style={{ display:'flex', gap:12, marginTop:36, flexWrap:'wrap', justifyContent:'center' }}>
        {['React','Node.js','MongoDB','Paystack','Socket.io'].map(t => (
          <span key={t} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.5)', fontSize:11, padding:'4px 12px', borderRadius:20 }}>{t}</span>
        ))}
      </div>
    </div>
  );

  if (s.type === 'problem') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#EF4444" />
      <div className="space-y-3 flex-1 mt-4">
        {s.points.map((p, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, background:'#FEF2F2', borderRadius:12, padding:'12px 16px', border:'1px solid #FEE2E2' }}>
            <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{p.icon}</span>
            <span style={{ fontSize:13, color:'#374151', lineHeight:1.6 }}>{p.text}</span>
          </div>
        ))}
      </div>
      <div style={{ background:'linear-gradient(135deg,#EF4444,#DC2626)', borderRadius:14, padding:'18px 22px', marginTop:20 }}>
        <div style={{ fontSize:40, fontWeight:900, color:'#fff', letterSpacing:'-0.04em' }}>{s.stat.value}</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.8)', marginTop:4, lineHeight:1.5 }}>{s.stat.label}</div>
      </div>
    </div>
  );

  if (s.type === 'solution') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#10B981" />
      <div className="space-y-3 flex-1 mt-4">
        {s.apps.map((app, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:16, background:'#F8FAFC', borderRadius:12, padding:'14px 18px', border:'1px solid #E2E8F0' }}>
            <span style={{ fontSize:26, lineHeight:1, flexShrink:0 }}>{app.icon}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{app.name}</div>
              <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{app.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (s.type === 'features') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#6366F1" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16, flex:1 }}>
        {s.features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'14px 16px', border:'1px solid #E2E8F0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                <Icon size={15} style={{ color:'#6366F1', flexShrink:0 }} />
                <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{f.label}</span>
              </div>
              <span style={{ fontSize:11, color:'#64748B', lineHeight:1.5 }}>{f.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (s.type === 'tech') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#7A5AF8" />
      <div className="space-y-2 flex-1 mt-4">
        {s.stack.map((item, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, background:'#F8FAFC', borderRadius:10, padding:'12px 16px', border:'1px solid #E2E8F0' }}>
            <div style={{ width:90, fontSize:10, fontWeight:700, color:'#94A3B8', letterSpacing:'0.05em', textTransform:'uppercase', flexShrink:0, marginTop:2 }}>{item.layer}</div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{item.tech}</div>
              <div style={{ fontSize:11, color:'#64748B', marginTop:2 }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:14 }}>
        {s.badges.map(b => (
          <span key={b} style={{ background:'#EEF2FF', color:'#6366F1', fontSize:10, fontWeight:700, padding:'3px 10px', borderRadius:20, border:'1px solid #C7D2FE' }}>{b}</span>
        ))}
      </div>
    </div>
  );

  if (s.type === 'market') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#F59E0B" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:16 }}>
        {s.stats.map((stat, i) => (
          <div key={i} style={{ background:'linear-gradient(135deg,#FFFBEB,#FEF3C7)', borderRadius:14, padding:'18px 20px', border:'1px solid #FDE68A' }}>
            <div style={{ fontSize:30, fontWeight:900, color:'#D97706', letterSpacing:'-0.03em' }}>{stat.value}</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#0F172A', margin:'4px 0 2px' }}>{stat.label}</div>
            <div style={{ fontSize:10, color:'#94A3B8' }}>{stat.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ background:'linear-gradient(135deg,#0F172A,#1E3A5F)', borderRadius:14, padding:'18px 22px', marginTop:16 }}>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.7 }}>
          <span style={{ fontWeight:800, color:'#10B981', fontSize:14 }}>Key insight: </span>{s.insight}
        </div>
      </div>
    </div>
  );

  if (s.type === 'pricing') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#10B981" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:16, flex:1 }}>
        {s.plans.map((plan, i) => (
          <div key={i} style={{ borderRadius:14, padding:'16px 14px', border: plan.highlight ? `2px solid ${plan.color}` : '1px solid #E2E8F0', background: plan.highlight ? '#F0FDF4' : '#F8FAFC', position:'relative' }}>
            {plan.highlight && <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:plan.color, color:'#fff', fontSize:9, fontWeight:800, padding:'2px 10px', borderRadius:20, letterSpacing:'0.06em', textTransform:'uppercase', whiteSpace:'nowrap' }}>Most Popular</div>}
            <div style={{ fontSize:13, fontWeight:800, color:'#0F172A', marginBottom:4 }}>{plan.name}</div>
            <div style={{ fontSize:22, fontWeight:900, color:plan.color, letterSpacing:'-0.03em' }}>{plan.price}<span style={{ fontSize:11, fontWeight:500, color:'#94A3B8' }}>{plan.cycle}</span></div>
            <div style={{ fontSize:10, color:'#64748B', marginTop:4, marginBottom:10 }}>Up to {plan.residents} residents</div>
            <div className="space-y-1">
              {plan.features.map((f, j) => (
                <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:5 }}>
                  <span style={{ color:plan.color, fontSize:11, flexShrink:0, marginTop:1 }}>✓</span>
                  <span style={{ fontSize:10, color:'#374151', lineHeight:1.4 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (s.type === 'traction') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#10B981" />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:16 }}>
        {s.metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'14px', border:'1px solid #E2E8F0', textAlign:'center' }}>
              <Icon size={18} style={{ color:m.color, margin:'0 auto 6px' }} />
              <div style={{ fontSize:24, fontWeight:900, color:m.color, letterSpacing:'-0.03em' }}>{m.value}</div>
              <div style={{ fontSize:11, color:'#64748B', marginTop:3 }}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <div className="space-y-3 mt-4">
        {s.testimonials.map((t, i) => (
          <div key={i} style={{ background:'#F0FDF4', borderLeft:'3px solid #10B981', borderRadius:'0 10px 10px 0', padding:'10px 14px' }}>
            <div style={{ fontSize:12, fontStyle:'italic', color:'#374151', lineHeight:1.6, marginBottom:4 }}>"{t.quote}"</div>
            <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8' }}>— {t.author}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (s.type === 'revenue') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#F59E0B" />
      <div className="space-y-3 mt-4">
        {s.streams.map((stream, i) => (
          <div key={i} style={{ background:'#FFFBEB', borderRadius:12, padding:'12px 16px', border:'1px solid #FDE68A' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:18 }}>{stream.icon}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'#0F172A' }}>{stream.name}</span>
              </div>
              <span style={{ fontSize:13, fontWeight:800, color:'#D97706' }}>{stream.pct}%</span>
            </div>
            <div style={{ background:'#E2E8F0', borderRadius:4, height:6, overflow:'hidden' }}>
              <div style={{ width:`${stream.pct}%`, background:'linear-gradient(90deg,#F59E0B,#D97706)', height:'100%', borderRadius:4 }} />
            </div>
            <div style={{ fontSize:11, color:'#64748B', marginTop:5 }}>{stream.desc}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:16 }}>
        <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>MRR Projections</div>
        <div style={{ display:'flex', gap:8 }}>
          {s.projections.map((p, i) => (
            <div key={i} style={{ flex:1, background:'linear-gradient(135deg,#0F172A,#1E3A5F)', borderRadius:12, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginBottom:4 }}>{p.year}</div>
              <div style={{ fontSize:18, fontWeight:900, color:'#10B981' }}>{p.mrr}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:2 }}>{p.estates} estates</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (s.type === 'team') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#7A5AF8" />
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:16, flex:1 }}>
        {s.advantages.map((a, i) => (
          <div key={i} style={{ background:'#F8FAFC', borderRadius:12, padding:'16px', border:'1px solid #E2E8F0' }}>
            <div style={{ fontSize:24, marginBottom:8 }}>{a.icon}</div>
            <div style={{ fontSize:13, fontWeight:700, color:'#0F172A', marginBottom:4 }}>{a.title}</div>
            <div style={{ fontSize:11, color:'#64748B', lineHeight:1.6 }}>{a.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (s.type === 'cta') return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10"
      style={{ background:'linear-gradient(135deg,#0F172A 0%,#064E3B 100%)' }}>
      <div style={{ fontSize:40, fontWeight:900, color:'#fff', letterSpacing:'-0.03em', marginBottom:12, lineHeight:1.2 }}>{s.title}</div>
      <div style={{ fontSize:16, color:'rgba(255,255,255,0.5)', marginBottom:40 }}>{s.subtitle}</div>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', justifyContent:'center' }}>
        {s.ctas.map((cta, i) => (
          <a key={i} href={cta.href} target="_blank" rel="noreferrer"
            style={{ display:'inline-block', background: cta.primary ? 'linear-gradient(135deg,#10B981,#059669)' : 'rgba(255,255,255,0.1)', color:'#fff', fontWeight:700, fontSize:14, textDecoration:'none', padding:'14px 32px', borderRadius:12, border: cta.primary ? 'none' : '1px solid rgba(255,255,255,0.2)' }}>
            {cta.label}
          </a>
        ))}
      </div>
      <div style={{ marginTop:48, display:'flex', gap:28, justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Email</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#10B981' }}>{s.contact.email}</div>
        </div>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Website</div>
          <div style={{ fontSize:14, fontWeight:600, color:'#10B981' }}>{s.contact.web}</div>
        </div>
      </div>
    </div>
  );

  // ─── Welcome deck slide types ───────────────────────────────────────────────
  if (s.type === 'w-cover') return (
    <div className="h-full flex flex-col items-center justify-center text-center p-10"
      style={{ background:'linear-gradient(135deg,#064E3B 0%,#065F46 55%,#047857 100%)' }}>
      <div style={{ display:'inline-block', background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.22)', color:'#D1FAE5', fontSize:11, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', padding:'5px 16px', borderRadius:20, marginBottom:24 }}>
        Welcome Deck · For new leads
      </div>
      <div style={{ fontSize:52, fontWeight:900, color:'#fff', letterSpacing:'-0.04em', lineHeight:1.1, marginBottom:10 }}>
        {s.title}
      </div>
      <div style={{ fontSize:18, fontWeight:600, color:'rgba(255,255,255,0.75)', marginBottom:24, letterSpacing:'-0.01em' }}>{s.subtitle}</div>
      <div style={{ maxWidth:520, fontSize:15, color:'rgba(255,255,255,0.6)', lineHeight:1.8 }}>{s.body}</div>
      <SayBox say={s.say} inverted />
    </div>
  );

  if (s.type === 'w-why') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#10B981" />
      <div className="space-y-3 flex-1 mt-4">
        {s.outcomes.map((o, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:14, background:'#F0FDF4', borderRadius:12, padding:'14px 18px', border:'1px solid #BBF7D0' }}>
            <span style={{ fontSize:24, lineHeight:1, flexShrink:0 }}>{o.icon}</span>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#064E3B', marginBottom:3 }}>{o.title}</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.6 }}>{o.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <SayBox say={s.say} />
    </div>
  );

  if (s.type === 'w-step') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:4 }}>
        <div style={{ width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', fontSize:18, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {s.stepNum}
        </div>
        <div>
          <div style={{ fontSize:22, fontWeight:900, color:'#0F172A', letterSpacing:'-0.03em' }}>{s.title}</div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>{s.subtitle}</div>
        </div>
      </div>

      <div className="space-y-2 mt-5">
        {s.tasks.map((t, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, background:'#F8FAFC', borderRadius:10, padding:'10px 14px', border:'1px solid #E2E8F0' }}>
            <div style={{ width:22, height:22, borderRadius:7, background:'#DCFCE7', color:'#059669', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
              <Check size={13} />
            </div>
            <span style={{ fontSize:13, color:'#1F2937', lineHeight:1.6 }}>{t}</span>
          </div>
        ))}
      </div>

      {s.cta && (
        <div style={{ marginTop:14 }}>
          <a href={s.cta.href}
            style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#10B981,#059669)', color:'#fff', fontWeight:700, fontSize:13, textDecoration:'none', padding:'10px 18px', borderRadius:10 }}>
            {s.cta.label} <ArrowRight size={14} />
          </a>
        </div>
      )}

      {s.retentionTip && (
        <div style={{ marginTop:14, background:'linear-gradient(135deg,#FEF3C7,#FDE68A)', border:'1px solid #F59E0B33', borderRadius:12, padding:'12px 16px' }}>
          <div style={{ fontSize:10, fontWeight:800, color:'#92400E', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:3 }}>Retention lever</div>
          <div style={{ fontSize:12, color:'#78350F', lineHeight:1.6 }}>{s.retentionTip}</div>
        </div>
      )}

      <SayBox say={s.say} />
    </div>
  );

  if (s.type === 'w-close') return (
    <div className="h-full flex flex-col p-8 overflow-y-auto" style={{ background:'#fff' }}>
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#10B981" />

      <div style={{ fontSize:10, fontWeight:800, color:'#94A3B8', letterSpacing:'0.08em', textTransform:'uppercase', margin:'18px 0 8px' }}>Your onboarding timeline</div>
      <div className="space-y-2">
        {s.checkins.map((c, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, background:'#F8FAFC', borderRadius:10, padding:'12px 16px', border:'1px solid #E2E8F0' }}>
            <span style={{ fontSize:20, lineHeight:1, flexShrink:0 }}>{c.icon}</span>
            <div>
              <div style={{ fontSize:12, fontWeight:800, color:'#059669', letterSpacing:'0.02em' }}>{c.when}</div>
              <div style={{ fontSize:12, color:'#374151', lineHeight:1.6, marginTop:2 }}>{c.what}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop:14, background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:12, padding:'14px 16px' }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#065F46', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>Our promises</div>
        <div className="space-y-1.5">
          {s.guarantees.map((g, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Check size={13} style={{ color:'#059669', flexShrink:0 }} />
              <span style={{ fontSize:12, color:'#064E3B', fontWeight:600 }}>{g}</span>
            </div>
          ))}
        </div>
      </div>

      {s.cta && (
        <div style={{ marginTop:14 }}>
          <a href={s.cta.href}
            style={{ display:'inline-flex', alignItems:'center', gap:8, background:'linear-gradient(135deg,#0F172A,#1E293B)', color:'#fff', fontWeight:700, fontSize:13, textDecoration:'none', padding:'10px 18px', borderRadius:10 }}>
            {s.cta.label} <ArrowRight size={14} />
          </a>
        </div>
      )}

      <SayBox say={s.say} />
    </div>
  );

  return null;
}

function SayBox({ say, inverted = false }) {
  if (!say) return null;
  if (inverted) {
    return (
      <div style={{ marginTop:28, maxWidth:560, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)', borderRadius:14, padding:'14px 18px', textAlign:'left' }}>
        <div style={{ fontSize:10, fontWeight:800, color:'#A7F3D0', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>Script · Say this</div>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.85)', lineHeight:1.65, fontStyle:'italic' }}>{say}</div>
      </div>
    );
  }
  return (
    <div style={{ marginTop:16, background:'#0F172A', borderRadius:12, padding:'14px 16px', borderLeft:'3px solid #10B981' }}>
      <div style={{ fontSize:10, fontWeight:800, color:'#34D399', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:4 }}>Script · Say this</div>
      <div style={{ fontSize:12.5, color:'rgba(255,255,255,0.85)', lineHeight:1.65, fontStyle:'italic' }}>{say}</div>
    </div>
  );
}

function SlideHeader({ title, subtitle, color }) {
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
        <div style={{ width:4, height:24, background:color, borderRadius:2, flexShrink:0 }} />
        <div style={{ fontSize:22, fontWeight:900, color:'#0F172A', letterSpacing:'-0.03em' }}>{title}</div>
      </div>
      <div style={{ fontSize:13, color:'#64748B', paddingLeft:12 }}>{subtitle}</div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function PitchDeck() {
  const [activeTab, setActiveTab] = useState('deck');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentWelcomeSlide, setCurrentWelcomeSlide] = useState(0);
  const [prospects, setProspects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [statusChanging, setStatusChanging] = useState(null);
  const [filterState, setFilterState] = useState('');
  const [leadPanelOpen, setLeadPanelOpen] = useState(false);

  const loadProspects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterType)   params.type   = filterType;
      if (filterState)  params.state  = filterState;
      const [pRes, sRes] = await Promise.all([
        pitchAPI.getProspects(params),
        pitchAPI.getStats(),
      ]);
      setProspects(pRes.data.data || []);
      setStats(sRes.data.data || null);
    } catch (err) {
      toast.error('Failed to load prospects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProspects(); }, [search, filterStatus, filterType, filterState]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === prospects.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(prospects.map(p => p._id)));
    }
  };

  const handleSendEmails = async (ids) => {
    if (!ids || (Array.isArray(ids) && ids.length === 0)) {
      toast.error('No prospects selected');
      return;
    }
    setSending(true);
    try {
      const payload = ids === 'all' ? { prospectIds: 'all' } : { prospectIds: Array.from(ids) };
      const res = await pitchAPI.sendEmails(payload);
      const { sent, failed, skipped } = res.data.data;
      toast.success(`Sent: ${sent} | Failed: ${failed} | Skipped (no key): ${skipped}`);
      setSelected(new Set());
      loadProspects();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send emails');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    setStatusChanging(id);
    try {
      await pitchAPI.updateProspect(id, { status });
      setProspects(prev => prev.map(p => p._id === id ? { ...p, status } : p));
    } catch {
      toast.error('Failed to update status');
    } finally {
      setStatusChanging(null);
    }
  };

  const slide = SLIDES[currentSlide];
  const totalSlides = SLIDES.length;

  const navBtn = 'btn-outline !px-3 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        title="Pitch deck"
        description="AreaConnect investor deck, new-lead welcome script and prospect outreach."
        actions={activeTab === 'prospects' ? (
          <>
            <button onClick={() => setLeadPanelOpen(true)} className="btn-outline">
              <Zap size={14} /> Find leads
            </button>
            <button onClick={() => handleSendEmails('all')} disabled={sending} className="btn-primary">
              <Mail size={14} /> Blast all
            </button>
          </>
        ) : null}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="tabs">
            {[
              { id:'deck',       label:'Investor deck' },
              { id:'welcome',    label:'Welcome deck' },
              { id:'prospects',  label:'Prospects', count: prospects.length },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`tab inline-flex items-center gap-1.5 ${activeTab === tab.id ? 'active' : ''}`}>
                {tab.label}
                {tab.count !== undefined && (
                  <span className="text-[11px] tabular-nums px-1.5 rounded-full bg-[#F2F4F7] text-[#475467] border border-[#EAECF0]">{tab.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* ── Deck tab ─────────────────────────────────────────────────── */}
      {activeTab === 'deck' && (
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Slide panel */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="card overflow-hidden h-[560px] lg:h-[620px] relative">
              <Slide slide={slide} />
            </div>
            {/* Slide nav */}
            <div className="flex items-center justify-between gap-3 mt-3">
              <button onClick={() => setCurrentSlide(i => Math.max(0, i - 1))}
                disabled={currentSlide === 0} className={navBtn}>
                <ChevronLeft size={15} /> <span className="hidden sm:inline">Previous</span>
              </button>
              <span className="text-[12.5px] text-[#475467] font-medium truncate text-center">
                <span className="tabular-nums text-[#101828]">{currentSlide + 1} / {totalSlides}</span>
                <span className="text-[#98A2B3]"> · {slide.title}</span>
              </span>
              <button onClick={() => setCurrentSlide(i => Math.min(totalSlides - 1, i + 1))}
                disabled={currentSlide === totalSlides - 1} className={navBtn}>
                <span className="hidden sm:inline">Next</span> <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Slide index panel */}
          <div className="card lg:w-56 flex-shrink-0 self-start w-full overflow-hidden">
            <div className="card-header !py-2.5 !px-3.5"><span className="card-title !text-[13px]">Slides</span><span className="card-sub tabular-nums">{totalSlides}</span></div>
            <div className="p-1.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-0.5 lg:max-h-[560px] overflow-y-auto">
              {SLIDES.map((s, i) => (
                <button key={s.id} onClick={() => setCurrentSlide(i)}
                  className={`text-left flex items-start gap-2 px-2.5 py-2 rounded-md transition-colors ${currentSlide === i ? 'bg-[#ECFDF3]' : 'hover:bg-[#F9FAFB]'}`}>
                  <span className={`text-[11px] tabular-nums font-medium w-4 flex-shrink-0 mt-px ${currentSlide === i ? 'text-[#059669]' : 'text-[#98A2B3]'}`}>{i + 1}</span>
                  <span className={`text-[12.5px] leading-snug ${currentSlide === i ? 'text-[#047857] font-semibold' : 'text-[#475467] font-medium'}`}>{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome deck tab ─────────────────────────────────────────── */}
      {activeTab === 'welcome' && (() => {
        const wSlide = WELCOME_SLIDES[currentWelcomeSlide];
        const wTotal = WELCOME_SLIDES.length;
        return (
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Slide panel */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="card overflow-hidden h-[560px] lg:h-[620px] relative">
                <Slide slide={wSlide} />
              </div>
              {/* Nav */}
              <div className="flex items-center justify-between gap-3 mt-3">
                <button onClick={() => setCurrentWelcomeSlide(i => Math.max(0, i - 1))}
                  disabled={currentWelcomeSlide === 0} className={navBtn}>
                  <ChevronLeft size={15} /> <span className="hidden sm:inline">Previous</span>
                </button>
                <span className="text-[12.5px] text-[#475467] font-medium truncate text-center">
                  <span className="tabular-nums text-[#101828]">{currentWelcomeSlide + 1} / {wTotal}</span>
                  <span className="text-[#98A2B3]"> · {wSlide.title}</span>
                </span>
                <button onClick={() => setCurrentWelcomeSlide(i => Math.min(wTotal - 1, i + 1))}
                  disabled={currentWelcomeSlide === wTotal - 1} className={navBtn}>
                  <span className="hidden sm:inline">Next</span> <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Slide index */}
            <div className="lg:w-64 flex-shrink-0 self-start w-full space-y-3">
              <div className="card overflow-hidden">
                <div className="card-header !py-2.5 !px-3.5"><span className="card-title !text-[13px]">Welcome flow</span><span className="card-sub tabular-nums">{wTotal}</span></div>
                <div className="p-1.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-0.5">
                  {WELCOME_SLIDES.map((s, i) => (
                    <button key={s.id} onClick={() => setCurrentWelcomeSlide(i)}
                      className={`text-left px-2.5 py-2 rounded-md transition-colors ${currentWelcomeSlide === i ? 'bg-[#ECFDF3]' : 'hover:bg-[#F9FAFB]'}`}>
                      <div className={`text-[11px] font-medium ${currentWelcomeSlide === i ? 'text-[#059669]' : 'text-[#98A2B3]'}`}>
                        {s.type === 'w-step' ? `Step ${s.stepNum}` : `Slide ${i + 1}`}
                      </div>
                      <div className={`text-[12.5px] leading-snug mt-0.5 ${currentWelcomeSlide === i ? 'text-[#047857] font-semibold' : 'text-[#475467] font-medium'}`}>
                        {s.title}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-[#EAECF0] bg-[#F9FAFB] px-3.5 py-3">
                <div className="text-[12px] font-semibold text-[#344054] mb-1">How to use</div>
                <div className="text-[12px] text-[#475467] leading-relaxed">
                  Share-screen with the new lead and walk through each slide. Read the <strong className="text-[#101828]">Script · Say this</strong> block to stay consistent across the team.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Prospects tab ─────────────────────────────────────────────── */}
      {activeTab === 'prospects' && (
        <div>
          {/* Stats row */}
          {stats && (
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-5">
              <StatCard label="Total"      value={stats.total}      icon={Users}       color="blue" />
              <StatCard label="Contacted"  value={stats.contacted}  icon={Mail}        color="purple" />
              <StatCard label="Interested" value={stats.interested} icon={Star}        color="amber" />
              <StatCard label="Converted"  value={stats.converted}  icon={TrendingUp}  color="green" />
              <StatCard label="Declined"   value={stats.declined}   icon={X}           color="red" />
            </div>
          )}

          <div className="card overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center px-4 py-3 border-b border-[#E4E7EC]">
              <div className="relative flex-1 min-w-0 lg:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                <input className="input-field !pl-8" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, company, city, state…" />
              </div>
              <div className="grid grid-cols-3 gap-2 lg:flex lg:items-center">
                <select className="input-field lg:!w-[140px]" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All statuses</option>
                  {Object.entries(STATUS_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="input-field lg:!w-[150px]" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">All types</option>
                  {Object.entries(TYPE_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="input-field lg:!w-[140px]" value={filterState} onChange={e => setFilterState(e.target.value)}>
                  <option value="">All states</option>
                  {NIGERIA_STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 lg:ml-auto flex-wrap">
                {selected.size > 0 && (
                  <button onClick={() => handleSendEmails(selected)} disabled={sending} className="btn-primary">
                    {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    Send to {selected.size} selected
                  </button>
                )}
                <button onClick={loadProspects} className="btn-outline" title="Refresh">
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-[calc(100vh-260px)] min-h-[320px]">
              <table className="table">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-[1] !pr-0" style={{ width:40 }}>
                      <button onClick={toggleAll} className="flex items-center text-[#98A2B3] hover:text-[#475467]" title="Select all">
                        {selected.size === prospects.length && prospects.length > 0 ? <CheckSquare size={15} className="text-[#059669]" /> : <Square size={15} />}
                      </button>
                    </th>
                    {['Name & company','Location','Type','Website','Status','Last emailed',''].map((h, idx) => (
                      <th key={idx} className="sticky top-0 z-[1]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [0,1,2,3,4].map(i => (
                      <tr key={i}><td colSpan={8}><div className="skeleton h-8" /></td></tr>
                    ))
                  ) : prospects.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="!py-14 text-center">
                        <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mx-auto mb-3">
                          <Users size={18} className="text-[#98A2B3]" />
                        </div>
                        <div className="text-[14px] font-semibold text-[#101828]">No prospects found</div>
                        <div className="text-[13px] text-[#475467] mt-1">Adjust the filters or use Find leads to search across Nigeria.</div>
                      </td>
                    </tr>
                  ) : prospects.map((p) => {
                    const tc = TYPE_COLORS[p.type] || TYPE_COLORS.estate_manager;
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS.new;
                    const isSelected = selected.has(p._id);
                    return (
                      <tr key={p._id} style={isSelected ? { background:'#F0FDF9' } : undefined}>
                        <td className="!pr-0">
                          <button onClick={() => toggleSelect(p._id)} className="flex items-center text-[#98A2B3] hover:text-[#475467]">
                            {isSelected ? <CheckSquare size={15} className="text-[#059669]" /> : <Square size={15} />}
                          </button>
                        </td>
                        <td className="min-w-[220px]">
                          <div className="cell-strong">{p.name}</div>
                          {p.title && <div className="text-[11.5px] font-medium text-[#475467] mt-px">{p.title}</div>}
                          <div className="text-[12px] text-[#475467] mt-px">{p.company}</div>
                          <div className="text-[12px] text-[#98A2B3]">{p.email}</div>
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="text-[#344054]">{p.city || '—'}</div>
                          {p.state && p.state !== p.city && <div className="text-[11.5px] text-[#98A2B3]">{p.state}</div>}
                        </td>
                        <td>
                          <span className={`badge badge-${tc.badge} whitespace-nowrap`}>{tc.label}</span>
                        </td>
                        <td>
                          {p.website
                            ? <a href={p.website} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#047857] hover:underline whitespace-nowrap">
                                <Globe size={11} />
                                {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 22)}
                              </a>
                            : <span className="text-[#D0D5DD]">—</span>}
                        </td>
                        <td>
                          <select
                            value={p.status}
                            onChange={e => handleStatusChange(p._id, e.target.value)}
                            disabled={statusChanging === p._id}
                            style={{ background:sc.bg, color:sc.color, fontSize:12, fontWeight:500, border:`1px solid ${sc.border}`, borderRadius:16, padding:'2px 8px', cursor:'pointer', outline:'none' }}>
                            {Object.entries(STATUS_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td className="whitespace-nowrap text-[12px] text-[#98A2B3] tabular-nums">
                          {p.emailSentAt ? new Date(p.emailSentAt).toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleSendEmails(new Set([p._id]))}
                            disabled={sending}
                            title="Send pitch email"
                            className="btn-outline !py-1 !px-2.5 !text-[12px]">
                            <Send size={12} /> Send
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <LeadSearchPanel open={leadPanelOpen} onClose={() => setLeadPanelOpen(false)} onDone={loadProspects} />
    </div>
  );
}
