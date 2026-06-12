import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { estateAPI, planAPI } from '../api';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import {
  Building2, MapPin, User, Hash, Users, Home, Shield,
  CheckCircle, XCircle, ArrowLeft, Edit3, Copy, Calendar,
  Phone, Mail, UserCheck, UserX, CreditCard, RefreshCw,
  ToggleLeft, ToggleRight, Clock, AlertCircle, DollarSign,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

function copyText(text) {
  navigator.clipboard.writeText(text);
  toast.success('Copied!');
}

function StatPill({ label, value, color = '#0F172A', sub }) {
  return (
    <div className="glass-card p-4 text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs mt-0.5 font-medium" style={{ color: '#475569' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{sub}</div>}
    </div>
  );
}

const SUB_STATUS = {
  active:    { label: 'Active',    bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  trial:     { label: 'Trial',     bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  expired:   { label: 'Expired',   bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  suspended: { label: 'Suspended', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  cancelled: { label: 'Cancelled', bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
};

export default function EstateDetail() {
  const { estateId } = useParams();
  const navigate = useNavigate();
  const [data, setData]           = useState(null);
  const [subscription, setSub]    = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editOpen, setEditOpen]   = useState(false);
  const [editForm, setEditForm]   = useState({ name: '', address: '' });
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(false);
  const [tab, setTab]             = useState('residents');
  const [expandedUnit, setExpandedUnit] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, allSubs] = await Promise.all([
        estateAPI.getDetail(estateId),
        planAPI.getSubscriptions(),
      ]);
      setData(res.data.data);
      const sub = allSubs.data.data.find(
        s => s.estateId?._id === estateId || s.estateId === estateId
      );
      setSub(sub || null);
    } catch {
      toast.error('Failed to load estate');
      navigate('/estates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [estateId]);

  const openEdit = () => {
    setEditForm({ name: data.estate.name, address: data.estate.address });
    setEditOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await estateAPI.update(estateId, editForm);
      toast.success('Estate updated');
      setEditOpen(false);
      load();
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

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

  const { estate, residents, securityStaff, units } = data;
  const activeResidents   = residents.filter(r => r.isActive).length;
  const occupiedUnits     = units.filter(u => u.status === 'occupied').length;
  const unitsByType       = units.reduce((acc, u) => { acc[u.type] = (acc[u.type] || 0) + 1; return acc; }, {});
  const activeStaff       = securityStaff.filter(s => s.isActive).length;

  const tabs = [
    { id: 'residents',    label: `Residents (${residents.length})`,     icon: Users    },
    { id: 'units',        label: `Units (${units.length})`,             icon: Home     },
    { id: 'security',     label: `Security (${securityStaff.length})`,  icon: Shield   },
    { id: 'subscription', label: 'Subscription',                        icon: CreditCard },
  ];

  const subStyle = subscription ? (SUB_STATUS[subscription.status] || SUB_STATUS.expired) : null;

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Back + header */}
      <div>
        <button onClick={() => navigate('/estates')}
          className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
          <ArrowLeft size={15} /> All Estates
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: '#059669' }}>
              {estate.name[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight" style={{ color: '#0F172A' }}>{estate.name}</h1>
              <div className="flex items-center gap-1.5 text-sm mt-1" style={{ color: '#94A3B8' }}>
                <MapPin size={13} />{estate.address}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {subscription && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                style={{ background: subStyle.bg, color: subStyle.color, border: `1px solid ${subStyle.border}` }}>
                <CreditCard size={11} />
                {subscription.planId?.name || 'Plan'} · {subStyle.label}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
              style={estate.isActive
                ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                : { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
              {estate.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
              {estate.isActive ? 'Active' : 'Inactive'}
            </span>
            <button onClick={toggleActive} disabled={toggling}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
              style={estate.isActive
                ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }
                : { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              {toggling
                ? <RefreshCw size={13} className="animate-spin" />
                : estate.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />
              }
              {estate.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={openEdit} className="btn-outline gap-2 py-1.5">
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>

      {/* Key info row */}
      <div className="glass-card p-5">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <div className="text-xs mb-1.5 flex items-center gap-1 font-medium" style={{ color: '#94A3B8' }}>
              <Hash size={11} /> Estate Code
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold tracking-widest" style={{ color: '#059669' }}>
                {estate.estateCode}
              </span>
              <button onClick={() => copyText(estate.estateCode)}
                className="transition-colors"
                style={{ color: '#CBD5E1' }}
                onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}>
                <Copy size={13} />
              </button>
            </div>
          </div>

          <div>
            <div className="text-xs mb-1.5 flex items-center gap-1 font-medium" style={{ color: '#94A3B8' }}>
              <User size={11} /> Estate Manager
            </div>
            {estate.managerId ? (
              <div>
                <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>{estate.managerId.name}</div>
                <a href={`mailto:${estate.managerId.email}`}
                  className="flex items-center gap-1 text-xs mt-0.5 transition-colors hover:underline"
                  style={{ color: '#7C3AED' }}>
                  <Mail size={10} />{estate.managerId.email}
                </a>
                {estate.managerId.phone && (
                  <a href={`tel:${estate.managerId.phone}`}
                    className="flex items-center gap-1 text-xs mt-0.5 transition-colors hover:underline"
                    style={{ color: '#94A3B8' }}>
                    <Phone size={10} />{estate.managerId.phone}
                  </a>
                )}
              </div>
            ) : (
              <div>
                <span className="text-sm italic" style={{ color: '#CBD5E1' }}>Unassigned</span>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>No manager assigned</div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs mb-1.5 flex items-center gap-1 font-medium" style={{ color: '#94A3B8' }}>
              <Calendar size={11} /> Estate Age
            </div>
            <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              {format(new Date(estate.createdAt), 'MMM d, yyyy')}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
              {formatDistanceToNow(new Date(estate.createdAt), { addSuffix: true })}
            </div>
          </div>

          <div>
            <div className="text-xs mb-1.5 flex items-center gap-1 font-medium" style={{ color: '#94A3B8' }}>
              <Building2 size={11} /> Unit Types
            </div>
            {Object.keys(unitsByType).length > 0 ? (
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(unitsByType).map(([type, count]) => (
                  <span key={type}
                    className="text-xs px-2 py-0.5 rounded-md capitalize"
                    style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-sm italic" style={{ color: '#CBD5E1' }}>No units</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Total Residents" value={residents.length} color="#059669"
          sub={`${activeResidents} active`} />
        <StatPill label="Occupied Units" value={`${occupiedUnits}/${units.length}`} color="#2563EB"
          sub={`${units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0}% occupancy`} />
        <StatPill label="Security Staff" value={securityStaff.length} color="#D97706"
          sub={`${activeStaff} active`} />
        <StatPill label="Plan Status"
          value={subscription ? (subStyle?.label || '—') : 'None'}
          color={subscription ? subStyle?.color : '#CBD5E1'}
          sub={subscription?.planId?.name || 'No subscription'} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto" style={{ borderBottom: '1px solid #E2E8F0' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap flex-shrink-0"
            style={tab === id
              ? { borderColor: '#10B981', color: '#059669' }
              : { borderColor: 'transparent', color: '#94A3B8' }}
            onMouseEnter={e => { if (tab !== id) e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={e => { if (tab !== id) e.currentTarget.style.color = '#94A3B8'; }}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Residents tab ── */}
      {tab === 'residents' && (
        <div className="glass-card overflow-hidden">
          {residents.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>No residents registered yet</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 flex items-center gap-3 flex-wrap"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#FAFBFC' }}>
                <span className="text-xs" style={{ color: '#94A3B8' }}>
                  {residents.length} total · {activeResidents} active · {residents.length - activeResidents} suspended
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Resident</th>
                      <th className="text-left font-medium px-5 py-3 hidden md:table-cell" style={{ color: '#94A3B8' }}>Contact</th>
                      <th className="text-left font-medium px-5 py-3 hidden lg:table-cell" style={{ color: '#94A3B8' }}>Unit</th>
                      <th className="text-left font-medium px-5 py-3 hidden xl:table-cell" style={{ color: '#94A3B8' }}>Joined</th>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {residents.map(r => (
                      <tr key={r._id} className="transition-colors"
                        style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0"
                              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)', color: '#059669' }}>
                              {r.name[0]}
                            </div>
                            <div>
                              <div className="font-medium" style={{ color: '#0F172A' }}>{r.name}</div>
                              <div className="text-xs md:hidden" style={{ color: '#94A3B8' }}>{r.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 text-xs mb-0.5 hover:underline"
                            style={{ color: '#475569' }}>
                            <Mail size={11} />{r.email}
                          </a>
                          {r.phone && (
                            <a href={`tel:${r.phone}`} className="flex items-center gap-1.5 text-xs hover:underline"
                              style={{ color: '#94A3B8' }}>
                              <Phone size={11} />{r.phone}
                            </a>
                          )}
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell text-xs" style={{ color: '#475569' }}>
                          {r.unitId
                            ? <span className="font-medium">{r.unitId.block ? `Block ${r.unitId.block} · ` : ''}Unit {r.unitId.unitNumber}</span>
                            : <span style={{ color: '#CBD5E1' }}>No unit</span>}
                        </td>
                        <td className="px-5 py-3.5 hidden xl:table-cell text-xs" style={{ color: '#94A3B8' }}>
                          {r.createdAt ? format(new Date(r.createdAt), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
                            style={r.isActive
                              ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                              : { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                            {r.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                            {r.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Units tab ── */}
      {tab === 'units' && (
        <div className="space-y-4">
          {/* Unit type summary */}
          {Object.keys(unitsByType).length > 0 && (
            <div className="glass-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
                Unit Breakdown
              </div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(unitsByType).map(([type, count]) => {
                  const typeUnits = units.filter(u => u.type === type);
                  const typeOccupied = typeUnits.filter(u => u.status === 'occupied').length;
                  return (
                    <div key={type} className="px-4 py-3 rounded-xl capitalize"
                      style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', minWidth: '120px' }}>
                      <div className="font-bold text-lg" style={{ color: '#0F172A' }}>{count}</div>
                      <div className="text-xs font-medium" style={{ color: '#475569' }}>{type}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{typeOccupied} occupied</div>
                    </div>
                  );
                })}
                <div className="px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)', minWidth: '120px' }}>
                  <div className="font-bold text-lg" style={{ color: '#2563EB' }}>{occupiedUnits}/{units.length}</div>
                  <div className="text-xs font-medium" style={{ color: '#2563EB' }}>Occupied</div>
                  <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    {units.length > 0 ? Math.round((occupiedUnits / units.length) * 100) : 0}% occupancy
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="glass-card overflow-hidden">
            {units.length === 0 ? (
              <div className="py-16 text-center">
                <Home size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
                <p className="text-sm" style={{ color: '#94A3B8' }}>No units added yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Unit</th>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Type</th>
                      <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Occupancy</th>
                      <th className="text-left font-medium px-5 py-3 hidden sm:table-cell" style={{ color: '#94A3B8' }}>Dues</th>
                      <th className="text-left font-medium px-5 py-3 hidden md:table-cell" style={{ color: '#94A3B8' }}>Residents</th>
                      <th className="w-8 px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map(u => {
                      const count = (u.residentIds || []).length;
                      const max   = u.maxOccupants || 7;
                      const expanded = expandedUnit === u._id;
                      const unitResidents = residents.filter(r => r.unitId?._id === u._id || r.unitId === u._id);
                      return (
                        <>
                          <tr key={u._id} className="transition-colors"
                            style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                            onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                            <td className="px-5 py-3.5">
                              <div className="font-medium" style={{ color: '#0F172A' }}>
                                {u.block ? `Block ${u.block} · ` : ''}Unit {u.unitNumber}
                              </div>
                            </td>
                            <td className="px-5 py-3.5 capitalize" style={{ color: '#475569' }}>{u.type}</td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2E8F0' }}>
                                  <div className="h-full rounded-full"
                                    style={{
                                      width: `${(count / max) * 100}%`,
                                      background: count >= max ? '#EF4444' : count > 0 ? '#10B981' : '#CBD5E1',
                                    }} />
                                </div>
                                <span className="text-xs font-medium"
                                  style={{ color: count >= max ? '#DC2626' : count > 0 ? '#059669' : '#CBD5E1' }}>
                                  {count}/{max}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 hidden sm:table-cell">
                              <span className="text-xs font-medium"
                                style={{ color: u.duesStatus === 'paid' ? '#059669' : '#DC2626' }}>
                                {u.duesStatus === 'paid' ? '✓ Paid' : '✗ Unpaid'}
                                {u.amountOwed > 0 && <span className="ml-1 font-normal" style={{ color: '#94A3B8' }}>₦{u.amountOwed.toLocaleString()}</span>}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 hidden md:table-cell text-xs" style={{ color: '#475569' }}>
                              {unitResidents.length > 0
                                ? unitResidents.slice(0, 2).map(r => r.name.split(' ')[0]).join(', ') + (unitResidents.length > 2 ? ` +${unitResidents.length - 2}` : '')
                                : <span style={{ color: '#CBD5E1' }}>Vacant</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              {unitResidents.length > 0 && (
                                <button onClick={() => setExpandedUnit(expanded ? null : u._id)}
                                  className="p-1 rounded transition-colors"
                                  style={{ color: '#94A3B8' }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                </button>
                              )}
                            </td>
                          </tr>
                          {expanded && unitResidents.map(r => (
                            <tr key={`${u._id}-${r._id}`}
                              style={{ background: '#F8FAFC', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                              <td colSpan={2} className="pl-10 pr-5 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                                    style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>
                                    {r.name[0]}
                                  </div>
                                  <span className="text-xs font-medium" style={{ color: '#0F172A' }}>{r.name}</span>
                                </div>
                              </td>
                              <td className="px-5 py-2 text-xs" style={{ color: '#94A3B8' }}>{r.email}</td>
                              <td className="px-5 py-2 hidden sm:table-cell text-xs" style={{ color: '#94A3B8' }}>{r.phone || '—'}</td>
                              <td colSpan={2} className="px-5 py-2">
                                <span className="text-xs font-medium"
                                  style={r.isActive
                                    ? { color: '#059669' }
                                    : { color: '#DC2626' }}>
                                  {r.isActive ? 'Active' : 'Suspended'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </>
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
        <div className="glass-card overflow-hidden">
          {securityStaff.length === 0 ? (
            <div className="py-16 text-center">
              <Shield size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
              <p className="text-sm" style={{ color: '#94A3B8' }}>No security staff registered</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#FAFBFC' }}>
                <span className="text-xs" style={{ color: '#94A3B8' }}>
                  {securityStaff.length} total · {activeStaff} active · {securityStaff.length - activeStaff} inactive
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Staff Member</th>
                    <th className="text-left font-medium px-5 py-3 hidden md:table-cell" style={{ color: '#94A3B8' }}>Contact</th>
                    <th className="text-left font-medium px-5 py-3 hidden lg:table-cell" style={{ color: '#94A3B8' }}>Joined</th>
                    <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {securityStaff.map(s => (
                    <tr key={s._id} className="transition-colors"
                      style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0"
                            style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.20)', color: '#D97706' }}>
                            {s.name[0]}
                          </div>
                          <div className="font-medium" style={{ color: '#0F172A' }}>{s.name}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-xs mb-0.5 hover:underline"
                          style={{ color: '#475569' }}>
                          <Mail size={11} />{s.email}
                        </a>
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-xs hover:underline"
                            style={{ color: '#94A3B8' }}>
                            <Phone size={11} />{s.phone}
                          </a>
                        )}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-xs" style={{ color: '#94A3B8' }}>
                        {s.createdAt ? format(new Date(s.createdAt), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md"
                          style={s.isActive
                            ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                            : { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                          {s.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* ── Subscription tab ── */}
      {tab === 'subscription' && (
        <div className="space-y-4">
          {!subscription ? (
            <div className="glass-card p-12 text-center">
              <CreditCard size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
              <h3 className="font-semibold text-base mb-1" style={{ color: '#0F172A' }}>No Subscription</h3>
              <p className="text-sm mb-5" style={{ color: '#94A3B8' }}>
                This estate has not been assigned a subscription plan yet.
              </p>
              <Link to="/subscriptions" className="btn-primary inline-flex gap-2">
                <CreditCard size={15} /> Assign Plan
              </Link>
            </div>
          ) : (
            <>
              {/* Plan overview card */}
              <div className="glass-card p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: subStyle.bg, border: `1px solid ${subStyle.border}` }}>
                      <CreditCard size={22} style={{ color: subStyle.color }} />
                    </div>
                    <div>
                      <div className="text-xl font-bold" style={{ color: '#0F172A' }}>
                        {subscription.planId?.name || 'Unknown Plan'}
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium mt-1 px-2.5 py-0.5 rounded-full"
                        style={{ background: subStyle.bg, color: subStyle.color, border: `1px solid ${subStyle.border}` }}>
                        {subStyle.label}
                      </span>
                    </div>
                  </div>
                  <Link to="/subscriptions" className="btn-outline gap-2 py-1.5 text-sm">
                    <Edit3 size={13} /> Edit Subscription
                  </Link>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-5 pt-5"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Billing Cycle</div>
                    <div className="text-sm font-semibold capitalize" style={{ color: '#0F172A' }}>
                      {subscription.cycle || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Billing Model</div>
                    <div className="text-sm font-semibold capitalize" style={{ color: '#0F172A' }}>
                      {subscription.billingModel === 'per_resident' ? 'Per Resident' : subscription.billingModel === 'flat' ? 'Flat Fee' : subscription.billingModel || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Monthly Price</div>
                    <div className="text-sm font-semibold" style={{ color: '#059669' }}>
                      {subscription.planId?.price?.monthly > 0
                        ? `₦${subscription.planId.price.monthly.toLocaleString()}`
                        : 'Free'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Annual Price</div>
                    <div className="text-sm font-semibold" style={{ color: '#475569' }}>
                      {subscription.planId?.price?.annual > 0
                        ? `₦${subscription.planId.price.annual.toLocaleString()}`
                        : 'Free'}
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid sm:grid-cols-3 gap-5 mt-5 pt-5"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  {subscription.status === 'trial' && subscription.trialEndsAt && (
                    <div>
                      <div className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: '#94A3B8' }}>
                        <Clock size={10} /> Trial Ends
                      </div>
                      <div className="text-sm font-semibold" style={{
                        color: new Date(subscription.trialEndsAt) < new Date() ? '#DC2626' : '#D97706',
                      }}>
                        {format(new Date(subscription.trialEndsAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {formatDistanceToNow(new Date(subscription.trialEndsAt), { addSuffix: true })}
                      </div>
                    </div>
                  )}
                  {subscription.nextBillingDate && (
                    <div>
                      <div className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: '#94A3B8' }}>
                        <Calendar size={10} /> Next Billing
                      </div>
                      <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                        {format(new Date(subscription.nextBillingDate), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                  {subscription.updatedAt && (
                    <div>
                      <div className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Last Updated</div>
                      <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>
                        {format(new Date(subscription.updatedAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  )}
                </div>

                {subscription.notes && (
                  <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <div className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>Admin Notes</div>
                    <p className="text-sm" style={{ color: '#475569' }}>{subscription.notes}</p>
                  </div>
                )}
              </div>

              {/* Plan features */}
              {subscription.planId?.features && (
                <div className="glass-card p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#94A3B8' }}>
                    Plan Features — {subscription.planId.name}
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                        <div key={key} className="flex items-center gap-2 py-1.5 px-3 rounded-lg"
                          style={{ background: enabled ? 'rgba(16,185,129,0.06)' : '#F8FAFC' }}>
                          {enabled
                            ? <CheckCircle size={13} style={{ color: '#10B981', flexShrink: 0 }} />
                            : <XCircle size={13} style={{ color: '#CBD5E1', flexShrink: 0 }} />
                          }
                          <span className="text-xs" style={{ color: enabled ? '#047857' : '#94A3B8' }}>{label}</span>
                          {typeof val === 'string' && val !== 'true' && val !== 'false' && (
                            <span className="text-xs ml-auto capitalize" style={{ color: '#94A3B8' }}>({val})</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {subscription.planId?.features?.maxResidents && (
                    <div className="mt-4 pt-4 grid sm:grid-cols-3 gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      {[
                        { label: 'Max Residents', value: subscription.planId.features.maxResidents },
                        { label: 'Max Units',     value: subscription.planId.features.maxUnits },
                        { label: 'Visitors/mo',   value: subscription.planId.features.maxVisitorsPerMonth },
                      ].map(({ label, value }) => (
                        <div key={label} className="text-center py-2 rounded-lg" style={{ background: '#F8FAFC' }}>
                          <div className="font-bold" style={{ color: '#0F172A' }}>{value ?? '—'}</div>
                          <div className="text-xs" style={{ color: '#94A3B8' }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit — ${estate.name}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>Estate Name</label>
            <input className="input-field" value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>Address</label>
            <textarea className="input-field" rows={3} value={editForm.address}
              onChange={e => setEditForm({ ...editForm, address: e.target.value })} required />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setEditOpen(false)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
