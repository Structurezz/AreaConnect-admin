import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Building2, MapPin, UserRound, CreditCard, ClipboardCheck, Check, ChevronLeft, ChevronRight,
  Search, Mail, KeyRound, ExternalLink, RotateCcw,
} from 'lucide-react';
import { onboardingAPI, planAPI } from '../../api';
import { Field, Segmented, PlanPicker, CopyButton, NG_STATES, ESTATE_TYPES, TRIAL_OPTIONS, naira } from './shared';

const STEPS = [
  { key: 'profile',  label: 'Estate profile',   icon: Building2 },
  { key: 'location', label: 'Location & contact', icon: MapPin },
  { key: 'manager',  label: 'Estate manager',   icon: UserRound },
  { key: 'billing',  label: 'Plan & billing',   icon: CreditCard },
  { key: 'review',   label: 'Review',           icon: ClipboardCheck },
];

const EMPTY = {
  estate: {
    name: '', estateType: 'gated', unitCount: '', address: '', city: '', state: 'Lagos',
    contactPhone: '', contactEmail: '', adminNotes: '',
    settings: { requireVisitorApproval: false, marketplaceApproval: false, allowGuestChat: true },
  },
  manager: { mode: 'new', userId: '', name: '', email: '', phone: '', sendEmail: true },
  billing: { planId: '', cycle: 'monthly', trialDays: 14, status: 'trial', notes: '' },
};

function ManagerPicker({ value, onChange }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => onboardingAPI.managers({ search: q || undefined })
      .then(({ data }) => setList(data.data || [])).catch(() => setList([])).finally(() => setLoading(false)), 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="rounded-xl border border-[#E4E7EC] overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-[#F2F4F7] bg-[#F9FAFB]">
        <Search size={14} className="text-[#98A2B3]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search managers by name or email"
          className="flex-1 bg-transparent outline-none text-[13px]" />
      </div>
      <div className="max-h-64 overflow-y-auto divide-y divide-[#F2F4F7]">
        {loading && <p className="p-4 text-[12.5px] text-[#98A2B3]">Loading managers…</p>}
        {!loading && !list.length && <p className="p-4 text-[12.5px] text-[#98A2B3]">No managers match.</p>}
        {!loading && list.map((m) => {
          const on = value === m._id;
          return (
            <button key={m._id} type="button" onClick={() => onChange(m)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
              <span className="w-8 h-8 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[12px] font-semibold text-[#475467] overflow-hidden">
                {m.profilePhoto ? <img src={m.profilePhoto} alt="" className="w-full h-full object-cover" /> : m.name?.[0]?.toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-[#101828] truncate">{m.name}</span>
                <span className="block text-[11.5px] text-[#667085] truncate">{m.email}</span>
              </span>
              <span className="badge-gray">{m.managedEstates?.length || 0} estates</span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>
                {on && <Check size={11} className="text-white" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 py-2.5 cursor-pointer">
      <button type="button" onClick={() => onChange(!checked)}
        className={`mt-0.5 w-9 h-5 rounded-full relative transition-colors flex-shrink-0 ${checked ? 'bg-[#059669]' : 'bg-[#D0D5DD]'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
      <span>
        <span className="block text-[13px] font-medium text-[#101828]">{label}</span>
        {hint && <span className="block text-[12px] text-[#667085]">{hint}</span>}
      </span>
    </label>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-[#F2F4F7] last:border-0">
      <dt className="text-[12.5px] text-[#667085]">{label}</dt>
      <dd className="text-[13px] font-medium text-[#101828] text-right">{value || <span className="text-[#98A2B3]">—</span>}</dd>
    </div>
  );
}

export default function WizardFlow({ onDone }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [plans, setPlans] = useState([]);
  const [pickedManager, setPickedManager] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    planAPI.getAll().then(({ data }) => {
      const active = (data.data || []).filter((p) => p.isActive !== false);
      setPlans(active);
      const starter = active.find((p) => p.slug === 'growth') || active[0];
      if (starter) setForm((f) => ({ ...f, billing: { ...f.billing, planId: starter._id } }));
    }).catch(() => {});
  }, []);

  const set = (group, k, v) => setForm((f) => ({ ...f, [group]: { ...f[group], [k]: v } }));
  const e = form.estate, m = form.manager, b = form.billing;
  const plan = plans.find((p) => p._id === b.planId);

  const errors = useMemo(() => {
    const out = {};
    if (!e.name.trim()) out.profile = 'Enter the estate name';
    if (!e.address.trim()) out.location = 'Enter the street address';
    if (m.mode === 'new' && (!m.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email))) out.manager = 'Enter the manager’s name and a valid email';
    if (m.mode === 'existing' && !m.userId) out.manager = 'Pick a manager';
    return out;
  }, [e, m]);

  const next = () => {
    const err = errors[STEPS[step].key];
    if (err) return toast.error(err);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    const firstBad = STEPS.findIndex((s) => errors[s.key]);
    if (firstBad >= 0) { setStep(firstBad); return toast.error(errors[STEPS[firstBad].key]); }
    setSaving(true);
    try {
      const { data } = await onboardingAPI.estate({
        estate: { ...e, unitCount: Number(e.unitCount) || 0 },
        manager: m.mode === 'existing' ? { mode: 'existing', userId: m.userId, sendEmail: m.sendEmail } : m,
        billing: { ...b, trialDays: b.status === 'trial' ? b.trialDays : 0 },
      });
      setResult(data.data);
      toast.success(`${data.data.estate.name} is live`);
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create the estate');
    } finally { setSaving(false); }
  };

  if (result) {
    const mgr = result.manager;
    return (
      <div className="card p-6 sm:p-8 max-w-3xl">
        <div className="flex items-start gap-4">
          <span className="w-11 h-11 rounded-full bg-[#ECFDF3] text-[#059669] flex items-center justify-center flex-shrink-0"><Check size={22} /></span>
          <div className="min-w-0">
            <h3 className="text-[18px] font-semibold text-[#101828]">{result.estate.name} has been onboarded</h3>
            <p className="mt-1 text-[13px] text-[#475467]">
              {result.subscription?.status === 'trial' ? `On a ${b.trialDays}-day trial of ${plan?.name || 'the selected plan'}.` : `Active on ${plan?.name || 'the selected plan'}.`}
              {mgr && (result.emailed ? ` Login details were emailed to ${mgr.email}.` : ' No email was sent.')}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#E4E7EC] p-4">
            <p className="text-[11.5px] font-medium text-[#667085]">Estate code — share with residents and guards</p>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="font-mono text-[22px] font-semibold tracking-[0.12em] text-[#101828]">{result.estate.estateCode}</span>
              <CopyButton text={result.estate.estateCode} />
            </div>
          </div>
          {mgr && (
            <div className="rounded-xl border border-[#E4E7EC] p-4">
              <p className="text-[11.5px] font-medium text-[#667085]">Manager · {mgr.created ? 'new account' : 'existing account'}</p>
              <p className="mt-1 text-[13.5px] font-semibold text-[#101828]">{mgr.name}</p>
              <p className="text-[12px] text-[#667085]">{mgr.email}</p>
              {mgr.tempPassword && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-[#F9FAFB] border border-[#F2F4F7] px-2.5 py-1.5">
                  <span className="flex items-center gap-1.5 font-mono text-[13px] text-[#047857]"><KeyRound size={13} />{mgr.tempPassword}</span>
                  <CopyButton text={`Email: ${mgr.email}\nTemporary password: ${mgr.tempPassword}\nLogin: https://area-connector.areaconnect.pro/login`} label="Copy login" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to={`/estates/${result.estate._id}`} className="btn-primary" style={{ textDecoration: 'none' }}><ExternalLink size={14} /> Open estate</Link>
          <button className="btn-outline" onClick={() => { setResult(null); setForm(EMPTY); setPickedManager(null); setStep(0); }}><RotateCcw size={14} /> Onboard another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
      {/* Stepper */}
      <ol className="card p-2 h-fit lg:sticky lg:top-0 flex lg:block overflow-x-auto">
        {STEPS.map((s, i) => {
          const done = i < step, on = i === step;
          return (
            <li key={s.key} className="flex-shrink-0">
              <button type="button" onClick={() => i <= step && setStep(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${on ? 'bg-[#F6FEF9]' : i <= step ? 'hover:bg-[#F9FAFB]' : 'cursor-default'}`}>
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ${done ? 'bg-[#059669] text-white' : on ? 'bg-white border-2 border-[#059669] text-[#059669]' : 'bg-[#F2F4F7] text-[#98A2B3]'}`}>
                  {done ? <Check size={13} /> : i + 1}
                </span>
                <span className={`text-[13px] whitespace-nowrap ${on ? 'font-semibold text-[#101828]' : done ? 'text-[#344054]' : 'text-[#98A2B3]'}`}>{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="card">
        <div className="px-5 sm:px-6 py-4 border-b border-[#F2F4F7] flex items-center justify-between">
          <div>
            <p className="text-[11.5px] text-[#98A2B3]">Step {step + 1} of {STEPS.length}</p>
            <h3 className="text-[15px] font-semibold text-[#101828]">{STEPS[step].label}</h3>
          </div>
          <div className="hidden sm:block w-40 h-1.5 rounded-full bg-[#F2F4F7] overflow-hidden">
            <div className="h-full bg-[#059669] transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
        </div>

        <div className="p-5 sm:p-6 min-h-[340px]">
          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estate name" required className="sm:col-span-2">
                <input className="input-field" value={e.name} onChange={(ev) => set('estate', 'name', ev.target.value)} placeholder="e.g. Pilot Crescent Estate" autoFocus />
              </Field>
              <Field label="Estate type">
                <select className="input-field" value={e.estateType} onChange={(ev) => set('estate', 'estateType', ev.target.value)}>
                  {ESTATE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Field>
              <Field label="Number of units" hint="Approximate — helps size the plan">
                <input className="input-field" type="number" min="0" value={e.unitCount} onChange={(ev) => set('estate', 'unitCount', ev.target.value)} placeholder="e.g. 48" />
              </Field>
              <div className="sm:col-span-2 mt-1">
                <p className="field-label">Estate settings</p>
                <div className="rounded-xl border border-[#E4E7EC] px-4 divide-y divide-[#F2F4F7]">
                  <Toggle checked={e.settings.requireVisitorApproval} onChange={(v) => set('estate', 'settings', { ...e.settings, requireVisitorApproval: v })}
                    label="Visitors need resident approval" hint="Guards wait for the host to approve before letting a visitor in" />
                  <Toggle checked={e.settings.marketplaceApproval} onChange={(v) => set('estate', 'settings', { ...e.settings, marketplaceApproval: v })}
                    label="Review marketplace listings" hint="The manager approves listings before residents see them" />
                  <Toggle checked={e.settings.allowGuestChat} onChange={(v) => set('estate', 'settings', { ...e.settings, allowGuestChat: v })}
                    label="Allow guest chat" hint="Visitors can message their host from the visitor pass" />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Street address" required className="sm:col-span-2" hint="We geocode this to place the estate on the map">
                <input className="input-field" value={e.address} onChange={(ev) => set('estate', 'address', ev.target.value)} placeholder="12 Admiralty Way, Lekki Phase 1" autoFocus />
              </Field>
              <Field label="City / area">
                <input className="input-field" value={e.city} onChange={(ev) => set('estate', 'city', ev.target.value)} placeholder="Lekki" />
              </Field>
              <Field label="State">
                <select className="input-field" value={e.state} onChange={(ev) => set('estate', 'state', ev.target.value)}>
                  {NG_STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Estate office phone">
                <input className="input-field" value={e.contactPhone} onChange={(ev) => set('estate', 'contactPhone', ev.target.value)} placeholder="+234 …" />
              </Field>
              <Field label="Estate office email">
                <input className="input-field" type="email" value={e.contactEmail} onChange={(ev) => set('estate', 'contactEmail', ev.target.value)} placeholder="office@estate.ng" />
              </Field>
              <Field label="Internal notes" className="sm:col-span-2" hint="Only visible to AreaConnect admins">
                <textarea className="input-field min-h-[80px]" value={e.adminNotes} onChange={(ev) => set('estate', 'adminNotes', ev.target.value)} placeholder="How we met them, agreed terms, follow-ups…" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Segmented value={m.mode} onChange={(v) => set('manager', 'mode', v)} options={[
                { value: 'new', label: 'New manager' }, { value: 'existing', label: 'Existing manager' }, { value: 'later', label: 'Assign later' },
              ]} />
              {m.mode === 'new' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" required><input className="input-field" value={m.name} onChange={(ev) => set('manager', 'name', ev.target.value)} placeholder="Adaeze Okafor" /></Field>
                  <Field label="Phone"><input className="input-field" value={m.phone} onChange={(ev) => set('manager', 'phone', ev.target.value)} placeholder="+234 …" /></Field>
                  <Field label="Email" required className="sm:col-span-2" hint="If this email already manages estates, this estate is added to their portfolio.">
                    <input className="input-field" type="email" value={m.email} onChange={(ev) => set('manager', 'email', ev.target.value)} placeholder="manager@email.com" />
                  </Field>
                </div>
              )}
              {m.mode === 'existing' && (
                <ManagerPicker value={m.userId} onChange={(mg) => { set('manager', 'userId', mg._id); setPickedManager(mg); }} />
              )}
              {m.mode === 'later' && (
                <div className="rounded-xl border border-dashed border-[#D0D5DD] p-5 text-[13px] text-[#475467]">
                  The estate will be created without a manager. Assign one later from <strong>Onboard estates → Add to portfolio</strong>.
                </div>
              )}
              {m.mode !== 'later' && (
                <div className="rounded-xl border border-[#E4E7EC] px-4">
                  <Toggle checked={m.sendEmail} onChange={(v) => set('manager', 'sendEmail', v)} label="Email the manager"
                    hint={m.mode === 'new' ? 'Sends a welcome email with their login and a temporary password' : 'Lets them know the estate is in their switcher'} />
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <Segmented value={b.cycle} onChange={(v) => set('billing', 'cycle', v)} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
                <Segmented value={b.status} onChange={(v) => set('billing', 'status', v)} options={[{ value: 'trial', label: 'Start on trial' }, { value: 'active', label: 'Active now' }]} />
              </div>
              <PlanPicker plans={plans} value={b.planId} onChange={(v) => set('billing', 'planId', v)} cycle={b.cycle} />
              {b.status === 'trial' && (
                <Field label="Trial length">
                  <Segmented value={b.trialDays} onChange={(v) => set('billing', 'trialDays', v)} options={TRIAL_OPTIONS.filter((o) => o.value > 0)} />
                </Field>
              )}
              <Field label="Billing notes" hint="e.g. agreed discount, invoice contact">
                <input className="input-field" value={b.notes} onChange={(ev) => set('billing', 'notes', ev.target.value)} />
              </Field>
            </div>
          )}

          {step === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#E4E7EC] p-4">
                <p className="text-[12px] font-semibold text-[#344054] mb-1 flex items-center gap-1.5"><Building2 size={13} /> Estate</p>
                <dl>
                  <ReviewRow label="Name" value={e.name} />
                  <ReviewRow label="Type" value={ESTATE_TYPES.find((t) => t.value === e.estateType)?.label} />
                  <ReviewRow label="Units" value={e.unitCount} />
                  <ReviewRow label="Address" value={e.address} />
                  <ReviewRow label="City, state" value={[e.city, e.state].filter(Boolean).join(', ')} />
                  <ReviewRow label="Office contact" value={[e.contactPhone, e.contactEmail].filter(Boolean).join(' · ')} />
                </dl>
              </div>
              <div className="space-y-4">
                <div className="rounded-xl border border-[#E4E7EC] p-4">
                  <p className="text-[12px] font-semibold text-[#344054] mb-1 flex items-center gap-1.5"><UserRound size={13} /> Manager</p>
                  <dl>
                    {m.mode === 'later' && <ReviewRow label="Manager" value="Assign later" />}
                    {m.mode === 'new' && <><ReviewRow label="Name" value={m.name} /><ReviewRow label="Email" value={m.email} /><ReviewRow label="Account" value="New — temporary password" /></>}
                    {m.mode === 'existing' && <><ReviewRow label="Name" value={pickedManager?.name} /><ReviewRow label="Email" value={pickedManager?.email} /><ReviewRow label="Portfolio" value={`${pickedManager?.managedEstates?.length || 0} → ${(pickedManager?.managedEstates?.length || 0) + 1} estates`} /></>}
                    {m.mode !== 'later' && <ReviewRow label="Welcome email" value={m.sendEmail ? <span className="flex items-center gap-1 justify-end"><Mail size={12} /> Yes</span> : 'No'} />}
                  </dl>
                </div>
                <div className="rounded-xl border border-[#E4E7EC] p-4">
                  <p className="text-[12px] font-semibold text-[#344054] mb-1 flex items-center gap-1.5"><CreditCard size={13} /> Billing</p>
                  <dl>
                    <ReviewRow label="Plan" value={plan ? `${plan.name} · ${naira(b.cycle === 'annual' ? plan.price?.annual : plan.price?.monthly)}/${b.cycle === 'annual' ? 'yr' : 'mo'}` : 'Starter (default)'} />
                    <ReviewRow label="Status" value={b.status === 'trial' ? `${b.trialDays}-day trial` : 'Active'} />
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 sm:px-6 py-4 border-t border-[#F2F4F7] flex items-center justify-between bg-[#FCFCFD] rounded-b-xl">
          <button className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}><ChevronLeft size={15} /> Back</button>
          {step < STEPS.length - 1
            ? <button className="btn-primary" onClick={next}>Continue <ChevronRight size={15} /></button>
            : <button className="btn-primary" disabled={saving} onClick={submit}>{saving ? 'Creating…' : 'Create estate'} <Check size={15} /></button>}
        </div>
      </div>
    </div>
  );
}
