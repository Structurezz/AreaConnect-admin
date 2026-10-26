import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export const NG_STATES = ['Abia','Abuja (FCT)','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];

export const ESTATE_TYPES = [
  { value: 'gated',       label: 'Gated estate' },
  { value: 'residential', label: 'Residential close / street' },
  { value: 'apartments',  label: 'Apartment complex' },
  { value: 'mixed',       label: 'Mixed use' },
  { value: 'cooperative', label: 'Housing cooperative' },
  { value: 'commercial',  label: 'Commercial / office park' },
];

export const TRIAL_OPTIONS = [
  { value: 0,  label: 'No trial' },
  { value: 7,  label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

export const naira = (n) => `₦${Number(n || 0).toLocaleString()}`;

export function Field({ label, hint, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}{required && <span className="text-[#D92D20]"> *</span>}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex p-0.5 rounded-lg border border-[#E4E7EC] bg-[#F9FAFB]">
      {options.map((o) => (
        <button key={String(o.value)} type="button" onClick={() => onChange(o.value)}
          className={`px-3 h-8 rounded-md text-[12.5px] font-medium transition-colors ${value === o.value ? 'bg-white text-[#101828] shadow-sm border border-[#E4E7EC]' : 'text-[#475467] hover:text-[#101828]'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PlanPicker({ plans, value, onChange, cycle = 'monthly' }) {
  if (!plans?.length) return <p className="text-[13px] text-[#98A2B3]">No active plans — the starter plan will be used.</p>;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {plans.map((p) => {
        const on = value === p._id;
        return (
          <button key={p._id} type="button" onClick={() => onChange(p._id)}
            className={`text-left rounded-xl border p-3.5 transition-all ${on ? 'border-[#059669] ring-4 ring-[#059669]/10 bg-[#F6FEF9]' : 'border-[#E4E7EC] hover:border-[#D0D5DD] bg-white'}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[13.5px] font-semibold text-[#101828]">
                <span className="w-2 h-2 rounded-full" style={{ background: p.color || '#059669' }} />{p.name}
              </span>
              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>
                {on && <Check size={11} className="text-white" />}
              </span>
            </div>
            <div className="mt-1.5 text-[18px] font-semibold text-[#101828] tabular-nums">
              {naira(cycle === 'annual' ? p.price?.annual : p.price?.monthly)}
              <span className="text-[12px] font-normal text-[#98A2B3]">/{cycle === 'annual' ? 'yr' : 'mo'}</span>
            </div>
            <p className="mt-1 text-[11.5px] text-[#667085] line-clamp-2">
              {p.description || `Up to ${p.features?.maxResidents ?? '—'} residents · ${p.features?.maxUnits ?? '—'} units`}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-ghost !px-2 !py-1 text-[12px]"
      onClick={() => { navigator.clipboard?.writeText(text); setDone(true); toast.success('Copied'); setTimeout(() => setDone(false), 1500); }}>
      {done ? <Check size={13} /> : <Copy size={13} />} {label}
    </button>
  );
}

// Minimal RFC-4180 CSV parser (quotes, commas and newlines inside quotes)
export function parseCSV(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',' || c === '\t') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

export function downloadCSV(filename, rows) {
  const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function SectionCard({ title, description, children, aside }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#F2F4F7]">
        <div>
          <h3 className="text-[14.5px] font-semibold text-[#101828]">{title}</h3>
          {description && <p className="mt-0.5 text-[12.5px] text-[#667085]">{description}</p>}
        </div>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
