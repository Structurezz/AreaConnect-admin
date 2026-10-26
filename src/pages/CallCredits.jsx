import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Gift, Search, Users, Building2, History, Check, Coins, X, RefreshCw } from 'lucide-react';
import { creditAdminAPI } from '../api';
import PageHeader from '../components/ui/PageHeader';

// Give bonus call credits ("airtime") to anyone on the platform, or to every
// resident of one or more estates. Server: controllers/creditAdminController.

const QUICK = [10, 25, 50, 100];
const ROLE_LABEL = { resident: 'Resident', estate_manager: 'Estate Manager', security: 'Security' };
const newRequestId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

function Initials({ name, photo }) {
  return photo
    ? <img src={photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
    : <div className="w-9 h-9 rounded-full bg-[#ECFDF3] text-[#067647] text-[11px] font-semibold flex items-center justify-center shrink-0">
        {(name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>;
}

const Checkbox = ({ on }) => (
  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-[#059669] border-[#059669] text-white' : 'border-[#D0D5DD] bg-white'}`}>
    {on && <Check size={11} strokeWidth={3} />}
  </span>
);

const Empty = ({ icon: Icon, title, hint }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
    <span className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
      <Icon size={18} className="text-[#98A2B3]" />
    </span>
    <p className="text-[13.5px] font-semibold text-[#101828]">{title}</p>
    {hint && <p className="mt-0.5 text-[12px] text-[#98A2B3]">{hint}</p>}
  </div>
);

export default function CallCredits() {
  const [tab, setTab] = useState('people');
  // People
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(new Map()); // id → user
  // Estates
  const [estates, setEstates] = useState([]);
  const [pickedEstates, setPickedEstates] = useState(new Set());
  // Grant
  const [credits, setCredits] = useState(25);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [requestId, setRequestId] = useState(newRequestId);
  // History
  const [grants, setGrants] = useState([]);

  useEffect(() => {
    creditAdminAPI.estates().then(({ data }) => setEstates(data.data || [])).catch(() => {});
    creditAdminAPI.grants().then(({ data }) => setGrants(data.data || [])).catch(() => {});
  }, []);

  // Debounced platform-wide search
  useEffect(() => {
    if (tab !== 'people') return;
    const t = setTimeout(async () => {
      setSearching(true);
      try { const { data } = await creditAdminAPI.searchUsers(q); setResults(data.data || []); }
      catch { toast.error('Search failed'); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, tab]);

  const togglePerson = (u) => setPicked((m) => { const n = new Map(m); n.has(u._id) ? n.delete(u._id) : n.set(u._id, u); return n; });
  const toggleEstate = (id) => setPickedEstates((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allEstatesPicked = estates.length > 0 && estates.every((e) => pickedEstates.has(e._id));

  const recipientsCount = tab === 'estates'
    ? estates.filter((e) => pickedEstates.has(e._id)).reduce((s, e) => s + e.residents, 0)
    : picked.size;
  const amount = Math.floor(Number(credits) || 0);
  const canGrant = amount >= 1 && amount <= 10000 && recipientsCount > 0;

  const summary = useMemo(() => {
    if (tab === 'estates') {
      const names = estates.filter((e) => pickedEstates.has(e._id)).map((e) => e.name);
      return `${recipientsCount} resident${recipientsCount === 1 ? '' : 's'} in ${names.length === 1 ? names[0] : `${names.length} estates`}`;
    }
    const names = [...picked.values()].map((u) => u.name);
    return names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
  }, [tab, estates, pickedEstates, picked, recipientsCount]);

  const send = async () => {
    setSending(true);
    try {
      const payload = { credits: amount, note, requestId };
      if (tab === 'estates') payload.estateIds = [...pickedEstates];
      else payload.userIds = [...picked.keys()];
      const { data } = await creditAdminAPI.grant(payload);
      toast.success(data.message);
      // Fresh id for the next grant; reset the selection.
      setRequestId(newRequestId());
      setConfirming(false);
      setPicked(new Map());
      setPickedEstates(new Set());
      setNote('');
      creditAdminAPI.grants().then(({ data: g }) => setGrants(g.data || [])).catch(() => {});
      if (tab === 'people') creditAdminAPI.searchUsers(q).then(({ data: r }) => setResults(r.data || [])).catch(() => {});
    } catch (e) {
      // Same requestId is kept, so retrying can't pay anyone twice.
      toast.error(e.response?.data?.message || 'Grant failed — you can safely try again');
    } finally { setSending(false); }
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Call credits"
        description="Give bonus airtime to anyone, or to every resident of whole estates. 1 credit = 1 minute of neighbour calls; recipients get an in-app notification."
      >
        <div className="max-w-full overflow-x-auto">
          <div className="tabs">
            {[['people', 'People', Users], ['estates', 'Estates', Building2], ['history', 'History', History]].map(([id, label, Icon]) => (
              <button key={id} onClick={() => { setTab(id); setConfirming(false); }}
                className={`tab inline-flex items-center gap-1.5 ${tab === id ? 'active' : ''}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {tab === 'history' ? (
        <div className="card overflow-hidden">
          <div className="card-header">
            <div>
              <div className="card-title">Grant history</div>
              <div className="card-sub">Every bonus credit grant made from the admin console</div>
            </div>
          </div>
          {grants.length === 0 ? (
            <Empty icon={Gift} title="No grants yet" hint="Grants you make will be listed here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table min-w-[760px]">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Recipients</th>
                    <th>Granted by</th>
                    <th className="!text-right">Each</th>
                    <th className="!text-right">Total credits</th>
                  </tr>
                </thead>
                <tbody>
                  {grants.map((g) => (
                    <tr key={g._id}>
                      <td className="whitespace-nowrap tabular-nums text-[12.5px]">{format(new Date(g.createdAt), 'MMM d, yyyy · h:mm a')}</td>
                      <td>
                        <div className="cell-strong">
                          {g.recipients} {g.scope === 'estates' ? 'residents' : g.recipients === 1 ? 'person' : 'people'}
                          <span className={`badge ${g.scope === 'estates' ? 'badge-blue' : 'badge-gray'} ml-2 align-middle`}>{g.scope === 'estates' ? 'Estates' : 'People'}</span>
                        </div>
                        {(g.scope === 'estates' || g.note) && (
                          <div className="text-[12px] text-[#98A2B3] mt-0.5 max-w-[360px] truncate">
                            {g.scope === 'estates' ? g.estateIds.map((e) => e.name).join(', ') : ''}
                            {g.scope === 'estates' && g.note ? ' · ' : ''}
                            {g.note ? `“${g.note}”` : ''}
                          </div>
                        )}
                      </td>
                      <td>{g.adminId?.name || 'admin'}</td>
                      <td className="text-right tabular-nums">{g.creditsEach}</td>
                      <td className="text-right tabular-nums font-semibold text-[#101828]">{g.totalCredits.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 xl:space-y-0 xl:grid xl:grid-cols-[1fr_360px] xl:gap-5 xl:items-start">
          {/* ── Who ── */}
          <section className="card overflow-hidden min-w-0">
            {tab === 'people' ? (
              <>
                <div className="px-4 py-3 border-b border-[#E4E7EC] space-y-2.5">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or estate"
                      className="input-field pl-9 w-full" />
                    {searching && <RefreshCw size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#98A2B3]" />}
                  </div>
                  {picked.size > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {[...picked.values()].map((u) => (
                        <button key={u._id} onClick={() => togglePerson(u)} className="badge badge-green hover:!bg-[#D1FADF]">
                          {u.name} <X size={11} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-[#F2F4F7]">
                  {results.length === 0 && !searching && <Empty icon={Users} title="No users found" hint="Try a different name, email or phone." />}
                  {results.map((u) => {
                    const on = picked.has(u._id);
                    return (
                      <button key={u._id} onClick={() => togglePerson(u)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
                        <Checkbox on={on} />
                        <Initials name={u.name} photo={u.profilePhoto} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[#101828] truncate">{u.name}</span>
                          <span className="block text-[12px] text-[#98A2B3] truncate">{ROLE_LABEL[u.role] || u.role}{u.estate ? ` · ${u.estate}` : ''} · {u.email}</span>
                        </span>
                        <span className="text-[12px] text-[#475467] shrink-0 inline-flex items-center gap-1 tabular-nums"><Coins size={12} className="text-[#98A2B3]" /> {u.callCredits || 0}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="card-header">
                  <span className="card-title">{estates.length} estates</span>
                  <button onClick={() => setPickedEstates(allEstatesPicked ? new Set() : new Set(estates.map((e) => e._id)))}
                    className="text-[12.5px] font-semibold text-[#059669] hover:text-[#047857]">
                    {allEstatesPicked ? 'Clear all' : 'Select all estates'}
                  </button>
                </div>
                <div className="divide-y divide-[#F2F4F7]">
                  {estates.length === 0 && <Empty icon={Building2} title="No estates" hint="Estates on the platform will appear here." />}
                  {estates.map((e) => {
                    const on = pickedEstates.has(e._id);
                    return (
                      <button key={e._id} onClick={() => toggleEstate(e._id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
                        <Checkbox on={on} />
                        <span className="w-9 h-9 rounded-lg bg-[#F2F4F7] text-[#475467] flex items-center justify-center shrink-0"><Building2 size={16} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[13px] font-semibold text-[#101828] truncate">{e.name}</span>
                          <span className="block text-[12px] text-[#98A2B3]">{e.estateCode}{e.isActive === false ? ' · inactive' : ''}</span>
                        </span>
                        <span className="text-[12px] text-[#475467] shrink-0 tabular-nums">{e.residents} resident{e.residents === 1 ? '' : 's'}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── How much ── */}
          <aside className="card xl:sticky xl:top-0">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Gift size={15} className="text-[#475467]" />
                <span className="card-title">Grant credits</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="field-label">Credits each</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {QUICK.map((v) => (
                    <button key={v} onClick={() => { setCredits(v); setConfirming(false); }}
                      className={`py-1.5 rounded-lg text-[13px] font-semibold border tabular-nums transition-colors ${amount === v ? 'bg-[#ECFDF3] border-[#059669] text-[#067647]' : 'border-[#D0D5DD] text-[#344054] hover:bg-[#F9FAFB]'}`}>
                      {v}
                    </button>
                  ))}
                </div>
                <input type="number" min={1} max={10000} value={credits} onChange={(e) => { setCredits(e.target.value); setConfirming(false); }}
                  className="input-field w-full tabular-nums" placeholder="Custom amount" />
                <p className="field-hint">≈ {amount} minute{amount === 1 ? '' : 's'} of neighbour calls each</p>
              </div>
              <div>
                <label className="field-label">Note to recipients (optional)</label>
                <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="e.g. Happy holidays from AreaConnect"
                  className="input-field w-full" />
              </div>

              {confirming ? (
                <div className="rounded-lg bg-[#F9FAFB] border border-[#E4E7EC] p-3.5 space-y-3">
                  <p className="text-[13px] text-[#344054]">
                    Give <strong className="text-[#101828]">{amount} credits</strong> each to <strong className="text-[#101828]">{summary}</strong>
                    {recipientsCount > 1 && <> — <strong className="text-[#101828] tabular-nums">{(amount * recipientsCount).toLocaleString()}</strong> credits in total</>}?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirming(false)} disabled={sending} className="btn-outline flex-1">Back</button>
                    <button onClick={send} disabled={sending} className="btn-primary flex-[2]">
                      {sending ? <><RefreshCw size={14} className="animate-spin" /> Giving…</> : <><Gift size={14} /> Confirm & give</>}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirming(true)} disabled={!canGrant} className="btn-primary w-full">
                  <Gift size={14} />
                  {recipientsCount
                    ? `Give to ${recipientsCount} ${tab === 'estates' ? (recipientsCount === 1 ? 'resident' : 'residents') : (recipientsCount === 1 ? 'person' : 'people')}`
                    : tab === 'estates' ? 'Select estates' : 'Select people'}
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
