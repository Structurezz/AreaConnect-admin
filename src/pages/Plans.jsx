import { useEffect, useState } from 'react';
import { planAPI } from '../api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import {
  CreditCard, Plus, Edit3, Check, X, ChevronDown, ChevronUp,
  Zap, Users, Home, Megaphone, MessageSquare, ShoppingBag,
  CreditCard as PayIcon, Shield, Music, Sparkles, BarChart2,
  Palette, Code2, Headphones, Star,
} from 'lucide-react';

const fmt = (n) => n === 0 ? 'Free' : `₦${n.toLocaleString()}`;

const FEATURE_GROUPS = [
  {
    label: 'Limits',
    items: [
      { key: 'maxResidents', label: 'Max Residents', type: 'number' },
      { key: 'maxUnits', label: 'Max Units', type: 'number' },
      { key: 'maxVisitorsPerMonth', label: 'Visitors / Month', type: 'number' },
    ],
  },
  {
    label: 'Core Features',
    items: [
      { key: 'visitorManagement', label: 'Visitor Management', icon: Users },
      { key: 'residentManagement', label: 'Resident Management', icon: Users },
      { key: 'unitManagement', label: 'Unit Management', icon: Home },
    ],
  },
  {
    label: 'Communication',
    items: [
      { key: 'announcements', label: 'Announcements', icon: Megaphone },
      { key: 'communityChat', label: 'Community Chat', icon: MessageSquare },
      { key: 'nkechiAI', label: 'Nkechi AI Moderator', icon: Sparkles },
    ],
  },
  {
    label: 'Commerce & Safety',
    items: [
      { key: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
      { key: 'paymentSystem', label: 'Payment System', icon: PayIcon },
      { key: 'securityPortal', label: 'Security Portal', icon: Shield },
      { key: 'emergencyBroadcast', label: 'Emergency Broadcast', icon: Zap },
    ],
  },
  {
    label: 'Entertainment (Resident Lounge)',
    items: [
      { key: 'residentLounge', label: 'Resident Lounge', icon: Music },
      { key: 'musicPlayer', label: 'Music Player / Radio', icon: Music },
      { key: 'fridayNightFunTimes', label: 'Friday Night FunTimes', icon: Star },
      { key: 'eventBoard', label: 'Event Board', icon: Megaphone },
      { key: 'pollsAndVoting', label: 'Polls & Voting', icon: BarChart2 },
    ],
  },
  {
    label: 'Analytics & Enterprise',
    items: [
      { key: 'analytics', label: 'Analytics', type: 'select', options: ['none', 'basic', 'full'] },
      { key: 'customBranding', label: 'Custom Branding', icon: Palette },
      { key: 'apiAccess', label: 'API Access', icon: Code2 },
      { key: 'prioritySupport', label: 'Priority Support', icon: Headphones },
      { key: 'whiteLabel', label: 'White Label', icon: Star },
    ],
  },
];

function FeatureValue({ featureKey, value, editable, onChange }) {
  const item = FEATURE_GROUPS.flatMap(g => g.items).find(i => i.key === featureKey);
  if (!item) return null;

  if (item.type === 'number') {
    if (!editable) return <span className="text-[13px] font-medium text-[#101828] tabular-nums">{value === -1 ? '∞' : value}</span>;
    return (
      <input
        type="number"
        min="-1"
        value={value}
        onChange={e => onChange(featureKey, parseInt(e.target.value))}
        className="input-field w-24 text-center tabular-nums"
      />
    );
  }
  if (item.type === 'select') {
    if (!editable) return <span className="badge badge-gray capitalize">{value}</span>;
    return (
      <select value={value} onChange={e => onChange(featureKey, e.target.value)} className="input-field w-auto">
        {item.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  // boolean
  if (!editable) return value
    ? <Check size={14} className="text-[#059669]" />
    : <X size={14} className="text-[#D0D5DD]" />;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!value}
      onClick={() => onChange(featureKey, !value)}
      className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${value ? 'bg-[#059669]' : 'bg-[#E4E7EC]'}`}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
        style={{ left: value ? '1.125rem' : '0.125rem' }}
      />
    </button>
  );
}

const BOOLEAN_FEATURES = FEATURE_GROUPS.flatMap(g => g.items).filter(i => !i.type);
const LIMITS = FEATURE_GROUPS[0].items;

function PlanCard({ plan, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const features = plan.features || {};
  const included = BOOLEAN_FEATURES.filter(i => features[i.key]);
  const preview = included.slice(0, 6);
  const analytics = features.analytics;

  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="p-5 flex-1">
        {/* Name + badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: plan.color }} />
              <span className="text-[15px] font-semibold text-[#101828]">{plan.name}</span>
              {plan.badge && <span className="badge badge-green">{plan.badge}</span>}
              {!plan.isActive && <span className="badge badge-gray">Inactive</span>}
            </div>
            {plan.description && (
              <p className="text-[12.5px] text-[#475467] mt-1 line-clamp-2">{plan.description}</p>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="mt-4">
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] leading-none font-semibold tracking-tight text-[#101828] tabular-nums">
              {fmt(plan.price.monthly)}
            </span>
            {plan.price.monthly > 0 && <span className="text-[12px] text-[#98A2B3]">/ month</span>}
          </div>
          <div className="mt-1.5 text-[12px] text-[#475467] tabular-nums">
            {fmt(plan.price.annual)}{plan.price.annual > 0 && <span className="text-[#98A2B3]"> / year</span>}
            <span className="text-[#D0D5DD] mx-1.5">·</span>
            {plan.price.perResident ? <>{fmt(plan.price.perResident)}<span className="text-[#98A2B3]"> / resident</span></> : <span className="text-[#98A2B3]">No per-resident billing</span>}
          </div>
        </div>

        {/* Limits */}
        <div className="mt-4 grid grid-cols-3 rounded-lg border border-[#E4E7EC] divide-x divide-[#E4E7EC]">
          {LIMITS.map(l => (
            <div key={l.key} className="px-2 py-2 text-center min-w-0">
              <div className="text-[13px] font-semibold text-[#101828] tabular-nums">
                {features[l.key] === -1 ? '∞' : (features[l.key] ?? '—')}
              </div>
              <div className="text-[10.5px] text-[#98A2B3] truncate">{l.label.replace('Max ', '')}</div>
            </div>
          ))}
        </div>

        {/* Included features */}
        <div className="mt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-[#98A2B3] mb-2">Includes</p>
          {preview.length ? (
            <ul className="space-y-1.5">
              {preview.map(i => (
                <li key={i.key} className="flex items-center gap-2 text-[13px] text-[#475467]">
                  <Check size={13} className="text-[#059669] flex-shrink-0" />
                  <span className="truncate">{i.label}</span>
                </li>
              ))}
              {analytics && analytics !== 'none' && (
                <li className="flex items-center gap-2 text-[13px] text-[#475467]">
                  <Check size={13} className="text-[#059669] flex-shrink-0" />
                  <span className="truncate capitalize">{analytics} analytics</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-[12.5px] text-[#98A2B3]">No features enabled</p>
          )}
          {included.length > preview.length && (
            <p className="text-[12px] text-[#98A2B3] mt-1.5">+{included.length - preview.length} more</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-4 border-t border-[#E4E7EC] bg-[#FCFCFD]">
          {FEATURE_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#98A2B3] mb-2">{group.label}</p>
              <div className="space-y-1.5">
                {group.items.map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[#475467]">{item.label}</span>
                    <FeatureValue featureKey={item.key} value={features[item.key]} editable={false} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 border-t border-[#E4E7EC] flex items-center justify-between gap-2">
        <button
          onClick={() => setExpanded(e => !e)}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[#475467] hover:text-[#101828] transition-colors"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide' : 'All'} features
        </button>
        <button onClick={() => onEdit(plan)} className="btn-outline !py-1.5 !px-3">
          <Edit3 size={13} /> Edit
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="text-[11px] font-semibold uppercase tracking-wide text-[#98A2B3] mb-3">{children}</p>;
}

const BLANK_PLAN = {
  name: '', slug: '', description: '', color: '#3B82F6', badge: '',
  price: { monthly: 0, annual: 0, perResident: 0 },
  features: {
    maxResidents: 20, maxUnits: 10, maxVisitorsPerMonth: 50,
    visitorManagement: true, residentManagement: true, unitManagement: true,
    announcements: false, communityChat: false, nkechiAI: false,
    marketplace: false, paymentSystem: false,
    securityPortal: false, emergencyBroadcast: false,
    residentLounge: false, musicPlayer: false, fridayNightFunTimes: false,
    eventBoard: false, pollsAndVoting: false,
    analytics: 'none', customBranding: false, apiAccess: false,
    prioritySupport: false, whiteLabel: false,
  },
};

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await planAPI.getAll();
      setPlans(data.data);
    } catch { toast.error('Failed to load plans'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({ ...BLANK_PLAN, features: { ...BLANK_PLAN.features } });
  const openEdit = (plan) => setEditing({ ...plan, price: { ...plan.price }, features: { ...plan.features } });

  const setField = (path, val) => {
    setEditing(prev => {
      const copy = { ...prev };
      if (path.startsWith('price.')) {
        copy.price = { ...copy.price, [path.split('.')[1]]: val };
      } else if (path.startsWith('features.')) {
        copy.features = { ...copy.features, [path.split('.')[1]]: val };
      } else {
        copy[path] = val;
      }
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editing._id) {
        await planAPI.update(editing._id, editing);
        toast.success('Plan updated');
      } else {
        await planAPI.create(editing);
        toast.success('Plan created');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        title="Plans & Pricing"
        description="Define subscription tiers, pricing and feature access for estates."
        actions={<button onClick={openNew} className="btn-primary"><Plus size={15} /> New plan</button>}
      />

      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <div key={i} className="skeleton h-[380px] rounded-xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
            <CreditCard size={18} className="text-[#98A2B3]" />
          </div>
          <p className="text-[14px] font-semibold text-[#101828]">No plans yet</p>
          <p className="text-[13px] text-[#475467] mt-0.5">Create your first subscription tier to start assigning estates.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {plans.map(p => <PlanCard key={p._id} plan={p} onEdit={openEdit} />)}
        </div>
      )}

      {/* Edit / Create drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="overlay-backdrop" aria-hidden="true" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-lg h-full overflow-y-auto flex flex-col bg-white border-l border-[#E4E7EC] shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10 bg-white border-b border-[#E4E7EC]">
              <div>
                <h2 className="text-[16px] font-semibold text-[#101828]">
                  {editing._id ? 'Edit plan' : 'New plan'}
                </h2>
                <p className="text-[12px] text-[#98A2B3] mt-0.5">
                  {editing._id ? editing.name : 'Set pricing, limits and included features'}
                </p>
              </div>
              <button
                onClick={() => setEditing(null)}
                className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6">
              {/* Basic info */}
              <div>
                <SectionLabel>Details</SectionLabel>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Plan name</label>
                      <input className="input-field" value={editing.name} onChange={e => setField('name', e.target.value)} placeholder="Professional" />
                    </div>
                    <div>
                      <label className="field-label">Slug</label>
                      <input className="input-field" value={editing.slug} onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="professional" />
                    </div>
                  </div>
                  <div>
                    <label className="field-label">Description</label>
                    <input className="input-field" value={editing.description} onChange={e => setField('description', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="field-label">Badge (optional)</label>
                      <input className="input-field" value={editing.badge} onChange={e => setField('badge', e.target.value)} placeholder="Best Value" />
                    </div>
                    <div>
                      <label className="field-label">Colour</label>
                      <div className="flex gap-2">
                        <input type="color" value={editing.color} onChange={e => setField('color', e.target.value)}
                          className="w-10 h-9 rounded-lg cursor-pointer p-0.5 border border-[#D0D5DD] bg-transparent flex-shrink-0"
                        />
                        <input className="input-field flex-1 min-w-0" value={editing.color} onChange={e => setField('color', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="pt-5 border-t border-[#F2F4F7]">
                <SectionLabel>Pricing (₦)</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label">Monthly flat fee</label>
                    <input type="number" min="0" className="input-field tabular-nums" value={editing.price.monthly}
                      onChange={e => setField('price.monthly', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="field-label">Annual flat fee (full year)</label>
                    <input type="number" min="0" className="input-field tabular-nums" value={editing.price.annual}
                      onChange={e => setField('price.annual', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <label className="field-label">Per-resident / month (₦ per resident)</label>
                    <input type="number" min="0" className="input-field tabular-nums" placeholder="e.g. 2000"
                      value={editing.price.perResident ?? 0}
                      onChange={e => setField('price.perResident', parseInt(e.target.value) || 0)} />
                    <p className="field-hint">Leave 0 to disable per-resident billing for this plan.</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              {FEATURE_GROUPS.map(group => (
                <div key={group.label} className="pt-5 border-t border-[#F2F4F7]">
                  <SectionLabel>{group.label}</SectionLabel>
                  <div className="space-y-2.5">
                    {group.items.map(item => (
                      <div key={item.key} className="flex items-center justify-between gap-3">
                        <span className="text-[13px] text-[#344054]">{item.label}</span>
                        <FeatureValue featureKey={item.key} value={editing.features[item.key]} editable
                          onChange={(k, v) => setField(`features.${k}`, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 sticky bottom-0 flex gap-2 justify-end bg-white border-t border-[#E4E7EC]">
              <button onClick={() => setEditing(null)} className="btn-outline">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? 'Saving...' : editing._id ? 'Save changes' : 'Create plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
