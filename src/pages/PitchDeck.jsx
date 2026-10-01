import { useState, useEffect, useRef } from 'react';
import { pitchAPI } from '../api';
import toast from 'react-hot-toast';
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

const TYPE_COLORS = {
  developer:        { bg: '#EEF2FF', color: '#6366F1', label: 'Developer' },
  estate_manager:   { bg: '#F0FDF4', color: '#059669', label: 'Est. Manager' },
  property_company: { bg: '#FEF3C7', color: '#D97706', label: 'Prop. Company' },
  investment_firm:  { bg: '#FDF4FF', color: '#9333EA', label: 'Investment' },
  government:       { bg: '#F0F9FF', color: '#0284C7', label: 'Government' },
};

const STATUS_COLORS = {
  new:       { bg: '#F1F5F9', color: '#64748B', label: 'New' },
  contacted: { bg: '#EEF2FF', color: '#6366F1', label: 'Contacted' },
  interested:{ bg: '#FEF3C7', color: '#D97706', label: 'Interested' },
  converted: { bg: '#F0FDF4', color: '#059669', label: 'Converted' },
  declined:  { bg: '#FEF2F2', color: '#DC2626', label: 'Declined' },
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
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#8B5CF6" />
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
      <SlideHeader title={s.title} subtitle={s.subtitle} color="#8B5CF6" />
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

  return null;
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
  const [prospects, setProspects] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [statusChanging, setStatusChanging] = useState(null);
  const [generating, setGenerating] = useState(false);

  const loadProspects = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterType)   params.type   = filterType;
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

  useEffect(() => { loadProspects(); }, [search, filterStatus, filterType]);

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

  const handleGenerate = async (count = 25) => {
    setGenerating(true);
    try {
      const res = await pitchAPI.generate({ count });
      const { added, total } = res.data;
      if (added === 0) {
        toast('No new prospects generated — all were duplicates. Try again.');
      } else {
        toast.success(`Added ${added} new prospects! Total: ${total}`);
      }
      loadProspects();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
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

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      {/* Page header */}
      <div className="px-6 pt-5 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}>
              <Presentation size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color:'#0F172A' }}>Pitch Deck</h1>
              <p className="text-sm" style={{ color:'#94A3B8' }}>AreaConnect investor deck & prospect outreach</p>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display:'flex', gap:4, background:'#F1F5F9', borderRadius:10, padding:4 }}>
            {[{ id:'deck', label:'Deck' },{ id:'prospects', label:`Prospects (${prospects.length})` }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{
                  padding:'7px 18px', borderRadius:7, fontSize:13, fontWeight:600, border:'none', cursor:'pointer',
                  background: activeTab === tab.id ? '#fff' : 'transparent',
                  color: activeTab === tab.id ? '#0F172A' : '#94A3B8',
                  boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden px-6 pb-6" style={{ minHeight:0 }}>

        {/* ── Deck tab ─────────────────────────────────────────────────── */}
        {activeTab === 'deck' && (
          <div className="h-full flex gap-4" style={{ minHeight:0 }}>
            {/* Slide panel */}
            <div className="flex-1 flex flex-col" style={{ minWidth:0 }}>
              <div className="flex-1 rounded-2xl overflow-hidden" style={{ border:'1px solid #E2E8F0', minHeight:0, position:'relative' }}>
                <Slide slide={slide} />
              </div>
              {/* Slide nav */}
              <div className="flex items-center justify-between mt-3">
                <button onClick={() => setCurrentSlide(i => Math.max(0, i - 1))}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background:'#F1F5F9', color: currentSlide === 0 ? '#CBD5E1' : '#0F172A', cursor: currentSlide === 0 ? 'not-allowed' : 'pointer', border:'1px solid #E2E8F0' }}>
                  <ChevronLeft size={15} /> Previous
                </button>
                <span style={{ fontSize:13, color:'#94A3B8', fontWeight:600 }}>
                  {currentSlide + 1} / {totalSlides} — {slide.title}
                </span>
                <button onClick={() => setCurrentSlide(i => Math.min(totalSlides - 1, i + 1))}
                  disabled={currentSlide === totalSlides - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background:'#F1F5F9', color: currentSlide === totalSlides - 1 ? '#CBD5E1' : '#0F172A', cursor: currentSlide === totalSlides - 1 ? 'not-allowed' : 'pointer', border:'1px solid #E2E8F0' }}>
                  Next <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Slide index panel */}
            <div className="w-44 flex-shrink-0 flex flex-col overflow-y-auto" style={{ gap:4 }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Slides</div>
              {SLIDES.map((s, i) => (
                <button key={s.id} onClick={() => setCurrentSlide(i)}
                  style={{
                    textAlign:'left', padding:'9px 12px', borderRadius:10, border:'none', cursor:'pointer',
                    background: currentSlide === i ? '#0F172A' : '#F8FAFC',
                    borderLeft: currentSlide === i ? '3px solid #10B981' : '3px solid transparent',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color: currentSlide === i ? '#94A3B8' : '#CBD5E1' }}>Slide {i + 1}</div>
                  <div style={{ fontSize:11, fontWeight:600, marginTop:1, color: currentSlide === i ? '#fff' : '#64748B', lineHeight:1.3 }}>{s.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Prospects tab ─────────────────────────────────────────────── */}
        {activeTab === 'prospects' && (
          <div className="h-full flex flex-col" style={{ minHeight:0 }}>
            {/* Stats row */}
            {stats && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:14, flexShrink:0 }}>
                {[
                  { label:'Total',     value: stats.total,     color:'#6366F1' },
                  { label:'Contacted', value: stats.contacted, color:'#8B5CF6' },
                  { label:'Interested',value: stats.interested,color:'#F59E0B' },
                  { label:'Converted', value: stats.converted, color:'#10B981' },
                  { label:'Declined',  value: stats.declined,  color:'#EF4444' },
                ].map(stat => (
                  <div key={stat.label} className="glass-card p-4 text-center">
                    <div style={{ fontSize:24, fontWeight:900, color:stat.color }}>{stat.value}</div>
                    <div style={{ fontSize:11, color:'#94A3B8', marginTop:2 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div style={{ display:'flex', gap:8, marginBottom:12, alignItems:'center', flexWrap:'wrap', flexShrink:0 }}>
              <div style={{ position:'relative', flex:'1', minWidth:160 }}>
                <Search size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8' }} />
                <input className="input-field" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, company, city…"
                  style={{ paddingLeft:32, height:36, fontSize:13 }} />
              </div>
              <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ height:36, fontSize:13, width:130 }}>
                <option value="">All Statuses</option>
                {Object.entries(STATUS_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="input-field" value={filterType} onChange={e => setFilterType(e.target.value)}
                style={{ height:36, fontSize:13, width:145 }}>
                <option value="">All Types</option>
                {Object.entries(TYPE_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <button onClick={loadProspects} className="btn-outline flex items-center gap-1.5" style={{ height:36, fontSize:13 }}>
                <RefreshCw size={13} /> Refresh
              </button>

              <button onClick={() => handleGenerate(25)} disabled={generating}
                style={{ height:36, fontSize:13, padding:'0 14px', borderRadius:8, background:'linear-gradient(135deg,#8B5CF6,#7C3AED)', color:'#fff', fontWeight:600, border:'none', cursor: generating ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', gap:6, opacity: generating ? 0.7 : 1 }}>
                {generating ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                {generating ? 'Generating…' : 'AI Generate 25 More'}
              </button>

              {selected.size > 0 && (
                <button onClick={() => handleSendEmails(selected)} disabled={sending}
                  className="btn-primary flex items-center gap-1.5" style={{ height:36, fontSize:13 }}>
                  {sending ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                  Send to {selected.size} selected
                </button>
              )}

              <button onClick={() => handleSendEmails('all')} disabled={sending}
                style={{ height:36, fontSize:13, padding:'0 14px', borderRadius:8, border:'1px solid #E2E8F0', background:'#fff', color:'#0F172A', fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
                <Mail size={13} /> Blast all
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-xl" style={{ border:'1px solid #E2E8F0', minHeight:0 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#F8FAFC', borderBottom:'1px solid #E2E8F0', position:'sticky', top:0, zIndex:1 }}>
                    <th style={{ padding:'10px 12px', textAlign:'left', width:36 }}>
                      <button onClick={toggleAll} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:0, display:'flex', alignItems:'center' }}>
                        {selected.size === prospects.length && prospects.length > 0 ? <CheckSquare size={15} style={{ color:'#6366F1' }} /> : <Square size={15} />}
                      </button>
                    </th>
                    {['Name & Company','City','Type','Website','Status','Last Emailed','Actions'].map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left', fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#94A3B8' }}>Loading prospects…</td></tr>
                  ) : prospects.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'#94A3B8' }}>No prospects found</td></tr>
                  ) : prospects.map((p, i) => {
                    const tc = TYPE_COLORS[p.type] || TYPE_COLORS.estate_manager;
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS.new;
                    const isSelected = selected.has(p._id);
                    return (
                      <tr key={p._id} style={{ borderBottom:'1px solid #F1F5F9', background: isSelected ? '#EEF2FF' : (i % 2 === 0 ? '#fff' : '#FAFAFA') }}>
                        <td style={{ padding:'10px 12px' }}>
                          <button onClick={() => toggleSelect(p._id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8', padding:0, display:'flex', alignItems:'center' }}>
                            {isSelected ? <CheckSquare size={15} style={{ color:'#6366F1' }} /> : <Square size={15} />}
                          </button>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ fontWeight:600, color:'#0F172A' }}>{p.name}</div>
                          {p.title && <div style={{ fontSize:10, fontWeight:700, color:'#8B5CF6', marginTop:1, textTransform:'uppercase', letterSpacing:'0.04em' }}>{p.title}</div>}
                          <div style={{ fontSize:11, color:'#64748B', marginTop:1 }}>{p.company}</div>
                          <div style={{ fontSize:11, color:'#94A3B8' }}>{p.email}</div>
                        </td>
                        <td style={{ padding:'10px 12px', color:'#64748B' }}>{p.city || '—'}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ background:tc.bg, color:tc.color, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:20 }}>{tc.label}</span>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          {p.website
                            ? <a href={p.website} target="_blank" rel="noreferrer"
                                style={{ fontSize:11, color:'#6366F1', fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                                <Globe size={11} />
                                {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 22)}
                              </a>
                            : <span style={{ fontSize:11, color:'#CBD5E1' }}>—</span>}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <select
                            value={p.status}
                            onChange={e => handleStatusChange(p._id, e.target.value)}
                            disabled={statusChanging === p._id}
                            style={{ background:sc.bg, color:sc.color, fontSize:11, fontWeight:700, border:`1px solid ${sc.color}40`, borderRadius:8, padding:'3px 8px', cursor:'pointer', outline:'none' }}>
                            {Object.entries(STATUS_COLORS).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding:'10px 12px', fontSize:11, color:'#94A3B8' }}>
                          {p.emailSentAt ? new Date(p.emailSentAt).toLocaleDateString('en-NG', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <button
                            onClick={() => handleSendEmails(new Set([p._id]))}
                            disabled={sending}
                            title="Send pitch email"
                            style={{ background:'#EEF2FF', border:'none', borderRadius:7, padding:'5px 10px', cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#6366F1' }}>
                            <Send size={11} /> Send
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
