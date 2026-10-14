import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Gift, Search, Users, Building2, History, Check, Coins, X, RefreshCw } from 'lucide-react';
import { creditAdminAPI } from '../api';

// Give bonus call credits ("airtime") to anyone on the platform, or to every
// resident of one or more estates. Server: controllers/creditAdminController.

const QUICK = [10, 25, 50, 100];
const ROLE_LABEL = { resident: 'Resident', estate_manager: 'Estate Manager', security: 'Security' };
const newRequestId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

function Initials({ name, photo }) {
  return photo
    ? <img src={photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
    : <div className="w-9 h-9 rounded-full bg-violet-50 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
        {(name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
      </div>;
}

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
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2E1065 0%, #6D28D9 55%, #8B5CF6 100%)' }}>
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 text-violet-100/90 text-sm"><Gift size={15} /> Bonus call credits</div>
          <p className="text-lg font-bold mt-1">Give free airtime to anyone, or whole estates</p>
          <p className="text-xs text-violet-50/80 mt-1">1 credit = 1 minute of neighbour calls. Recipients get an in-app notification.</p>
        </div>
      </div>

      <div className="flex p-1 rounded-2xl bg-slate-100">
        {[['people', 'People', Users], ['estates', 'Estates', Building2], ['history', 'History', History]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); setConfirming(false); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all inline-flex items-center justify-center gap-1.5 ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'history' ? (
        grants.length === 0 ? (
          <div className="glass-card py-12 text-center text-sm text-slate-400">No grants yet</div>
        ) : (
          <div className="glass-card divide-y divide-slate-100 overflow-hidden">
            {grants.map((g) => (
              <div key={g._id} className="flex items-center gap-3 p-4">
                <span className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0"><Gift size={18} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {g.creditsEach} credits × {g.recipients} {g.scope === 'estates' ? `residents · ${g.estateIds.map((e) => e.name).join(', ')}` : g.recipients === 1 ? 'person' : 'people'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {format(new Date(g.createdAt), 'MMM d, yyyy · h:mm a')} · by {g.adminId?.name || 'admin'}{g.note ? ` · “${g.note}”` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-violet-700">{g.totalCredits.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400">credits</div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-5 xl:space-y-0 xl:grid xl:grid-cols-[1fr_380px] xl:gap-6 xl:items-start">
          {/* ── Who ── */}
          <section className="space-y-3 min-w-0">
            {tab === 'people' ? (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or estate"
                    className="input-field pl-10 py-3 w-full" />
                  {searching && <RefreshCw size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
                </div>
                {picked.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {[...picked.values()].map((u) => (
                      <button key={u._id} onClick={() => togglePerson(u)}
                        className="inline-flex items-center gap-1 text-xs font-semibold pl-2.5 pr-1.5 py-1 rounded-full bg-violet-100 text-violet-800">
                        {u.name} <X size={12} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="glass-card divide-y divide-slate-100 overflow-hidden">
                  {results.length === 0 && !searching && <div className="py-10 text-center text-sm text-slate-400">No users found</div>}
                  {results.map((u) => {
                    const on = picked.has(u._id);
                    return (
                      <button key={u._id} onClick={() => togglePerson(u)}
                        className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${on ? 'bg-violet-50/70' : 'hover:bg-slate-50'}`}>
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300'}`}>
                          {on && <Check size={13} />}
                        </span>
                        <Initials name={u.name} photo={u.profilePhoto} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-900 truncate">{u.name}</span>
                          <span className="block text-xs text-slate-400 truncate">{ROLE_LABEL[u.role] || u.role}{u.estate ? ` · ${u.estate}` : ''} · {u.email}</span>
                        </span>
                        <span className="text-xs text-slate-500 shrink-0 inline-flex items-center gap-1"><Coins size={12} /> {u.callCredits || 0}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{estates.length} estates</span>
                  <button onClick={() => setPickedEstates(allEstatesPicked ? new Set() : new Set(estates.map((e) => e._id)))}
                    className="text-xs font-semibold text-violet-700 hover:underline">
                    {allEstatesPicked ? 'Clear all' : 'Select all estates'}
                  </button>
                </div>
                <div className="glass-card divide-y divide-slate-100 overflow-hidden">
                  {estates.map((e) => {
                    const on = pickedEstates.has(e._id);
                    return (
                      <button key={e._id} onClick={() => toggleEstate(e._id)}
                        className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${on ? 'bg-violet-50/70' : 'hover:bg-slate-50'}`}>
                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-violet-600 border-violet-600 text-white' : 'border-slate-300'}`}>
                          {on && <Check size={13} />}
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><Building2 size={16} /></span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold text-slate-900 truncate">{e.name}</span>
                          <span className="block text-xs text-slate-400">{e.estateCode}{e.isActive === false ? ' · inactive' : ''}</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-500 shrink-0">{e.residents} resident{e.residents === 1 ? '' : 's'}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          {/* ── How much ── */}
          <aside className="glass-card p-5 space-y-4 xl:sticky xl:top-0">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Credits each</label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {QUICK.map((v) => (
                  <button key={v} onClick={() => { setCredits(v); setConfirming(false); }}
                    className={`py-2 rounded-xl text-sm font-bold border transition-colors ${amount === v ? 'bg-violet-50 border-violet-400 text-violet-700' : 'border-slate-200 text-slate-600'}`}>
                    {v}
                  </button>
                ))}
              </div>
              <input type="number" min={1} max={10000} value={credits} onChange={(e) => { setCredits(e.target.value); setConfirming(false); }}
                className="input-field w-full py-2.5" placeholder="Custom amount" />
              <p className="text-[11px] text-slate-400 mt-1">≈ {amount} minute{amount === 1 ? '' : 's'} of neighbour calls each</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Note to recipients (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder="e.g. Happy holidays from AreaConnect"
                className="input-field w-full py-2.5" />
            </div>

            {confirming ? (
              <div className="rounded-2xl bg-violet-50 border border-violet-200 p-4 space-y-3">
                <p className="text-sm text-violet-900">
                  Give <strong>{amount} credits</strong> each to <strong>{summary}</strong>
                  {recipientsCount > 1 && <> — <strong>{(amount * recipientsCount).toLocaleString()}</strong> credits in total</>}?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(false)} disabled={sending} className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600">Back</button>
                  <button onClick={send} disabled={sending} className="flex-[2] py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white inline-flex items-center justify-center gap-2">
                    {sending ? <><RefreshCw size={14} className="animate-spin" /> Giving…</> : <><Gift size={15} /> Confirm & give</>}
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} disabled={!canGrant}
                className="w-full py-3 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 inline-flex items-center justify-center gap-2">
                <Gift size={16} />
                {recipientsCount
                  ? `Give to ${recipientsCount} ${tab === 'estates' ? (recipientsCount === 1 ? 'resident' : 'residents') : (recipientsCount === 1 ? 'person' : 'people')}`
                  : tab === 'estates' ? 'Select estates' : 'Select people'}
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
