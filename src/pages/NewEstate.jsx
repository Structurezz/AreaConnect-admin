import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { estateAPI, userAPI, planAPI } from '../api';
import {
  Building2, User, CheckCircle, ArrowRight, ArrowLeft,
  Eye, EyeOff, Copy, Hash, CreditCard, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STEPS = ['Estate Details', 'Estate Manager', 'Plan & Billing', 'Done'];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{
              color: i === current ? '#059669' : i < current ? '#10B981' : '#CBD5E1',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all"
              style={
                i === current
                  ? { borderColor: '#10B981', background: 'rgba(16,185,129,0.10)', color: '#059669' }
                  : i < current
                  ? { borderColor: '#10B981', background: 'rgba(16,185,129,0.10)', color: '#059669' }
                  : { borderColor: '#E2E8F0', color: '#CBD5E1' }
              }
            >
              {i < current ? '✓' : i + 1}
            </div>
            <span className="hidden sm:block">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className="w-8 h-px transition-colors"
              style={{ background: i < current ? 'rgba(16,185,129,0.40)' : '#E2E8F0' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function EstateStep({ form, onChange, onNext, saving }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>Estate Details</h2>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Enter the basic information for the new estate.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Estate Name *</label>
          <input
            className="input-field"
            placeholder="e.g. Greenfield Estate"
            value={form.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Address *</label>
          <textarea
            className="input-field resize-none"
            rows={3}
            placeholder="Full estate address"
            value={form.address}
            onChange={(e) => onChange('address', e.target.value)}
          />
        </div>
        <div
          className="p-3 rounded-xl flex gap-2 text-sm"
          style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.18)',
            color: '#475569',
          }}
        >
          <Hash size={16} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
          A unique 6-character estate code will be auto-generated for residents.
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!form.name.trim() || !form.address.trim() || saving}
          className="btn-primary gap-2"
        >
          {saving ? 'Creating…' : <><span>Next</span><ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}

function ManagerStep({ form, onChange, onNext, onSkip, saving }) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>Assign Estate Manager</h2>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Create a manager account or skip to assign one later.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Full Name *</label>
          <input className="input-field" placeholder="Manager's full name"
            value={form.name} onChange={(e) => onChange('name', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Email Address *</label>
          <input type="email" className="input-field" placeholder="manager@example.com"
            value={form.email} onChange={(e) => onChange('email', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Phone</label>
          <input className="input-field" placeholder="+234…"
            value={form.phone} onChange={(e) => onChange('phone', e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>Temporary Password *</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              className="input-field pr-10"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={(e) => onChange('password', e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => e.currentTarget.style.color = '#475569'}
              onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>Share with the manager so they can log in.</p>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onSkip} className="btn-outline flex-1">Skip for Now</button>
        <button
          onClick={onNext}
          disabled={!form.name.trim() || !form.email.trim() || form.password.length < 6 || saving}
          className="btn-primary flex-1 gap-2"
        >
          <User size={15} /> {saving ? 'Creating…' : 'Create Manager'}
        </button>
      </div>
    </div>
  );
}

const STATUS_OPTS = [
  { value: 'trial',     label: 'Trial' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
];

const fmt = (n) => n > 0 ? `₦${n.toLocaleString()}` : 'Free';

function PlanStep({ plans, form, onChange, onNext, onBack, saving }) {
  const selected = plans.find(p => p._id === form.selectedPlanId);

  const billingOptions = selected ? [
    selected.price.monthly >= 0 && {
      id: 'flat_monthly', label: 'Monthly', billingModel: 'flat', cycle: 'monthly',
      price: `${fmt(selected.price.monthly)}/mo`,
    },
    selected.price.annual > 0 && {
      id: 'flat_annual', label: 'Annual', billingModel: 'flat', cycle: 'annual',
      price: `${fmt(selected.price.annual)}/yr`,
      badge: selected.price.monthly > 0
        ? `Save ${Math.round((1 - selected.price.annual / (selected.price.monthly * 12)) * 100)}%`
        : null,
    },
    selected.price.perResident > 0 && {
      id: 'per_resident', label: 'Per resident', billingModel: 'per_resident', cycle: 'monthly',
      price: `${fmt(selected.price.perResident)}/resident/mo`,
    },
  ].filter(Boolean) : [];

  const canNext = !!form.selectedPlanId && !!form.billingOption;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>Plan &amp; Billing</h2>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Assign a subscription plan and billing model for this estate.</p>
      </div>

      {plans.length === 0 ? (
        <div className="rounded-xl p-4 text-sm text-center" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#D97706' }}>
          No plans found. Create plans in the Plans section first.
        </div>
      ) : (
        <>
          {/* Plan selector */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>Select Plan</p>
            <div className="space-y-2">
              {plans.map(plan => (
                <button
                  key={plan._id}
                  onClick={() => { onChange('selectedPlanId', plan._id); onChange('billingOption', ''); }}
                  className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-center justify-between"
                  style={form.selectedPlanId === plan._id
                    ? { border: `1.5px solid ${plan.color || '#10B981'}55`, background: `${plan.color || '#10B981'}0D` }
                    : { border: '1px solid #E2E8F0', background: '#FAFAFA' }
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: plan.color || '#10B981' }} />
                    <div>
                      <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{plan.name}</span>
                      {plan.badge && (
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                          {plan.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                    {plan.price.monthly > 0 ? `from ${fmt(plan.price.monthly)}/mo` : 'Free'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Billing option for selected plan */}
          {selected && billingOptions.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#94A3B8' }}>Billing Cycle</p>
              <div className="space-y-2">
                {billingOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => onChange('billingOption', opt.id)}
                    className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-center justify-between"
                    style={form.billingOption === opt.id
                      ? { border: '1.5px solid rgba(16,185,129,0.45)', background: 'rgba(16,185,129,0.06)' }
                      : { border: '1px solid #E2E8F0', background: '#FAFAFA' }
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                        style={form.billingOption === opt.id
                          ? { borderColor: '#10B981', background: '#10B981' }
                          : { borderColor: '#CBD5E1' }
                        }>
                        {form.billingOption === opt.id && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>{opt.label}</span>
                        {opt.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: '#94A3B8' }}>{opt.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Per-resident count */}
      {form.billingOption === 'per_resident' && (
        <div>
          <label className="text-sm font-medium mb-1.5 block" style={{ color: '#475569' }}>
            Resident count (optional, for reference)
          </label>
          <input type="number" min="1" className="input-field" placeholder="e.g. 80"
            value={form.residentCount} onChange={e => onChange('residentCount', e.target.value)} />
        </div>
      )}

      {/* Status & trial */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#475569' }}>Subscription Status</label>
          <select className="input-field" value={form.status} onChange={e => onChange('status', e.target.value)}>
            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        {form.status === 'trial' && (
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#475569' }}>Trial Duration (days)</label>
            <input type="number" min="1" max="90" className="input-field" placeholder="14"
              value={form.trialDays} onChange={e => onChange('trialDays', e.target.value)} />
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onBack} className="btn-outline gap-2"><ArrowLeft size={14} /> Back</button>
        <button
          onClick={() => onNext(canNext ? null : 'skip')}
          disabled={saving}
          className={`flex-1 gap-2 ${canNext ? 'btn-primary' : 'btn-outline'}`}
        >
          <CreditCard size={15} />
          {saving ? 'Assigning…' : canNext ? 'Assign Plan' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

function DoneStep({ estate, manager, plan, onFinish }) {
  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied!'); };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}
        >
          <CheckCircle size={30} style={{ color: '#059669' }} />
        </div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>Estate Created!</h2>
        <p className="text-sm" style={{ color: '#94A3B8' }}>Here's a summary. Save the details below.</p>
      </div>

      <div className="glass-card-gold p-5 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm mb-3" style={{ color: '#059669' }}>
          <Building2 size={16} /> Estate
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#94A3B8' }}>Name</span>
          <span className="font-medium" style={{ color: '#0F172A' }}>{estate.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#94A3B8' }}>Estate Code</span>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-widest" style={{ color: '#059669' }}>
              {estate.estateCode}
            </span>
            <button
              onClick={() => copy(estate.estateCode)}
              className="p-1 rounded transition-colors"
              style={{ color: '#94A3B8' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#059669'; e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
        {plan && (
          <div
            className="flex items-center justify-between pt-1"
            style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
          >
            <span className="text-sm" style={{ color: '#94A3B8' }}>Plan</span>
            <span className="text-sm font-medium" style={{ color: '#475569' }}>{plan}</span>
          </div>
        )}
      </div>

      {manager && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-sm mb-3" style={{ color: '#475569' }}>
            <User size={16} /> Manager Account
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#94A3B8' }}>Name</span>
            <span className="font-medium" style={{ color: '#0F172A' }}>{manager.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#94A3B8' }}>Email</span>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: '#0F172A' }}>{manager.email}</span>
              <button
                onClick={() => copy(manager.email)}
                className="p-1 rounded transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#94A3B8' }}>Password</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm" style={{ color: '#0F172A' }}>{manager.tempPassword}</span>
              <button
                onClick={() => copy(manager.tempPassword)}
                className="p-1 rounded transition-colors"
                style={{ color: '#94A3B8' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#0F172A'; e.currentTarget.style.background = '#F1F5F9'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'transparent'; }}
              >
                <Copy size={13} />
              </button>
            </div>
          </div>
          <p className="text-xs pt-1" style={{ color: '#D97706' }}>
            Share these credentials privately. Manager can change password after logging in.
          </p>
        </div>
      )}

      <button onClick={onFinish} className="btn-primary w-full gap-2">
        Go to Estates <ArrowRight size={16} />
      </button>
    </div>
  );
}

export default function NewEstate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [estateForm, setEstateForm] = useState({ name: '', address: '' });
  const [managerForm, setManagerForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [planForm, setPlanForm] = useState({
    selectedPlanId: '',
    billingOption: '',
    status: 'trial',
    trialDays: '14',
    residentCount: '',
  });
  const [plans, setPlans] = useState([]);
  const [result, setResult] = useState({ estate: null, manager: null, planLabel: null });
  const [saving, setSaving] = useState(false);

  const loadPlans = async () => {
    try {
      const { data } = await planAPI.getAll();
      setPlans(data.data);
    } catch { /* non-fatal */ }
  };

  const handleCreateEstate = async () => {
    setSaving(true);
    try {
      const { data } = await estateAPI.create(estateForm);
      setResult(r => ({ ...r, estate: data.data }));
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create estate');
    } finally { setSaving(false); }
  };

  const handleCreateManager = async () => {
    setSaving(true);
    try {
      await userAPI.create({ ...managerForm, role: 'estate_manager', estateId: result.estate._id });
      setResult(r => ({
        ...r,
        manager: { name: managerForm.name, email: managerForm.email, tempPassword: managerForm.password },
      }));
      await loadPlans();
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create manager account');
    } finally { setSaving(false); }
  };

  const handleSkipManager = async () => {
    await loadPlans();
    setStep(2);
  };

  const handleAssignPlan = async (skip) => {
    if (skip === 'skip') {
      setStep(3);
      return;
    }

    const plan = plans.find(p => p._id === planForm.selectedPlanId);
    const BILLING_OPTIONS = {
      flat_monthly: { cycle: 'monthly', billingModel: 'flat' },
      flat_annual:  { cycle: 'annual',  billingModel: 'flat' },
      per_resident: { cycle: 'monthly', billingModel: 'per_resident' },
    };
    const billing = BILLING_OPTIONS[planForm.billingOption];

    if (!plan || !billing) { setStep(3); return; }

    setSaving(true);
    try {
      await planAPI.assign({
        estateId: result.estate._id,
        planId: plan._id,
        cycle: billing.cycle,
        billingModel: billing.billingModel,
        residentCount: billing.billingModel === 'per_resident' ? parseInt(planForm.residentCount) || 0 : 0,
        status: planForm.status,
        trialDays: planForm.status === 'trial' ? parseInt(planForm.trialDays) || 14 : 0,
        notes: `Assigned via admin onboarding — ${plan.name} · ${planForm.billingOption.replace('_', ' ')}`,
      });

      const priceMap = {
        flat_monthly: plan.price.monthly > 0 ? `${fmt(plan.price.monthly)}/mo` : 'Free',
        flat_annual:  plan.price.annual > 0  ? `${fmt(plan.price.annual)}/yr`  : 'Free',
        per_resident: `${fmt(plan.price.perResident)}/resident/mo`,
      };
      setResult(r => ({ ...r, planLabel: `${plan.name} · ${priceMap[planForm.billingOption]}` }));
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign plan');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: '#0F172A' }}>Onboard New Estate</h1>
        <p className="text-sm" style={{ color: '#94A3B8' }}>
          Set up a gated community, assign a manager, and configure billing.
        </p>
      </div>

      <StepIndicator current={step} />

      <div className="glass-card-gold p-6">
        {step === 0 && (
          <EstateStep
            form={estateForm}
            onChange={(k, v) => setEstateForm(f => ({ ...f, [k]: v }))}
            onNext={handleCreateEstate}
            saving={saving}
          />
        )}
        {step === 1 && (
          <ManagerStep
            form={managerForm}
            onChange={(k, v) => setManagerForm(f => ({ ...f, [k]: v }))}
            onNext={handleCreateManager}
            onSkip={handleSkipManager}
            saving={saving}
          />
        )}
        {step === 2 && (
          <PlanStep
            plans={plans}
            form={planForm}
            onChange={(k, v) => setPlanForm(f => ({ ...f, [k]: v }))}
            onNext={handleAssignPlan}
            onBack={() => setStep(1)}
            saving={saving}
          />
        )}
        {step === 3 && (
          <DoneStep
            estate={result.estate}
            manager={result.manager}
            plan={result.planLabel}
            onFinish={() => navigate('/estates')}
          />
        )}
      </div>
    </div>
  );
}
