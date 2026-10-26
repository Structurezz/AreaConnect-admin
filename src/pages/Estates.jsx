import { useEffect, useMemo, useState } from 'react';
import { estateAPI } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import EditEstateDrawer from '../components/estates/EditEstateDrawer';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import EstatesMap, { STATUS_COLOR, estateTone } from '../components/estates/EstatesMap';
import {
  Building2, MapPin, Search, Edit3, ArrowRight, ToggleLeft, ToggleRight, RefreshCw, Phone, Mail, Gift,
  Users as UsersIcon, Home as HomeIcon, Bell, AlertTriangle, UserX, Copy, X, LayoutGrid, Rows3, Wallet,
  DoorOpen, CalendarClock, CreditCard, ExternalLink, Navigation, MessageCircle,
} from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['all', 'active', 'inactive', 'managed', 'unmanaged'];
const SUB_FILTERS = [
  { key: 'all',     label: 'Any sub' },
  { key: 'trial',   label: 'Trial' },
  { key: 'active',  label: 'Paying' },
  { key: 'comp',    label: 'Comp' },
  { key: 'risk',    label: 'Renewal risk' },
  { key: 'expired', label: 'Expired' },
  { key: 'nosub',   label: 'No sub' },
];
const TONE_LABEL = { active: 'Paying', trial: 'On trial', comp: 'Comp access', risk: 'Renewal risk', expired: 'Expired', none: 'No subscription', inactive: 'Deactivated' };
const SUB_BADGE = { active: 'badge-green', trial: 'badge-blue', expired: 'badge-red', suspended: 'badge-yellow', cancelled: 'badge-gray' };
const TYPE_LABEL = { gated: 'Gated estate', residential: 'Residential close', apartments: 'Apartment complex', mixed: 'Mixed use', cooperative: 'Housing cooperative', commercial: 'Commercial park' };
const SOURCE_LABEL = { wizard: 'Guided setup', bulk: 'Bulk import', invite: 'Invitation', portfolio: 'Portfolio', self: 'Self sign-up', legacy: 'Legacy' };

const naira = (n) => `₦${Math.round(n || 0).toLocaleString()}`;
const planName = (sub) => (sub?.compActive ? sub?.compPlan?.name : sub?.planId?.name);
const monthlyValue = (e) => {
  const s = e.subscription;
  if (!s || s.compActive || s.status !== 'active' || !e.isActive) return 0;
  const p = s.planId?.price || {};
  return s.cycle === 'annual' ? (p.annual || 0) / 12 : (p.monthly || 0);
};
const place = (e) => [e.city, e.state].filter(Boolean).join(', ') || e.location?.formattedAddress?.split(',').slice(-3, -1).join(',').trim() || '';
const occupancy = (e) => {
  const cap = e.counts?.units || e.unitCount || 0;
  return cap ? Math.min(100, Math.round(((e.counts?.residents || 0) / cap) * 100)) : null;
};

function Avatar({ user, size = 28 }) {
  return (
    <span className="rounded-full bg-[#F2F4F7] text-[#475467] flex items-center justify-center font-semibold overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {user?.profilePhoto ? <img src={user.profilePhoto} alt="" className="w-full h-full object-cover" /> : (user?.name?.[0] || '?').toUpperCase()}
    </span>
  );
}

function ToneBadge({ e }) {
  const t = estateTone(e);
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#344054] whitespace-nowrap">
      <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[t] }} />{TONE_LABEL[t]}
    </span>
  );
}

function PlanCell({ sub }) {
  if (!sub) return <span className="badge badge-gray">No subscription</span>;
  const cls = sub.compActive ? 'badge-yellow' : (SUB_BADGE[sub.status] || 'badge-gray');
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-[13px] font-medium text-[#101828]">{planName(sub) || 'No plan'}</span>
        <span className={`badge ${cls} capitalize`}>{sub.compActive ? 'comp' : sub.status}</span>
      </div>
      <span className="text-[11px] text-[#98A2B3] tabular-nums whitespace-nowrap">
        {sub.status === 'trial' && sub.trialEndsAt ? `Trial ends ${format(new Date(sub.trialEndsAt), 'd MMM')}`
          : sub.compActive ? (sub.compExpiresAt ? `Comp until ${format(new Date(sub.compExpiresAt), 'd MMM')}` : 'Comp · no expiry')
          : sub.nextBillingDate ? `Renews ${format(new Date(sub.nextBillingDate), 'd MMM')}${sub.hasCard ? ` · ••${sub.cardLast4 || ''}` : ''}` : ''}
      </span>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, tone = '#475467' }) {
  return (
    <div className="rounded-lg border border-[#F2F4F7] bg-[#FCFCFD] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11.5px] text-[#667085]"><Icon size={12} style={{ color: tone }} />{label}</div>
      <div className="mt-0.5 text-[17px] font-semibold text-[#101828] tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-[#98A2B3]">{sub}</div>}
    </div>
  );
}

// Right-hand panel for the estate picked on the map / in the list
function EstatePanel({ e, onClose, onEdit, onToggle, toggling }) {
  const navigate = useNavigate();
  const s = e.subscription;
  const occ = occupancy(e);
  const mgr = e.managerId;
  const phone = (mgr?.phone || '').replace(/[^\d+]/g, '');
  const mapsUrl = e.location?.lat ? `https://www.google.com/maps/search/?api=1&query=${e.location.lat},${e.location.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address || '')}`;
  return (
    <div className="card h-full flex flex-col overflow-hidden animate-fade-in">
      <div className="px-4 pt-4 pb-3 border-b border-[#F2F4F7]">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-lg flex items-center justify-center text-[15px] font-semibold text-white flex-shrink-0" style={{ background: STATUS_COLOR[estateTone(e)] }}>
            {e.name?.[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-[#101828] leading-tight truncate">{e.name}</h3>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <button onClick={() => { navigator.clipboard?.writeText(e.estateCode); toast.success('Code copied'); }}
                className="inline-flex items-center gap-1 font-mono text-[11.5px] text-[#475467] px-1.5 py-0.5 rounded border border-[#E4E7EC] hover:bg-[#F9FAFB]">
                {e.estateCode} <Copy size={10} />
              </button>
              <ToneBadge e={e} />
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]" aria-label="Close"><X size={16} /></button>
        </div>
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2.5 flex items-start gap-1.5 text-[12.5px] text-[#475467] hover:text-[#059669]">
          <MapPin size={13} className="mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{e.address}</span>
        </a>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Metric icon={UsersIcon} label="Residents" value={e.counts?.residents ?? 0} tone="#059669" />
          <Metric icon={HomeIcon} label="Units" value={e.counts?.units ?? 0} sub={e.unitCount ? `${e.unitCount} planned` : null} tone="#2E90FA" />
          <Metric icon={DoorOpen} label="Visitors" value={e.counts?.visitorsWeek ?? 0} sub={`${e.counts?.visitorsToday ?? 0} today · 7 days`} tone="#7A5AF8" />
          <Metric icon={Bell} label="Open alerts" value={e.counts?.openAlerts ?? 0} tone={(e.counts?.openAlerts || 0) > 0 ? '#D92D20' : '#98A2B3'} />
        </div>

        {occ !== null && (
          <div>
            <div className="flex justify-between text-[12px] mb-1"><span className="text-[#667085]">Occupancy (residents per unit)</span><span className="font-medium text-[#101828] tabular-nums">{occ}%</span></div>
            <div className="h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full bg-[#059669]" style={{ width: `${occ}%` }} /></div>
          </div>
        )}

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">Manager</p>
          {mgr ? (
            <div className="rounded-lg border border-[#E4E7EC] p-3">
              <div className="flex items-center gap-2.5">
                <Avatar user={mgr} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-[#101828] truncate">{mgr.name}</p>
                  <p className="text-[11.5px] text-[#667085] truncate">{mgr.email}</p>
                </div>
              </div>
              {mgr.lastSeen && <p className="mt-2 text-[11px] text-[#98A2B3]">Last active {formatDistanceToNowStrict(new Date(mgr.lastSeen))} ago</p>}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                <a href={`mailto:${mgr.email}`} className="btn-outline !px-2 !py-1.5 text-[12px] justify-center"><Mail size={12} /> Email</a>
                <a href={phone ? `tel:${phone}` : undefined} className={`btn-outline !px-2 !py-1.5 text-[12px] justify-center ${phone ? '' : 'opacity-40 pointer-events-none'}`}><Phone size={12} /> Call</a>
                <a href={phone ? `https://wa.me/${phone.replace(/^\+/, '').replace(/^0/, '234')}` : undefined} target="_blank" rel="noreferrer" className={`btn-outline !px-2 !py-1.5 text-[12px] justify-center ${phone ? '' : 'opacity-40 pointer-events-none'}`}><MessageCircle size={12} /> Chat</a>
              </div>
            </div>
          ) : (
            <Link to="/onboarding?method=portfolio" className="flex items-center gap-2 rounded-lg border border-dashed border-[#FEC84B] bg-[#FFFAEB] p-3 text-[12.5px] text-[#B54708]">
              <UserX size={14} /> No manager — assign one <ArrowRight size={12} className="ml-auto" />
            </Link>
          )}
        </div>

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">Subscription</p>
          <dl className="rounded-lg border border-[#E4E7EC] divide-y divide-[#F2F4F7] text-[12.5px]">
            {[
              ['Plan', s ? <span className="flex items-center gap-1.5 justify-end">{s.compActive && <Gift size={12} className="text-[#F79009]" />}{planName(s) || '—'}</span> : 'None'],
              ['Status', s ? <span className={`badge ${s.compActive ? 'badge-yellow' : SUB_BADGE[s.status] || 'badge-gray'} capitalize`}>{s.compActive ? 'comp' : s.status}</span> : '—'],
              ['Monthly value', monthlyValue(e) ? naira(monthlyValue(e)) : '—'],
              [s?.status === 'trial' ? 'Trial ends' : 'Next billing', s?.status === 'trial' && s.trialEndsAt ? format(new Date(s.trialEndsAt), 'd MMM yyyy') : s?.nextBillingDate ? format(new Date(s.nextBillingDate), 'd MMM yyyy') : '—'],
              ['Card on file', s?.hasCard ? <span className="flex items-center gap-1 justify-end"><CreditCard size={12} /> ••{s.cardLast4}</span> : 'No'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-3 py-2"><dt className="text-[#667085]">{k}</dt><dd className="font-medium text-[#101828] text-right">{v}</dd></div>
            ))}
          </dl>
          {s?.renewalIssue && <p className="mt-2 flex items-start gap-1.5 text-[12px] text-[#B42318]"><AlertTriangle size={13} className="mt-0.5" />{s.renewalError || 'Last renewal failed'}</p>}
        </div>

        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">Profile</p>
          <dl className="rounded-lg border border-[#E4E7EC] divide-y divide-[#F2F4F7] text-[12.5px]">
            {[
              ['Type', TYPE_LABEL[e.estateType] || '—'],
              ['Location', place(e) || '—'],
              ['Office', [e.contactPhone, e.contactEmail].filter(Boolean).join(' · ') || '—'],
              ['Onboarded via', SOURCE_LABEL[e.onboarding?.source] || 'Self sign-up'],
              ['Joined', format(new Date(e.createdAt), 'd MMM yyyy')],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-3 py-2"><dt className="text-[#667085]">{k}</dt><dd className="font-medium text-[#101828] text-right truncate max-w-[60%]">{v}</dd></div>
            ))}
          </dl>
          {e.adminNotes && <p className="mt-2 text-[12px] text-[#475467] bg-[#F9FAFB] border border-[#F2F4F7] rounded-lg px-3 py-2 whitespace-pre-line">{e.adminNotes}</p>}
        </div>
      </div>

      <div className="p-3 border-t border-[#F2F4F7] grid grid-cols-[1fr_auto_auto] gap-2 bg-[#FCFCFD]">
        <button onClick={() => navigate(`/estates/${e._id}`)} className="btn-primary justify-center">Open estate <ArrowRight size={13} /></button>
        <button onClick={() => onEdit(e)} className="btn-outline !px-2.5" title="Edit"><Edit3 size={14} /></button>
        <button onClick={(ev) => onToggle(e, ev)} disabled={toggling === e._id} className={`btn-outline !px-2.5 ${e.isActive ? 'hover:!text-[#B42318]' : 'hover:!text-[#067647]'}`} title={e.isActive ? 'Deactivate' : 'Activate'}>
          {toggling === e._id ? <RefreshCw size={14} className="animate-spin" /> : e.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
        </button>
      </div>
    </div>
  );
}

// Network summary shown when no estate is selected
function NetworkPanel({ estates, tone, setTone }) {
  const tones = Object.keys(TONE_LABEL).map((t) => [t, estates.filter((e) => estateTone(e) === t).length]).filter(([, n]) => n);
  const byPlace = Object.entries(estates.reduce((m, e) => {
    const k = e.state || e.city || (e.location?.formattedAddress?.split(',').slice(-2, -1)[0] || '').replace(/\d+/g, '').trim() || 'Unknown';
    m[k] = (m[k] || 0) + 1; return m;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = byPlace[0]?.[1] || 1;
  const located = estates.filter((e) => e.location?.lat).length;
  return (
    <div className="card h-full flex flex-col overflow-hidden">
      <div className="px-4 py-3.5 border-b border-[#F2F4F7]">
        <h3 className="text-[14px] font-semibold text-[#101828]">Network</h3>
        <p className="text-[12px] text-[#667085]">{located} of {estates.length} estates on the map · click a pin for details</p>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">Status</p>
          <div className="space-y-1">
            {tones.map(([t, n]) => (
              <button key={t} onClick={() => setTone(tone === t ? null : t)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left text-[13px] transition-colors ${tone === t ? 'bg-[#F2F4F7]' : 'hover:bg-[#F9FAFB]'}`}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLOR[t] }} />
                <span className="flex-1 text-[#344054]">{TONE_LABEL[t]}</span>
                <span className="font-semibold text-[#101828] tabular-nums">{n}</span>
              </button>
            ))}
          </div>
          {tone && <button onClick={() => setTone(null)} className="mt-1.5 text-[12px] text-[#059669] font-medium">Clear map filter</button>}
        </div>
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#98A2B3] mb-2">Top locations</p>
          <div className="space-y-2">
            {byPlace.map(([k, n]) => (
              <div key={k}>
                <div className="flex justify-between text-[12.5px]"><span className="text-[#344054] truncate">{k}</span><span className="font-medium text-[#101828] tabular-nums">{n}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full rounded-full bg-[#10B981]" style={{ width: `${(n / max) * 100}%` }} /></div>
              </div>
            ))}
            {!byPlace.length && <p className="text-[12.5px] text-[#98A2B3]">No estates yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EstateCard({ e, onSelect, selected }) {
  const occ = occupancy(e);
  return (
    <button onClick={() => onSelect(e)}
      className={`text-left card p-4 hover:shadow-md transition-all ${selected ? '!border-[#059669] ring-4 ring-[#059669]/10' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-semibold text-white flex-shrink-0" style={{ background: STATUS_COLOR[estateTone(e)] }}>{e.name?.[0]?.toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#101828] truncate">{e.name}</p>
          <p className="text-[12px] text-[#667085] truncate flex items-center gap-1"><MapPin size={11} />{place(e) || e.address}</p>
        </div>
        <span className="font-mono text-[11px] text-[#98A2B3]">{e.estateCode}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1 text-center">
        {[['Residents', e.counts?.residents], ['Units', e.counts?.units], ['Visits 7d', e.counts?.visitorsWeek], ['Alerts', e.counts?.openAlerts]].map(([l, v]) => (
          <div key={l} className="rounded-md bg-[#F9FAFB] py-1.5">
            <div className={`text-[14px] font-semibold tabular-nums ${l === 'Alerts' && v ? 'text-[#D92D20]' : 'text-[#101828]'}`}>{v ?? 0}</div>
            <div className="text-[10.5px] text-[#98A2B3]">{l}</div>
          </div>
        ))}
      </div>
      {occ !== null && <div className="mt-3 h-1 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full bg-[#059669]" style={{ width: `${occ}%` }} /></div>}
      <div className="mt-3 pt-3 border-t border-[#F2F4F7] flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          {e.managerId ? <><Avatar user={e.managerId} size={22} /><span className="text-[12px] text-[#344054] truncate">{e.managerId.name}</span></> : <span className="badge badge-yellow">Unassigned</span>}
        </span>
        <PlanBadgeSmall sub={e.subscription} />
      </div>
    </button>
  );
}

function PlanBadgeSmall({ sub }) {
  if (!sub) return <span className="badge badge-gray">No sub</span>;
  return <span className={`badge ${sub.compActive ? 'badge-yellow' : SUB_BADGE[sub.status] || 'badge-gray'}`}>{planName(sub) || 'Plan'} · {sub.compActive ? 'comp' : sub.status}</span>;
}

export default function AdminEstates() {
  const navigate = useNavigate();
  const [estates, setEstates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subFilter, setSubFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [sortBy, setSortBy] = useState('new');
  const [tone, setTone] = useState(null);
  const [view, setView] = useState(() => { try { return localStorage.getItem('ac_estates_view') || 'table'; } catch { return 'table'; } });
  const [focusId, setFocusId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toggling, setToggling] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await estateAPI.getOverview();
      setEstates(data.data);
    } catch { toast.error('Failed to load estates'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { try { localStorage.setItem('ac_estates_view', view); } catch { /* ignore */ } }, [view]);

  const planOptions = Array.from(new Set(estates.map((e) => planName(e.subscription)).filter(Boolean))).sort();

  const openEdit = (e) => setEditing(e);

  const toggleActive = async (estate, ev) => {
    ev?.stopPropagation();
    setToggling(estate._id);
    try {
      await estateAPI.update(estate._id, { isActive: !estate.isActive });
      setEstates((prev) => prev.map((e) => (e._id === estate._id ? { ...e, isActive: !e.isActive } : e)));
      toast.success(estate.isActive ? `${estate.name} deactivated` : `${estate.name} activated`);
    } catch { toast.error('Action failed'); }
    finally { setToggling(null); }
  };

  const filtered = useMemo(() => estates.filter((e) => {
    if (statusFilter === 'active' && !e.isActive) return false;
    if (statusFilter === 'inactive' && e.isActive) return false;
    if (statusFilter === 'managed' && !e.managerId) return false;
    if (statusFilter === 'unmanaged' && e.managerId) return false;
    if (tone && estateTone(e) !== tone) return false;
    const sub = e.subscription;
    if (subFilter === 'trial' && sub?.status !== 'trial') return false;
    if (subFilter === 'active' && !(sub?.status === 'active' && !sub.compActive)) return false;
    if (subFilter === 'comp' && !sub?.compActive) return false;
    if (subFilter === 'risk' && !sub?.renewalIssue) return false;
    if (subFilter === 'expired' && !['expired', 'suspended', 'cancelled'].includes(sub?.status || '')) return false;
    if (subFilter === 'nosub' && sub) return false;
    if (planFilter !== 'all' && planName(sub) !== planFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.name, e.estateCode, e.address, e.city, e.state, e.managerId?.name, e.managerId?.email].some((v) => (v || '').toLowerCase().includes(q));
  }).sort((a, b) => {
    if (sortBy === 'residents') return (b.counts?.residents || 0) - (a.counts?.residents || 0);
    if (sortBy === 'visitors7d') return (b.counts?.visitorsWeek || 0) - (a.counts?.visitorsWeek || 0);
    if (sortBy === 'alerts') return (b.counts?.openAlerts || 0) - (a.counts?.openAlerts || 0);
    if (sortBy === 'value') return monthlyValue(b) - monthlyValue(a);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    return new Date(b.createdAt) - new Date(a.createdAt);
  }), [estates, statusFilter, tone, subFilter, planFilter, search, sortBy]);

  const counts = {
    all: estates.length,
    active: estates.filter((e) => e.isActive).length,
    inactive: estates.filter((e) => !e.isActive).length,
    managed: estates.filter((e) => e.managerId).length,
    unmanaged: estates.filter((e) => !e.managerId).length,
  };
  const totals = estates.reduce((t, e) => ({
    residents: t.residents + (e.counts?.residents || 0), units: t.units + (e.counts?.units || 0),
    visitors: t.visitors + (e.counts?.visitorsWeek || 0), alerts: t.alerts + (e.counts?.openAlerts || 0),
    mrr: t.mrr + monthlyValue(e), trials: t.trials + (e.subscription?.status === 'trial' ? 1 : 0),
  }), { residents: 0, units: 0, visitors: 0, alerts: 0, mrr: 0, trials: 0 });
  const hasFilters = search || statusFilter !== 'all' || subFilter !== 'all' || planFilter !== 'all' || tone;
  const focused = estates.find((e) => e._id === focusId) || null;
  const select = (e) => setFocusId((id) => (id === e._id ? null : e._id));

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader
        description={`${counts.all} estates · ${counts.active} active · ${counts.unmanaged} without a manager`}
        actions={
          <>
            <button onClick={load} className="btn-outline"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button>
            <div className="tabs">
              <button className={`tab inline-flex items-center gap-1.5 ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}><Rows3 size={13} /> Table</button>
              <button className={`tab inline-flex items-center gap-1.5 ${view === 'cards' ? 'active' : ''}`} onClick={() => setView('cards')}><LayoutGrid size={13} /> Cards</button>
            </div>
          </>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6 mb-5">
        <StatCard label="Estates" value={counts.all} icon={Building2} color="green" hint={`${counts.active} active · ${totals.trials} on trial`} />
        <StatCard label="Residents" value={totals.residents} icon={UsersIcon} color="blue" hint={`across ${counts.all} estates`} />
        <StatCard label="Units" value={totals.units} icon={HomeIcon} color="purple" hint={totals.units ? `${Math.round((totals.residents / totals.units) * 100)}% occupied` : 'none registered'} />
        <StatCard label="Paid MRR" value={naira(totals.mrr)} icon={Wallet} color="green" hint="excludes trials & comp" />
        <StatCard label="Visitors · 7 days" value={totals.visitors} icon={DoorOpen} color="amber" />
        <StatCard label="Open alerts" value={totals.alerts} icon={Bell} color={totals.alerts ? 'red' : 'green'} hint={counts.unmanaged ? `${counts.unmanaged} unmanaged estates` : 'all estates managed'} />
      </div>

      {/* Map + side panel */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] mb-5">
        <div className="card overflow-hidden" style={{ isolation: 'isolate' }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#F2F4F7]">
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-[#059669]" />
              <h3 className="text-[14px] font-semibold text-[#101828]">Estate map</h3>
              {tone && <span className="badge badge-gray">{TONE_LABEL[tone]}</span>}
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[11.5px] text-[#667085]">
              {['active', 'trial', 'comp', 'risk', 'none'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[t] }} />{TONE_LABEL[t]}</span>
              ))}
            </div>
          </div>
          {loading && !estates.length ? <div className="skeleton h-[440px] rounded-none" /> : <EstatesMap estates={filtered} selectedId={focusId} onSelect={select} height={440} />}
        </div>
        <div className="lg:h-[490px] min-h-[320px]">
          {focused
            ? <EstatePanel key={focused._id} e={focused} onClose={() => setFocusId(null)} onEdit={openEdit} onToggle={toggleActive} toggling={toggling} />
            : <NetworkPanel estates={estates} tone={tone} setTone={setTone} />}
        </div>
      </div>

      {/* Directory */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#F2F4F7] flex flex-col gap-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="tabs overflow-x-auto">
              {STATUS_FILTERS.map((f) => (
                <button key={f} className={`tab capitalize ${statusFilter === f ? 'active' : ''}`} onClick={() => setStatusFilter(f)}>
                  {f} <span className="text-[#98A2B3] font-normal tabular-nums">{counts[f]}</span>
                </button>
              ))}
            </div>
            <div className="lg:ml-auto flex items-center gap-2 h-9 px-3 rounded-lg border border-[#D0D5DD] bg-white lg:w-80">
              <Search size={14} className="text-[#98A2B3]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, code, city, manager…" className="flex-1 bg-transparent outline-none text-[13px] min-w-0" />
              {search && <button onClick={() => setSearch('')} className="text-[#98A2B3]"><X size={13} /></button>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="tabs overflow-x-auto">
              {SUB_FILTERS.map((f) => <button key={f.key} className={`tab ${subFilter === f.key ? 'active' : ''}`} onClick={() => setSubFilter(f.key)}>{f.label}</button>)}
            </div>
            <select className="input-field !w-auto !h-9 !py-0" value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
              <option value="all">All plans</option>
              {planOptions.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="input-field !w-auto !h-9 !py-0" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="new">Newest</option>
              <option value="name">Name A–Z</option>
              <option value="residents">Most residents</option>
              <option value="visitors7d">Most visitors (7d)</option>
              <option value="alerts">Most alerts</option>
              <option value="value">Highest value</option>
            </select>
            {hasFilters && (
              <button className="btn-ghost text-[12px]" onClick={() => { setSearch(''); setStatusFilter('all'); setSubFilter('all'); setPlanFilter('all'); setTone(null); }}>Clear filters</button>
            )}
          </div>
        </div>

        {loading && !estates.length ? (
          <div className="p-4 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : !filtered.length ? (
          <div className="py-14 text-center">
            <span className="mx-auto w-11 h-11 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center"><Building2 size={18} /></span>
            <p className="mt-3 text-[14px] font-semibold text-[#101828]">{hasFilters ? 'No estates match these filters' : 'No estates yet'}</p>
            <p className="mt-1 text-[12.5px] text-[#667085]">{hasFilters ? 'Try clearing a filter.' : 'Onboard your first estate to see it here.'}</p>
            {!hasFilters && <Link to="/onboarding" className="btn-primary mt-4 inline-flex">Onboard estates</Link>}
          </div>
        ) : view === 'cards' ? (
          <div className="p-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((e) => <EstateCard key={e._id} e={e} selected={focusId === e._id} onSelect={(x) => { select(x); window.scrollTo?.({ top: 0, behavior: 'smooth' }); document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' }); }} />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[1180px]">
              <thead>
                <tr>
                  <th>Estate</th><th>Location</th><th>Manager</th><th>Plan</th><th>Status</th>
                  <th className="!text-right">Residents</th><th className="!text-right">Occupancy</th><th className="!text-right">Visitors 7d</th>
                  <th className="!text-right">Alerts</th><th className="!text-right">Value / mo</th><th>Joined</th><th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => {
                  const occ = occupancy(e);
                  return (
                    <tr key={e._id} onClick={() => select(e)} className={`cursor-pointer ${focusId === e._id ? '!bg-[#F6FEF9]' : ''}`}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-[12.5px] font-semibold text-white flex-shrink-0" style={{ background: STATUS_COLOR[estateTone(e)] }}>{e.name?.[0]?.toUpperCase()}</span>
                          <div className="min-w-0">
                            <div className="cell-strong truncate max-w-[200px]">{e.name}</div>
                            <div className="font-mono text-[11px] text-[#98A2B3]">{e.estateCode}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="text-[12.5px] text-[#344054] truncate max-w-[180px]" title={e.address}>{place(e) || e.address}</div>
                        {!e.location?.lat && <div className="text-[11px] text-[#B54708]">Not on map</div>}
                      </td>
                      <td>
                        {e.managerId ? (
                          <div className="flex items-center gap-2">
                            <Avatar user={e.managerId} />
                            <div className="min-w-0"><div className="text-[13px] text-[#101828] truncate max-w-[150px]">{e.managerId.name}</div><div className="text-[11px] text-[#98A2B3] truncate max-w-[150px]">{e.managerId.email}</div></div>
                          </div>
                        ) : <span className="badge badge-yellow">Unassigned</span>}
                      </td>
                      <td><PlanCell sub={e.subscription} /></td>
                      <td><ToneBadge e={e} /></td>
                      <td className="text-right tabular-nums cell-strong">{e.counts?.residents ?? 0}</td>
                      <td className="text-right">
                        {occ === null ? <span className="text-[#98A2B3]">—</span> : (
                          <div className="inline-flex items-center gap-2"><div className="w-14 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full bg-[#059669]" style={{ width: `${occ}%` }} /></div><span className="tabular-nums text-[12px]">{occ}%</span></div>
                        )}
                      </td>
                      <td className="text-right tabular-nums whitespace-nowrap">{e.counts?.visitorsWeek ?? 0}<span className="text-[#98A2B3] text-[11px]"> · {e.counts?.visitorsToday ?? 0} today</span></td>
                      <td className="text-right">{(e.counts?.openAlerts || 0) > 0 ? <span className="badge badge-red">{e.counts.openAlerts}</span> : <span className="text-[#98A2B3]">0</span>}</td>
                      <td className="text-right tabular-nums">{monthlyValue(e) ? naira(monthlyValue(e)) : <span className="text-[#98A2B3]">—</span>}</td>
                      <td className="whitespace-nowrap text-[12.5px]">{format(new Date(e.createdAt), 'd MMM yy')}</td>
                      <td onClick={(ev) => ev.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={(ev) => toggleActive(e, ev)} disabled={toggling === e._id} title={e.isActive ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-md text-[#98A2B3] disabled:opacity-40 ${e.isActive ? 'hover:text-[#B42318] hover:bg-[#FEF3F2]' : 'hover:text-[#067647] hover:bg-[#ECFDF3]'}`}>
                            {toggling === e._id ? <RefreshCw size={14} className="animate-spin" /> : e.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                          </button>
                          <button onClick={() => openEdit(e)} title="Edit" className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]"><Edit3 size={14} /></button>
                          <button onClick={() => navigate(`/estates/${e._id}`)} title="Open" className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#059669] hover:bg-[#ECFDF3]"><ExternalLink size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!!filtered.length && (
          <div className="px-4 py-2.5 border-t border-[#F2F4F7] text-[12px] text-[#667085] flex items-center gap-2">
            <CalendarClock size={12} /> Showing {filtered.length} of {estates.length} estates · click a row to see it on the map
          </div>
        )}
      </div>

      <EditEstateDrawer estate={editing} open={!!editing} onClose={() => setEditing(null)} onSaved={() => load()} />
    </div>
  );
}
