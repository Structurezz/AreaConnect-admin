import { useEffect, useState } from 'react';
import { withdrawalAPI } from '../api';
import toast from 'react-hot-toast';
import {
  Wallet, RefreshCw, Check, X, Zap, Copy, Clock, Building2,
  CheckCircle2, XCircle, Search, Landmark, AlertTriangle, KeyRound,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const STATUS = {
  pending: { label: 'Pending',  badge: 'yellow', icon: Clock },
  success: { label: 'Paid',     badge: 'green',  icon: CheckCircle2 },
  failed:  { label: 'Rejected', badge: 'red',    icon: XCircle },
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
    <span className={`badge badge-${s.badge}`}>
      <Icon size={11} /> {s.label}
    </span>
  );
}

const SM = '!px-2.5 !py-1 !text-[12px]';

function Modal({ onClose, title, sub, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md overflow-hidden shadow-xl">
        <div className="px-5 pt-5 pb-4">
          <h3 className="text-[15px] font-semibold text-[#101828]">{title}</h3>
          <p className="text-[13px] mt-1 text-[#475467]">{sub}</p>
        </div>
        <div className="px-5 pb-5">{children}</div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#E4E7EC] bg-[#F9FAFB]">{footer}</div>
      </div>
    </div>
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

  const renderActions = (w) => {
    const isActing = actingId === w._id;
    if (w.status !== 'pending') return null;
    if (hasTransfer(w)) {
      return (
        <>
          <button onClick={() => { setOtpFor(w._id); setOtp(''); }} disabled={isActing} className={`btn-primary ${SM}`}>
            <KeyRound size={13} /> Enter OTP
          </button>
          <button onClick={() => resendOtp(w._id)} disabled={isActing} className={`btn-outline ${SM}`}>
            <RefreshCw size={12} className={isActing ? 'animate-spin' : ''} /> Resend OTP
          </button>
          <button onClick={() => syncWithPaystack(w._id)} disabled={isActing} className={`btn-outline ${SM}`}>
            <RefreshCw size={12} className={isActing ? 'animate-spin' : ''} /> Check Paystack
          </button>
          <button onClick={() => { setRejectFor(w._id); setRejectReason(''); }} disabled={isActing}
            className={`btn-outline ${SM} !text-[#B42318] hover:!bg-[#FEF3F2]`}>
            <X size={13} /> Reject
          </button>
        </>
      );
    }
    return (
      <>
        <button onClick={() => { setPaidNoteFor(w._id); setPaidNote(''); }} disabled={isActing} className={`btn-primary ${SM}`}>
          <Check size={13} /> Mark as paid
        </button>
        <button onClick={() => processViaPaystack(w._id)} disabled={isActing} className={`btn-outline ${SM}`}>
          {isActing ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
          Process via Paystack
        </button>
        <button onClick={() => syncWithPaystack(w._id)} disabled={isActing} className={`btn-outline ${SM}`}>
          <RefreshCw size={12} className={isActing ? 'animate-spin' : ''} /> Check Paystack
        </button>
        <button onClick={() => { setRejectFor(w._id); setRejectReason(''); }} disabled={isActing}
          className={`btn-outline ${SM} !text-[#B42318] hover:!bg-[#FEF3F2]`}>
          <X size={13} /> Reject
        </button>
      </>
    );
  };

  const extraBadges = (w) => (
    <>
      {w.status === 'pending' && w.paystackStatus === 'otp' && (
        <span className="badge badge-blue"><KeyRound size={10} /> Awaiting OTP</span>
      )}
      {w.source === 'marketplace' && (
        <span className="badge badge-gray">Marketplace seller</span>
      )}
    </>
  );

  const surplusColor = balance?.surplus == null ? 'text-[#98A2B3]' : balance.surplus >= 0 ? 'text-[#067647]' : 'text-[#B42318]';

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Manager Withdrawals"
        description="Managers withdraw straight to their bank via Paystack. Pending items are transfers still in flight or requests that need your attention."
        actions={
          <button onClick={refresh} className="btn-outline">
            <RefreshCw size={14} className={loading || balanceLoading ? 'animate-spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Paystack balance vs manager liabilities */}
      <div className="card mb-4">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Landmark size={15} className="text-[#475467]" />
            <span className="card-title">Paystack balance</span>
            {balance?.testMode && <span className="badge badge-yellow">Test mode</span>}
            {balanceLoading && <RefreshCw size={12} className="animate-spin text-[#98A2B3]" />}
          </div>
        </div>
        {!balanceLoading && !balance ? (
          <p className="px-5 py-4 text-[13px] text-[#B42318]">Couldn't load balance.</p>
        ) : !balance ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-4">
            {[0, 1, 2].map(i => <div key={i} className="space-y-2"><div className="skeleton h-3 w-28" /><div className="skeleton h-6 w-36" /></div>)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#EAECF0]">
              <div className="px-5 py-4">
                <div className="text-[12px] font-medium text-[#475467]">Available on Paystack</div>
                <div className="text-[22px] font-semibold tracking-tight mt-1 text-[#101828] tabular-nums">
                  {balance.paystack ? fmt(balance.paystack.balance) : '—'}
                </div>
                {balance.paystackError && (
                  <div className="text-[11.5px] mt-0.5 text-[#B42318]">{balance.paystackError}</div>
                )}
              </div>
              <div className="px-5 py-4">
                <div className="text-[12px] font-medium text-[#475467]">Owed to managers</div>
                <div className="text-[22px] font-semibold tracking-tight mt-1 text-[#B54708] tabular-nums">{fmt(balance.owed)}</div>
                <div className="text-[11.5px] mt-0.5 text-[#98A2B3] tabular-nums">
                  {fmt(balance.walletBalances)} in wallets
                  {balance.queued.count > 0 && <> · {fmt(balance.queued.total)} queued ({balance.queued.count})</>}
                </div>
              </div>
              <div className="px-5 py-4">
                <div className="text-[12px] font-medium text-[#475467]">Safe to move to bank</div>
                <div className={`text-[22px] font-semibold tracking-tight mt-1 tabular-nums ${surplusColor}`}>
                  {balance.surplus == null ? '—' : fmt(Math.max(0, balance.surplus))}
                </div>
              </div>
            </div>
            {balance.surplus != null && balance.surplus < 0 && (
              <div className="mx-5 mb-4 px-3 py-2.5 rounded-lg flex items-start gap-2 text-[12.5px] bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318]">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Paystack balance is <span className="tabular-nums font-semibold">{fmt(-balance.surplus)}</span> short of what managers can withdraw. Top up the balance or some withdrawals will fail.</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Pending" value={fmt(totals.pending?.total || 0)} icon={Clock} color="amber"
          hint={`${totals.pending?.count || 0} request${(totals.pending?.count || 0) === 1 ? '' : 's'}`} />
        <StatCard label="Paid" value={fmt(totals.success?.total || 0)} icon={CheckCircle2} color="green"
          hint={`${totals.success?.count || 0} request${(totals.success?.count || 0) === 1 ? '' : 's'}`} />
        <StatCard label="Rejected" value={fmt(totals.failed?.total || 0)} icon={XCircle} color="red"
          hint={`${totals.failed?.count || 0} request${(totals.failed?.count || 0) === 1 ? '' : 's'}`} />
        <StatCard label="Owing managers" value={fmt(totals.pending?.total || 0)} icon={Wallet} color="blue"
          hint={`${totals.pending?.count || 0} request${(totals.pending?.count || 0) === 1 ? '' : 's'}`} />
      </div>

      {/* Ledger */}
      <div className="card overflow-hidden">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between px-4 py-3 border-b border-[#E4E7EC]">
          <div className="max-w-full overflow-x-auto">
            <div className="tabs">
              {TABS.map(t => (
                <button key={t.v} onClick={() => setTab(t.v)} className={`tab ${tab === t.v ? 'active' : ''}`}>
                  {t.label}
                  {t.totals && (
                    <span className="ml-1.5 text-[11px] tabular-nums text-[#98A2B3]">{t.totals.count || 0}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search manager, estate, reference, account…"
              className="input-field pl-9" />
          </div>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <span className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
              <Wallet size={18} className="text-[#98A2B3]" />
            </span>
            <p className="text-[13.5px] font-semibold text-[#101828]">
              {search ? 'No matching withdrawals' : tab === 'pending' ? 'No pending requests' : `No ${tab} withdrawals yet`}
            </p>
            <p className="mt-0.5 text-[12px] text-[#98A2B3]">
              {search ? 'Try a different search term.' : tab === 'pending' ? 'All caught up.' : 'They will show up here once processed.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="table min-w-[1000px]">
                <thead>
                  <tr>
                    <th>Estate · Requester</th>
                    <th>Pay to</th>
                    <th>Requested</th>
                    <th>Status</th>
                    <th className="!text-right">Amount</th>
                    <th className="!text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(w => {
                    const user = w.userId || {};
                    const estate = w.estateId || {};
                    return (
                      <tr key={w._id} className="align-top">
                        <td className="!align-top">
                          <div className="flex items-center gap-1.5">
                            <span className="cell-strong">{estate.name || '—'}</span>
                            {estate.estateCode && <span className="badge badge-gray !text-[10px]">{estate.estateCode}</span>}
                          </div>
                          <div className="text-[12px] text-[#475467] mt-0.5">
                            {user.name || (w.source === 'marketplace' ? 'Seller' : 'Manager')} · {user.email || '—'}
                            {user.phone && <> · {user.phone}</>}
                          </div>
                          <div className="text-[11px] text-[#98A2B3] mt-0.5">
                            Ref <span className="font-mono">{w.reference}</span>
                          </div>
                        </td>
                        <td className="!align-top">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0">
                              <div className="font-mono text-[12.5px] text-[#101828]">{w.accountNumber}</div>
                              <div className="text-[12px] text-[#475467]">{w.bankName}</div>
                              <div className="text-[11.5px] text-[#98A2B3]">{w.accountName || '—'}</div>
                            </div>
                            <button onClick={() => copyBank(w)} title="Copy bank details" className="btn-ghost !p-1.5">
                              <Copy size={13} />
                            </button>
                          </div>
                        </td>
                        <td className="!align-top whitespace-nowrap">
                          <div className="text-[12.5px] text-[#101828] tabular-nums">{format(new Date(w.createdAt), 'MMM d, yyyy HH:mm')}</div>
                          <div className="text-[11.5px] text-[#98A2B3]">{formatDistanceToNow(new Date(w.createdAt))} ago</div>
                        </td>
                        <td className="!align-top">
                          <div className="flex flex-col items-start gap-1">
                            <Pill status={w.status} />
                            {extraBadges(w)}
                          </div>
                          {w.status !== 'pending' && w.failureReason && (
                            <div className="mt-1 text-[11.5px] text-[#98A2B3] max-w-[200px]">
                              {w.status === 'failed' ? 'Reason: ' : 'Note: '}{w.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="!align-top text-right tabular-nums text-[14px] font-semibold text-[#101828] whitespace-nowrap">
                          {fmt(w.amount)}
                        </td>
                        <td className="!align-top">
                          <div className="flex flex-wrap justify-end gap-1.5 max-w-[300px] ml-auto">
                            {renderActions(w)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="lg:hidden divide-y divide-[#EAECF0]">
              {filtered.map(w => {
                const user = w.userId || {};
                const estate = w.estateId || {};
                return (
                  <div key={w._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Building2 size={13} className="text-[#98A2B3]" />
                          <span className="text-[13.5px] font-semibold text-[#101828]">{estate.name || '—'}</span>
                          {estate.estateCode && <span className="badge badge-gray !text-[10px]">{estate.estateCode}</span>}
                        </div>
                        <div className="text-[12px] text-[#475467] mt-0.5 break-words">
                          {user.name || (w.source === 'marketplace' ? 'Seller' : 'Manager')} · {user.email || '—'}
                          {user.phone && <> · {user.phone}</>}
                        </div>
                      </div>
                      <div className="text-[16px] font-semibold text-[#101828] tabular-nums whitespace-nowrap">{fmt(w.amount)}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Pill status={w.status} />
                      {extraBadges(w)}
                    </div>
                    <div className="text-[11px] mt-1.5 text-[#98A2B3] break-all">
                      {formatDistanceToNow(new Date(w.createdAt))} ago · {format(new Date(w.createdAt), 'MMM d, yyyy HH:mm')} · Ref <span className="font-mono">{w.reference}</span>
                    </div>
                    <div className="mt-3 px-3 py-2.5 rounded-lg flex items-center justify-between gap-3 bg-[#F9FAFB] border border-[#EAECF0]">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-[#98A2B3]">Pay to</div>
                        <div className="font-mono text-[12.5px] text-[#101828]">
                          {w.accountNumber} <span className="text-[#475467]">· {w.bankName}</span>
                        </div>
                        <div className="text-[12px] text-[#475467]">{w.accountName || '—'}</div>
                      </div>
                      <button onClick={() => copyBank(w)} className={`btn-outline ${SM}`}>
                        <Copy size={12} /> Copy
                      </button>
                    </div>
                    {w.status !== 'pending' && w.failureReason && (
                      <div className="mt-2 text-[12px] text-[#98A2B3]">
                        {w.status === 'failed' ? 'Reason: ' : 'Note: '}{w.failureReason}
                      </div>
                    )}
                    {w.status === 'pending' && (
                      <div className="mt-3 flex flex-wrap gap-1.5">{renderActions(w)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Mark-as-paid modal */}
      {paidNoteFor && (
        <Modal onClose={() => setPaidNoteFor(null)} title="Mark as paid"
          sub="Confirm you've transferred the funds from your Paystack dashboard. The manager will receive a receipt email."
          footer={<>
            <button type="button" onClick={() => setPaidNoteFor(null)} className="btn-outline">Cancel</button>
            <button onClick={confirmMarkPaid} disabled={actingId === paidNoteFor} className="btn-primary">
              {actingId === paidNoteFor ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
              Confirm paid
            </button>
          </>}>
          <label className="field-label">Note (optional)</label>
          <input className="input-field" placeholder="e.g. Transfer ID from Paystack dashboard"
            value={paidNote} onChange={e => setPaidNote(e.target.value)} />
        </Modal>
      )}

      {/* Transfer OTP modal */}
      {otpFor && (
        <Modal onClose={() => setOtpFor(null)} title="Authorise transfer"
          sub="Enter the OTP Paystack sent to the AreaConnect business phone/email for this transfer."
          footer={<>
            <button type="button" onClick={() => setOtpFor(null)} className="btn-outline">Cancel</button>
            <button onClick={confirmOtp} disabled={!otp.trim() || actingId === otpFor} className="btn-primary">
              {actingId === otpFor ? <RefreshCw size={14} className="animate-spin" /> : <KeyRound size={14} />}
              Send transfer
            </button>
          </>}>
          <label className="field-label">OTP *</label>
          <input className="input-field font-mono tracking-widest" inputMode="numeric" autoFocus
            placeholder="e.g. 123456"
            value={otp} onChange={e => setOtp(e.target.value)} />
        </Modal>
      )}

      {/* Reject modal */}
      {rejectFor && (
        <Modal onClose={() => setRejectFor(null)} title="Reject withdrawal"
          sub="The manager will be notified and the amount returns to their wallet balance."
          footer={<>
            <button type="button" onClick={() => setRejectFor(null)} className="btn-outline">Cancel</button>
            <button onClick={confirmReject} disabled={!rejectReason.trim() || actingId === rejectFor} className="btn-danger">
              {actingId === rejectFor ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />}
              Reject
            </button>
          </>}>
          <label className="field-label">Reason *</label>
          <input className="input-field" placeholder="e.g. Mismatched account name, unverified estate"
            value={rejectReason} onChange={e => setRejectReason(e.target.value)} required />
        </Modal>
      )}
    </div>
  );
}
