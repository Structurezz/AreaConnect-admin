import { useEffect, useState } from 'react';
import { planAPI, estateAPI } from '../api';
import toast from 'react-hot-toast';
import {
  CreditCard, RefreshCw, Building2, Edit3, X, Search, Filter,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLE = {
  active:    { label: 'Active',    bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' },
  trial:     { label: 'Trial',     bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
  expired:   { label: 'Expired',   bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
  suspended: { label: 'Suspended', bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
  cancelled: { label: 'Cancelled', bg: '#F8FAFC', color: '#475569', border: '#E2E8F0' },
};
const STATUS_KEYS = ['all', 'active', 'trial', 'expired', 'suspended', 'cancelled'];

const fmt = (n) => n === 0 ? 'Free' : `₦${n.toLocaleString()}`;

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.expired;
  return (
    <span className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

export default function Subscriptions() {
  const [subs, setSubs]         = useState([]);
  const [plans, setPlans]       = useState([]);
  const [estates, setEstates]   = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editing, setEditing]   = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newForm, setNewForm]   = useState({
    estateId: '', planId: '', cycle: 'monthly', billingModel: 'flat',
    residentCount: '', status: 'trial', trialDays: 14, notes: '',
  });
  const [showNew, setShowNew]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, e, st] = await Promise.all([
        planAPI.getSubscriptions(),
        planAPI.getAll(),
        estateAPI.getAll(),
        planAPI.getSubscriptionStats(),
      ]);
      setSubs(s.data.data);
      setPlans(p.data.data);
      setEstates(e.data.data);
      setStats(st.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setAssigning(true);
    try {
      await planAPI.assign(newForm);
      toast.success('Subscription assigned');
      setShowNew(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setAssigning(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await planAPI.updateSubscription(editing._id, {
        planId: editing.planId?._id || editing.planId,
        cycle: editing.cycle,
        status: editing.status,
        notes: editing.notes,
        billingModel: editing.billingModel,
      });
      toast.success('Subscription updated');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const filtered = subs.filter(sub => {
    if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      sub.estateId?.name?.toLowerCase().includes(q) ||
      sub.estateId?.estateCode?.toLowerCase().includes(q) ||
      sub.planId?.name?.toLowerCase().includes(q)
    );
  });

  const MRR = stats?.mrr || 0;

  const statusCounts = STATUS_KEYS.reduce((acc, s) => {
    acc[s] = s === 'all' ? subs.length : subs.filter(sub => sub.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Subscriptions</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Manage estate plan assignments and billing</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary gap-2">
          <CreditCard size={15} /> Assign Plan
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Total',             value: stats.total,   color: '#0F172A' },
            { label: 'Active',            value: stats.active,  color: '#059669' },
            { label: 'On Trial',          value: stats.trial,   color: '#2563EB' },
            { label: 'Expired/Suspended', value: stats.expired, color: '#DC2626' },
            { label: 'Monthly Revenue',   value: fmt(MRR),      color: '#059669' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4 text-center">
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
              <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Plan distribution */}
      {stats?.byPlan?.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
            Distribution by Plan
          </p>
          <div className="flex gap-3 flex-wrap">
            {stats.byPlan.map(p => {
              const pct = Math.round((p.count / Math.max(stats.total, 1)) * 100);
              return (
                <div key={p._id} className="flex items-center gap-2 px-3 py-2 rounded-full"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{p.name}</span>
                  <span className="text-xs" style={{ color: '#94A3B8' }}>{p.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search estate, code, plan…"
            className="input-field pl-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_KEYS.map(s => {
            const style = s !== 'all' ? (STATUS_STYLE[s] || {}) : {};
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                style={statusFilter === s
                  ? { background: s === 'all' ? '#0F172A' : style.color, color: '#FFF', border: 'none' }
                  : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
                {s === 'all' ? 'All' : STATUS_STYLE[s]?.label || s}
                <span className="ml-1" style={{ color: statusFilter === s ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>
                  {statusCounts[s]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <RefreshCw size={20} className="animate-spin" style={{ color: '#10B981' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
            <p className="text-sm" style={{ color: '#94A3B8' }}>
              {search || statusFilter !== 'all' ? 'No matching subscriptions' : 'No subscriptions yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Estate</th>
                  <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Plan</th>
                  <th className="text-left font-medium px-5 py-3 hidden sm:table-cell" style={{ color: '#94A3B8' }}>Cycle</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell" style={{ color: '#94A3B8' }}>Model</th>
                  <th className="text-left font-medium px-5 py-3" style={{ color: '#94A3B8' }}>Status</th>
                  <th className="text-left font-medium px-5 py-3 hidden lg:table-cell" style={{ color: '#94A3B8' }}>Next Billing</th>
                  <th className="text-left font-medium px-5 py-3 hidden xl:table-cell" style={{ color: '#94A3B8' }}>Notes</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => {
                  const plan = sub.planId;
                  const price = sub.cycle === 'annual' ? plan?.price?.annual : plan?.price?.monthly;
                  return (
                    <tr key={sub._id} className="transition-colors"
                      style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                      <td className="px-5 py-3.5">
                        <div className="font-medium" style={{ color: '#0F172A' }}>{sub.estateId?.name || '—'}</div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>{sub.estateId?.estateCode}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {plan ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: plan.color }} />
                              <span className="font-medium" style={{ color: '#0F172A' }}>{plan.name}</span>
                            </div>
                            {price > 0 && (
                              <div className="text-xs mt-0.5 ml-4" style={{ color: '#94A3B8' }}>
                                ₦{price.toLocaleString()}/{sub.cycle === 'annual' ? 'yr' : 'mo'}
                              </div>
                            )}
                          </div>
                        ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell capitalize text-xs" style={{ color: '#475569' }}>
                        {sub.cycle}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-xs capitalize" style={{ color: '#475569' }}>
                        {sub.billingModel === 'per_resident' ? 'Per resident' : 'Flat fee'}
                      </td>
                      <td className="px-5 py-3.5"><StatusBadge status={sub.status} /></td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-xs" style={{ color: '#94A3B8' }}>
                        {sub.nextBillingDate ? format(new Date(sub.nextBillingDate), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-5 py-3.5 hidden xl:table-cell max-w-[140px]">
                        {sub.notes
                          ? <span className="text-xs truncate block" style={{ color: '#475569' }} title={sub.notes}>{sub.notes}</span>
                          : <span className="text-xs" style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setEditing({ ...sub })}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: '#94A3B8' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
                          <Edit3 size={14} />
                        </button>
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
            Showing {filtered.length} of {subs.length} subscriptions
          </div>
        )}
      </div>

      {/* Assign modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNew(false)} />
          <div className="relative glass-card w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>Assign Plan to Estate</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Create a new subscription assignment</p>
              </div>
              <button onClick={() => setShowNew(false)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Estate *</label>
                <select className="input-field" value={newForm.estateId}
                  onChange={e => setNewForm({ ...newForm, estateId: e.target.value })} required>
                  <option value="">Select estate…</option>
                  {estates.map(e => <option key={e._id} value={e._id}>{e.name} — {e.estateCode}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Plan *</label>
                <select className="input-field" value={newForm.planId}
                  onChange={e => setNewForm({ ...newForm, planId: e.target.value })} required>
                  <option value="">Select plan…</option>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.name} — {fmt(p.price.monthly)}/mo</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Billing Model</label>
                  <select className="input-field" value={newForm.billingModel}
                    onChange={e => setNewForm({ ...newForm, billingModel: e.target.value })}>
                    <option value="flat">Flat fee</option>
                    <option value="per_resident">Per resident</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Billing Cycle</label>
                  <select className="input-field" value={newForm.cycle}
                    onChange={e => setNewForm({ ...newForm, cycle: e.target.value })}
                    disabled={newForm.billingModel === 'per_resident'}>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
              {newForm.billingModel === 'per_resident' && (
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Resident Count</label>
                  <input type="number" min="1" className="input-field" placeholder="e.g. 80" value={newForm.residentCount}
                    onChange={e => setNewForm({ ...newForm, residentCount: e.target.value })} />
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Initial Status</label>
                <select className="input-field" value={newForm.status}
                  onChange={e => setNewForm({ ...newForm, status: e.target.value })}>
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                </select>
              </div>
              {newForm.status === 'trial' && (
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>
                    Trial Duration (days)
                  </label>
                  <input type="number" min="1" max="90" className="input-field" value={newForm.trialDays}
                    onChange={e => setNewForm({ ...newForm, trialDays: parseInt(e.target.value) })} />
                </div>
              )}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Notes (optional)</label>
                <input className="input-field" placeholder="Internal notes about this subscription…"
                  value={newForm.notes} onChange={e => setNewForm({ ...newForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNew(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={assigning} className="btn-primary flex-1">
                  {assigning ? 'Assigning…' : 'Assign Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>Edit Subscription</h3>
                <p className="text-sm -mt-0.5" style={{ color: '#475569' }}>{editing.estateId?.name}</p>
              </div>
              <button onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Plan</label>
                <select className="input-field" value={editing.planId?._id || editing.planId}
                  onChange={e => setEditing({ ...editing, planId: e.target.value })}>
                  {plans.map(p => <option key={p._id} value={p._id}>{p.name} — {fmt(p.price.monthly)}/mo</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Cycle</label>
                  <select className="input-field" value={editing.cycle}
                    onChange={e => setEditing({ ...editing, cycle: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Status</label>
                  <select className="input-field" value={editing.status}
                    onChange={e => setEditing({ ...editing, status: e.target.value })}>
                    {Object.keys(STATUS_STYLE).map(s => (
                      <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Billing Model</label>
                <select className="input-field" value={editing.billingModel || 'flat'}
                  onChange={e => setEditing({ ...editing, billingModel: e.target.value })}>
                  <option value="flat">Flat fee</option>
                  <option value="per_resident">Per resident</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Notes</label>
                <input className="input-field" placeholder="Internal notes…"
                  value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(null)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
