import { useEffect, useState, useCallback } from 'react';
import { Search, Plus, RefreshCw, UserCheck, UserX, X, Edit3, Phone, Mail, Building2, KeyRound, Clock, ShieldAlert, CheckSquare, Square, Users as UsersIcon, ShieldCheck, Home, Briefcase } from 'lucide-react';
import { userAPI, estateAPI } from '../api';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const ROLES = ['all', 'super_admin', 'estate_manager', 'resident', 'security'];
const ROLE_META = {
  super_admin:    { label: 'Super Admin', badge: 'gray',   avBg: '#F2F4F7', avFg: '#344054' },
  estate_manager: { label: 'Estate Mgr',  badge: 'green',  avBg: '#ECFDF3', avFg: '#067647' },
  resident:       { label: 'Resident',    badge: 'blue',   avBg: '#EFF8FF', avFg: '#175CD3' },
  security:       { label: 'Security',    badge: 'yellow', avBg: '#FFFAEB', avFg: '#B54708' },
};
const STATUS_LABELS = { all: 'All', active: 'Active', suspended: 'Suspended', 'pending-reset': 'Pending reset' };
const STATUS_FILTERS = ['all', 'active', 'suspended', 'pending-reset'];

function RoleBadge({ role }) {
  const m = ROLE_META[role] || { label: role, badge: 'gray' };
  return <span className={`badge badge-${m.badge}`}>{m.label}</span>;
}

function ModalShell({ title, subtitle, onClose, children, scroll }) {
  return (
    <div className="fixed inset-0 bg-[#101828]/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
      <div className={`card w-full max-w-md overflow-hidden ${scroll ? 'max-h-[90vh] flex flex-col' : ''}`}>
        <div className="card-header">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#101828]">{title}</h2>
            {subtitle && <div className="text-[12px] text-[#98A2B3] mt-0.5 flex items-center gap-1.5 flex-wrap">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7] transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className={`p-5 ${scroll ? 'overflow-y-auto' : ''}`}>{children}</div>
      </div>
    </div>
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
  const [estateFilter, setEstateFilter] = useState('all');
  const [sortBy, setSortBy]         = useState('new');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(BLANK_FORM);
  const [editForm, setEditForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(null);
  const [resetting, setResetting] = useState(null);
  const [selected, setSelected]   = useState(new Set());
  const [bulking, setBulking]     = useState(false);

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

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const doBulk = async (action) => {
    if (!selected.size) return;
    if (!window.confirm(`${action === 'suspend' ? 'Suspend' : 'Activate'} ${selected.size} selected user${selected.size === 1 ? '' : 's'}?`)) return;
    setBulking(true);
    try {
      await userAPI.bulk({ userIds: Array.from(selected), action });
      toast.success(`${action === 'suspend' ? 'Suspended' : 'Activated'} ${selected.size}`);
      setSelected(new Set());
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk action failed');
    } finally { setBulking(false); }
  };

  const resetPassword = async (user) => {
    if (!window.confirm(`Send ${user.name} a new temporary password?\n\nTheir current password will be invalidated.`)) return;
    setResetting(user._id);
    try {
      await userAPI.resetPassword(user._id);
      toast.success('Temp password emailed');
      setUsers(prev => prev.map(u => u._id === user._id ? { ...u, mustChangePassword: true } : u));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Reset failed');
    } finally { setResetting(null); }
  };

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
      role: u.role,
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
    if (statusFilter === 'active'    && !u.isActive) return false;
    if (statusFilter === 'suspended' && u.isActive)  return false;
    if (statusFilter === 'pending-reset' && !u.mustChangePassword) return false;
    if (estateFilter !== 'all' && (u.estateId?._id || u.estateId) !== estateFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q);
  }).sort((a, b) => {
    if (sortBy === 'lastseen') return new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0);
    if (sortBy === 'name')     return (a.name || '').localeCompare(b.name || '');
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const counts = ROLES.reduce((acc, r) => {
    acc[r] = r === 'all' ? users.length : users.filter(u => u.role === r).length;
    return acc;
  }, {});

  const activeCount    = users.filter(u => u.isActive).length;
  const suspendedCount = users.length - activeCount;

  const allSelected = filtered.length > 0 && filtered.every(u => selected.has(u._id));
  const iconBtn = 'p-1.5 rounded-md text-[#98A2B3] transition-colors disabled:opacity-40';

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Users"
        description="Manage all platform users, roles and access."
        actions={(
          <>
            <button onClick={load} className="btn-outline gap-2" title="Refresh">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary gap-2">
              <Plus size={15} /> New user
            </button>
          </>
        )}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="tabs">
            {ROLES.map(r => (
              <button key={r} onClick={() => setRoleFilter(r)} className={`tab ${roleFilter === r ? 'active' : ''}`}>
                {r === 'all' ? 'All roles' : ROLE_META[r]?.label || r}
                <span className="ml-1.5 text-[11px] text-[#98A2B3] tabular-nums">{counts[r]}</span>
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-6 mb-5">
        <StatCard label="Total users" value={users.length}          icon={UsersIcon}   color="green" />
        <StatCard label="Active"      value={activeCount}           icon={UserCheck}   color="green" />
        <StatCard label="Suspended"   value={suspendedCount}        icon={UserX}       color="red" />
        <StatCard label="Managers"    value={counts.estate_manager} icon={Briefcase}   color="green" />
        <StatCard label="Residents"   value={counts.resident}       icon={Home}        color="blue" />
        <StatCard label="Security"    value={counts.security}       icon={ShieldCheck} color="amber" />
      </div>

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-[#E4E7EC] flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1 min-w-0 lg:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, phone…"
              className="input-field pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <div className="overflow-x-auto max-w-full">
              <div className="tabs">
                {STATUS_FILTERS.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`tab ${statusFilter === s ? 'active' : ''}`}>
                    {STATUS_LABELS[s] || s}
                  </button>
                ))}
              </div>
            </div>
            <select className="input-field !w-auto min-w-[150px] !h-[34px] !text-[12.5px]"
              value={estateFilter} onChange={e => setEstateFilter(e.target.value)}>
              <option value="all">All estates</option>
              {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
            <select className="input-field !w-auto min-w-[130px] !h-[34px] !text-[12.5px]"
              value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="new">Newest first</option>
              <option value="lastseen">Last seen</option>
              <option value="name">Name A→Z</option>
            </select>
          </div>
        </div>

        {/* Bulk action bar — only shows when something is selected */}
        {selected.size > 0 && (
          <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap bg-[#ECFDF3] border-b border-[#ABEFC6]">
            <span className="text-[13px] font-semibold text-[#067647] tabular-nums">{selected.size} selected</span>
            <button onClick={() => doBulk('activate')} disabled={bulking} className="btn-primary !h-8 !px-3 !text-[12.5px]">
              {bulking ? '…' : 'Activate'}
            </button>
            <button onClick={() => doBulk('suspend')} disabled={bulking} className="btn-danger !h-8 !px-3 !text-[12.5px]">
              {bulking ? '…' : 'Suspend'}
            </button>
            <button onClick={() => setSelected(new Set())} className="btn-ghost !h-8 !px-3 !text-[12.5px] ml-auto">Clear</button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-8 h-8 !rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-40" />
                  <div className="skeleton h-2.5 w-56" />
                </div>
                <div className="skeleton h-5 w-20 hidden sm:block" />
                <div className="skeleton h-5 w-16" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
              <UsersIcon size={18} className="text-[#98A2B3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#101828]">No users found</p>
            <p className="text-[12.5px] text-[#98A2B3] mt-0.5">Try changing the search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[900px]">
              <thead>
                <tr>
                  <th className="w-10 !pr-0">
                    <button onClick={() => {
                      if (filtered.every(u => selected.has(u._id))) setSelected(new Set());
                      else setSelected(new Set(filtered.map(u => u._id)));
                    }} className="flex items-center" aria-label="Select all">
                      {allSelected
                        ? <CheckSquare size={15} className="text-[#059669]" />
                        : <Square size={15} className="text-[#D0D5DD]" />}
                    </button>
                  </th>
                  <th className="text-left">User</th>
                  <th className="text-left">Role</th>
                  <th className="text-left">Estate / Unit</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Last seen</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const meta = ROLE_META[u.role] || { avBg: '#F2F4F7', avFg: '#344054' };
                  const estateName = typeof u.estateId === 'object' ? (u.estateId?.name || '—') : '—';
                  const unit = typeof u.unitId === 'object' && u.unitId
                    ? `${u.unitId.block ? `Block ${u.unitId.block} · ` : ''}Unit ${u.unitId.unitNumber}`
                    : null;
                  const isSelected = selected.has(u._id);
                  return (
                    <tr key={u._id} className={isSelected ? '!bg-[#F6FEF9]' : ''}>
                      <td className="!pr-0">
                        <button onClick={() => toggleSelect(u._id)} className="flex items-center" aria-label="Select user">
                          {isSelected
                            ? <CheckSquare size={15} className="text-[#059669]" />
                            : <Square size={15} className="text-[#D0D5DD]" />}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 overflow-hidden"
                            style={{ background: meta.avBg, color: meta.avFg }}>
                            {u.profilePhoto
                              ? <img src={u.profilePhoto} alt="" className="w-full h-full object-cover" />
                              : (u.name?.[0]?.toUpperCase() || '?')}
                          </div>
                          <div className="min-w-0">
                            <div className="cell-strong leading-tight flex items-center gap-1.5">
                              <span className="truncate max-w-[200px]">{u.name}</span>
                              {u.mustChangePassword && (
                                <span title="Must change password on next sign-in" className="badge badge-yellow !text-[10px] !py-0 gap-0.5">
                                  <ShieldAlert size={10} /> Reset
                                </span>
                              )}
                            </div>
                            <a href={`mailto:${u.email}`}
                              className="text-[12px] text-[#98A2B3] hover:text-[#475467] hover:underline flex items-center gap-1 mt-0.5">
                              <Mail size={11} /><span className="truncate max-w-[220px]">{u.email}</span>
                            </a>
                          </div>
                        </div>
                      </td>
                      <td><RoleBadge role={u.role} /></td>
                      <td>
                        {estateName !== '—' ? (
                          <>
                            <div className="flex items-center gap-1.5 text-[13px] text-[#344054]">
                              <Building2 size={12} className="text-[#98A2B3] flex-shrink-0" />
                              <span className="truncate max-w-[160px]">{estateName}</span>
                            </div>
                            {unit && <div className="text-[11.5px] text-[#98A2B3] mt-0.5">{unit}</div>}
                          </>
                        ) : <span className="text-[#D0D5DD]">—</span>}
                      </td>
                      <td>
                        {u.phone
                          ? <a href={`tel:${u.phone}`} className="text-[12.5px] flex items-center gap-1 text-[#475467] hover:underline tabular-nums whitespace-nowrap">
                              <Phone size={11} className="text-[#98A2B3]" />{u.phone}
                            </a>
                          : <span className="text-[#D0D5DD]">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-[#12B76A]' : 'bg-[#F04438]'}`} />
                          {u.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="text-[12.5px] flex items-center gap-1 text-[#475467]">
                          <Clock size={11} className="text-[#98A2B3]" />
                          {u.lastSeen ? formatDistanceToNow(new Date(u.lastSeen), { addSuffix: true }) : <span className="text-[#98A2B3]">Never</span>}
                        </div>
                        <div className="text-[11.5px] text-[#98A2B3] mt-0.5">
                          Joined {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yy') : '—'}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => openEdit(u)} title="Edit user"
                            className={`${iconBtn} hover:text-[#101828] hover:bg-[#F2F4F7]`}>
                            <Edit3 size={14} />
                          </button>
                          {u.role !== 'super_admin' && (
                            <button onClick={() => resetPassword(u)} disabled={resetting === u._id}
                              title="Email a new temporary password"
                              className={`${iconBtn} hover:text-[#175CD3] hover:bg-[#EFF8FF]`}>
                              {resetting === u._id ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                            </button>
                          )}
                          {u.role !== 'super_admin' && (
                            <button onClick={() => toggleActive(u)} disabled={toggling === u._id}
                              title={u.isActive ? 'Suspend user' : 'Activate user'}
                              className={`${iconBtn} ${u.isActive ? 'hover:text-[#B42318] hover:bg-[#FEF3F2]' : 'hover:text-[#067647] hover:bg-[#ECFDF3]'}`}>
                              {toggling === u._id
                                ? <RefreshCw size={14} className="animate-spin" />
                                : u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
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
          <div className="px-4 py-2.5 text-[12px] text-[#98A2B3] border-t border-[#E4E7EC] tabular-nums">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <ModalShell title="Create user" subtitle="Add a new user to the platform" onClose={() => setShowCreate(false)} scroll>
          <form onSubmit={handleCreate} className="space-y-3.5">
            <div>
              <label className="field-label">Full name *</label>
              <input required value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className="input-field" placeholder="John Doe" />
            </div>
            <div>
              <label className="field-label">Email *</label>
              <input required type="email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="input-field" placeholder="john@example.com" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Phone</label>
                <input value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="input-field" placeholder="+234…" />
              </div>
              <div>
                <label className="field-label">Password *</label>
                <input required type="password" minLength={6} value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="input-field" placeholder="Min. 6 chars" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="field-label">Role *</label>
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
                <label className="field-label">Estate</label>
                <select value={form.estateId}
                  onChange={e => setForm(p => ({ ...p, estateId: e.target.value }))}
                  className="input-field">
                  <option value="">— None —</option>
                  {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary gap-2">
                {saving ? <><RefreshCw size={13} className="animate-spin" /> Creating…</> : 'Create user'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {/* Edit User Modal */}
      {editing && (
        <ModalShell title="Edit user" subtitle={<>{editing.email} <RoleBadge role={editing.role} /></>} onClose={() => setEditing(null)}>
          <form onSubmit={handleEdit} className="space-y-3.5">
            <div>
              <label className="field-label">Full name *</label>
              <input required value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                className="input-field" />
            </div>
            <div>
              <label className="field-label">Phone</label>
              <input value={editForm.phone}
                onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                className="input-field" placeholder="+234…" />
            </div>
            {editing.role !== 'super_admin' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Role</label>
                  <select value={editForm.role}
                    onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                    className="input-field">
                    <option value="estate_manager">Estate Manager</option>
                    <option value="resident">Resident</option>
                    <option value="security">Security</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Estate</label>
                  <select value={editForm.estateId}
                    onChange={e => setEditForm(p => ({ ...p, estateId: e.target.value }))}
                    className="input-field">
                    <option value="">— None —</option>
                    {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary gap-2">
                {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : 'Save changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
