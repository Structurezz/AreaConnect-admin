import { useEffect, useState } from 'react';
import { withdrawalAPI } from '../api';
import toast from 'react-hot-toast';
import {
  Wallet, RefreshCw, Check, X, Zap, Copy, Clock, Building2,
  CheckCircle2, XCircle, Search,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS = {
  pending: { label: 'Pending',  bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', icon: Clock },
  success: { label: 'Paid',     bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', icon: CheckCircle2 },
  failed:  { label: 'Rejected', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XCircle },
};

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const mask = (acct) => acct ? acct.slice(0, -4).replace(/\d/g, '•') + acct.slice(-4) : '••••';

function Pill({ status }) {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <Icon size={10} /> {s.label}
    </span>
  );
}

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [totals, setTotals] = useState({ pending: {}, success: {}, failed: {} });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [paidNoteFor, setPaidNoteFor] = useState(null);
  const [paidNote, setPaidNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await withdrawalAPI.list({ status: tab === 'all' ? undefined : tab });
      setWithdrawals(data.data.withdrawals);
      setTotals(data.data.totals);
    } catch {
      toast.error('Failed to load withdrawals');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const confirmMarkPaid = async () => {
    const id = paidNoteFor;
    setActingId(id);
    try {
      await withdrawalAPI.markPaid(id, { note: paidNote });
      toast.success('Marked as paid — receipt emailed to manager');
      setPaidNoteFor(null);
      setPaidNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setActingId(null); }
  };

  const processViaPaystack = async (id) => {
    if (!window.confirm('Fire Paystack /transfer now? The money leaves your Paystack balance immediately.')) return;
    setActingId(id);
    try {
      await withdrawalAPI.processPaystack(id);
      toast.success('Paystack transfer initiated');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setActingId(null); }
  };

  const confirmReject = async () => {
    const id = rejectFor;
    setActingId(id);
    try {
      await withdrawalAPI.reject(id, { reason: rejectReason || 'Rejected by admin' });
      toast.success('Rejected — manager notified');
      setRejectFor(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setActingId(null); }
  };

  const copyBank = (w) => {
    const text = `${w.accountName}\n${w.accountNumber}\n${w.bankName}\n${fmt(w.amount)} — Ref ${w.reference}`;
    navigator.clipboard.writeText(text);
    toast.success('Bank details copied');
  };

  const filtered = withdrawals.filter(w => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      w.userId?.name?.toLowerCase().includes(q) ||
      w.estateId?.name?.toLowerCase().includes(q) ||
      w.estateId?.estateCode?.toLowerCase().includes(q) ||
      w.reference?.toLowerCase().includes(q) ||
      w.accountNumber?.includes(q)
    );
  });

  const TABS = [
    { v: 'pending', label: 'Pending',  totals: totals.pending },
    { v: 'success', label: 'Paid',     totals: totals.success },
    { v: 'failed',  label: 'Rejected', totals: totals.failed  },
    { v: 'all',     label: 'All',      totals: null },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Manager Withdrawals</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Estate managers request payouts here. Pay them manually from your Paystack dashboard and mark paid — or fire the transfer with one click.
          </p>
        </div>
        <button onClick={load} className="btn-outline gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending',  count: totals.pending?.count || 0, amount: totals.pending?.total || 0, color: '#D97706' },
          { label: 'Paid',     count: totals.success?.count || 0, amount: totals.success?.total || 0, color: '#059669' },
          { label: 'Rejected', count: totals.failed?.count  || 0, amount: totals.failed?.total  || 0, color: '#DC2626' },
          {
            label: 'Owing managers',
            count: totals.pending?.count || 0,
            amount: totals.pending?.total || 0,
            color: '#0F172A',
            emphasis: true,
          },
        ].map(({ label, count, amount, color, emphasis }) => (
          <div key={label} className="glass-card p-4"
               style={emphasis ? { background: 'linear-gradient(135deg,#FEF3C7,#FDE68A)', border: 'none' } : {}}>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>{label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color }}>{fmt(amount)}</div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{count} request{count === 1 ? '' : 's'}</div>
          </div>
        ))}
      </div>

      {/* Tabs + search */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(t => (
            <button key={t.v} onClick={() => setTab(t.v)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={tab === t.v
                ? { background: '#0F172A', color: '#FFF', border: '1px solid #0F172A' }
                : { background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
              {t.label}
              {t.totals && (
                <span className="ml-1" style={{ color: tab === t.v ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>
                  {t.totals.count || 0}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-52">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search manager, estate, reference, account…"
            className="input-field pl-9" />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={20} className="animate-spin" style={{ color: '#10B981' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card py-16 text-center">
          <Wallet size={36} className="mx-auto mb-3" style={{ color: '#CBD5E1' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            {search ? 'No matching withdrawals' : tab === 'pending' ? 'No pending requests — all caught up.' : `No ${tab} withdrawals yet`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(w => {
            const user = w.userId || {};
            const estate = w.estateId || {};
            const isActing = actingId === w._id;
            const isPending = w.status === 'pending';
            return (
              <div key={w._id} className="glass-card p-4 lg:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2 size={14} style={{ color: '#64748B' }} />
                      <span className="font-semibold" style={{ color: '#0F172A' }}>{estate.name || '—'}</span>
                      {estate.estateCode && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                              style={{ background: '#F1F5F9', color: '#64748B' }}>{estate.estateCode}</span>
                      )}
                      <Pill status={w.status} />
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#64748B' }}>
                      {user.name || 'Manager'} · {user.email || '—'}
                      {user.phone && <> · {user.phone}</>}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                      Requested {formatDistanceToNow(new Date(w.createdAt))} ago · {format(new Date(w.createdAt), 'MMM d, yyyy HH:mm')}
                      {' '}· Ref <code style={{ background: '#F1F5F9', padding: '1px 4px', borderRadius: 3 }}>{w.reference}</code>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: '#0F172A' }}>{fmt(w.amount)}</div>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-lg flex flex-wrap items-center justify-between gap-3"
                     style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Pay to</div>
                    <div className="font-mono text-sm" style={{ color: '#0F172A' }}>
                      {w.accountNumber} <span style={{ color: '#64748B' }}>· {w.bankName}</span>
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#475569' }}>
                      {w.accountName || '—'}
                    </div>
                  </div>
                  <button onClick={() => copyBank(w)}
                    className="btn-outline gap-1 text-xs">
                    <Copy size={12} /> Copy
                  </button>
                </div>

                {!isPending && w.failureReason && (
                  <div className="mt-2 text-xs" style={{ color: '#94A3B8' }}>
                    {w.status === 'failed' ? 'Reason: ' : 'Note: '}{w.failureReason}
                  </div>
                )}

                {isPending && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => { setPaidNoteFor(w._id); setPaidNote(''); }}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                      style={{ background: '#059669' }}>
                      <Check size={13} /> Mark as paid
                    </button>
                    <button onClick={() => processViaPaystack(w._id)}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}>
                      {isActing ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                      Process via Paystack
                    </button>
                    <button onClick={() => { setRejectFor(w._id); setRejectReason(''); }}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                      <X size={13} /> Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mark-as-paid modal */}
      {paidNoteFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setPaidNoteFor(null)} />
          <div className="relative glass-card w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>Mark as paid</h3>
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                Confirm you've transferred the funds from your Paystack dashboard. The manager will receive a receipt email.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Note (optional)</label>
              <input className="input-field" placeholder="e.g. Transfer ID from Paystack dashboard"
                value={paidNote} onChange={e => setPaidNote(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setPaidNoteFor(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={confirmMarkPaid} disabled={actingId === paidNoteFor}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#059669' }}>
                {actingId === paidNoteFor ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                Confirm paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setRejectFor(null)} />
          <div className="relative glass-card w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>Reject withdrawal</h3>
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                The manager will be notified and the amount returns to their wallet balance.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>Reason *</label>
              <input className="input-field" placeholder="e.g. Mismatched account name, unverified estate"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)} required />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setRejectFor(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={confirmReject} disabled={!rejectReason.trim() || actingId === rejectFor}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: '#DC2626' }}>
                {actingId === rejectFor ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
