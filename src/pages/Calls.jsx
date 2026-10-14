import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import { callAPI } from '../api';
import { useCall } from '../context/CallContext';

// AreaConnect admin calling: reach any estate manager or guard on the
// platform (free). Directory comes from /calls/admin/directory.

const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, MMM d'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const ROLE_LABEL = { security: 'Security', estate_manager: 'Estate Manager', super_admin: 'Estate Manager', resident: 'Resident' };

function Avatar({ person, size = 44 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {person.profilePhoto ? (
        <img src={person.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center font-bold text-violet-700 bg-violet-50" style={{ fontSize: size * 0.36 }}>
          {(person.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
      )}
      {person.online && <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" title="Online now" />}
    </div>
  );
}

export default function Calls() {
  const { call, startCall } = useCall() || {};
  const [dir, setDir] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('managers');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const [d, h] = await Promise.all([callAPI.directory(), callAPI.history()]);
      setDir(d.data.data || []);
      setHistory(h.data.data);
    } catch {
      toast.error('Could not load contacts');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!call) load(); }, [call]); // refresh history after a call

  const people = dir.filter((p) => (tab === 'guards' ? p.role === 'security' : p.role !== 'security'));
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = term ? people.filter((p) => `${p.name} ${p.estate || ''} ${ROLE_LABEL[p.role] || ''}`.toLowerCase().includes(term)) : people;
    return [...list].sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
  }, [people, q]);

  const findPerson = (id) => dir.find((x) => String(x._id) === String(id));
  const missedIn = history.filter((c) => c.direction === 'incoming' && ['missed', 'declined'].includes(c.status) && Date.now() - new Date(c.createdAt) < 86400000).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-3xl p-5 sm:p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2E1065 0%, #6D28D9 55%, #8B5CF6 100%)' }}>
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-violet-100/90 text-sm"><Phone size={15} /> Calls</div>
            <p className="text-lg font-bold mt-1">Call any estate manager or guard on AreaConnect</p>
            <p className="text-xs text-violet-50/80 mt-1 flex items-center gap-1.5"><ShieldCheck size={12} /> Admin calls are always free</p>
          </div>
          <button onClick={load} aria-label="Refresh" className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 shrink-0">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex p-1 rounded-2xl bg-slate-100">
        {[['managers', 'Estate managers'], ['guards', 'Guards'], ['recent', 'Recent']].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setQ(''); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {label}
            {id === 'recent' && missedIn > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full align-middle">{missedIn}</span>
            )}
          </button>
        ))}
      </div>

      {tab !== 'recent' ? (
        <>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or estate"
              className="input-field pl-10 py-3" />
          </div>
          {loading ? (
            <div className="py-16 flex justify-center"><RefreshCw size={22} className="animate-spin text-violet-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="glass-card py-12 text-center text-sm text-slate-400">
              {q ? `No match for “${q}”` : tab === 'guards' ? 'No guards yet' : 'No estate managers yet'}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 2xl:grid-cols-3 gap-3">
              {filtered.map((p) => (
                <div key={p._id} className="glass-card p-4 flex items-center gap-3">
                  <Avatar person={p} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{p.name}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {p.estate || ROLE_LABEL[p.role]}{p.online ? ' · online' : ''}
                    </div>
                  </div>
                  <button onClick={() => startCall(p)} disabled={!!call} aria-label={`Call ${p.name}`}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40">
                    <Phone size={17} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : history.length === 0 ? (
        <div className="glass-card py-12 text-center text-sm text-slate-400">No calls yet</div>
      ) : (
        <div className="glass-card divide-y divide-slate-100 overflow-hidden">
          {history.map((c) => {
            const out = c.direction === 'outgoing';
            const other = (out ? c.calleeId : c.callerId) || {};
            const missed = ['missed', 'declined', 'cancelled', 'failed'].includes(c.status);
            const Icon = missed && !out ? PhoneMissed : out ? PhoneOutgoing : PhoneIncoming;
            const person = findPerson(other._id);
            return (
              <div key={c._id} className="flex items-center gap-3 p-4">
                <Icon size={17} className={missed ? 'text-red-500' : 'text-slate-400'} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-semibold truncate ${missed && !out ? 'text-red-600' : 'text-slate-900'}`}>
                    {other.name || 'Unknown'}
                    {c.kind === 'emergency' && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 align-middle">EMERGENCY</span>}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {dayLabel(new Date(c.createdAt))} {format(new Date(c.createdAt), 'h:mm a')}
                    {c.durationSec ? ` · ${mmss(c.durationSec)}` : ` · ${c.status}`}
                  </div>
                </div>
                {person && (
                  <button onClick={() => startCall(person)} disabled={!!call} aria-label={`Call ${person.name} back`}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-40">
                    <Phone size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
