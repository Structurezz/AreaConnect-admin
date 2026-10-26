import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Search, Plus, Trash2, Check, Building2, Briefcase } from 'lucide-react';
import { onboardingAPI, estateAPI, planAPI } from '../../api';
import { Field, Segmented, SectionCard, NG_STATES, TRIAL_OPTIONS } from './shared';

const blank = () => ({ name: '', address: '', city: '', state: 'Lagos', unitCount: '' });

export default function Portfolio({ onDone }) {
  const [managers, setManagers] = useState(null);
  const [q, setQ] = useState('');
  const [mgr, setMgr] = useState(null);
  const [newRows, setNewRows] = useState([blank()]);
  const [estates, setEstates] = useState([]);
  const [moveIds, setMoveIds] = useState([]);
  const [moveQ, setMoveQ] = useState('');
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState({ planId: '', cycle: 'monthly', trialDays: 14 });
  const [sendEmail, setSendEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadManagers = () => onboardingAPI.managers().then(({ data }) => setManagers(data.data || [])).catch(() => setManagers([]));
  useEffect(() => {
    loadManagers();
    estateAPI.getAll().then(({ data }) => setEstates(data.data || [])).catch(() => {});
    planAPI.getAll().then(({ data }) => setPlans((data.data || []).filter((p) => p.isActive !== false))).catch(() => {});
  }, []);

  const list = useMemo(() => (managers || []).filter((m) => !q || `${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase())), [managers, q]);
  const owned = new Set((mgr?.managedEstates || []).map((e) => e._id));
  const movable = estates.filter((e) => !owned.has(e._id) && (!moveQ || `${e.name} ${e.estateCode}`.toLowerCase().includes(moveQ.toLowerCase())));
  const setRow = (i, k, v) => setNewRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const validNew = newRows.filter((r) => r.name.trim() && r.address.trim());

  const submit = async () => {
    if (!mgr) return toast.error('Pick a manager first');
    if (!validNew.length && !moveIds.length) return toast.error('Add a new estate or pick an existing one');
    setBusy(true);
    try {
      const { data } = await onboardingAPI.portfolio({
        managerId: mgr._id,
        estates: validNew.map((r) => ({ ...r, unitCount: Number(r.unitCount) || 0 })),
        existingEstateIds: moveIds,
        billing: { ...billing, planId: billing.planId || undefined, trialDays: billing.trialDays },
        sendEmail,
      });
      const n = data.data.created.length + data.data.assigned.length;
      toast.success(`${n} estate${n === 1 ? '' : 's'} added to ${mgr.name}'s portfolio`);
      setNewRows([blank()]); setMoveIds([]);
      const fresh = await onboardingAPI.managers();
      setManagers(fresh.data.data || []);
      setMgr((fresh.data.data || []).find((m) => m._id === mgr._id) || null);
      estateAPI.getAll().then(({ data: d }) => setEstates(d.data || [])).catch(() => {});
      onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the portfolio');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      {/* Manager list */}
      <div className="card h-fit overflow-hidden">
        <div className="px-4 py-3.5 border-b border-[#F2F4F7]">
          <h3 className="text-[14px] font-semibold text-[#101828]">Choose a manager</h3>
          <div className="mt-2.5 flex items-center gap-2 px-3 h-9 rounded-lg border border-[#D0D5DD] bg-white">
            <Search size={14} className="text-[#98A2B3]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="flex-1 bg-transparent outline-none text-[13px]" />
          </div>
        </div>
        <div className="max-h-[520px] overflow-y-auto divide-y divide-[#F2F4F7]">
          {managers === null && <div className="p-4 space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10" />)}</div>}
          {managers && !list.length && <p className="p-5 text-[12.5px] text-[#98A2B3]">No managers found.</p>}
          {list.map((m) => {
            const on = mgr?._id === m._id;
            return (
              <button key={m._id} onClick={() => setMgr(m)} className={`w-full flex items-center gap-3 px-4 py-3 text-left relative ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
                {on && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[#059669]" />}
                <span className="w-8 h-8 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[12px] font-semibold text-[#475467] overflow-hidden flex-shrink-0">
                  {m.profilePhoto ? <img src={m.profilePhoto} alt="" className="w-full h-full object-cover" /> : m.name?.[0]?.toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium text-[#101828] truncate">{m.name}</span>
                  <span className="block text-[11.5px] text-[#667085] truncate">{m.email}</span>
                </span>
                <span className="badge-gray">{m.managedEstates?.length || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!mgr ? (
        <div className="card flex flex-col items-center justify-center text-center p-10 min-h-[320px]">
          <span className="w-12 h-12 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center"><Briefcase size={20} /></span>
          <p className="mt-3 text-[14px] font-semibold text-[#101828]">Grow a manager's portfolio</p>
          <p className="mt-1 text-[13px] text-[#667085] max-w-sm">Pick a manager to add new estates they run, or move existing estates under them. They switch between estates from their dashboard.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <SectionCard title={mgr.name} description={`${mgr.email} · currently manages ${mgr.managedEstates?.length || 0} estate${mgr.managedEstates?.length === 1 ? '' : 's'}`}>
            <div className="flex flex-wrap gap-2">
              {(mgr.managedEstates || []).map((e) => (
                <span key={e._id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E4E7EC] text-[12.5px] text-[#344054]">
                  <Building2 size={13} className="text-[#98A2B3]" />{e.name}<span className="font-mono text-[11px] text-[#98A2B3]">{e.estateCode}</span>
                </span>
              ))}
              {!mgr.managedEstates?.length && <span className="text-[12.5px] text-[#98A2B3]">No estates yet</span>}
            </div>
          </SectionCard>

          <SectionCard title="New estates" description="Create estates directly in this manager's portfolio.">
            <div className="space-y-2.5">
              {newRows.map((r, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[1.2fr_1.6fr_1fr_1fr_80px_32px] p-3 md:p-0 rounded-xl border md:border-0 border-[#E4E7EC]">
                  <input className="input-field" placeholder="Estate name *" value={r.name} onChange={(e) => setRow(i, 'name', e.target.value)} />
                  <input className="input-field" placeholder="Street address *" value={r.address} onChange={(e) => setRow(i, 'address', e.target.value)} />
                  <input className="input-field" placeholder="City" value={r.city} onChange={(e) => setRow(i, 'city', e.target.value)} />
                  <select className="input-field" value={r.state} onChange={(e) => setRow(i, 'state', e.target.value)}>{NG_STATES.map((s) => <option key={s}>{s}</option>)}</select>
                  <input className="input-field" placeholder="Units" type="number" min="0" value={r.unitCount} onChange={(e) => setRow(i, 'unitCount', e.target.value)} />
                  <button type="button" className="h-10 flex items-center justify-center text-[#98A2B3] hover:text-[#D92D20] disabled:opacity-30" disabled={newRows.length === 1}
                    onClick={() => setNewRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={15} /></button>
                </div>
              ))}
              <button type="button" className="btn-ghost" onClick={() => setNewRows((rs) => [...rs, blank()])}><Plus size={14} /> Add another estate</button>
            </div>
            {validNew.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#F2F4F7] grid gap-4 md:grid-cols-3">
                <Field label="Plan">
                  <select className="input-field" value={billing.planId} onChange={(e) => setBilling((b) => ({ ...b, planId: e.target.value }))}>
                    <option value="">Starter (default)</option>
                    {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Cycle"><Segmented value={billing.cycle} onChange={(v) => setBilling((b) => ({ ...b, cycle: v }))} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'annual', label: 'Annual' }]} /></Field>
                <Field label="Free trial"><Segmented value={billing.trialDays} onChange={(v) => setBilling((b) => ({ ...b, trialDays: v }))} options={TRIAL_OPTIONS} /></Field>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Existing estates" description="Move estates already on the platform into this portfolio (e.g. unassigned estates or a handover).">
            <div className="flex items-center gap-2 px-3 h-9 rounded-lg border border-[#D0D5DD] bg-white mb-3">
              <Search size={14} className="text-[#98A2B3]" />
              <input value={moveQ} onChange={(e) => setMoveQ(e.target.value)} placeholder="Search estates by name or code" className="flex-1 bg-transparent outline-none text-[13px]" />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-[#E4E7EC] divide-y divide-[#F2F4F7]">
              {movable.slice(0, 60).map((e) => {
                const on = moveIds.includes(e._id);
                return (
                  <button key={e._id} type="button" onClick={() => setMoveIds((ids) => (on ? ids.filter((x) => x !== e._id) : [...ids, e._id]))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>{on && <Check size={11} className="text-white" />}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-[#101828] truncate">{e.name} <span className="font-mono text-[11px] text-[#98A2B3]">{e.estateCode}</span></span>
                      <span className="block text-[11.5px] text-[#667085] truncate">{e.managerId ? `Managed by ${e.managerId.name}` : 'Unassigned'}</span>
                    </span>
                    {!e.managerId && <span className="badge-yellow">Unassigned</span>}
                  </button>
                );
              })}
              {!movable.length && <p className="p-4 text-[12.5px] text-[#98A2B3]">No estates match.</p>}
            </div>
            {moveIds.some((id) => estates.find((e) => e._id === id)?.managerId) && (
              <p className="mt-2 text-[12px] text-[#B54708]">Some selected estates already have a manager — {mgr.name} becomes their primary manager.</p>
            )}
          </SectionCard>

          <div className="card px-5 py-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-[13px] text-[#344054]">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="accent-[#059669]" />
              Email {mgr.name.split(' ')[0]} about the new estates
            </label>
            <button className="btn-primary" disabled={busy || (!validNew.length && !moveIds.length)} onClick={submit}>
              {busy ? 'Saving…' : `Add ${validNew.length + moveIds.length || ''} estate${validNew.length + moveIds.length === 1 ? '' : 's'} to portfolio`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
