import { useEffect, useRef, useState } from 'react';
import { planAPI, estateAPI } from '../api';
import { Drawer, AssignPlanDrawer, GrantCompDrawer } from '../components/billing/BillingDrawers';
import toast from 'react-hot-toast';
import {
  CreditCard, RefreshCw, Building2, Edit3, X, Search,
  Gift, Sparkles, Infinity as InfinityIcon, Trash2,
  CheckCircle2, Clock, AlertCircle, Wallet,
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_STYLE = {
  active:    { label: 'Active',    badge: 'badge-green'  },
  trial:     { label: 'Trial',     badge: 'badge-blue'   },
  expired:   { label: 'Expired',   badge: 'badge-red'    },
  suspended: { label: 'Suspended', badge: 'badge-yellow' },
  cancelled: { label: 'Cancelled', badge: 'badge-gray'   },
};
const STATUS_KEYS = ['all', 'active', 'trial', 'expired', 'suspended', 'cancelled'];

const fmt = (n) => n === 0 ? 'Free' : `₦${n.toLocaleString()}`;

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.expired;
  return <span className={`badge ${s.badge}`}>{s.label}</span>;
}

// Edit uses the same full-height side panel as Assign / Grant comp
function ModalShell({ title, subtitle, icon, onClose, children }) {
  return (
    <Drawer title={title} subtitle={subtitle} icon={icon} onClose={onClose}>
      <div className="px-6 pt-5 min-h-full flex flex-col">{children}</div>
    </Drawer>
  );
}

const EXPIRY_OPTS_LONG = [
  { v: '7', label: '7 days' }, { v: '30', label: '30 days' }, { v: '90', label: '90 days' },
  { v: 'custom', label: 'Custom' }, { v: 'never', label: 'Never' },
];
const EXPIRY_OPTS_SHORT = [
  { v: '7', label: '7d' }, { v: '30', label: '30d' }, { v: '90', label: '90d' },
  { v: 'custom', label: 'Custom' }, { v: 'never', label: 'Never' },
];

function Segmented({ options, value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-0.5 p-[3px] rounded-[9px] bg-[#F2F4F7] border border-[#E4E7EC]">
      {options.map(opt => (
        <button key={opt.v} type="button" onClick={() => onChange(opt.v)}
          className={`px-1.5 py-1.5 rounded-md text-[12px] font-medium transition-all whitespace-nowrap ${
            value === opt.v ? 'bg-white text-[#101828] font-semibold shadow-sm' : 'text-[#475467] hover:text-[#101828]'
          }`}>
          {opt.label}
        </button>
      ))}
    </div>
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

  const iconBtn = 'p-1.5 rounded-md text-[#98A2B3] transition-colors';

  const paidMrr = stats?.mrrPaid ?? stats?.mrr ?? 0;
  const compMrr = stats?.mrrComp ?? 0;
  const planTotal = Math.max(1, (stats?.byPlan || []).reduce((t, p) => t + (p.count || 0), 0));
  const payingCount = Math.max(0, (stats?.active ?? 0) - (stats?.activeComp ?? 0));

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in space-y-4">
      {/* Billing account */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'radial-gradient(120% 160% at 100% 0%, #065F46 0%, #0B1220 55%)' }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10 pointer-events-none" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] text-white/60 flex items-center gap-1.5"><CreditCard size={13} /> Estate subscriptions · billing</p>
            <p className="mt-4 text-[12.5px] text-white/70">Paid monthly recurring revenue</p>
            <p className="mt-1 text-[38px] leading-none font-semibold tracking-tight tabular-nums">₦{Math.round(paidMrr).toLocaleString()}</p>
            <p className="mt-2 text-[12px] text-white/55">₦{Math.round(paidMrr * 12).toLocaleString()} a year · {payingCount} paying estate{payingCount === 1 ? '' : 's'}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => openCompModal()} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white/10 border border-white/15 text-white text-[13px] font-semibold hover:bg-white/15">
              <Gift size={15} className="text-amber-300" /> Grant comp
            </button>
            <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white text-emerald-800 text-[13px] font-semibold hover:bg-emerald-50">
              <CreditCard size={15} /> Assign plan
            </button>
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            ['Subscriptions', stats?.total ?? 0, `${stats?.active ?? 0} active`],
            ['On trial', stats?.trial ?? 0, stats?.trialPipelineMrr ? `₦${Math.round(stats.trialPipelineMrr).toLocaleString()}/mo if they convert` : 'converting soon', 'text-sky-300'],
            ['Comp access', stats?.activeComp ?? 0, `₦${Math.round(compMrr).toLocaleString()}/mo given away`, 'text-amber-200'],
            ['Renewals · 7 days', stats?.renewalsDue7d ?? 0, `${stats?.failedRenewalCount ?? 0} failed renewal${stats?.failedRenewalCount === 1 ? '' : 's'}`, stats?.failedRenewalCount ? 'text-red-300' : ''],
            ['Expired / suspended', (stats?.expired ?? 0) + (stats?.suspended ?? 0), `${stats?.cancelled30d ?? 0} cancelled in 30 days`, (stats?.expired ?? 0) ? 'text-red-300' : ''],
          ].map(([l, v, h, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5">
              <p className="text-[11px] text-white/55">{l}</p>
              <p className={`mt-0.5 text-[17px] font-semibold tabular-nums ${c || 'text-white'}`}>{v}</p>
              <p className="text-[10.5px] text-white/40 truncate">{h}</p>
            </div>
          ))}
        </div>

        {stats?.byPlan?.length > 0 && (
          <div className="relative mt-5">
            <div className="flex h-2 rounded-full overflow-hidden bg-white/10">
              {stats.byPlan.map((p) => (
                <div key={p.planId || p._id || p.name} className="h-full" title={`${p.name}: ${p.count}`} style={{ width: `${(p.count / planTotal) * 100}%`, background: p.color || '#10B981' }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {stats.byPlan.map((p) => (
                <span key={p.planId || p._id || p.name} className="inline-flex items-center gap-1.5 text-[11.5px] text-white/70">
                  <span className="w-2 h-2 rounded-full" style={{ background: p.color || '#10B981' }} />
                  {p.name} <span className="text-white/40 tabular-nums">{p.count}{p.comp ? ` · ${p.comp} comp` : ''}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Search + Filter toolbar */}
        <div className="px-4 py-3 border-b border-[#E4E7EC] flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="tabs">
              {STATUS_KEYS.map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`tab ${statusFilter === s ? 'active' : ''}`}>
                  {s === 'all' ? 'All' : STATUS_STYLE[s]?.label || s}
                  <span className="ml-1.5 text-[11px] text-[#98A2B3] tabular-nums">{statusCounts[s]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="relative lg:ml-auto lg:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search estate, code, plan…"
              className="input-field pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            {[0, 1, 2, 3, 4].map(i => <div key={i} className="skeleton h-11 rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-2.5">
              <Building2 size={17} className="text-[#98A2B3]" />
            </div>
            <p className="text-[13.5px] font-semibold text-[#101828]">
              {search || statusFilter !== 'all' ? 'No matching subscriptions' : 'No subscriptions yet'}
            </p>
            <p className="text-[12.5px] text-[#98A2B3] mt-0.5">
              {search || statusFilter !== 'all' ? 'Try a different search or status filter.' : 'Assign a plan to an estate to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table min-w-[700px]">
              <thead>
                <tr>
                  <th className="text-left">Estate</th>
                  <th className="text-left">Plan</th>
                  <th className="text-left hidden sm:table-cell">Cycle</th>
                  <th className="text-left hidden md:table-cell">Model</th>
                  <th className="text-left">Status</th>
                  <th className="!text-right hidden md:table-cell">Value / mo</th>
                  <th className="text-left hidden lg:table-cell">Next billing</th>
                  <th className="text-left hidden xl:table-cell">Notes</th>
                  <th className="w-20 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => {
                  const plan = sub.planId;
                  const price = sub.cycle === 'annual' ? plan?.price?.annual : plan?.price?.monthly;
                  const compLive = isCompLive(sub);
                  const compPlan = compLive ? sub.comp.planId : null;
                  const estateKey = sub.estateId?._id || sub.estateId;
                  return (
                    <tr key={sub._id} className={compLive ? 'bg-[#FFFCF5]' : undefined}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="cell-strong">{sub.estateId?.name || '—'}</span>
                          {compLive && (
                            <span className="badge badge-yellow"
                                  title={`Comp: ${compPlan?.name || 'plan'} · ${sub.comp.reason || 'no reason'}`}>
                              <Sparkles size={10} /> Comp
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[#98A2B3]">{sub.estateId?.estateCode}</div>
                      </td>
                      <td>
                        {compLive && compPlan ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: compPlan.color || '#F79009' }} />
                              <span className="font-medium text-[#101828]">{compPlan.name}</span>
                              <span className="badge badge-green">Free</span>
                            </div>
                            <div className="text-[11.5px] mt-0.5 ml-4 flex items-center gap-1 text-[#B54708]">
                              {sub.comp.expiresAt
                                ? <>Promo ends {format(new Date(sub.comp.expiresAt), 'MMM d, yyyy')}</>
                                : <><InfinityIcon size={11} /> Never expires</>}
                            </div>
                            {plan && (
                              <div className="text-[11px] mt-0.5 ml-4 text-[#98A2B3]">
                                Underlying: {plan.name}
                              </div>
                            )}
                          </div>
                        ) : plan ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: plan.color }} />
                              <span className="font-medium text-[#101828]">{plan.name}</span>
                            </div>
                            {price > 0 && (
                              <div className="text-[11.5px] mt-0.5 ml-4 text-[#98A2B3] tabular-nums">
                                ₦{price.toLocaleString()}/{sub.cycle === 'annual' ? 'yr' : 'mo'}
                              </div>
                            )}
                          </div>
                        ) : <span className="text-[#D0D5DD]">—</span>}
                      </td>
                      <td className="hidden sm:table-cell capitalize">{sub.cycle}</td>
                      <td className="hidden md:table-cell">
                        {sub.billingModel === 'per_resident' ? 'Per resident' : 'Flat fee'}
                      </td>
                      <td><StatusBadge status={sub.status} /></td>
                      <td className="hidden md:table-cell text-right tabular-nums whitespace-nowrap">
                        {!compLive && sub.status === 'active' && price > 0
                          ? <span className="font-semibold text-[#067647]">₦{Math.round(sub.cycle === 'annual' ? price / 12 : price).toLocaleString()}</span>
                          : <span className="text-[#D0D5DD]">—</span>}
                      </td>
                      <td className="hidden lg:table-cell text-[12px] whitespace-nowrap">
                        {sub.nextBillingDate ? format(new Date(sub.nextBillingDate), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="hidden xl:table-cell max-w-[160px]">
                        {sub.notes
                          ? <span className="text-[12px] truncate block" title={sub.notes}>{sub.notes}</span>
                          : <span className="text-[#D0D5DD]">—</span>}
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-0.5">
                          <button onClick={() => openEdit(sub)}
                            title="Edit subscription"
                            className={`${iconBtn} hover:text-[#101828] hover:bg-[#F2F4F7]`}>
                            <Edit3 size={14} />
                          </button>
                          {compLive ? (
                            <button
                              onClick={() => handleRevokeComp(sub)}
                              disabled={compRevoking === estateKey}
                              title="Revoke comp access"
                              className={`${iconBtn} hover:text-[#B42318] hover:bg-[#FEF3F2] disabled:opacity-50`}
                            >
                              {compRevoking === estateKey
                                ? <RefreshCw size={14} className="animate-spin" />
                                : <Trash2 size={14} />}
                            </button>
                          ) : (
                            <button
                              onClick={() => openCompModal({ estateId: estateKey })}
                              title="Grant comp access"
                              className={`${iconBtn} hover:text-[#B54708] hover:bg-[#FFFAEB]`}
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
          <div className="px-5 py-2.5 text-[12px] text-[#98A2B3] border-t border-[#E4E7EC] tabular-nums">
            Showing {filtered.length} of {subs.length} subscriptions
          </div>
        )}
      </div>

      {/* Assign plan — side panel */}
      {showNew && (
        <AssignPlanDrawer estates={estates} plans={plans} subs={subs} form={newForm} setForm={setNewForm}
          onSubmit={handleAssign} saving={assigning} onClose={() => setShowNew(false)} />
      )}

      {/* Grant comp — side panel */}
      {showComp && (
        <GrantCompDrawer estates={estates} plans={plans} subs={subs} form={compForm} setForm={setCompForm}
          onSubmit={handleGrantComp} saving={compGranting} onClose={() => setShowComp(false)} />
      )}

      {/* Edit modal */}
      {editing && (
        <ModalShell title="Edit subscription" subtitle={editing.estateId?.name}
          icon={Edit3} onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="flex-1 flex flex-col space-y-4">
            <div>
              <label className="field-label">Plan</label>
              <select className="input-field" value={editing.planId?._id || editing.planId}
                onChange={e => setEditing({ ...editing, planId: e.target.value })}>
                {plans.map(p => <option key={p._id} value={p._id}>{p.name} — {fmt(p.price.monthly)}/mo</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label">Cycle</label>
                <select className="input-field" value={editing.cycle}
                  onChange={e => setEditing({ ...editing, cycle: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="field-label">Status</label>
                <select className="input-field" value={editing.status}
                  onChange={e => setEditing({ ...editing, status: e.target.value })}>
                  {Object.keys(STATUS_STYLE).map(s => (
                    <option key={s} value={s}>{STATUS_STYLE[s].label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Billing model</label>
              <select className="input-field" value={editing.billingModel || 'flat'}
                onChange={e => setEditing({ ...editing, billingModel: e.target.value })}>
                <option value="flat">Flat fee</option>
                <option value="per_resident">Per resident</option>
              </select>
            </div>
            <div>
              <label className="field-label">Notes</label>
              <input className="input-field" placeholder="Internal notes…"
                value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            </div>

            {/* Comp access panel */}
            <div className={`rounded-lg border p-3.5 transition-colors ${editCompForm.isActive ? 'border-[#FEDF89] bg-[#FFFCF5]' : 'border-[#E4E7EC] bg-[#FCFCFD]'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Gift size={15} className={editCompForm.isActive ? 'text-[#DC6803]' : 'text-[#98A2B3]'} />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#101828]">Comp access</div>
                    <div className="text-[11.5px] text-[#98A2B3]">
                      {editing.comp?.isActive && editing.comp?.planId
                        ? 'Currently granted — update or toggle off to revoke'
                        : 'Grant a free promo plan on top of billing'}
                    </div>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input type="checkbox" className="sr-only peer"
                    checked={editCompForm.isActive}
                    onChange={e => setEditCompForm({ ...editCompForm, isActive: e.target.checked })} />
                  <div className={`w-9 h-5 rounded-full transition-colors ${editCompForm.isActive ? 'bg-[#059669]' : 'bg-[#D0D5DD]'}`} />
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: editCompForm.isActive ? 'translateX(16px)' : 'translateX(0)' }} />
                </label>
              </div>

              {editCompForm.isActive && (
                <div className="space-y-3 mt-3.5 pt-3.5 border-t border-[#FEF0C7]">
                  <div>
                    <label className="field-label">Comp plan *</label>
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
                    <label className="field-label">Reason</label>
                    <input className="input-field" placeholder="e.g. Launch promo, VIP, Beta tester"
                      value={editCompForm.reason}
                      onChange={e => setEditCompForm({ ...editCompForm, reason: e.target.value })} />
                  </div>
                  <div>
                    <label className="field-label">Expires</label>
                    <Segmented options={EXPIRY_OPTS_SHORT} value={editCompForm.expiryPreset}
                      onChange={v => setEditCompForm({ ...editCompForm, expiryPreset: v })} />
                    {editCompForm.expiryPreset === 'custom' && (
                      <input type="date" className="input-field mt-2"
                        min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                        value={editCompForm.customExpiry}
                        onChange={e => setEditCompForm({ ...editCompForm, customExpiry: e.target.value })}
                        required />
                    )}
                    {editCompForm.expiryPreset === 'never' && (
                      <p className="field-hint flex items-center gap-1">
                        <InfinityIcon size={11} /> Stays active until revoked manually.
                      </p>
                    )}
                    {editing.comp?.expiresAt && editCompForm.expiryPreset !== 'never' && (
                      <p className="field-hint">
                        Current expiry: {format(new Date(editing.comp.expiresAt), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!editCompForm.isActive && editing.comp?.isActive && editing.comp?.planId && (
                <p className="text-[11.5px] mt-2.5 text-[#B42318]">
                  Comp will be revoked when you save.
                </p>
              )}
            </div>

            <div className="sticky bottom-0 mt-auto -mx-6 px-6 py-4 bg-[#FCFCFD] border-t border-[#EAECF0] flex gap-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
