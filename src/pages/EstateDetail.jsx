import { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { estateAPI, planAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import GoogleMapEmbed, { mapsQuery } from '../components/estates/GoogleMapEmbed';
import EditEstateDrawer from '../components/estates/EditEstateDrawer';
import {
  Building2, MapPin, User, Hash, Users, Home, Shield,
  CheckCircle, XCircle, ArrowLeft, Edit3, Copy, Calendar,
  Phone, Mail, UserCheck, UserX, CreditCard, RefreshCw,
  ToggleLeft, ToggleRight, Clock, AlertCircle, DollarSign,
  ChevronDown, ChevronUp, AlertTriangle, Megaphone, Siren, Pin, Gift, ArrowRight,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// A unit's real dues position, computed server-side from its residents'
// bills (server/utils/unitDues). Replaces the old manual "Paid/Unpaid" flag,
// which defaulted to paid and never reflected actual payments.
const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const shortDay = (d) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' });
function unitDuesView(d = {}) {
  switch (d.status) {
    case 'overdue': return { color: '#B42318', label: `${naira(d.overdueAmount)} overdue`,
      detail: `${d.overdueCount} bill${d.overdueCount > 1 ? 's' : ''} past due${d.outstanding > d.overdueAmount ? ` · ${naira(d.outstanding)} owed` : ''}` };
    case 'owing': return { color: '#B54708', label: `${naira(d.outstanding)} owing`,
      detail: d.nextDue ? `Next due ${shortDay(d.nextDue.dueDate)}` : '' };
    case 'clear': return { color: '#067647', label: 'All bills paid',
      detail: d.lastPaidAt ? `Last paid ${shortDay(d.lastPaidAt)} · ${naira(d.paidThisYear)} this year` : '' };
    case 'exempt': return { color: '#475467', label: 'Exempt', detail: '' };
    case 'no_residents': return { color: '#98A2B3', label: 'No residents to bill', detail: '' };
    default: return { color: '#98A2B3', label: 'No bills issued yet', detail: '' };
  }
}


function copyText(text) {
  navigator.clipboard.writeText(text);
  toast.success('Copied!');
}

const SUB_STATUS = {
  active:    { label: 'Active',    badge: 'badge-green',  color: 'green' },
  trial:     { label: 'Trial',     badge: 'badge-blue',   color: 'blue' },
  expired:   { label: 'Expired',   badge: 'badge-red',    color: 'red' },
  suspended: { label: 'Suspended', badge: 'badge-yellow', color: 'amber' },
  cancelled: { label: 'Cancelled', badge: 'badge-gray',   color: 'amber' },
};

const ONBOARDING_SOURCE = {
  self: 'Self sign-up', wizard: 'Onboarding wizard', bulk: 'Bulk import',
  invite: 'Invite', portfolio: 'Portfolio', legacy: 'Legacy',
};

function Empty({ icon: Icon, title, hint, action }) {
  return (
    <div className="py-12 text-center px-4">
      <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mx-auto mb-3">
        <Icon size={18} className="text-[#98A2B3]" />
      </div>
      <p className="text-[13.5px] font-medium text-[#101828]">{title}</p>
      {hint && <p className="text-[12.5px] text-[#98A2B3] mt-0.5">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-[#98A2B3] flex items-center gap-1 mb-1">
        {Icon && <Icon size={12} />}{label}
      </dt>
      <dd className="text-[13px] text-[#101828] min-w-0">{children}</dd>
    </div>
  );
}

const Dash = () => <span className="text-[#D0D5DD]">—</span>;

export default function EstateDetail() {
  const { estateId } = useParams();
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [subscription, setSub]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editOpen, setEditOpen]   = useState(false);
  const [toggling, setToggling]   = useState(false);
  const [tab, setTab]             = useState('residents');
  const [expandedUnit, setExpandedUnit] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // Single-trip detail now includes subscription + recent visitors / alerts /
      // announcements / payments. No more O(all-subs) fetch per estate.
      const { data } = await estateAPI.getDetail(estateId);
      setData(data.data);
      setSub(data.data.subscription || null);
    } catch {
      toast.error('Failed to load estate');
      navigate('/estates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [estateId]);

  const openEdit = () => setEditOpen(true);

  const toggleActive = async () => {
    setToggling(true);
    try {
      await estateAPI.update(estateId, { isActive: !data.estate.isActive });
      toast.success(data.estate.isActive ? 'Estate deactivated' : 'Estate activated');
      load();
    } catch { toast.error('Action failed'); }
    finally { setToggling(false); }
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner size={32} /></div>;
  if (!data) return null;

  const { estate, residents, securityStaff, units, visitors = [], alerts = [], announcements = [], payments = [] } = data;
  const activeResidents   = residents.filter(r => r.isActive).length;
  const occupiedUnits     = units.filter(u => u.status === 'occupied').length;
  const unitsByType       = units.reduce((acc, u) => { acc[u.type] = (acc[u.type] || 0) + 1; return acc; }, {});
  const activeStaff       = securityStaff.filter(s => s.isActive).length;
  const openAlerts        = alerts.filter(a => ['open', 'acknowledged'].includes(a.status));

  const tabs = [
    { id: 'residents',    label: 'Residents',     count: residents.length,     icon: Users    },
    { id: 'units',        label: 'Units',         count: units.length,         icon: Home     },
    { id: 'security',     label: 'Security',      count: securityStaff.length, icon: Shield   },
    { id: 'visitors',     label: 'Visitors',      count: visitors.length,      icon: UserCheck },
    { id: 'alerts',       label: 'Alerts',        count: openAlerts.length,    icon: AlertTriangle },
    { id: 'payments',     label: 'Payments',      count: payments.length,      icon: CreditCard },
    { id: 'announcements',label: 'Announcements', count: announcements.length, icon: Megaphone },
    { id: 'subscription', label: 'Subscription',                               icon: CreditCard },
  ];

  const subStyle = subscription ? (SUB_STATUS[subscription.status] || SUB_STATUS.expired) : null;
  const occupancyPct = units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0;
  const location = [estate.city, estate.state].filter(Boolean).join(', ');

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <button onClick={() => navigate('/estates')}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#475467] hover:text-[#101828] mb-3 transition-colors">
        <ArrowLeft size={14} /> All estates
      </button>

      <PageHeader heading
        title={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[15px] font-semibold bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6] flex-shrink-0">
              {estate.name[0]}
            </span>
            <span className="min-w-0 break-words">{estate.name}</span>
            <span className={`badge ${estate.isActive ? 'badge-green' : 'badge-red'} inline-flex items-center gap-1`}>
              {estate.isActive ? <CheckCircle size={11} /> : <XCircle size={11} />}
              {estate.isActive ? 'Active' : 'Inactive'}
            </span>
            {subscription && (
              <span className={`badge ${subStyle.badge} inline-flex items-center gap-1`}>
                <CreditCard size={11} />
                {subscription.planId?.name || 'Plan'} · {subStyle.label}
              </span>
            )}
          </span>
        }
        description={
          <span className="flex items-center gap-x-3 gap-y-1 flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Hash size={12} className="text-[#98A2B3]" />
              <span className="font-mono tracking-wider text-[#101828]">{estate.estateCode}</span>
              <button onClick={() => copyText(estate.estateCode)} title="Copy code"
                className="text-[#98A2B3] hover:text-[#059669] transition-colors">
                <Copy size={12} />
              </button>
            </span>
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <MapPin size={12} className="text-[#98A2B3] flex-shrink-0" />
              <span className="break-words">{estate.address}</span>
            </span>
          </span>
        }
        actions={
          <>
            <button onClick={toggleActive} disabled={toggling}
              className={`btn-outline gap-2 disabled:opacity-50 ${estate.isActive ? '!text-[#B42318]' : '!text-[#067647]'}`}>
              {toggling
                ? <RefreshCw size={14} className="animate-spin" />
                : estate.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />
              }
              {estate.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={openEdit} className="btn-primary gap-2">
              <Edit3 size={14} /> Edit estate
            </button>
          </>
        }
      />

      <div className="space-y-5">
        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <StatCard label="Residents" value={residents.length} icon={Users} color="green"
            hint={`${activeResidents} active · ${residents.length - activeResidents} suspended`} />
          <StatCard label="Occupied units" value={`${occupiedUnits}/${units.length}`} icon={Home} color="blue"
            hint={`${occupancyPct}% occupancy`} />
          <StatCard label="Security staff" value={securityStaff.length} icon={Shield} color="amber"
            hint={`${activeStaff} active`} />
          <StatCard label="Plan status" value={subscription ? (subStyle?.label || '—') : 'None'} icon={CreditCard}
            color={subscription ? subStyle?.color : 'red'}
            hint={subscription?.planId?.name || 'No subscription'} />
        </div>

        {/* Location */}
        <div className="card overflow-hidden" style={{ isolation: 'isolate' }}>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="relative">
              <GoogleMapEmbed estate={estate} height={300} zoom={estate.location?.lat ? 17 : 15} />
              {!estate.location?.lat && (
                <span className="absolute left-3 top-3 px-2.5 py-1 rounded-md bg-white/95 border border-[#FEDF89] text-[11.5px] text-[#B54708] shadow-sm">
                  Showing Google's best match for the address — set an exact pin in Edit estate
                </span>
              )}
            </div>
            <div className="p-5 border-t lg:border-t-0 lg:border-l border-[#F2F4F7] flex flex-col">
              <div className="card-title flex items-center gap-1.5"><MapPin size={14} className="text-[#059669]" /> Location</div>
              <p className="mt-2 text-[13px] text-[#344054] leading-relaxed">{estate.location?.formattedAddress || estate.address}</p>
              {location && <p className="mt-1 text-[12px] text-[#667085]">{location}</p>}
              <dl className="mt-4 space-y-1.5 text-[12px]">
                <div className="flex justify-between"><dt className="text-[#98A2B3]">Coordinates</dt><dd className="font-mono text-[#475467]">{estate.location?.lat ? `${estate.location.lat.toFixed(5)}, ${estate.location.lng.toFixed(5)}` : 'Not geocoded'}</dd></div>
                {estate.location?.geocodedAt && <div className="flex justify-between"><dt className="text-[#98A2B3]">Pinned</dt><dd className="text-[#475467]">{format(new Date(estate.location.geocodedAt), 'MMM d, yyyy')}</dd></div>}
              </dl>
              <div className="mt-auto pt-4 grid grid-cols-2 gap-2">
                <a className="btn-outline justify-center text-[12px]" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery(estate))}`}>
                  <MapPin size={13} /> Open map
                </a>
                <a className="btn-outline justify-center text-[12px]" target="_blank" rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery(estate))}`}>
                  <ArrowRight size={13} /> Directions
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Profile + manager */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="card-header">
              <div>
                <div className="card-title">Estate profile</div>
                <div className="card-sub">Details captured at onboarding</div>
              </div>
            </div>
            <dl className="p-5 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
              <Field label="Estate code" icon={Hash}>
                <span className="font-mono tracking-wider font-semibold">{estate.estateCode}</span>
              </Field>
              <Field label="Estate type" icon={Building2}>
                {estate.estateType ? <span className="capitalize">{estate.estateType}</span> : <Dash />}
              </Field>
              <Field label="City / state" icon={MapPin}>
                {location || <Dash />}
              </Field>
              <Field label="Planned units" icon={Home}>
                {estate.unitCount ? <span className="tabular-nums">{Number(estate.unitCount).toLocaleString()}</span> : <Dash />}
              </Field>
              <Field label="Created" icon={Calendar}>
                <div className="tabular-nums">{format(new Date(estate.createdAt), 'MMM d, yyyy')}</div>
                <div className="text-[11.5px] text-[#98A2B3]">{formatDistanceToNow(new Date(estate.createdAt), { addSuffix: true })}</div>
              </Field>
              <Field label="Onboarding source" icon={Clock}>
                {estate.onboarding?.source
                  ? <span className="badge badge-gray">{ONBOARDING_SOURCE[estate.onboarding.source] || estate.onboarding.source}</span>
                  : <Dash />}
              </Field>
              <div className="col-span-2 md:col-span-3">
                <Field label="Address" icon={MapPin}>
                  {estate.address || <Dash />}
                </Field>
              </div>
              <div className="col-span-2 md:col-span-3">
                <Field label="Unit types" icon={Building2}>
                  {Object.keys(unitsByType).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(unitsByType).map(([type, count]) => (
                        <span key={type} className="badge badge-gray capitalize">{type}: {count}</span>
                      ))}
                    </div>
                  ) : <span className="text-[#98A2B3]">No units</span>}
                </Field>
              </div>
              {estate.adminNotes && (
                <div className="col-span-2 md:col-span-3">
                  <Field label="Admin notes" icon={Edit3}>
                    <p className="text-[13px] text-[#475467] whitespace-pre-line rounded-lg bg-[#F9FAFB] border border-[#F2F4F7] px-3 py-2">
                      {estate.adminNotes}
                    </p>
                  </Field>
                </div>
              )}
            </dl>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Contacts</div>
                <div className="card-sub">Manager and estate office</div>
              </div>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="text-[12px] font-medium text-[#98A2B3] flex items-center gap-1 mb-1.5">
                  <User size={12} /> Estate manager
                </div>
                {estate.managerId ? (
                  <div className="space-y-1">
                    <div className="text-[13.5px] font-semibold text-[#101828]">{estate.managerId.name}</div>
                    <a href={`mailto:${estate.managerId.email}`}
                      className="flex items-center gap-1.5 text-[12.5px] text-[#475467] hover:text-[#059669] hover:underline break-all">
                      <Mail size={12} className="text-[#98A2B3] flex-shrink-0" />{estate.managerId.email}
                    </a>
                    {estate.managerId.phone && (
                      <a href={`tel:${estate.managerId.phone}`}
                        className="flex items-center gap-1.5 text-[12.5px] text-[#475467] hover:underline tabular-nums">
                        <Phone size={12} className="text-[#98A2B3]" />{estate.managerId.phone}
                      </a>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="badge badge-yellow">Unassigned</span>
                    <div className="text-[12px] text-[#98A2B3] mt-1">No manager assigned</div>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t border-[#F2F4F7]">
                <div className="text-[12px] font-medium text-[#98A2B3] flex items-center gap-1 mb-1.5">
                  <Building2 size={12} /> Estate contact
                </div>
                {estate.contactPhone || estate.contactEmail ? (
                  <div className="space-y-1">
                    {estate.contactEmail && (
                      <a href={`mailto:${estate.contactEmail}`}
                        className="flex items-center gap-1.5 text-[12.5px] text-[#475467] hover:text-[#059669] hover:underline break-all">
                        <Mail size={12} className="text-[#98A2B3] flex-shrink-0" />{estate.contactEmail}
                      </a>
                    )}
                    {estate.contactPhone && (
                      <a href={`tel:${estate.contactPhone}`}
                        className="flex items-center gap-1.5 text-[12.5px] text-[#475467] hover:underline tabular-nums">
                        <Phone size={12} className="text-[#98A2B3]" />{estate.contactPhone}
                      </a>
                    )}
                  </div>
                ) : <span className="text-[12.5px] text-[#98A2B3]">No contact details on file</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="tabs">
            {tabs.map(({ id, label, count, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`tab inline-flex items-center gap-1.5 ${tab === id ? 'active' : ''}`}>
                <Icon size={13} className={tab === id ? 'text-[#059669]' : 'text-[#98A2B3]'} />
                {label}
                {count !== undefined && (
                  <span className="text-[11px] tabular-nums text-[#98A2B3]">{count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Residents tab ── */}
        {tab === 'residents' && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <div className="card-title">Residents</div>
                <div className="card-sub">
                  {residents.length} total · {activeResidents} active · {residents.length - activeResidents} suspended
                </div>
              </div>
            </div>
            {residents.length === 0 ? (
              <Empty icon={Users} title="No residents yet" hint="Residents appear here once they join with the estate code." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[560px]">
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th className="hidden md:table-cell">Contact</th>
                      <th className="hidden lg:table-cell">Unit</th>
                      <th className="hidden xl:table-cell">Joined</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map(r => (
                      <tr key={r._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[12px] flex-shrink-0 bg-[#F2F4F7] text-[#344054]">
                              {r.name[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="cell-strong">{r.name}</div>
                              <div className="text-[11.5px] text-[#98A2B3] md:hidden truncate">{r.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-[12.5px] hover:underline">
                            <Mail size={11} className="text-[#98A2B3]" />{r.email}
                          </a>
                          {r.phone && (
                            <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-[12px] text-[#98A2B3] hover:underline tabular-nums">
                              <Phone size={11} />{r.phone}
                            </a>
                          )}
                        </td>
                        <td className="hidden lg:table-cell">
                          {r.unitId
                            ? <span className="text-[#101828]">{r.unitId.block ? `Block ${r.unitId.block} · ` : ''}Unit {r.unitId.unitNumber}</span>
                            : <span className="text-[#98A2B3]">No unit</span>}
                        </td>
                        <td className="hidden xl:table-cell tabular-nums text-[#667085]">
                          {r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td>
                          <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'} inline-flex items-center gap-1`}>
                            {r.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                            {r.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Units tab ── */}
        {tab === 'units' && (
          <div className="space-y-5">
            {/* Unit type summary */}
            {Object.keys(unitsByType).length > 0 && (
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Unit breakdown</div>
                    <div className="card-sub">{occupiedUnits} of {units.length} occupied · {occupancyPct}% occupancy</div>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Object.entries(unitsByType).map(([type, count]) => {
                    const typeUnits = units.filter(u => u.type === type);
                    const typeOccupied = typeUnits.filter(u => u.status === 'occupied').length;
                    return (
                      <div key={type} className="px-3.5 py-3 rounded-lg border border-[#E4E7EC] capitalize">
                        <div className="text-[18px] font-semibold text-[#101828] tabular-nums">{count}</div>
                        <div className="text-[12.5px] font-medium text-[#475467]">{type}</div>
                        <div className="text-[11.5px] text-[#98A2B3]">{typeOccupied} occupied</div>
                      </div>
                    );
                  })}
                  <div className="px-3.5 py-3 rounded-lg border border-[#ABEFC6] bg-[#ECFDF3]">
                    <div className="text-[18px] font-semibold text-[#067647] tabular-nums">{occupiedUnits}/{units.length}</div>
                    <div className="text-[12.5px] font-medium text-[#067647]">Occupied</div>
                    <div className="text-[11.5px] text-[#475467]">{occupancyPct}% occupancy</div>
                  </div>
                </div>
              </div>
            )}

            <div className="card overflow-hidden">
              <div className="card-header">
                <div>
                  <div className="card-title">Units</div>
                  <div className="card-sub">{units.length} units · dues position from residents' bills</div>
                </div>
              </div>
              {units.length === 0 ? (
                <Empty icon={Home} title="No units added yet" hint="Units are created by the estate manager." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Unit</th>
                        <th>Type</th>
                        <th>Occupancy</th>
                        <th className="hidden sm:table-cell">Dues</th>
                        <th className="hidden md:table-cell">Residents</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map(u => {
                        const count = (u.residentIds || []).length;
                        const max   = u.maxOccupants || 7;
                        const expanded = expandedUnit === u._id;
                        const unitResidents = residents.filter(r => r.unitId?._id === u._id || r.unitId === u._id);
                        return (
                          <Fragment key={u._id}>
                            <tr>
                              <td className="cell-strong whitespace-nowrap">
                                {u.block ? `Block ${u.block} · ` : ''}Unit {u.unitNumber}
                              </td>
                              <td className="capitalize">{u.type}</td>
                              <td>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 rounded-full overflow-hidden bg-[#F2F4F7]">
                                    <div className="h-full rounded-full"
                                      style={{
                                        width: `${(count / max) * 100}%`,
                                        background: count >= max ? '#F04438' : count > 0 ? '#059669' : '#D0D5DD',
                                      }} />
                                  </div>
                                  <span className="text-[12px] font-medium tabular-nums"
                                    style={{ color: count >= max ? '#B42318' : count > 0 ? '#067647' : '#98A2B3' }}>
                                    {count}/{max}
                                  </span>
                                </div>
                              </td>
                              <td className="hidden sm:table-cell">
                                {(() => {
                                  const dv = unitDuesView(u.dues);
                                  return (
                                    <div className="text-[12px] leading-tight">
                                      <div className="font-semibold tabular-nums" style={{ color: dv.color }}>{dv.label}</div>
                                      {dv.detail && <div className="mt-0.5 text-[#98A2B3]">{dv.detail}</div>}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="hidden md:table-cell text-[12.5px]">
                                {unitResidents.length > 0
                                  ? unitResidents.slice(0, 2).map(r => r.name.split(' ')[0]).join(', ') + (unitResidents.length > 2 ? ` +${unitResidents.length - 2}` : '')
                                  : <span className="text-[#98A2B3]">Vacant</span>}
                              </td>
                              <td>
                                {unitResidents.length > 0 && (
                                  <button onClick={() => setExpandedUnit(expanded ? null : u._id)}
                                    className="p-1 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7] transition-colors">
                                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {expanded && unitResidents.map(r => (
                              <tr key={`${u._id}-${r._id}`} className="bg-[#F9FAFB]">
                                <td colSpan={2} className="!pl-8">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 bg-white border border-[#E4E7EC] text-[#344054]">
                                      {r.name[0]}
                                    </div>
                                    <span className="text-[12.5px] font-medium text-[#101828]">{r.name}</span>
                                  </div>
                                </td>
                                <td className="text-[12px] text-[#98A2B3]">{r.email}</td>
                                <td className="hidden sm:table-cell text-[12px] text-[#98A2B3] tabular-nums">{r.phone || '—'}</td>
                                <td colSpan={2}>
                                  <span className={`badge ${r.isActive ? 'badge-green' : 'badge-red'}`}>
                                    {r.isActive ? 'Active' : 'Suspended'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Security tab ── */}
        {tab === 'security' && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <div className="card-title">Security staff</div>
                <div className="card-sub">
                  {securityStaff.length} total · {activeStaff} active · {securityStaff.length - activeStaff} inactive
                </div>
              </div>
            </div>
            {securityStaff.length === 0 ? (
              <Empty icon={Shield} title="No security staff registered" hint="Gate staff added by the manager appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Staff member</th>
                      <th className="hidden md:table-cell">Contact</th>
                      <th className="hidden lg:table-cell">Joined</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {securityStaff.map(s => (
                      <tr key={s._id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[12px] flex-shrink-0 bg-[#FFFAEB] text-[#B54708]">
                              {s.name[0]}
                            </div>
                            <div className="cell-strong">{s.name}</div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-[12.5px] hover:underline">
                            <Mail size={11} className="text-[#98A2B3]" />{s.email}
                          </a>
                          {s.phone && (
                            <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-[12px] text-[#98A2B3] hover:underline tabular-nums">
                              <Phone size={11} />{s.phone}
                            </a>
                          )}
                        </td>
                        <td className="hidden lg:table-cell tabular-nums text-[#667085]">
                          {s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td>
                          <span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Visitors tab ── */}
        {tab === 'visitors' && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <div className="card-title">Recent visitors</div>
                <div className="card-sub">{visitors.length} most recent visitor passes</div>
              </div>
            </div>
            {visitors.length === 0 ? (
              <Empty icon={UserCheck} title="No visitor activity yet" hint="Visitor passes created by residents appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[600px]">
                  <thead>
                    <tr>
                      <th>Visitor</th>
                      <th>Host</th>
                      <th>Code</th>
                      <th>Status</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map(v => (
                      <tr key={v._id}>
                        <td>
                          <div className="cell-strong">{v.name}</div>
                          {v.phone && <div className="text-[11.5px] text-[#98A2B3] tabular-nums">{v.phone}</div>}
                        </td>
                        <td>{v.hostName || '—'}</td>
                        <td className="font-mono text-[12px] tracking-wider text-[#101828]">{v.accessCode || '—'}</td>
                        <td>
                          <span className={`badge capitalize ${v.status === 'checked_in' ? 'badge-green' : v.status === 'checked_out' ? 'badge-gray' : 'badge-yellow'}`}>
                            {String(v.status || 'pending').replace('_', ' ')}
                          </span>
                        </td>
                        <td className="text-[12px] text-[#98A2B3] whitespace-nowrap">
                          {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Alerts tab ── */}
        {tab === 'alerts' && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <div className="card-title">Security alerts</div>
                <div className="card-sub">{alerts.length} recent · {openAlerts.length} open or acknowledged</div>
              </div>
            </div>
            {alerts.length === 0 ? (
              <Empty icon={AlertTriangle} title="No security alerts" hint="Panic and incident alerts from this estate appear here." />
            ) : (
              <ul className="divide-y divide-[#F2F4F7]">
                {alerts.map(a => (
                  <li key={a._id} className="px-5 py-3.5 flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${a.severity === 'critical' ? 'bg-[#FEF3F2] text-[#B42318]' : a.severity === 'high' ? 'bg-[#FFFAEB] text-[#B54708]' : 'bg-[#F2F4F7] text-[#475467]'}`}>
                      <Siren size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#101828]">{a.title || a.type || 'Alert'}</span>
                        <span className={`badge capitalize ${a.status === 'open' ? 'badge-red' : a.status === 'resolved' ? 'badge-green' : 'badge-gray'}`}>
                          {a.status || 'open'}
                        </span>
                        {a.isEmergencyBroadcast && <span className="badge badge-red">Broadcast</span>}
                      </div>
                      {a.note && <div className="text-[13px] text-[#475467] mt-1">{a.note}</div>}
                      <div className="text-[12px] text-[#98A2B3] mt-1">
                        {a.residentId?.name && <>By {a.residentId.name} · </>}
                        {a.unitId && <>Unit {a.unitId.unitNumber} · </>}
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Payments tab ── */}
        {tab === 'payments' && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <div className="card-title">Payments</div>
                <div className="card-sub">{payments.length} recent resident payments</div>
              </div>
            </div>
            {payments.length === 0 ? (
              <Empty icon={CreditCard} title="No payments yet" hint="Resident dues payments appear here." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[600px]">
                  <thead>
                    <tr>
                      <th>Resident</th>
                      <th>Schedule</th>
                      <th className="!text-right">Amount</th>
                      <th>Status</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p._id}>
                        <td className="cell-strong">{p.residentId?.name || '—'}</td>
                        <td>{p.scheduleId?.title || '—'}</td>
                        <td className="text-right font-semibold text-[#101828] tabular-nums">
                          ₦{Number(p.amount || p.scheduleId?.amount || 0).toLocaleString()}
                        </td>
                        <td>
                          <span className={`badge capitalize ${p.status === 'paid' ? 'badge-green' : p.status === 'overdue' ? 'badge-red' : 'badge-yellow'}`}>
                            {p.status || 'pending'}
                          </span>
                        </td>
                        <td className="text-[12px] text-[#98A2B3] whitespace-nowrap">
                          {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Announcements tab ── */}
        {tab === 'announcements' && (
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <div className="card-title">Announcements</div>
                <div className="card-sub">{announcements.length} posted by estate management</div>
              </div>
            </div>
            {announcements.length === 0 ? (
              <Empty icon={Megaphone} title="No announcements posted" hint="Notices sent to residents appear here." />
            ) : (
              <ul className="divide-y divide-[#F2F4F7]">
                {announcements.map(a => (
                  <li key={a._id} className="px-5 py-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#EFF8FF] text-[#175CD3]">
                      <Megaphone size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#101828]">{a.title}</span>
                        {a.isPinned && <Pin size={12} className="text-[#B54708]" />}
                        {a.category && <span className="badge badge-blue capitalize">{a.category}</span>}
                      </div>
                      {a.message && <div className="text-[13px] text-[#475467] mt-1 line-clamp-2">{a.message}</div>}
                      <div className="text-[12px] text-[#98A2B3] mt-1">
                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Subscription tab ── */}
        {tab === 'subscription' && (
          <div className="space-y-5">
            {!subscription ? (
              <div className="card">
                <Empty icon={CreditCard} title="No subscription"
                  hint="This estate has not been assigned a subscription plan yet."
                  action={
                    <Link to="/subscriptions" className="btn-primary inline-flex gap-2">
                      <CreditCard size={14} /> Assign plan
                    </Link>
                  } />
              </div>
            ) : (
              <>
                {/* Plan overview card */}
                <div className="card">
                  <div className="card-header">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#ECFDF3] text-[#059669]">
                        <CreditCard size={17} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-semibold text-[#101828]">{subscription.planId?.name || 'Unknown Plan'}</span>
                          <span className={`badge ${subStyle.badge}`}>{subStyle.label}</span>
                        </div>
                        <div className="card-sub">Current subscription</div>
                      </div>
                    </div>
                    <Link to="/subscriptions" className="btn-outline gap-2 flex-shrink-0">
                      <Edit3 size={13} /> Edit subscription
                    </Link>
                  </div>

                  <dl className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                    <Field label="Billing cycle">
                      <span className="capitalize">{subscription.cycle || '—'}</span>
                    </Field>
                    <Field label="Billing model">
                      {subscription.billingModel === 'per_resident' ? 'Per Resident' : subscription.billingModel === 'flat' ? 'Flat Fee' : <span className="capitalize">{subscription.billingModel || '—'}</span>}
                    </Field>
                    <Field label="Monthly price">
                      <span className="font-semibold tabular-nums">
                        {subscription.planId?.price?.monthly > 0
                          ? `₦${subscription.planId.price.monthly.toLocaleString()}`
                          : 'Free'}
                      </span>
                    </Field>
                    <Field label="Annual price">
                      <span className="font-semibold tabular-nums">
                        {subscription.planId?.price?.annual > 0
                          ? `₦${subscription.planId.price.annual.toLocaleString()}`
                          : 'Free'}
                      </span>
                    </Field>

                    {subscription.status === 'trial' && subscription.trialEndsAt && (
                      <Field label="Trial ends" icon={Clock}>
                        <div className={`font-semibold tabular-nums ${new Date(subscription.trialEndsAt) < new Date() ? 'text-[#B42318]' : 'text-[#B54708]'}`}>
                          {format(new Date(subscription.trialEndsAt), 'MMM d, yyyy')}
                        </div>
                        <div className="text-[11.5px] text-[#98A2B3]">
                          {formatDistanceToNow(new Date(subscription.trialEndsAt), { addSuffix: true })}
                        </div>
                      </Field>
                    )}
                    {subscription.nextBillingDate && (
                      <Field label="Next billing" icon={Calendar}>
                        <span className="tabular-nums">{format(new Date(subscription.nextBillingDate), 'MMM d, yyyy')}</span>
                      </Field>
                    )}
                    {subscription.updatedAt && (
                      <Field label="Last updated">
                        <span className="tabular-nums">{format(new Date(subscription.updatedAt), 'MMM d, yyyy')}</span>
                      </Field>
                    )}

                    {subscription.notes && (
                      <div className="col-span-2 lg:col-span-4 pt-4 border-t border-[#F2F4F7]">
                        <Field label="Admin notes">
                          <p className="text-[13px] text-[#475467]">{subscription.notes}</p>
                        </Field>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Plan features */}
                {subscription.planId?.features && (
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <div className="card-title">Plan features</div>
                        <div className="card-sub">Included in {subscription.planId.name}</div>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1">
                        {[
                          { key: 'visitorManagement', label: 'Visitor Management' },
                          { key: 'residentManagement', label: 'Resident Management' },
                          { key: 'unitManagement', label: 'Unit Management' },
                          { key: 'announcements', label: 'Announcements' },
                          { key: 'communityChat', label: 'Community Chat' },
                          { key: 'marketplace', label: 'Marketplace' },
                          { key: 'paymentSystem', label: 'Payment System' },
                          { key: 'securityPortal', label: 'Security Portal' },
                          { key: 'emergencyBroadcast', label: 'Emergency Broadcast' },
                          { key: 'residentLounge', label: 'Resident Lounge' },
                          { key: 'nkechiAI', label: 'Nkechi AI' },
                        ].map(({ key, label }) => {
                          const val = subscription.planId.features[key];
                          const enabled = val === true || val === 'full' || val === 'basic';
                          return (
                            <div key={key} className="flex items-center gap-2 py-1.5 border-b border-[#F2F4F7]">
                              {enabled
                                ? <CheckCircle size={14} className="text-[#059669] flex-shrink-0" />
                                : <XCircle size={14} className="text-[#D0D5DD] flex-shrink-0" />
                              }
                              <span className={`text-[13px] ${enabled ? 'text-[#101828]' : 'text-[#98A2B3]'}`}>{label}</span>
                              {typeof val === 'string' && val !== 'true' && val !== 'false' && (
                                <span className="badge badge-gray ml-auto capitalize">{val}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {subscription.planId?.features?.maxResidents && (
                        <div className="mt-5 grid grid-cols-3 gap-3">
                          {[
                            { label: 'Max residents', value: subscription.planId.features.maxResidents },
                            { label: 'Max units',     value: subscription.planId.features.maxUnits },
                            { label: 'Visitors / mo', value: subscription.planId.features.maxVisitorsPerMonth },
                          ].map(({ label, value }) => (
                            <div key={label} className="rounded-lg border border-[#E4E7EC] px-3 py-2.5">
                              <div className="text-[16px] font-semibold text-[#101828] tabular-nums">{value ?? '—'}</div>
                              <div className="text-[11.5px] text-[#98A2B3]">{label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <EditEstateDrawer estate={estate} open={editOpen} onClose={() => setEditOpen(false)} onSaved={() => load()} />
    </div>
  );
}
