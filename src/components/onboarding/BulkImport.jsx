import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, Download, FileSpreadsheet, AlertCircle, AlertTriangle, CheckCircle2, Trash2, RotateCcw, KeyRound } from 'lucide-react';
import { onboardingAPI, planAPI } from '../../api';
import { Field, Segmented, SectionCard, TRIAL_OPTIONS, parseCSV, downloadCSV } from './shared';

const COLUMNS = [
  { key: 'name',         label: 'Estate name',   aliases: ['estate', 'estate name', 'name'] },
  { key: 'address',      label: 'Address',       aliases: ['address', 'street', 'location'] },
  { key: 'city',         label: 'City',          aliases: ['city', 'area', 'lga'] },
  { key: 'state',        label: 'State',         aliases: ['state'] },
  { key: 'unitCount',    label: 'Units',         aliases: ['units', 'unit count', 'unitcount', 'houses'] },
  { key: 'managerName',  label: 'Manager name',  aliases: ['manager', 'manager name', 'managername', 'contact name'] },
  { key: 'managerEmail', label: 'Manager email', aliases: ['email', 'manager email', 'manageremail', 'contact email'] },
  { key: 'managerPhone', label: 'Manager phone', aliases: ['phone', 'manager phone', 'managerphone', 'contact phone'] },
  { key: 'planSlug',     label: 'Plan',          aliases: ['plan', 'plan slug', 'planslug'] },
];
const TEMPLATE = [
  COLUMNS.map((c) => c.label),
  ['Pilot Crescent Estate', '4 Pilot Crescent, Surulere', 'Surulere', 'Lagos', '36', 'Adaeze Okafor', 'adaeze@example.com', '+2348012345678', 'growth'],
  ['Adebayo Close', '9 Adebayo Close, Ikeja GRA', 'Ikeja', 'Lagos', '18', 'Adaeze Okafor', 'adaeze@example.com', '', 'starter'],
];

function rowsFromText(text) {
  const grid = parseCSV(text);
  if (!grid.length) return [];
  const head = grid[0].map((h) => h.toLowerCase().replace(/[^a-z ]/g, '').trim());
  const hasHeader = head.some((h) => COLUMNS.some((c) => c.aliases.includes(h)));
  const map = hasHeader
    ? head.map((h) => COLUMNS.find((c) => c.aliases.includes(h))?.key || null)
    : COLUMNS.map((c) => c.key);
  return (hasHeader ? grid.slice(1) : grid).map((cells) => {
    const r = {};
    map.forEach((k, i) => { if (k) r[k] = cells[i] || ''; });
    return r;
  });
}

export default function BulkImport({ onDone }) {
  const fileRef = useRef(null);
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [checks, setChecks] = useState([]);
  const [plans, setPlans] = useState([]);
  const [defaults, setDefaults] = useState({ planId: '', cycle: 'monthly', trialDays: 14 });
  const [sendEmails, setSendEmails] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    planAPI.getAll().then(({ data }) => setPlans((data.data || []).filter((p) => p.isActive !== false))).catch(() => {});
  }, []);

  // Validate on the server whenever the parsed rows change
  useEffect(() => {
    if (!rows.length) { setChecks([]); return; }
    const t = setTimeout(() => onboardingAPI.bulk({ rows, dryRun: true })
      .then(({ data }) => setChecks(data.data.checked || [])).catch(() => {}), 350);
    return () => clearTimeout(t);
  }, [rows]);

  const load = (t) => { setText(t); setRows(rowsFromText(t)); setResult(null); };
  const onFile = (f) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result || ''));
    reader.readAsText(f);
  };

  const errCount = checks.filter((c) => c.errors.length).length;
  const warnCount = checks.filter((c) => !c.errors.length && c.warnings.length).length;
  const managers = useMemo(() => new Set(rows.map((r) => (r.managerEmail || '').toLowerCase()).filter(Boolean)).size, [rows]);

  const updateCell = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const removeRow = (i) => setRows((rs) => rs.filter((_, j) => j !== i));

  const runImport = async () => {
    setBusy(true);
    try {
      const { data } = await onboardingAPI.bulk({ rows, defaults: { ...defaults, planId: defaults.planId || undefined }, sendEmails });
      setResult(data.data);
      toast.success(`${data.data.created} estate${data.data.created === 1 ? '' : 's'} onboarded`);
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setBusy(false); }
  };

  if (result) {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="stat-card"><p className="text-[12.5px] text-[#475467]">Estates created</p><p className="mt-1 text-[26px] font-semibold text-[#067647]">{result.created}</p></div>
          <div className="stat-card"><p className="text-[12.5px] text-[#475467]">Failed rows</p><p className="mt-1 text-[26px] font-semibold text-[#B42318]">{result.failed}</p></div>
          <div className="stat-card"><p className="text-[12.5px] text-[#475467]">Welcome emails sent</p><p className="mt-1 text-[26px] font-semibold text-[#101828]">{result.emailsSent}</p></div>
        </div>

        {result.credentials?.length > 0 && (
          <SectionCard title="New manager logins" description="Temporary passwords are shown once. Download them now if you need to share them another way."
            aside={<button className="btn-outline" onClick={() => downloadCSV(`manager-logins-${result.batchId}.csv`, [['Name', 'Email', 'Temporary password', 'Estates'], ...result.credentials.map((c) => [c.name, c.email, c.tempPassword, c.estates.join('; ')])])}><Download size={14} /> Download</button>}>
            <div className="overflow-x-auto -m-5">
              <table className="table">
                <thead><tr><th>Manager</th><th>Temporary password</th><th>Estates</th></tr></thead>
                <tbody>{result.credentials.map((c) => (
                  <tr key={c.email}><td><span className="cell-strong">{c.name}</span><br /><span className="text-[12px]">{c.email}</span></td>
                    <td><span className="font-mono text-[#047857] flex items-center gap-1.5"><KeyRound size={13} />{c.tempPassword}</span></td>
                    <td>{c.estates.join(', ')}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </SectionCard>
        )}

        <SectionCard title={`Batch ${result.batchId}`} description="Row-by-row result">
          <div className="overflow-x-auto -m-5">
            <table className="table">
              <thead><tr><th>Row</th><th>Estate</th><th>Code</th><th>Manager</th><th>Result</th></tr></thead>
              <tbody>{result.results.map((r) => (
                <tr key={r.row}>
                  <td>{r.row}</td><td className="cell-strong">{r.name || '—'}</td>
                  <td className="font-mono">{r.estateCode || '—'}</td>
                  <td>{r.manager ? <>{r.manager}{r.managerCreated && <span className="badge-blue ml-1.5">new</span>}</> : '—'}</td>
                  <td>{r.ok ? <span className="badge-green">Created</span> : <span className="badge-red" title={r.error}>{r.error}</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SectionCard>
        <button className="btn-outline" onClick={() => { setResult(null); setRows([]); setText(''); }}><RotateCcw size={14} /> Import another file</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionCard title="1 · Add your estates" description="Upload a CSV or paste rows from Excel / Google Sheets. One row per estate — the same manager email on several rows gives that manager all of those estates."
        aside={<button className="btn-outline whitespace-nowrap" onClick={() => downloadCSV('areaconnect-estates-template.csv', TEMPLATE)}><Download size={14} /> Template</button>}>
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <button type="button" onClick={() => fileRef.current?.click()}
            onDragOver={(ev) => ev.preventDefault()} onDrop={(ev) => { ev.preventDefault(); onFile(ev.dataTransfer.files?.[0]); }}
            className="rounded-xl border-2 border-dashed border-[#D0D5DD] hover:border-[#059669] hover:bg-[#F6FEF9] transition-colors flex flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[#475467]"><Upload size={18} /></span>
            <span className="text-[13px] font-semibold text-[#101828]">Upload CSV</span>
            <span className="text-[12px] text-[#667085]">Click or drag a file here</span>
            <input ref={fileRef} type="file" accept=".csv,text/csv,.tsv,.txt" className="hidden" onChange={(ev) => onFile(ev.target.files?.[0])} />
          </button>
          <textarea className="input-field font-mono text-[12px] min-h-[150px]" value={text} onChange={(ev) => load(ev.target.value)}
            placeholder={`${COLUMNS.map((c) => c.label).join(', ')}\nPilot Crescent Estate, 4 Pilot Crescent, Surulere, Lagos, 36, Adaeze Okafor, adaeze@example.com, +234…, growth`} />
        </div>
      </SectionCard>

      {rows.length > 0 && (
        <SectionCard title={`2 · Check ${rows.length} row${rows.length === 1 ? '' : 's'}`} description="Edit any cell before importing. Rows with errors are skipped."
          aside={<div className="flex items-center gap-2 text-[12px]">
            {errCount > 0 && <span className="badge-red"><AlertCircle size={12} /> {errCount} error{errCount === 1 ? '' : 's'}</span>}
            {warnCount > 0 && <span className="badge-yellow"><AlertTriangle size={12} /> {warnCount} warning{warnCount === 1 ? '' : 's'}</span>}
            {!errCount && <span className="badge-green"><CheckCircle2 size={12} /> Ready</span>}
          </div>}>
          <div className="overflow-x-auto -m-5">
            <table className="table">
              <thead><tr><th>#</th>{COLUMNS.map((c) => <th key={c.key}>{c.label}</th>)}<th>Status</th><th /></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const c = checks[i];
                  return (
                    <tr key={i} className={c?.errors.length ? 'bg-[#FFFBFA]' : ''}>
                      <td className="text-[#98A2B3]">{i + 1}</td>
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="!py-1.5 !px-1.5">
                          <input value={r[col.key] || ''} onChange={(ev) => updateCell(i, col.key, ev.target.value)}
                            className="w-full min-w-[110px] px-2 py-1 rounded-md border border-transparent hover:border-[#E4E7EC] focus:border-[#059669] outline-none bg-transparent text-[12.5px] text-[#101828]" />
                        </td>
                      ))}
                      <td className="whitespace-nowrap">
                        {c?.errors.length ? <span className="badge-red" title={c.errors.join('\n')}>{c.errors[0]}</span>
                          : c?.warnings.length ? <span className="badge-yellow" title={c.warnings.join('\n')}>{c.warnings[0]}</span>
                          : <span className="badge-green">OK</span>}
                      </td>
                      <td><button className="text-[#98A2B3] hover:text-[#D92D20]" onClick={() => removeRow(i)} aria-label="Remove row"><Trash2 size={14} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {rows.length > 0 && (
        <SectionCard title="3 · Billing defaults & import" description="Used for rows that don't name a plan.">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Default plan">
              <select className="input-field" value={defaults.planId} onChange={(ev) => setDefaults((d) => ({ ...d, planId: ev.target.value }))}>
                <option value="">Starter (default)</option>
                {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Billing cycle">
              <Segmented value={defaults.cycle} onChange={(v) => setDefaults((d) => ({ ...d, cycle: v }))} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} />
            </Field>
            <Field label="Free trial">
              <Segmented value={defaults.trialDays} onChange={(v) => setDefaults((d) => ({ ...d, trialDays: v }))} options={TRIAL_OPTIONS} />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[13px] text-[#344054]">
            <input type="checkbox" checked={sendEmails} onChange={(ev) => setSendEmails(ev.target.checked)} className="accent-[#059669]" />
            Email each manager once with all their estates and login details
          </label>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#F2F4F7]">
            <p className="text-[12.5px] text-[#667085] flex items-center gap-1.5">
              <FileSpreadsheet size={14} /> {rows.length - errCount} estate{rows.length - errCount === 1 ? '' : 's'} · {managers} manager{managers === 1 ? '' : 's'} will be onboarded
            </p>
            <button className="btn-primary" disabled={busy || rows.length === errCount} onClick={runImport}>
              {busy ? 'Importing…' : `Import ${rows.length - errCount} estate${rows.length - errCount === 1 ? '' : 's'}`}
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
