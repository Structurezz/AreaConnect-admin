import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, RefreshCw, UserCheck, UserX, X, Edit3, Phone, Mail, Building2 } from 'lucide-react';
import { userAPI, estateAPI } from '../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ROLES = ['all', 'super_admin', 'estate_manager', 'resident', 'security'];
const ROLE_META = {
  super_admin:    { label: 'Super Admin',  bg: 'rgba(124,58,237,0.10)', color: '#7C3AED', border: 'rgba(124,58,237,0.20)' },
  estate_manager: { label: 'Estate Mgr',  bg: 'rgba(16,185,129,0.10)',  color: '#059669', border: 'rgba(16,185,129,0.20)' },
  resident:       { label: 'Resident',    bg: 'rgba(37,99,235,0.10)',   color: '#2563EB', border: 'rgba(37,99,235,0.20)' },
  security:       { label: 'Security',    bg: 'rgba(245,158,11,0.10)',  color: '#D97706', border: 'rgba(245,158,11,0.20)' },
};
const STATUS_FILTERS = ['all', 'active', 'suspended'];

function RoleBadge({ role }) {
  const m = ROLE_META[role] || { label: role, bg: 'rgba(71,85,105,0.08)', color: '#475569', border: '#E2E8F0' };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: m.bg, color: m.color, border: `1px solid ${m.border}` }}>
      {m.label}
    </span>
  );
}

const BLANK_FORM = { name: '', email: '', phone: '', password: '', role: 'estate_manager', estateId: '' };

export default function Users() {
  const [users, setUsers]         = useState([]);
  const [estates, setEstates]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(BLANK_FORM);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (roleFilter !== 'all') params.role = roleFilter;
    Promise.all([userAPI.getAll(params), estateAPI.getAll()])
      .then(([u, e]) => { setUsers(u.data.data); setEstates(e.data.data); })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [roleFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (user) => {
    setToggling(user._id);
    try {
      await userAPI.update(user._id, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
      toast.success(user.isActive ? `${user.name} suspended` : `${user.name} activated`);
    } catch {
      toast.error('Action failed');
    } finally {
      setToggling(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.estateId) delete payload.estateId;
      const { data } = await userAPI.create(payload);
      setUsers(prev => [data.data, ...prev]);
      setShowCreate(false);
      setForm(BLANK_FORM);
      toast.success('User created successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (u) => {
    setEditing(u);
    setEditForm({
      name: u.name || '',
      phone: u.phone || '',
      estateId: typeof u.estateId === 'object' ? (u.estateId?._id || '') : (u.estateId || ''),
    });
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (!payload.estateId) delete payload.estateId;
      await userAPI.update(editing._id, payload);
      setUsers(prev => prev.map(u => u._id === editing._id ? { ...u, ...payload } : u));
      setEditing(null);
      toast.success('User updated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter(u => {
    if (statusFilter === 'active' && !u.isActive) return false;
    if (statusFilter === 'suspended' && u.isActive) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
  });

  const counts = ROLES.reduce((acc, r) => {
    acc[r] = r === 'all' ? users.length : users.filter(u => u.role === r).length;
    return acc;
  }, {});

  const activeCount    = users.filter(u => u.isActive).length;
  const suspendedCount = users.length - activeCount;

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Users</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Manage all platform users and roles</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
          <Plus size={15} /> New User
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Users',    value: users.length,   color: '#0F172A' },
          { label: 'Active',         value: activeCount,    color: '#059669' },
          { label: 'Suspended',      value: suspendedCount, color: '#DC2626' },
          { label: 'Estate Managers', value: counts.estate_manager, color: '#7C3AED' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, phone…"
            className="input-field pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={statusFilter === s
                ? { background: s === 'active' ? '#059669' : s === 'suspended' ? '#DC2626' : '#0F172A', color: '#FFF' }
                : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ROLES.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={roleFilter === r
                ? { background: '#10B981', color: '#FFF' }
                : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
              {r === 'all' ? 'All Roles' : ROLE_META[r]?.label || r}
              <span className="ml-1.5" style={{ color: roleFilter === r ? 'rgba(255,255,255,0.7)' : '#94A3B8' }}>
                {counts[r]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={20} className="animate-spin" style={{ color: '#10B981' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>User</th>
                  <th className="text-left font-medium px-4 py-3" style={{ color: '#94A3B8' }}>Role</th>
                  <th className="text-left font-medium px-4 py-3 hidden sm:table-cell" style={{ color: '#94A3B8' }}>Phone</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell" style={{ color: '#94A3B8' }}>Estate</th>
                  <th className="text-left font-medium px-4 py-3 hidden lg:table-cell" style={{ color: '#94A3B8' }}>Joined</th>
                  <th className="text-center font-medium px-4 py-3" style={{ color: '#94A3B8' }}>Status</th>
                  <th className="px-4 py-3 w-20 text-right font-medium" style={{ color: '#94A3B8' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const meta = ROLE_META[u.role] || { bg: 'rgba(71,85,105,0.08)', color: '#475569' };
                  const estateName = typeof u.estateId === 'object' ? (u.estateId?.name || '—') : '—';
                  return (
                    <tr key={u._id} className="transition-colors"
                      style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: meta.bg, color: meta.color }}>
                            {u.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium leading-tight" style={{ color: '#0F172A' }}>{u.name}</div>
                            <a href={`mailto:${u.email}`}
                              className="text-xs hover:underline flex items-center gap-1"
                              style={{ color: '#94A3B8' }}>
                              <Mail size={10} />{u.email}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {u.phone
                          ? <a href={`tel:${u.phone}`} className="text-xs flex items-center gap-1 hover:underline"
                              style={{ color: '#475569' }}>
                              <Phone size={11} />{u.phone}
                            </a>
                          : <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {estateName !== '—'
                          ? <div className="flex items-center gap-1.5 text-xs" style={{ color: '#475569' }}>
                              <Building2 size={11} style={{ flexShrink: 0 }} />{estateName}
                            </div>
                          : <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="text-xs" style={{ color: '#94A3B8' }}>
                          {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={u.isActive
                            ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                            : { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(u)}
                            title="Edit user"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: '#CBD5E1' }}
                            onMouseEnter={ev => { ev.currentTarget.style.color = '#7C3AED'; ev.currentTarget.style.background = 'rgba(124,58,237,0.08)'; }}
                            onMouseLeave={ev => { ev.currentTarget.style.color = '#CBD5E1'; ev.currentTarget.style.background = 'transparent'; }}>
                            <Edit3 size={13} />
                          </button>
                          {u.role !== 'super_admin' && (
                            <button onClick={() => toggleActive(u)} disabled={toggling === u._id}
                              title={u.isActive ? 'Suspend user' : 'Activate user'}
                              className="p-1.5 rounded-lg transition-all disabled:opacity-40"
                              style={{ color: '#CBD5E1' }}
                              onMouseEnter={ev => {
                                ev.currentTarget.style.color = u.isActive ? '#DC2626' : '#059669';
                                ev.currentTarget.style.background = u.isActive ? '#FEF2F2' : '#ECFDF5';
                              }}
                              onMouseLeave={ev => {
                                ev.currentTarget.style.color = '#CBD5E1';
                                ev.currentTarget.style.background = 'transparent';
                              }}>
                              {toggling === u._id
                                ? <RefreshCw size={13} className="animate-spin" />
                                : u.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && (
          <div className="px-5 py-2.5 text-xs" style={{ borderTop: '1px solid rgba(0,0,0,0.04)', color: '#94A3B8' }}>
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Create User</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Add a new user to the platform</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Full Name *</label>
                <input required value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Email *</label>
                <input required type="email" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="input-field" placeholder="john@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Phone</label>
                  <input value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="input-field" placeholder="+234…" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Password *</label>
                  <input required type="password" minLength={6} value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="input-field" placeholder="Min. 6 chars" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Role *</label>
                  <select value={form.role}
                    onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                    className="input-field">
                    <option value="super_admin">Super Admin</option>
                    <option value="estate_manager">Estate Manager</option>
                    <option value="resident">Resident</option>
                    <option value="security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Estate</label>
                  <select value={form.estateId}
                    onChange={e => setForm(p => ({ ...p, estateId: e.target.value }))}
                    className="input-field">
                    <option value="">— None —</option>
                    {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
                  {saving ? <><RefreshCw size={13} className="animate-spin" /> Creating…</> : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Edit User</h2>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {editing.email} · <RoleBadge role={editing.role} />
                </p>
              </div>
              <button onClick={() => setEditing(null)} className="transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Full Name *</label>
                <input required value={editForm.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                  className="input-field" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Phone</label>
                <input value={editForm.phone}
                  onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                  className="input-field" placeholder="+234…" />
              </div>
              {editing.role !== 'super_admin' && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: '#475569' }}>Estate</label>
                  <select value={editForm.estateId}
                    onChange={e => setEditForm(p => ({ ...p, estateId: e.target.value }))}
                    className="input-field">
                    <option value="">— None —</option>
                    {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditing(null)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 gap-2">
                  {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
