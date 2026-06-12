import { useEffect, useState } from 'react';
import { estateAPI } from '../api';
import { Link, useNavigate } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import {
  Building2, Plus, MapPin, User, Hash,
  CheckCircle, XCircle, Search, Edit3, ArrowRight,
  ToggleLeft, ToggleRight, RefreshCw, Phone, Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_FILTERS = ['all', 'active', 'inactive', 'managed', 'unmanaged'];

export default function AdminEstates() {
  const navigate  = useNavigate();
  const [estates, setEstates]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected]   = useState(null);
  const [editForm, setEditForm]   = useState({ name: '', address: '' });
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await estateAPI.getAll();
      setEstates(data.data);
    } catch { toast.error('Failed to load estates'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

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
    if (statusFilter === 'active'   && !e.isActive)    return false;
    if (statusFilter === 'inactive' && e.isActive)     return false;
    if (statusFilter === 'managed'  && !e.managerId)   return false;
    if (statusFilter === 'unmanaged' && e.managerId)   return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return e.name.toLowerCase().includes(q) || e.estateCode.includes(q.toUpperCase());
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
            placeholder="Search by name or estate code…"
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
