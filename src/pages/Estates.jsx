import { useEffect, useState } from 'react';
import { estateAPI } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import {
  Building2, Plus, MapPin, User, Hash,
  CheckCircle, XCircle, Search, Edit3, ArrowRight,
  ToggleLeft, ToggleRight, RefreshCw, Phone, Mail, Gift, Users as UsersIcon,
  Home as HomeIcon, Bell, AlertTriangle, CreditCard, UserCheck as UserCheckIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['all', 'active', 'inactive', 'managed', 'unmanaged'];
const SUB_FILTERS = [
  { key: 'all',       label: 'Any sub' },
  { key: 'trial',     label: 'Trial' },
  { key: 'active',    label: 'Active' },
  { key: 'comp',      label: 'Comp (gift)' },
  { key: 'risk',      label: 'Renewal risk' },
  { key: 'expired',   label: 'Expired' },
  { key: 'nosub',     label: 'No sub' },
];

export default function AdminEstates() {
  const navigate  = useNavigate();
  const [estates, setEstates]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [subFilter, setSubFilter]       = useState('all');
  const [planFilter, setPlanFilter]     = useState('all');
  const [sortBy, setSortBy]             = useState('new');
  const [selected, setSelected]   = useState(null);
  const [editForm, setEditForm]   = useState({ name: '', address: '' });
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      // Overview includes subscription + resident/unit/visitor/alert counts
      // per estate so the list row can show meaningful activity at a glance.
      const { data } = await estateAPI.getOverview();
      setEstates(data.data);
    } catch { toast.error('Failed to load estates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const planOptions = Array.from(new Set(estates
    .map(e => e.subscription?.compActive ? e.subscription?.compPlan?.name : e.subscription?.planId?.name)
    .filter(Boolean))).sort();

  const openEdit = (e) => {
    setSelected(e);
    setEditForm({ name: e.name, address: e.address });
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      await estateAPI.update(selected._id, editForm);
      toast.success('Estate updated');
      setSelected(null);
      load();
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (estate, ev) => {
    ev.stopPropagation();
    setToggling(estate._id);
    try {
      await estateAPI.update(estate._id, { isActive: !estate.isActive });
      setEstates(prev => prev.map(e => e._id === estate._id ? { ...e, isActive: !e.isActive } : e));
      toast.success(estate.isActive ? `${estate.name} deactivated` : `${estate.name} activated`);
    } catch { toast.error('Action failed'); }
    finally { setToggling(null); }
  };

  const filtered = estates.filter(e => {
    if (statusFilter === 'active'    && !e.isActive)    return false;
    if (statusFilter === 'inactive'  && e.isActive)     return false;
    if (statusFilter === 'managed'   && !e.managerId)   return false;
    if (statusFilter === 'unmanaged' && e.managerId)    return false;

    const sub = e.subscription;
    if (subFilter === 'trial'   && sub?.status !== 'trial')     return false;
    if (subFilter === 'active'  && !(sub?.status === 'active' && !sub.compActive)) return false;
    if (subFilter === 'comp'    && !sub?.compActive)            return false;
    if (subFilter === 'risk'    && !sub?.renewalIssue)          return false;
    if (subFilter === 'expired' && !['expired','suspended','cancelled'].includes(sub?.status || '')) return false;
    if (subFilter === 'nosub'   && sub)                         return false;

    if (planFilter !== 'all') {
      const planName = sub?.compActive ? sub?.compPlan?.name : sub?.planId?.name;
      if (planName !== planFilter) return false;
    }

    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q)
        || e.estateCode?.toLowerCase().includes(q)
        || (e.managerId?.name || '').toLowerCase().includes(q)
        || (e.managerId?.email || '').toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sortBy === 'residents')     return (b.counts?.residents    || 0) - (a.counts?.residents    || 0);
    if (sortBy === 'visitors7d')    return (b.counts?.visitorsWeek || 0) - (a.counts?.visitorsWeek || 0);
    if (sortBy === 'alerts')        return (b.counts?.openAlerts   || 0) - (a.counts?.openAlerts   || 0);
    if (sortBy === 'name')          return (a.name || '').localeCompare(b.name || '');
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const counts = STATUS_FILTERS.reduce((acc, f) => {
    if (f === 'all')       acc[f] = estates.length;
    else if (f === 'active')    acc[f] = estates.filter(e => e.isActive).length;
    else if (f === 'inactive')  acc[f] = estates.filter(e => !e.isActive).length;
    else if (f === 'managed')   acc[f] = estates.filter(e => e.managerId).length;
    else if (f === 'unmanaged') acc[f] = estates.filter(e => !e.managerId).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#0F172A' }}>All Estates</h1>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            {estates.length} estate{estates.length !== 1 ? 's' : ''} registered on the platform ·
            <span className="ml-1" style={{ color: '#059669' }}>
              {estates.filter(e => e.isActive).length} active
            </span>
          </p>
        </div>
        <Link to="/estates/new" className="btn-primary gap-2">
          <Plus size={16} /> Create Estate
        </Link>
      </div>

      {/* Summary stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: estates.length,                              color: '#0F172A' },
          { label: 'Active',    value: estates.filter(e => e.isActive).length,      color: '#059669' },
          { label: 'Managed',   value: estates.filter(e => e.managerId).length,     color: '#7C3AED' },
          { label: 'Unmanaged', value: estates.filter(e => !e.managerId).length,    color: '#D97706' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input className="input-field pl-9"
            placeholder="Search estate, code, manager name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={statusFilter === f
                ? { background: f === 'inactive' ? '#DC2626' : f === 'unmanaged' ? '#D97706' : '#059669', color: '#FFF' }
                : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
              {f === 'all' ? 'All Estates' : f}
              <span className="ml-1" style={{ color: statusFilter === f ? 'rgba(255,255,255,0.65)' : '#94A3B8' }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary filters — subscription + plan + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Subscription</span>
        {SUB_FILTERS.map(f => (
          <button key={f.key} onClick={() => setSubFilter(f.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={subFilter === f.key
              ? { background: f.key === 'comp' ? '#D97706' : f.key === 'risk' ? '#DC2626' : '#0F172A', color: '#FFF' }
              : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            {f.label}
          </button>
        ))}
        {planOptions.length > 0 && (
          <>
            <span className="text-xs font-bold uppercase tracking-wider ml-3" style={{ color: '#94A3B8' }}>Plan</span>
            <select className="input-field" style={{ width: 160, height: 32, fontSize: 12 }}
              value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
              <option value="all">All plans</option>
              {planOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </>
        )}
        <span className="text-xs font-bold uppercase tracking-wider ml-3" style={{ color: '#94A3B8' }}>Sort</span>
        <select className="input-field" style={{ width: 160, height: 32, fontSize: 12 }}
          value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="new">Newest</option>
          <option value="name">Name A→Z</option>
          <option value="residents">Most residents</option>
          <option value="visitors7d">Most visitors (7d)</option>
          <option value="alerts">Open alerts</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <Building2 size={48} className="mx-auto mb-4" style={{ color: '#CBD5E1' }} />
          <p className="font-medium" style={{ color: '#475569' }}>
            {search || statusFilter !== 'all' ? 'No matching estates' : 'No estates found'}
          </p>
          {statusFilter === 'all' && !search && (
            <Link to="/estates/new" className="btn-primary mt-4 inline-flex gap-2">
              <Plus size={16} /> Create First Estate
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(e => (
            <div key={e._id} className="glass-card overflow-hidden transition-all duration-300 flex flex-col">
              <div className="h-1.5"
                style={{ background: `linear-gradient(90deg, ${e.isActive ? 'rgba(16,185,129,0.6)' : 'rgba(148,163,184,0.4)'} 0%, ${e.isActive ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.1)'} 100%)` }} />

              <div className="p-5 flex-1 flex flex-col">
                {/* Name + status */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0"
                      style={{ background: e.isActive ? 'rgba(16,185,129,0.08)' : 'rgba(148,163,184,0.10)', border: `1px solid ${e.isActive ? 'rgba(16,185,129,0.18)' : 'rgba(148,163,184,0.20)'}`, color: e.isActive ? '#059669' : '#94A3B8' }}>
                      {e.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold leading-tight truncate" style={{ color: '#0F172A' }}>{e.name}</h3>
                      <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        <MapPin size={10} />
                        <span className="truncate max-w-[160px]">{e.address}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium flex-shrink-0"
                    style={{ color: e.isActive ? '#059669' : '#94A3B8' }}>
                    {e.isActive ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {e.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="rounded-xl p-2.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="text-xs mb-0.5 flex items-center gap-1" style={{ color: '#94A3B8' }}>
                      <Hash size={10} /> Code
                    </div>
                    <div className="font-mono font-bold tracking-widest text-sm" style={{ color: '#059669' }}>
                      {e.estateCode}
                    </div>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div className="text-xs mb-0.5 flex items-center gap-1" style={{ color: '#94A3B8' }}>
                      <User size={10} /> Manager
                    </div>
                    <div className="text-xs font-medium truncate" style={{ color: e.managerId ? '#0F172A' : '#CBD5E1' }}>
                      {e.managerId?.name || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Manager contact */}
                {e.managerId && (
                  <div className="flex items-center gap-3 mb-4 px-2.5 py-2 rounded-xl"
                    style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    {e.managerId.email && (
                      <a href={`mailto:${e.managerId.email}`}
                        className="flex items-center gap-1 text-xs hover:underline truncate"
                        style={{ color: '#7C3AED' }}>
                        <Mail size={10} style={{ flexShrink: 0 }} />
                        <span className="truncate">{e.managerId.email}</span>
                      </a>
                    )}
                    {e.managerId.phone && (
                      <a href={`tel:${e.managerId.phone}`}
                        className="flex items-center gap-1.5 text-xs hover:underline ml-auto flex-shrink-0"
                        style={{ color: '#94A3B8' }}>
                        <Phone size={10} />{e.managerId.phone}
                      </a>
                    )}
                  </div>
                )}

                {/* Subscription row — plan + status + comp/risk badges */}
                {e.subscription ? (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {(() => {
                      const sub = e.subscription;
                      const planName = sub.compActive ? sub.compPlan?.name : sub.planId?.name;
                      const color    = sub.compActive ? '#D97706' : (sub.status === 'active' ? '#059669' : sub.status === 'trial' ? '#2563EB' : '#94A3B8');
                      return (
                        <>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: color + '14', color, border: `1px solid ${color}30` }}>
                            <CreditCard size={10} /> {planName || 'No plan'} · {sub.status}
                          </span>
                          {sub.compActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}
                                  title={sub.compExpiresAt ? `Ends ${format(new Date(sub.compExpiresAt), 'MMM d, yyyy')}` : 'Never expires'}>
                              <Gift size={9} /> COMP
                            </span>
                          )}
                          {sub.renewalIssue && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}
                                  title={sub.renewalError || 'Renewal failed'}>
                              <AlertTriangle size={9} /> RENEWAL
                            </span>
                          )}
                          {sub.hasCard && !sub.renewalIssue && (
                            <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>
                              ••{sub.cardLast4 || 'card'}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                      No subscription
                    </span>
                  </div>
                )}

                {/* Activity counters */}
                <div className="grid grid-cols-4 gap-1.5 mb-3 text-center">
                  {[
                    { Icon: UsersIcon,     v: e.counts?.residents     || 0, label: 'Res',  color: '#7C3AED' },
                    { Icon: HomeIcon,      v: e.counts?.units         || 0, label: 'Units', color: '#2563EB' },
                    { Icon: UserCheckIcon, v: e.counts?.visitorsToday || 0, label: 'Vis today', color: '#0EA5E9' },
                    { Icon: Bell,          v: e.counts?.openAlerts    || 0, label: 'Alerts', color: e.counts?.openAlerts ? '#DC2626' : '#94A3B8' },
                  ].map(({ Icon, v, label, color }) => (
                    <div key={label} className="rounded-lg py-1.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <Icon size={11} className="mx-auto" style={{ color }} />
                      <div className="text-xs font-black" style={{ color: '#0F172A' }}>{v}</div>
                      <div className="text-[9px]" style={{ color: '#94A3B8' }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-3"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                  <div className="text-xs" style={{ color: '#CBD5E1' }}>
                    {format(new Date(e.createdAt), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Toggle active */}
                    <button onClick={(ev) => toggleActive(e, ev)}
                      disabled={toggling === e._id}
                      title={e.isActive ? 'Deactivate estate' : 'Activate estate'}
                      className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                      style={{ color: '#CBD5E1' }}
                      onMouseEnter={ev => {
                        ev.currentTarget.style.color = e.isActive ? '#DC2626' : '#059669';
                        ev.currentTarget.style.background = e.isActive ? '#FEF2F2' : '#ECFDF5';
                      }}
                      onMouseLeave={ev => {
                        ev.currentTarget.style.color = '#CBD5E1';
                        ev.currentTarget.style.background = 'transparent';
                      }}>
                      {toggling === e._id
                        ? <RefreshCw size={13} className="animate-spin" />
                        : e.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                    </button>
                    {/* Edit */}
                    <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                      title="Edit estate"
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: '#CBD5E1' }}
                      onMouseEnter={ev => { ev.currentTarget.style.color = '#7C3AED'; ev.currentTarget.style.background = 'rgba(124,58,237,0.08)'; }}
                      onMouseLeave={ev => { ev.currentTarget.style.color = '#CBD5E1'; ev.currentTarget.style.background = 'transparent'; }}>
                      <Edit3 size={13} />
                    </button>
                    {/* View details */}
                    <button onClick={() => navigate(`/estates/${e._id}`)}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={ev => { ev.currentTarget.style.color = '#059669'; ev.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
                      onMouseLeave={ev => { ev.currentTarget.style.color = '#94A3B8'; ev.currentTarget.style.background = 'transparent'; }}>
                      Details <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Edit — ${selected?.name}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>Estate Name</label>
            <input className="input-field" value={editForm.name}
              onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm mb-1.5 block font-medium" style={{ color: '#475569' }}>Address</label>
            <textarea className="input-field resize-none" rows={3} value={editForm.address}
              onChange={e => setEditForm({ ...editForm, address: e.target.value })} required />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={() => setSelected(null)} className="btn-outline flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
