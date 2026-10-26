import { useEffect, useState } from 'react';
import { withdrawalAPI } from '../api';
import toast from 'react-hot-toast';
import {
  Wallet, RefreshCw, Check, X, Zap, Copy, Clock, Building2,
  CheckCircle2, XCircle, Search, Landmark, AlertTriangle, KeyRound, ArrowUpRight,
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

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
      <div className="overlay-backdrop" aria-hidden="true" onClick={onClose} />
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

  const short = balance?.surplus != null && balance.surplus < 0;
  const groups = filtered.reduce((m, w) => {
    const k = format(new Date(w.createdAt), 'yyyy-MM-dd'); (m[k] ||= []).push(w); return m;
  }, {});
  const dayTitle = (k) => { const d = new Date(`${k}T00:00:00`); return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMM yyyy'); };
  const ROW_TONE = { pending: 'bg-[#FFFAEB] text-[#B54708]', success: 'bg-[#F2F4F7] text-[#344054]', failed: 'bg-[#FEF3F2] text-[#D92D20]' };

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12 space-y-4">
      {/* Payout account summary */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'radial-gradient(120% 160% at 100% 0%, #065F46 0%, #0B1220 55%)' }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] text-white/60 flex items-center gap-1.5">
              <Landmark size={13} /> Manager payouts · Paystack transfers
              {balance?.testMode && <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-200 text-[10.5px] font-semibold">TEST MODE</span>}
            </p>
            <p className="mt-4 text-[12.5px] text-white/70">Owed to managers</p>
            <p className="mt-1 text-[38px] leading-none font-semibold tracking-tight tabular-nums">{balance ? fmt(balance.owed) : balanceLoading ? '…' : '—'}</p>
            <p className="mt-2 text-[12px] text-white/55">
              {balance ? <>{fmt(balance.walletBalances)} in estate wallets{balance.queued?.count > 0 && <> · {fmt(balance.queued.total)} queued ({balance.queued.count})</>}</> : 'Couldn’t load balance'}
            </p>
          </div>
          <button onClick={refresh} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10" title="Refresh">
            <RefreshCw size={16} className={loading || balanceLoading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Paystack balance', balance?.paystack ? fmt(balance.paystack.balance) : '—', balance?.paystackError || 'available now'],
            ['Safe to move to bank', balance?.surplus == null ? '—' : fmt(Math.max(0, balance.surplus)), 'after manager wallets', short ? 'text-red-300' : 'text-emerald-300'],
            ['Pending requests', fmt(totals.pending?.total || 0), `${totals.pending?.count || 0} awaiting action`, totals.pending?.count ? 'text-amber-200' : ''],
            ['Paid out', fmt(totals.success?.total || 0), `${totals.success?.count || 0} transfers · ${totals.failed?.count || 0} rejected`],
          ].map(([l, v, h, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5">
              <p className="text-[11px] text-white/55">{l}</p>
              <p className={`mt-0.5 text-[17px] font-semibold tabular-nums ${c || 'text-white'}`}>{v}</p>
              <p className="text-[10.5px] text-white/40 truncate">{h}</p>
            </div>
          ))}
        </div>
        {short && (
          <div className="relative mt-4 px-3 py-2.5 rounded-lg flex items-start gap-2 text-[12.5px] bg-red-500/15 border border-red-400/30 text-red-100">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Paystack is <b className="tabular-nums">{fmt(-balance.surplus)}</b> short of what managers can withdraw. Top up or some payouts will fail.</span>
          </div>
        )}
      </div>

      {/* Payout statement */}
      <div className="card overflow-hidden">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between px-5 py-3 border-b border-[#F2F4F7]">
          <div className="tabs overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.v} onClick={() => setTab(t.v)} className={`tab ${tab === t.v ? 'active' : ''}`}>
                {t.label}{t.totals && <span className="ml-1.5 text-[11px] tabular-nums text-[#98A2B3]">{t.totals.count || 0}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#D0D5DD] w-full md:w-80">
            <Search size={14} className="text-[#98A2B3]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Manager, estate, reference, account" className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" />
          </div>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <span className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3"><Wallet size={18} className="text-[#98A2B3]" /></span>
            <p className="text-[13.5px] font-semibold text-[#101828]">{search ? 'No matching payouts' : tab === 'pending' ? 'No pending requests' : `No ${tab === 'success' ? 'paid' : tab === 'failed' ? 'rejected' : ''} payouts yet`}</p>
            <p className="mt-0.5 text-[12px] text-[#98A2B3]">{search ? 'Try a different search term.' : tab === 'pending' ? 'All caught up.' : 'They will show up here once processed.'}</p>
          </div>
        ) : (
          <div className="max-h-[75vh] overflow-y-auto">
            {Object.entries(groups).map(([day, rows]) => (
              <div key={day}>
                <div className="sticky top-0 z-[1] flex justify-between px-5 py-1.5 bg-[#F9FAFB] border-y border-[#F2F4F7] text-[11.5px]">
                  <span className="font-semibold text-[#475467]">{dayTitle(day)}</span>
                  <span className="text-[#98A2B3] tabular-nums">−{fmt(rows.filter((w) => w.status !== 'failed').reduce((t, w) => t + w.amount, 0))}</span>
                </div>
                {rows.map((w) => {
                  const user = w.userId || {};
                  const estate = w.estateId || {};
                  const st = STATUS[w.status] || STATUS.pending;
                  return (
                    <div key={w._id} className="px-5 py-3 border-b border-[#F9FAFB] last:border-0 hover:bg-[#FCFCFD]">
                      <div className="flex items-center gap-3">
                        <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${ROW_TONE[w.status] || ROW_TONE.pending}`}>
                          {w.status === 'pending' ? <Clock size={16} /> : w.status === 'failed' ? <XCircle size={16} /> : <ArrowUpRight size={16} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-[#101828] truncate">
                            {estate.name || (w.source === 'marketplace' ? 'Marketplace seller' : 'Estate')}
                            {estate.estateCode && <span className="font-mono text-[11px] text-[#98A2B3] ml-1.5">{estate.estateCode}</span>}
                            <span className="font-normal text-[#667085]"> · {user.name || 'Manager'}</span>
                          </p>
                          <p className="text-[11.5px] text-[#98A2B3] truncate">
                            {format(new Date(w.createdAt), 'HH:mm')} · {formatDistanceToNow(new Date(w.createdAt))} ago · <span className="font-mono">{w.reference}</span>
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 min-w-0 w-60 px-3 py-1.5 rounded-lg bg-[#F9FAFB] border border-[#F2F4F7]">
                          <Landmark size={13} className="text-[#98A2B3] flex-shrink-0" />
                          <div className="min-w-0 flex-1 leading-tight">
                            <p className="text-[12px] text-[#101828] truncate"><span className="font-mono">{w.accountNumber}</span> · {w.bankName}</p>
                            <p className="text-[11px] text-[#98A2B3] truncate">{w.accountName || '—'}</p>
                          </div>
                          <button onClick={() => copyBank(w)} title="Copy bank details" className="text-[#98A2B3] hover:text-[#101828]"><Copy size={12} /></button>
                        </div>
                        <div className="text-right flex-shrink-0 w-28">
                          <p className={`text-[13.5px] font-semibold tabular-nums text-[#101828] ${w.status === 'failed' ? 'line-through opacity-50' : ''}`}>−{fmt(w.amount)}</p>
                          <p className={`text-[11px] ${w.status === 'pending' ? 'text-[#B54708]' : w.status === 'failed' ? 'text-[#B42318]' : 'text-[#98A2B3]'}`}>
                            {w.status === 'pending' && w.paystackStatus === 'otp' ? 'Awaiting OTP' : w.status === 'success' ? 'Sent' : st.label}
                          </p>
                        </div>
                      </div>
                      {(w.status === 'pending' || w.failureReason || w.source === 'marketplace') && (
                        <div className="mt-2 pl-12 flex flex-wrap items-center gap-1.5">
                          {w.source === 'marketplace' && <span className="badge badge-gray">Marketplace seller</span>}
                          {w.status !== 'pending' && w.failureReason && <span className="text-[11.5px] text-[#667085]">{w.status === 'failed' ? 'Reason: ' : 'Note: '}{w.failureReason}</span>}
                          <span className="md:hidden"><button onClick={() => copyBank(w)} className={`btn-outline ${SM}`}><Copy size={12} /> {w.bankName} ••{(w.accountNumber || '').slice(-4)}</button></span>
                          {w.status === 'pending' && renderActions(w)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
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
