import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import {
  X, Building2, Layers, Receipt, CalendarClock, StickyNote, Search, Check, Users, Home, Gift, Sparkles,
  RefreshCw, Infinity as InfinityIcon, Tag, Eye, CreditCard, AlertTriangle, Clock, Zap, UserRound,
} from 'lucide-react';

const naira = (n) => (Number(n || 0) === 0 ? 'Free' : `₦${Number(n).toLocaleString()}`);

/* ── Shell: full-height panel from the right ─────────────────────────── */
export function Drawer({ title, subtitle, icon: Icon, tone = 'green', onClose, children, footer, width = 560 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  const tones = {
    green: 'bg-[#ECFDF3] border-[#ABEFC6] text-[#067647]',
    amber: 'bg-[#FFFAEB] border-[#FEDF89] text-[#B54708]',
    gray:  'bg-[#F9FAFB] border-[#EAECF0] text-[#344054]',
  };
  // Portal to <body> so page animations (transforms) can't offset the fixed panel
  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="overlay-backdrop" aria-hidden="true" onClick={onClose} />
      <aside className="relative h-full w-full bg-white flex flex-col shadow-[-8px_0_40px_rgba(15,23,42,0.18)] animate-slide-in-right" style={{ maxWidth: width }} role="dialog" aria-label={title}>
        <header className="flex items-start gap-3 px-6 py-5 border-b border-[#EAECF0] bg-white">
          {Icon && <span className={`w-11 h-11 rounded-xl border flex items-center justify-center flex-shrink-0 ${tones[tone]}`}><Icon size={19} /></span>}
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold text-[#101828]">{title}</h2>
            {subtitle && <p className="text-[12.5px] text-[#667085] mt-0.5">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto bg-white">{children}</div>
        {footer && <footer className="px-6 py-4 border-t border-[#EAECF0] bg-[#FCFCFD] flex items-center gap-2">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}

export function Section({ icon: Icon, title, hint, children, step }) {
  return (
    <section className="px-6 py-5 border-b border-[#F2F4F7] last:border-0">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="w-7 h-7 rounded-lg bg-[#F2F4F7] text-[#475467] flex items-center justify-center flex-shrink-0">
          {step ? <span className="text-[12px] font-semibold">{step}</span> : <Icon size={14} />}
        </span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-semibold text-[#101828] flex items-center gap-1.5">{step && Icon && <Icon size={13} className="text-[#98A2B3]" />}{title}</h3>
          {hint && <p className="text-[11.5px] text-[#98A2B3]">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Choice({ value, onChange, options }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(({ v, label, hint, icon: Icon, disabled }) => {
        const on = value === v;
        return (
          <button key={v} type="button" disabled={disabled} onClick={() => onChange(v)}
            className={`text-left rounded-xl border px-3 py-2.5 transition-all disabled:opacity-40 ${on ? 'border-[#059669] bg-[#F6FEF9] ring-2 ring-[#059669]/10' : 'border-[#E4E7EC] hover:border-[#D0D5DD]'}`}>
            <span className={`flex items-center gap-1.5 text-[13px] font-medium ${on ? 'text-[#101828]' : 'text-[#344054]'}`}>{Icon && <Icon size={14} className={on ? 'text-[#059669]' : 'text-[#98A2B3]'} />}{label}</span>
            {hint && <span className="block text-[11px] text-[#98A2B3] mt-0.5">{hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

const SUB_TONE = { active: 'text-[#067647] bg-[#ECFDF3]', trial: 'text-[#175CD3] bg-[#EFF8FF]', expired: 'text-[#B42318] bg-[#FEF3F2]', suspended: 'text-[#B54708] bg-[#FFFAEB]', cancelled: 'text-[#475467] bg-[#F2F4F7]' };

function EstatePicker({ estates, subByEstate, value, onChange }) {
  const [q, setQ] = useState('');
  const list = estates.filter((e) => !q || `${e.name} ${e.estateCode} ${e.address || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-xl border border-[#E4E7EC] overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-[#F2F4F7] bg-[#F9FAFB]">
        <Search size={14} className="text-[#98A2B3]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${estates.length} estates`} className="flex-1 bg-transparent outline-none text-[13px]" />
      </div>
      <div className="max-h-[220px] overflow-y-auto divide-y divide-[#F2F4F7]">
        {!list.length && <p className="px-3 py-4 text-[12.5px] text-[#98A2B3]">No estates match.</p>}
        {list.map((e) => {
          const on = value === e._id;
          const sub = subByEstate[e._id];
          return (
            <button key={e._id} type="button" onClick={() => onChange(e._id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ${on ? 'bg-[#059669] text-white' : 'bg-[#F2F4F7] text-[#475467]'}`}>{e.name?.[0]?.toUpperCase()}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-[#101828] truncate">{e.name}</span>
                <span className="block text-[11.5px] text-[#98A2B3] truncate"><span className="font-mono">{e.estateCode}</span>{e.managerId?.name ? ` · ${e.managerId.name}` : ''}</span>
              </span>
              {sub
                ? <span className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${SUB_TONE[sub.status] || SUB_TONE.cancelled}`}>{sub.planId?.name || 'Plan'} · {sub.status}</span>
                : <span className="text-[10.5px] font-medium text-[#98A2B3]">No plan</span>}
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>{on && <Check size={10} className="text-white" />}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanCards({ plans, value, onChange, cycle = 'monthly', comp = false }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {plans.map((p) => {
        const on = value === p._id;
        const price = cycle === 'annual' ? p.price?.annual : p.price?.monthly;
        return (
          <button key={p._id} type="button" onClick={() => onChange(p._id)}
            className={`text-left rounded-xl border p-3 transition-all ${on ? 'border-[#059669] bg-[#F6FEF9] ring-2 ring-[#059669]/10' : 'border-[#E4E7EC] hover:border-[#D0D5DD]'}`}>
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#101828]"><span className="w-2 h-2 rounded-full" style={{ background: p.color || '#059669' }} />{p.name}</span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>{on && <Check size={10} className="text-white" />}</span>
            </span>
            <span className="mt-1.5 block">
              {comp ? (
                <><span className="text-[16px] font-semibold text-[#067647]">Free</span><span className="ml-1.5 text-[11.5px] text-[#98A2B3] line-through">{naira(p.price?.monthly)}/mo</span></>
              ) : (
                <><span className="text-[16px] font-semibold text-[#101828] tabular-nums">{naira(price)}</span><span className="text-[11.5px] text-[#98A2B3]">/{cycle === 'annual' ? 'yr' : 'mo'}</span></>
              )}
            </span>
            <span className="mt-1.5 flex items-center gap-3 text-[11px] text-[#667085]">
              <span className="flex items-center gap-1"><Users size={11} />{p.features?.maxResidents ?? '—'}</span>
              <span className="flex items-center gap-1"><Home size={11} />{p.features?.maxUnits ?? '—'}</span>
              {p.price?.perResident > 0 && <span>₦{p.price.perResident}/resident</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Summary({ rows, tone = 'green' }) {
  return (
    <div className={`rounded-xl border ${tone === 'amber' ? 'border-[#FEDF89] bg-[#FFFCF5]' : 'border-[#D1FADF] bg-[#F6FEF9]'} divide-y divide-white`}>
      {rows.filter(Boolean).map(([k, v, Icon]) => (
        <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px]">
          <span className="text-[#475467] flex items-center gap-1.5">{Icon && <Icon size={13} className="text-[#98A2B3]" />}{k}</span>
          <span className="font-semibold text-[#101828] text-right">{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Assign plan ─────────────────────────────────────────────────────── */
export function AssignPlanDrawer({ estates, plans, subs, form, setForm, onSubmit, saving, onClose }) {
  const subByEstate = useMemo(() => Object.fromEntries(subs.map((s) => [s.estateId?._id || s.estateId, s])), [subs]);
  const estate = estates.find((e) => e._id === form.estateId);
  const plan = plans.find((p) => p._id === form.planId);
  const existing = subByEstate[form.estateId];
  const perResident = form.billingModel === 'per_resident';
  const price = perResident ? (plan?.price?.perResident || 0) * (Number(form.residentCount) || 0) : form.cycle === 'annual' ? plan?.price?.annual : plan?.price?.monthly;
  const firstCharge = form.status === 'trial' ? new Date(Date.now() + (Number(form.trialDays) || 0) * 86400000) : new Date();
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <Drawer title="Assign a plan" subtitle="Put an estate on a plan, choose how it's billed and when it starts." icon={CreditCard} onClose={onClose}
      footer={<>
        <span className="text-[12px] text-[#667085] mr-auto">{estate && plan ? <>{estate.name} → <b className="text-[#101828]">{plan.name}</b></> : 'Pick an estate and a plan'}</span>
        <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
        <button type="submit" form="assign-plan-form" disabled={saving || !form.estateId || !form.planId} className="btn-primary">
          {saving ? <><RefreshCw size={14} className="animate-spin" /> Assigning…</> : <><Check size={14} /> Assign plan</>}
        </button>
      </>}>
      <form id="assign-plan-form" onSubmit={onSubmit}>
        <Section step="1" icon={Building2} title="Estate" hint="Which estate is this subscription for?">
          <EstatePicker estates={estates} subByEstate={subByEstate} value={form.estateId} onChange={(v) => set('estateId', v)} />
          {existing && (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-[#B54708]"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              This estate is already on <b>{existing.planId?.name || 'a plan'}</b> ({existing.status}). Assigning replaces it.</p>
          )}
        </Section>

        <Section step="2" icon={Layers} title="Plan" hint="Residents and units each plan allows are shown on the card.">
          <PlanCards plans={plans} value={form.planId} onChange={(v) => set('planId', v)} cycle={form.cycle} />
        </Section>

        <Section step="3" icon={Receipt} title="Billing">
          <p className="text-[12px] font-medium text-[#344054] mb-1.5">How is it charged?</p>
          <Choice value={form.billingModel} onChange={(v) => setForm({ ...form, billingModel: v, cycle: v === 'per_resident' ? 'monthly' : form.cycle })} options={[
            { v: 'flat', label: 'Flat fee', hint: 'One price for the estate', icon: Tag },
            { v: 'per_resident', label: 'Per resident', hint: 'Price × active residents', icon: Users },
          ]} />
          {perResident ? (
            <label className="block mt-3">
              <span className="text-[12px] font-medium text-[#344054]">Resident count</span>
              <input type="number" min="1" className="input-field mt-1.5" placeholder="e.g. 80" value={form.residentCount} onChange={(e) => set('residentCount', e.target.value)} />
            </label>
          ) : (
            <>
              <p className="text-[12px] font-medium text-[#344054] mt-3 mb-1.5">Billing cycle</p>
              <Choice value={form.cycle} onChange={(v) => set('cycle', v)} options={[
                { v: 'monthly', label: 'Monthly', icon: CalendarClock },
                { v: 'annual', label: 'Annual', hint: plan?.price?.annual ? `${naira(plan.price.annual)} / year` : undefined, icon: CalendarClock },
              ]} />
            </>
          )}
        </Section>

        <Section step="4" icon={Zap} title="Start">
          <Choice value={form.status} onChange={(v) => set('status', v)} options={[
            { v: 'trial', label: 'Free trial first', hint: 'Billing starts when it ends', icon: Clock },
            { v: 'active', label: 'Active now', hint: 'Bill from today', icon: Zap },
          ]} />
          {form.status === 'trial' && (
            <div className="mt-3 flex items-center gap-2">
              {[7, 14, 30].map((d) => (
                <button key={d} type="button" onClick={() => set('trialDays', d)}
                  className={`px-3 h-9 rounded-lg border text-[12.5px] font-medium ${Number(form.trialDays) === d ? 'border-[#059669] bg-[#F6FEF9] text-[#067647]' : 'border-[#E4E7EC] text-[#475467] hover:border-[#D0D5DD]'}`}>{d} days</button>
              ))}
              <input type="number" min="1" max="90" className="input-field !w-24 !h-9" value={form.trialDays} onChange={(e) => set('trialDays', parseInt(e.target.value, 10) || '')} />
              <span className="text-[12px] text-[#98A2B3]">days</span>
            </div>
          )}
        </Section>

        <Section step="5" icon={StickyNote} title="Notes" hint="Only admins see this">
          <textarea className="input-field min-h-[70px]" placeholder="e.g. Agreed 10% discount for annual payment" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Section>

        <Section icon={Receipt} title="Summary">
          <Summary rows={[
            ['Estate', estate ? `${estate.name} · ${estate.estateCode}` : '—', Building2],
            ['Plan', plan?.name || '—', Layers],
            ['Price', plan ? `${naira(price)}${perResident ? ' / month' : form.cycle === 'annual' ? ' / year' : ' / month'}` : '—', Tag],
            ['Status', form.status === 'trial' ? `${form.trialDays || 0}-day trial` : 'Active', Zap],
            ['First charge', plan ? format(firstCharge, 'd MMM yyyy') : '—', CalendarClock],
          ]} />
        </Section>
      </form>
    </Drawer>
  );
}

/* ── Grant comp access ──────────────────────────────────────────────── */
const REASONS = ['Launch promo', 'VIP', 'Beta tester', 'Partner estate', 'Goodwill'];
const EXPIRY = [
  { v: '7', label: '7 days' }, { v: '30', label: '30 days' }, { v: '90', label: '90 days' },
  { v: 'custom', label: 'Pick date' }, { v: 'never', label: 'Never' },
];

export function GrantCompDrawer({ estates, plans, subs, form, setForm, onSubmit, saving, onClose }) {
  const subByEstate = useMemo(() => Object.fromEntries(subs.map((s) => [s.estateId?._id || s.estateId, s])), [subs]);
  const estate = estates.find((e) => e._id === form.estateId);
  const plan = plans.find((p) => p._id === form.planId);
  const set = (k, v) => setForm({ ...form, [k]: v });
  const ends = form.expiryPreset === 'never' ? null
    : form.expiryPreset === 'custom' ? (form.customExpiry ? new Date(form.customExpiry) : null)
    : new Date(Date.now() + Number(form.expiryPreset) * 86400000);
  const value = plan ? (form.cycle === 'annual' ? plan.price?.annual : plan.price?.monthly) : 0;

  return (
    <Drawer title="Grant comp access" subtitle="Give an estate a plan for free — promos, VIPs, beta testers. It overrides billing until it ends." icon={Gift} tone="amber" onClose={onClose}
      footer={<>
        <span className="text-[12px] text-[#667085] mr-auto">{estate && plan ? <>{estate.name} gets <b className="text-[#101828]">{plan.name}</b> free</> : 'Pick an estate and a plan'}</span>
        <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
        <button type="submit" form="grant-comp-form" disabled={saving || !form.estateId || !form.planId} className="btn-primary">
          {saving ? <><RefreshCw size={14} className="animate-spin" /> Granting…</> : <><Sparkles size={14} /> Grant comp</>}
        </button>
      </>}>
      <form id="grant-comp-form" onSubmit={onSubmit}>
        <Section step="1" icon={Building2} title="Estate" hint="The estate that gets free access">
          <EstatePicker estates={estates} subByEstate={subByEstate} value={form.estateId} onChange={(v) => set('estateId', v)} />
        </Section>

        <Section step="2" icon={Layers} title="Plan to unlock" hint="Every feature of this plan is unlocked for free">
          <PlanCards plans={plans} value={form.planId} onChange={(v) => set('planId', v)} comp />
        </Section>

        <Section step="3" icon={Tag} title="Reason" hint="Shown to admins and in the gift email">
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {REASONS.map((r) => (
              <button key={r} type="button" onClick={() => set('reason', r)}
                className={`px-2.5 h-8 rounded-full border text-[12px] font-medium ${form.reason === r ? 'border-[#F79009] bg-[#FFFAEB] text-[#B54708]' : 'border-[#E4E7EC] text-[#475467] hover:border-[#D0D5DD]'}`}>{r}</button>
            ))}
          </div>
          <input className="input-field" placeholder="Or type a reason" value={form.reason} onChange={(e) => set('reason', e.target.value)} />
        </Section>

        <Section step="4" icon={CalendarClock} title="How long?">
          <div className="grid grid-cols-5 gap-1.5">
            {EXPIRY.map((o) => (
              <button key={o.v} type="button" onClick={() => set('expiryPreset', o.v)}
                className={`h-9 rounded-lg border text-[12px] font-medium flex items-center justify-center gap-1 ${form.expiryPreset === o.v ? 'border-[#059669] bg-[#F6FEF9] text-[#067647]' : 'border-[#E4E7EC] text-[#475467] hover:border-[#D0D5DD]'}`}>
                {o.v === 'never' && <InfinityIcon size={12} />}{o.label}
              </button>
            ))}
          </div>
          {form.expiryPreset === 'custom' && (
            <input type="date" className="input-field mt-2.5" required min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              value={form.customExpiry} onChange={(e) => set('customExpiry', e.target.value)} />
          )}
          <p className="mt-2 text-[11.5px] text-[#98A2B3] flex items-center gap-1">
            {form.expiryPreset === 'never' ? <><InfinityIcon size={11} /> Stays free until you revoke it.</> : ends ? <>Ends {format(ends, 'EEEE, d MMM yyyy')} — then normal billing resumes.</> : 'Pick an end date.'}
          </p>
        </Section>

        <Section step="5" icon={Eye} title="Normal price shown in the email">
          <Choice value={form.cycle} onChange={(v) => set('cycle', v)} options={[
            { v: 'monthly', label: 'Monthly price', icon: CalendarClock },
            { v: 'annual', label: 'Annual price', icon: CalendarClock },
          ]} />
          <p className="mt-1.5 text-[11.5px] text-[#98A2B3]">Only changes the “normally ₦…” line in the gift email. Features unlock either way.</p>
        </Section>

        <Section icon={Gift} title="Summary">
          <Summary tone="amber" rows={[
            ['Estate', estate ? `${estate.name} · ${estate.estateCode}` : '—', Building2],
            ['Manager', estate?.managerId?.name || '—', UserRound],
            ['Plan unlocked', plan?.name || '—', Layers],
            ['Value given', plan ? `${naira(value)} / ${form.cycle === 'annual' ? 'year' : 'month'}` : '—', Tag],
            ['Ends', form.expiryPreset === 'never' ? 'Never' : ends ? format(ends, 'd MMM yyyy') : '—', CalendarClock],
            ['Reason', form.reason || '—', StickyNote],
          ]} />
        </Section>
      </form>
    </Drawer>
  );
}
