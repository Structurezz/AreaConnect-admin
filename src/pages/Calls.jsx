import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search, RefreshCw, ShieldCheck } from 'lucide-react';
import { callAPI } from '../api';
import { useCall } from '../context/CallContext';
import PageHeader from '../components/ui/PageHeader';

// AreaConnect admin calling: reach any estate manager or guard on the
// platform (free). Directory comes from /calls/admin/directory.

const dayLabel = (d) => (isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, MMM d'));
const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const ROLE_LABEL = { security: 'Security', estate_manager: 'Estate Manager', super_admin: 'Estate Manager', resident: 'Resident' };

function Avatar({ person, size = 32 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {person.profilePhoto ? (
        <img src={person.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center font-semibold text-[#344054] bg-[#F2F4F7]" style={{ fontSize: size * 0.36 }}>
          {(person.name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
        </div>
      )}
      {person.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#12B76A] ring-2 ring-white" title="Online now" />}
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

  const Empty = ({ icon: Icon, title, hint }) => (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
        <Icon size={18} className="text-[#98A2B3]" />
      </div>
      <p className="text-[14px] font-semibold text-[#101828]">{title}</p>
      {hint && <p className="text-[12.5px] text-[#98A2B3] mt-0.5">{hint}</p>}
    </div>
  );
  const callBtn = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
  const callBackBtn = 'inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[12.5px] font-semibold border border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Calls"
        description="Call any estate manager or guard on AreaConnect. Admin calls are always free."
        actions={(
          <button onClick={load} className="btn-outline gap-2" aria-label="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      >
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="tabs">
            {[['managers', 'Estate managers'], ['guards', 'Guards'], ['recent', 'Recent']].map(([id, label]) => (
              <button key={id} onClick={() => { setTab(id); setQ(''); }} className={`tab ${tab === id ? 'active' : ''}`}>
                {label}
                {id === 'recent' && missedIn > 0 && (
                  <span className="ml-1.5 text-[10.5px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA] px-1.5 rounded-full tabular-nums">{missedIn}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {tab !== 'recent' ? (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E4E7EC] flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 sm:max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or estate"
                className="input-field pl-9" />
            </div>
            <div className="sm:ml-auto flex items-center gap-1.5 text-[12px] text-[#98A2B3]">
              <ShieldCheck size={13} className="text-[#059669]" /> Free platform calling
            </div>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 !rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-40" />
                    <div className="skeleton h-2.5 w-28" />
                  </div>
                  <div className="skeleton h-8 w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty icon={Phone}
              title={q ? `No match for “${q}”` : tab === 'guards' ? 'No guards yet' : 'No estate managers yet'}
              hint={q ? 'Try a different name or estate.' : 'Contacts appear here once they join the platform.'} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="text-left">Name</th>
                      <th className="text-left">Estate</th>
                      <th className="text-left">Role</th>
                      <th className="text-left">Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar person={p} />
                            <span className="cell-strong truncate max-w-[240px]">{p.name}</span>
                          </div>
                        </td>
                        <td><span className="truncate inline-block max-w-[220px] align-middle">{p.estate || '—'}</span></td>
                        <td><span className={`badge ${p.role === 'security' ? 'badge-yellow' : 'badge-green'}`}>{ROLE_LABEL[p.role] || p.role}</span></td>
                        <td>
                          {p.online
                            ? <span className="badge badge-green"><span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]" />Online</span>
                            : <span className="badge badge-gray">Offline</span>}
                        </td>
                        <td className="text-right">
                          <button onClick={() => startCall(p)} disabled={!!call} aria-label={`Call ${p.name}`} className={callBtn}>
                            <Phone size={13} /> Call
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-[#F2F4F7]">
                {filtered.map((p) => (
                  <div key={p._id} className="px-4 py-3 flex items-center gap-3">
                    <Avatar person={p} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#101828] truncate">{p.name}</div>
                      <div className="text-[12px] text-[#98A2B3] truncate">
                        {p.estate || ROLE_LABEL[p.role]}{p.online ? ' · online' : ''}
                      </div>
                    </div>
                    <button onClick={() => startCall(p)} disabled={!!call} aria-label={`Call ${p.name}`}
                      className="w-9 h-9 rounded-full flex items-center justify-center bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-40">
                      <Phone size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 text-[12px] text-[#98A2B3] border-t border-[#E4E7EC] tabular-nums">
                {filtered.length} contact{filtered.length === 1 ? '' : 's'}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="card-header">
            <div>
              <h2 className="card-title">Call history</h2>
              <p className="card-sub">{missedIn > 0 ? `${missedIn} missed in the last 24 hours` : 'Your recent calls'}</p>
            </div>
          </div>
          {history.length === 0 ? (
            <Empty icon={PhoneIncoming} title="No calls yet" hint="Calls you make or receive will appear here." />
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {history.map((c) => {
                const out = c.direction === 'outgoing';
                const other = (out ? c.calleeId : c.callerId) || {};
                const missed = ['missed', 'declined', 'cancelled', 'failed'].includes(c.status);
                const Icon = missed && !out ? PhoneMissed : out ? PhoneOutgoing : PhoneIncoming;
                const person = findPerson(other._id);
                return (
                  <div key={c._id} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-[#F9FAFB] transition-colors">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${missed ? 'bg-[#FEF3F2] text-[#D92D20]' : 'bg-[#F2F4F7] text-[#475467]'}`}>
                      <Icon size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[13px] font-semibold truncate ${missed && !out ? 'text-[#B42318]' : 'text-[#101828]'}`}>
                          {other.name || 'Unknown'}
                        </span>
                        {c.kind === 'emergency' && <span className="badge badge-red">Emergency</span>}
                      </div>
                      <div className="text-[12px] text-[#98A2B3] truncate tabular-nums">
                        {out ? 'Outgoing' : 'Incoming'} · {dayLabel(new Date(c.createdAt))} {format(new Date(c.createdAt), 'h:mm a')}
                      </div>
                    </div>
                    <div className="hidden sm:block text-[12.5px] text-[#475467] tabular-nums w-24 text-right">
                      {c.durationSec ? mmss(c.durationSec) : <span className={`badge ${missed ? 'badge-red' : 'badge-gray'} capitalize`}>{c.status}</span>}
                    </div>
                    <span className="sm:hidden text-[12px] text-[#98A2B3] tabular-nums">{c.durationSec ? mmss(c.durationSec) : c.status}</span>
                    <div className="w-[88px] flex justify-end flex-shrink-0">
                      {person && (
                        <button onClick={() => startCall(person)} disabled={!!call} aria-label={`Call ${person.name} back`} className={callBackBtn}>
                          <Phone size={13} /> <span className="hidden sm:inline">Call back</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
