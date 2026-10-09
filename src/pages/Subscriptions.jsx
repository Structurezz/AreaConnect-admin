import { useEffect, useState } from 'react';
import { planAPI, estateAPI } from '../api';
import toast from 'react-hot-toast';
import {
  CreditCard, RefreshCw, Building2, Edit3, X, Search, Filter,
  Gift, Sparkles, Infinity as InfinityIcon, Trash2,
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

  // Comp / promo override state
  const [showComp,    setShowComp]    = useState(false);
  const [compGranting, setCompGranting] = useState(false);
  const [compRevoking, setCompRevoking] = useState(null);
  const [compForm,    setCompForm]    = useState({
    estateId: '', planId: '', reason: '', expiryPreset: 'never', customExpiry: '', cycle: 'monthly',
  });

  // Inline comp panel inside the Edit Subscription modal. Seeded from the
  // subscription's current comp when the modal opens so the admin can tweak
  // plan / reason / expiry — or flip isActive off to revoke on save.
  const [editCompForm, setEditCompForm] = useState({
    isActive: false, planId: '', reason: '',
    expiryPreset: 'never', customExpiry: '', cycle: 'monthly',
  });

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

  const openEdit = (sub) => {
    const comp     = sub.comp || {};
    const isActive = !!(comp.isActive && comp.planId);
    const hasExpiry = !!comp.expiresAt;
    setEditCompForm({
      isActive,
      planId:   comp.planId?._id || comp.planId || '',
      reason:   comp.reason || '',
      cycle:    'monthly',
      expiryPreset: hasExpiry ? 'custom' : 'never',
      customExpiry: hasExpiry ? new Date(comp.expiresAt).toISOString().slice(0, 10) : '',
    });
    setEditing({ ...sub });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const estateId  = editing.estateId?._id || editing.estateId;
      const wasActive = !!(editing.comp?.isActive && editing.comp?.planId);
      const willActive = !!editCompForm.isActive;

      // Validate comp input before touching the server.
      if (willActive && !editCompForm.planId) {
        toast.error('Pick a plan for the comp access');
        setSaving(false);
        return;
      }
      if (willActive && editCompForm.expiryPreset === 'custom' && !editCompForm.customExpiry) {
        toast.error('Pick a custom expiry date');
        setSaving(false);
        return;
      }

      await planAPI.updateSubscription(editing._id, {
        planId: editing.planId?._id || editing.planId,
        cycle: editing.cycle,
        status: editing.status,
        notes: editing.notes,
        billingModel: editing.billingModel,
      });

      if (wasActive && !willActive) {
        await planAPI.revokeComp(estateId);
      } else if (willActive) {
        const expiresAt = resolveCompExpiry(editCompForm.expiryPreset, editCompForm.customExpiry);
        await planAPI.grantComp({
          estateId,
          planId:    editCompForm.planId,
          reason:    editCompForm.reason,
          cycle:     editCompForm.cycle,
          expiresAt,
        });
      }

      toast.success('Subscription updated');
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  // Preselect premium-ish plan when the grant modal opens
  const openCompModal = (preset = {}) => {
    const premium = plans.find(p =>
      /premium|pro|growth/i.test(p.name || '') || /premium|pro|growth/i.test(p.slug || '')
    ) || plans[plans.length - 1];
    setCompForm({
      estateId: preset.estateId || '',
      planId:   preset.planId   || premium?._id || '',
      reason:   preset.reason   || 'Launch promo',
      expiryPreset: preset.expiryPreset || 'never',
      customExpiry: '',
      cycle:    preset.cycle    || 'monthly',
    });
    setShowComp(true);
  };

  const resolveCompExpiry = (preset, custom) => {
    if (preset === 'never') return null;
    if (preset === 'custom') return custom ? new Date(custom).toISOString() : null;
    const days = Number(preset);
    if (!Number.isFinite(days) || days <= 0) return null;
    return new Date(Date.now() + days * 86400000).toISOString();
  };

  const handleGrantComp = async (e) => {
    e.preventDefault();
    if (!compForm.estateId || !compForm.planId) {
      toast.error('Pick an estate and a plan');
      return;
    }
    setCompGranting(true);
    try {
      const expiresAt = resolveCompExpiry(compForm.expiryPreset, compForm.customExpiry);
      await planAPI.grantComp({
        estateId:  compForm.estateId,
        planId:    compForm.planId,
        reason:    compForm.reason,
        cycle:     compForm.cycle,
        expiresAt,
      });
      toast.success('Comp access granted');
      setShowComp(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant comp');
    } finally {
      setCompGranting(false);
    }
  };

  const handleRevokeComp = async (sub) => {
    const estateId = sub.estateId?._id || sub.estateId;
    if (!estateId) return;
    if (!window.confirm(`Revoke comp access for ${sub.estateId?.name || 'this estate'}?`)) return;
    setCompRevoking(estateId);
    try {
      await planAPI.revokeComp(estateId);
      toast.success('Comp access revoked');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke');
    } finally {
      setCompRevoking(null);
    }
  };

  // A subscription row's comp is "live" when flagged active and (no expiry OR expiry in future).
  const isCompLive = (sub) => {
    if (!sub?.comp?.isActive || !sub?.comp?.planId) return false;
    if (!sub.comp.expiresAt) return true;
    return new Date(sub.comp.expiresAt) > new Date();
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => openCompModal()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 1px 6px rgba(245,158,11,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <Gift size={15} /> Grant Comp Access
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary gap-2">
            <CreditCard size={15} /> Assign Plan
          </button>
        </div>
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
                  const compLive = isCompLive(sub);
                  const compPlan = compLive ? sub.comp.planId : null;
                  return (
                    <tr key={sub._id} className="transition-colors"
                      style={{ borderTop: '1px solid rgba(0,0,0,0.04)', background: compLive ? 'rgba(245,158,11,0.04)' : undefined }}
                      onMouseEnter={ev => ev.currentTarget.style.background = compLive ? 'rgba(245,158,11,0.08)' : '#F8FAFC'}
                      onMouseLeave={ev => ev.currentTarget.style.background = compLive ? 'rgba(245,158,11,0.04)' : 'transparent'}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="font-medium" style={{ color: '#0F172A' }}>{sub.estateId?.name || '—'}</div>
                          {compLive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                  style={{ background: 'rgba(245,158,11,0.15)', color: '#B45309', border: '1px solid rgba(245,158,11,0.35)' }}
                                  title={`Comp: ${compPlan?.name || 'plan'} · ${sub.comp.reason || 'no reason'}`}>
                              <Sparkles size={9} /> COMP
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>{sub.estateId?.estateCode}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {compLive && compPlan ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: compPlan.color || '#F59E0B' }} />
                              <span className="font-medium" style={{ color: '#0F172A' }}>{compPlan.name}</span>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: 'rgba(5,150,105,0.10)', color: '#047857' }}>
                                FREE
                              </span>
                            </div>
                            <div className="text-xs mt-0.5 ml-4 flex items-center gap-1.5" style={{ color: '#B45309' }}>
                              {sub.comp.expiresAt
                                ? <>Promo ends {format(new Date(sub.comp.expiresAt), 'MMM d, yyyy')}</>
                                : <><InfinityIcon size={11} /> Never expires</>}
                            </div>
                            {plan && (
                              <div className="text-[10px] mt-0.5 ml-4" style={{ color: '#94A3B8' }}>
                                Underlying: {plan.name}
                              </div>
                            )}
                          </div>
                        ) : plan ? (
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
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(sub)}
                            title="Edit subscription"
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: '#94A3B8' }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
                            <Edit3 size={14} />
                          </button>
                          {compLive ? (
                            <button
                              onClick={() => handleRevokeComp(sub)}
                              disabled={compRevoking === (sub.estateId?._id || sub.estateId)}
                              title="Revoke comp access"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: '#B45309' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)'; }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              {compRevoking === (sub.estateId?._id || sub.estateId)
                                ? <RefreshCw size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          ) : (
                            <button
                              onClick={() => openCompModal({ estateId: sub.estateId?._id || sub.estateId })}
                              title="Grant comp access"
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: '#94A3B8' }}
                              onMouseEnter={e => { e.currentTarget.style.color = '#B45309'; e.currentTarget.style.background = 'rgba(245,158,11,0.10)'; }}
                              onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
                            >
                              <Gift size={14} />
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

      {/* Grant Comp modal */}
      {showComp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowComp(false)} />
          <div className="relative glass-card w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
                  <Gift size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>Grant Comp Access</h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Give any estate a free plan — promos, VIPs, beta testers. Overrides billing.</p>
                </div>
              </div>
              <button onClick={() => setShowComp(false)}
                className="p-1.5 rounded-lg transition-all flex-shrink-0"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGrantComp} className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Estate *</label>
                <select className="input-field" value={compForm.estateId}
                  onChange={e => setCompForm({ ...compForm, estateId: e.target.value })} required>
                  <option value="">Select estate…</option>
                  {estates.map(e => <option key={e._id} value={e._id}>{e.name} — {e.estateCode}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Grant plan *</label>
                <select className="input-field" value={compForm.planId}
                  onChange={e => setCompForm({ ...compForm, planId: e.target.value })} required>
                  <option value="">Select plan…</option>
                  {plans.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} — normally {fmt(p.price.monthly)}/mo (comp = free)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>
                  Estate gets every feature of this plan for free until the comp expires or is revoked.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Reason</label>
                  <input className="input-field"
                    placeholder="e.g. Launch promo, VIP comp, Beta tester"
                    value={compForm.reason}
                    onChange={e => setCompForm({ ...compForm, reason: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Shown as</label>
                  <select className="input-field" value={compForm.cycle}
                    onChange={e => setCompForm({ ...compForm, cycle: e.target.value })}>
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] -mt-1" style={{ color: '#94A3B8' }}>
                Shown-as price only affects the gift email's "normal price" line. Features are unlocked either way.
              </p>

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Expires</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { v: '7',       label: '7 days'  },
                    { v: '30',      label: '30 days' },
                    { v: '90',      label: '90 days' },
                    { v: 'custom',  label: 'Custom' },
                    { v: 'never',   label: 'Never'   },
                  ].map(opt => (
                    <button key={opt.v} type="button"
                      onClick={() => setCompForm({ ...compForm, expiryPreset: opt.v })}
                      className="px-2 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={compForm.expiryPreset === opt.v
                        ? { background: '#F59E0B', color: '#FFF', border: '1px solid #D97706' }
                        : { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                {compForm.expiryPreset === 'custom' && (
                  <input type="date" className="input-field mt-2"
                    min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                    value={compForm.customExpiry}
                    onChange={e => setCompForm({ ...compForm, customExpiry: e.target.value })}
                    required />
                )}
                {compForm.expiryPreset === 'never' && (
                  <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#B45309' }}>
                    <InfinityIcon size={11} /> Comp stays active until you revoke it manually.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowComp(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={compGranting}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 1px 6px rgba(245,158,11,0.35)' }}>
                  {compGranting ? <><RefreshCw size={14} className="animate-spin" /> Granting…</> : <><Sparkles size={14} /> Grant comp</>}
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

              <div className="pt-3" style={{ borderTop: '1px dashed #E2E8F0' }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                         style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
                      <Gift size={13} className="text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: '#0F172A' }}>Comp Access</div>
                      <div className="text-[10px]" style={{ color: '#94A3B8' }}>
                        {editing.comp?.isActive && editing.comp?.planId
                          ? 'Currently granted — update or toggle off to revoke'
                          : 'Grant a free promo plan on top of billing'}
                      </div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer"
                      checked={editCompForm.isActive}
                      onChange={e => setEditCompForm({ ...editCompForm, isActive: e.target.checked })} />
                    <div className="w-9 h-5 rounded-full transition-all"
                         style={{ background: editCompForm.isActive ? '#F59E0B' : '#CBD5E1' }} />
                    <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                          style={{ transform: editCompForm.isActive ? 'translateX(16px)' : 'translateX(0)' }} />
                  </label>
                </div>

                {editCompForm.isActive && (
                  <div className="space-y-3 mt-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Comp plan *</label>
                      <select className="input-field" value={editCompForm.planId}
                        onChange={e => setEditCompForm({ ...editCompForm, planId: e.target.value })} required>
                        <option value="">Select plan…</option>
                        {plans.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.name} — normally {fmt(p.price.monthly)}/mo (comp = free)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Reason</label>
                      <input className="input-field" placeholder="e.g. Launch promo, VIP, Beta tester"
                        value={editCompForm.reason}
                        onChange={e => setEditCompForm({ ...editCompForm, reason: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Expires</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { v: '7',      label: '7d'     },
                          { v: '30',     label: '30d'    },
                          { v: '90',     label: '90d'    },
                          { v: 'custom', label: 'Custom' },
                          { v: 'never',  label: 'Never'  },
                        ].map(opt => (
                          <button key={opt.v} type="button"
                            onClick={() => setEditCompForm({ ...editCompForm, expiryPreset: opt.v })}
                            className="px-2 py-2 rounded-lg text-xs font-semibold transition-all"
                            style={editCompForm.expiryPreset === opt.v
                              ? { background: '#F59E0B', color: '#FFF', border: '1px solid #D97706' }
                              : { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {editCompForm.expiryPreset === 'custom' && (
                        <input type="date" className="input-field mt-2"
                          min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                          value={editCompForm.customExpiry}
                          onChange={e => setEditCompForm({ ...editCompForm, customExpiry: e.target.value })}
                          required />
                      )}
                      {editCompForm.expiryPreset === 'never' && (
                        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: '#B45309' }}>
                          <InfinityIcon size={11} /> Stays active until revoked manually.
                        </p>
                      )}
                      {editing.comp?.expiresAt && editCompForm.expiryPreset !== 'never' && (
                        <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>
                          Current expiry: {format(new Date(editing.comp.expiresAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {!editCompForm.isActive && editing.comp?.isActive && editing.comp?.planId && (
                  <p className="text-[11px] mt-2" style={{ color: '#DC2626' }}>
                    Comp will be revoked when you save.
                  </p>
                )}
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
