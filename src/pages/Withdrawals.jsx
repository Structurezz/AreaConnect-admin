import { useEffect, useState } from 'react';
import { withdrawalAPI } from '../api';
import toast from 'react-hot-toast';
import {
  Wallet, RefreshCw, Check, X, Zap, Copy, Clock, Building2,
  CheckCircle2, XCircle, Search, Landmark, AlertTriangle, KeyRound,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const STATUS = {
  pending: { label: 'Pending',  bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', icon: Clock },
  success: { label: 'Paid',     bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', icon: CheckCircle2 },
  failed:  { label: 'Rejected', bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', icon: XCircle },
};

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
// A real Paystack transfer exists (not a manual payout or test mock) — so
// it's in flight and must not be paid again by hand.
const hasTransfer = (w) => w.paystackTransferCode
  && !w.paystackTransferCode.startsWith('MANUAL-') && w.paystackTransferCode !== 'TRF_test_mock';

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
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [actingId, setActingId] = useState(null);
  const [rejectFor, setRejectFor] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [paidNoteFor, setPaidNoteFor] = useState(null);
  const [paidNote, setPaidNote] = useState('');
  const [otpFor, setOtpFor] = useState(null);
  const [otp, setOtp] = useState('');

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

  const loadBalance = async () => {
    setBalanceLoading(true);
    try {
      const { data } = await withdrawalAPI.balance();
      setBalance(data.data);
    } catch {
      setBalance(null);
    } finally { setBalanceLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);
  useEffect(() => { loadBalance(); }, []);

  const refresh = () => { load(); loadBalance(); };

  const confirmMarkPaid = async () => {
    const id = paidNoteFor;
    setActingId(id);
    try {
      await withdrawalAPI.markPaid(id, { note: paidNote });
      toast.success('Marked as paid — receipt emailed to manager');
      setPaidNoteFor(null);
      setPaidNote('');
      refresh();
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
      refresh();
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
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setActingId(null); }
  };

  const confirmOtp = async () => {
    const id = otpFor;
    setActingId(id);
    try {
      const { data } = await withdrawalAPI.finalizeOtp(id, otp);
      toast.success(data.data?.status === 'success'
        ? 'Transfer sent — receipt emailed to manager'
        : 'OTP accepted — Paystack is processing the transfer');
      setOtpFor(null);
      setOtp('');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setActingId(null); }
  };

  const resendOtp = async (id) => {
    setActingId(id);
    try {
      await withdrawalAPI.resendOtp(id);
      toast.success('OTP re-sent to the Paystack business phone');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setActingId(null); }
  };

  const syncWithPaystack = async (id) => {
    setActingId(id);
    try {
      const { data } = await withdrawalAPI.sync(id);
      const st = data.data?.status;
      if (st === 'success') toast.success('Paystack confirms it was paid — marked as paid');
      else if (st === 'failed') toast.error('Paystack reports the transfer failed — funds returned to wallet');
      else toast(`Still ${data.data?.paystackStatus || 'pending'} on Paystack`);
      refresh();
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
            Managers withdraw straight to their bank via Paystack. Pending items are transfers still in flight or requests that need your attention.
          </p>
        </div>
        <button onClick={refresh} className="btn-outline gap-2">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Paystack balance vs manager liabilities */}
      <div className="glass-card p-4 lg:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Landmark size={16} style={{ color: '#0F172A' }} />
          <h2 className="font-semibold text-sm" style={{ color: '#0F172A' }}>Paystack balance</h2>
          {balance?.testMode && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                  style={{ background: '#FEF3C7', color: '#92400E' }}>TEST MODE</span>
          )}
          {balanceLoading && <RefreshCw size={12} className="animate-spin" style={{ color: '#94A3B8' }} />}
        </div>
        {!balanceLoading && !balance ? (
          <p className="text-sm" style={{ color: '#DC2626' }}>Couldn't load balance.</p>
        ) : balance && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Available on Paystack</div>
                <div className="text-2xl font-bold mt-1" style={{ color: '#0F172A' }}>
                  {balance.paystack ? fmt(balance.paystack.balance) : '—'}
                </div>
                {balance.paystackError && (
                  <div className="text-xs mt-0.5" style={{ color: '#DC2626' }}>{balance.paystackError}</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Owed to managers</div>
                <div className="text-2xl font-bold mt-1" style={{ color: '#D97706' }}>{fmt(balance.owed)}</div>
                <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                  {fmt(balance.walletBalances)} in wallets
                  {balance.queued.count > 0 && <> · {fmt(balance.queued.total)} queued ({balance.queued.count})</>}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Safe to move to bank</div>
                <div className="text-2xl font-bold mt-1"
                     style={{ color: balance.surplus == null ? '#94A3B8' : balance.surplus >= 0 ? '#059669' : '#DC2626' }}>
                  {balance.surplus == null ? '—' : fmt(Math.max(0, balance.surplus))}
                </div>
              </div>
            </div>
            {balance.surplus != null && balance.surplus < 0 && (
              <div className="mt-3 p-3 rounded-lg flex items-start gap-2 text-xs"
                   style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C' }}>
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                Paystack balance is {fmt(-balance.surplus)} short of what managers can withdraw. Top up the balance or some withdrawals will fail.
              </div>
            )}
          </>
        )}
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
                      {isPending && w.paystackStatus === 'otp' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: '#EDE9FE', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                          <KeyRound size={10} /> Awaiting OTP
                        </span>
                      )}
                      {w.source === 'marketplace' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: '#EEF2FF', color: '#4338CA', border: '1px solid #C7D2FE' }}>
                          Marketplace seller
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#64748B' }}>
                      {user.name || (w.source === 'marketplace' ? 'Seller' : 'Manager')} · {user.email || '—'}
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

                {isPending && hasTransfer(w) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => { setOtpFor(w._id); setOtp(''); }}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                      style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}>
                      <KeyRound size={13} /> Enter OTP
                    </button>
                    <button onClick={() => resendOtp(w._id)}
                      disabled={isActing}
                      className="btn-outline gap-1 text-xs">
                      {isActing ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Resend OTP
                    </button>
                    <button onClick={() => syncWithPaystack(w._id)}
                      disabled={isActing}
                      className="btn-outline gap-1 text-xs">
                      <RefreshCw size={12} className={isActing ? 'animate-spin' : ''} /> Check Paystack
                    </button>
                    <button onClick={() => { setRejectFor(w._id); setRejectReason(''); }}
                      disabled={isActing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                      <X size={13} /> Reject
                    </button>
                  </div>
                )}

                {isPending && !hasTransfer(w) && (
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
                    <button onClick={() => syncWithPaystack(w._id)}
                      disabled={isActing}
                      className="btn-outline gap-1 text-xs">
                      <RefreshCw size={12} className={isActing ? 'animate-spin' : ''} /> Check Paystack
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

      {/* Transfer OTP modal */}
      {otpFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOtpFor(null)} />
          <div className="relative glass-card w-full max-w-md p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg" style={{ color: '#0F172A' }}>Authorise transfer</h3>
              <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
                Enter the OTP Paystack sent to the AreaConnect business phone/email for this transfer.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: '#475569' }}>OTP *</label>
              <input className="input-field font-mono tracking-widest" inputMode="numeric" autoFocus
                placeholder="e.g. 123456"
                value={otp} onChange={e => setOtp(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setOtpFor(null)} className="btn-outline flex-1">Cancel</button>
              <button onClick={confirmOtp} disabled={!otp.trim() || actingId === otpFor}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)' }}>
                {actingId === otpFor ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
                Send transfer
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
