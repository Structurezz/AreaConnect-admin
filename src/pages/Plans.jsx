import { useEffect, useState } from 'react';
import { planAPI } from '../api';
import toast from 'react-hot-toast';
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
    if (!editable) return <span className="text-sm" style={{ color: '#475569' }}>{value === -1 ? '∞' : value}</span>;
    return (
      <input
        type="number"
        min="-1"
        value={value}
        onChange={e => onChange(featureKey, parseInt(e.target.value))}
        className="input-field w-20 text-center"
      />
    );
  }
  if (item.type === 'select') {
    if (!editable) return (
      <span
        className="text-xs capitalize px-2 py-0.5 rounded-full"
        style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}
      >
        {value}
      </span>
    );
    return (
      <select value={value} onChange={e => onChange(featureKey, e.target.value)} className="input-field w-auto">
        {item.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  // boolean
  if (!editable) return value
    ? <Check size={14} style={{ color: '#059669' }} />
    : <X size={14} style={{ color: '#CBD5E1' }} />;
  return (
    <button
      onClick={() => onChange(featureKey, !value)}
      className="w-10 h-5 rounded-full transition-all relative"
      style={{ background: value ? '#10B981' : '#E2E8F0' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: value ? '1.25rem' : '0.125rem' }}
      />
    </button>
  );
}

function PlanCard({ plan, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: plan.color + '14', border: `1px solid ${plan.color}30` }}
            >
              <CreditCard size={18} style={{ color: plan.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: '#0F172A' }}>{plan.name}</span>
                {plan.badge && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: plan.color + '18', color: plan.color }}
                  >
                    {plan.badge}
                  </span>
                )}
                {!plan.isActive && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0' }}
                  >
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{plan.description}</p>
            </div>
          </div>
          <button
            onClick={() => onEdit(plan)}
            className="p-2 rounded-lg transition-all"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Edit3 size={14} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: '/ month', value: fmt(plan.price.monthly) },
            { label: '/ year', value: fmt(plan.price.annual) },
            { label: '/ resident', value: plan.price.perResident ? fmt(plan.price.perResident) : '—' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl p-3 text-center"
              style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}
            >
              <div className="font-bold text-sm" style={{ color: '#0F172A' }}>{value}</div>
              <div className="text-xs" style={{ color: '#94A3B8' }}>{label}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1.5 text-xs w-full justify-center transition-colors"
          style={{ color: '#94A3B8' }}
          onMouseEnter={e => e.currentTarget.style.color = '#0F172A'}
          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide' : 'View'} features
        </button>
      </div>

      {expanded && (
        <div className="p-5 space-y-5" style={{ borderTop: '1px solid #E2E8F0' }}>
          {FEATURE_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>
                {group.label}
              </p>
              <div className="space-y-2">
                {group.items.map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: '#475569' }}>{item.label}</span>
                    <FeatureValue featureKey={item.key} value={plan.features[item.key]} editable={false} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Plans &amp; Pricing</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Define subscription tiers and feature access</p>
        </div>
        <button onClick={openNew} className="btn-primary gap-2"><Plus size={16} /> New Plan</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div
            className="animate-spin rounded-full"
            style={{ width: 24, height: 24, border: '2px solid #E2E8F0', borderTopColor: '#10B981' }}
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map(p => <PlanCard key={p._id} plan={p} onEdit={openEdit} />)}
        </div>
      )}

      {/* Edit / Create drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div
            className="relative w-full max-w-lg h-full overflow-y-auto flex flex-col shadow-2xl"
            style={{ background: '#FFFFFF', borderLeft: '1px solid #E2E8F0' }}
          >
            <div
              className="flex items-center justify-between px-6 py-5 sticky top-0 z-10"
              style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0' }}
            >
              <h2 className="font-bold text-lg" style={{ color: '#0F172A' }}>
                {editing._id ? 'Edit Plan' : 'New Plan'}
              </h2>
              <button
                onClick={() => setEditing(null)}
                className="p-2 rounded-lg transition-all"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {/* Basic info */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Plan Name</label>
                    <input className="input-field" value={editing.name} onChange={e => setField('name', e.target.value)} placeholder="Professional" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Slug</label>
                    <input className="input-field" value={editing.slug} onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))} placeholder="professional" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Description</label>
                  <input className="input-field" value={editing.description} onChange={e => setField('description', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Badge (optional)</label>
                    <input className="input-field" value={editing.badge} onChange={e => setField('badge', e.target.value)} placeholder="Best Value" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Colour</label>
                    <div className="flex gap-2">
                      <input type="color" value={editing.color} onChange={e => setField('color', e.target.value)}
                        className="w-10 h-9 rounded-lg cursor-pointer p-0.5"
                        style={{ border: '1.5px solid #E2E8F0', background: 'transparent' }}
                      />
                      <input className="input-field flex-1" value={editing.color} onChange={e => setField('color', e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>Pricing (₦)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Monthly flat fee</label>
                    <input type="number" min="0" className="input-field" value={editing.price.monthly}
                      onChange={e => setField('price.monthly', parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Annual flat fee (full year)</label>
                    <input type="number" min="0" className="input-field" value={editing.price.annual}
                      onChange={e => setField('price.annual', parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Per-resident / month (₦ per resident)</label>
                    <input type="number" min="0" className="input-field" placeholder="e.g. 2000"
                      value={editing.price.perResident ?? 0}
                      onChange={e => setField('price.perResident', parseInt(e.target.value) || 0)} />
                    <p className="text-xs mt-1" style={{ color: '#CBD5E1' }}>Leave 0 to disable per-resident billing for this plan.</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              {FEATURE_GROUPS.map(group => (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
                    {group.label}
                  </p>
                  <div className="space-y-3">
                    {group.items.map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#475569' }}>{item.label}</span>
                        <FeatureValue featureKey={item.key} value={editing.features[item.key]} editable
                          onChange={(k, v) => setField(`features.${k}`, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="px-6 py-4 sticky bottom-0 flex gap-3"
              style={{ background: '#FFFFFF', borderTop: '1px solid #E2E8F0' }}
            >
              <button onClick={() => setEditing(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : editing._id ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
