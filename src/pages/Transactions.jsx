import { useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, AlertCircle, X,
  Building2, Clock, AlertTriangle, Link2, Receipt, Landmark, ArrowDownLeft, CheckCircle2, MinusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { adminPaymentAPI, estateAPI } from '../api';

const fmtNGN = (n) => `₦${Number(n || 0).toLocaleString()}`;

const STATUS = {
  paid:    { label: 'Paid',    badge: 'green' },
  pending: { label: 'Pending', badge: 'yellow' },
  overdue: { label: 'Overdue', badge: 'red' },
  waived:  { label: 'Waived',  badge: 'gray' },
};

const ROW_ICON = { paid: ArrowDownLeft, pending: Clock, overdue: AlertTriangle, waived: MinusCircle };
const ROW_TONE = {
  paid: 'bg-[#ECFDF3] text-[#067647]', pending: 'bg-[#FFFAEB] text-[#B54708]',
  overdue: 'bg-[#FEF3F2] text-[#D92D20]', waived: 'bg-[#F2F4F7] text-[#667085]',
};

const TableSkeleton = ({ cols = 6 }) => (
  <div className="p-4 space-y-2.5">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((__, j) => <div key={j} className="skeleton h-4" />)}
      </div>
    ))}
  </div>
);

const Empty = ({ icon: Icon, title, hint }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center px-4">
    <span className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
      <Icon size={18} className="text-[#98A2B3]" />
    </span>
    <p className="text-[13.5px] font-semibold text-[#101828]">{title}</p>
    {hint && <p className="mt-0.5 text-[12px] text-[#98A2B3]">{hint}</p>}
  </div>
);

export default function Transactions() {
  const [tab, setTab]                     = useState('payments');
  const [payments, setPayments]           = useState([]);
  const [stats, setStats]                 = useState(null);
  const [ledger, setLedger]               = useState([]);
  const [estates, setEstates]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [reconciling, setReconciling]     = useState(null);
  const [attachFor, setAttachFor]         = useState(null);
  const [attachForm, setAttachForm]       = useState({ estateId: '', residentId: '', scheduleId: '' });
  const [attaching, setAttaching]         = useState(false);
  const [estateResidents, setEstateResidents] = useState([]);
  const [estateSchedules, setEstateSchedules] = useState([]);

  const [filters, setFilters] = useState({ status: '', estateId: '', search: '' });
  const [ledgerFilter, setLedgerFilter] = useState('all');

  const loadStats = async () => {
    try {
      const { data } = await adminPaymentAPI.stats();
      setStats(data.data);
    } catch { /* non-blocking */ }
  };

  const loadEstates = async () => {
    if (estates.length) return;
    try {
      const { data } = await estateAPI.getAll();
      setEstates(data.data || []);
    } catch { /* non-blocking */ }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filters.status)   params.status   = filters.status;
      if (filters.estateId) params.estateId = filters.estateId;
      if (filters.search)   params.search   = filters.search;
      const { data } = await adminPaymentAPI.list(params);
      setPayments(data.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load payments');
    } finally { setLoading(false); }
  };

  const loadLedger = async () => {
    setLoading(true);
    try {
      const { data } = await adminPaymentAPI.paystackLedger({ limit: 100 });
      setLedger(data.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load Paystack ledger');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); loadEstates(); }, []);
  useEffect(() => {
    if (tab === 'payments') loadPayments();
    if (tab === 'ledger')   loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filters.status, filters.estateId]);

  const handleReconcile = async (payment) => {
    if (!payment.paystackReference) {
      toast.error('No Paystack reference on this payment');
      return;
    }
    setReconciling(payment._id);
    try {
      const { data } = await adminPaymentAPI.reconcile(payment.paystackReference);
      if (data.alreadyPaid) toast.success('Already paid — refreshing');
      else toast.success(`Reconciled ${fmtNGN(payment.amount)}`);
      loadPayments();
      loadStats();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Reconcile failed';
      const gateway = err?.response?.data?.gateway;
      toast.error(gateway ? `${msg} · ${gateway}` : msg);
    } finally { setReconciling(null); }
  };

  const openAttachModal = async (tx) => {
    setAttachFor(tx);
    setAttachForm({ estateId: '', residentId: '', scheduleId: '' });
    setEstateResidents([]);
    setEstateSchedules([]);
  };

  // When admin picks an estate inside the attach modal, load its residents
  useEffect(() => {
    const estateId = attachForm.estateId;
    if (!estateId) { setEstateResidents([]); setEstateSchedules([]); return; }
    (async () => {
      try {
        const { data: det } = await estateAPI.getDetail(estateId);
        setEstateResidents(det.data?.residents || []);
        setEstateSchedules(det.data?.schedules || []);
      } catch { /* ignore */ }
    })();
  }, [attachForm.estateId]);

  const submitAttach = async () => {
    if (!attachForm.estateId || !attachForm.residentId || !attachForm.scheduleId) {
      toast.error('Estate, resident and schedule are required');
      return;
    }
    setAttaching(true);
    try {
      await adminPaymentAPI.attach({
        reference: attachFor.reference,
        estateId:  attachForm.estateId,
        residentId: attachForm.residentId,
        scheduleId: attachForm.scheduleId,
      });
      toast.success(`Attached ${fmtNGN(attachFor.amount)}`);
      setAttachFor(null);
      loadLedger();
      loadStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Attach failed');
    } finally { setAttaching(false); }
  };

  const filteredPayments = useMemo(() => {
    if (!filters.search) return payments;
    const q = filters.search.toLowerCase();
    return payments.filter(p =>
      p.paystackReference?.toLowerCase().includes(q) ||
      p.residentId?.name?.toLowerCase().includes(q) ||
      p.residentId?.email?.toLowerCase().includes(q) ||
      p.estateId?.name?.toLowerCase().includes(q),
    );
  }, [payments, filters.search]);

  const dateOf = (x) => new Date(x.paidAt || x.createdAt || 0);
  const groupByDay = (rows) => rows.reduce((m, r) => {
    const d = dateOf(r); const k = Number.isNaN(d.getTime()) ? 'unknown' : format(d, 'yyyy-MM-dd');
    (m[k] ||= []).push(r); return m;
  }, {});
  const dayTitle = (k) => {
    if (k === 'unknown') return 'Undated';
    const d = new Date(`${k}T00:00:00`);
    return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMM yyyy');
  };
  const sumPaid = (rows) => rows.reduce((t, r) => t + ((r.status === 'paid' || r.status === 'success') ? Number(r.amount || 0) : 0), 0);
  const ledgerShown = ledgerFilter === 'all' ? ledger : ledger.filter((tx) => (ledgerFilter === 'linked' ? tx.matched : !tx.matched));
  const unlinked = ledger.filter((tx) => !tx.matched).length;

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12 space-y-4">
      {/* Account summary */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'radial-gradient(120% 160% at 100% 0%, #065F46 0%, #0B1220 55%)' }}>
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full border border-white/10" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[12px] text-white/60 flex items-center gap-1.5"><Landmark size={13} /> Estate dues · all estates</p>
            <p className="mt-4 text-[12.5px] text-white/70">Collected all time</p>
            <p className="mt-1 text-[38px] leading-none font-semibold tracking-tight tabular-nums">{stats ? fmtNGN(stats.collected) : '—'}</p>
            <p className="mt-2 text-[12px] text-white/55">{stats?.collectedCount || 0} payments received</p>
          </div>
          <button onClick={() => { loadStats(); tab === 'payments' ? loadPayments() : loadLedger(); }} className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="relative mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Last 30 days', fmtNGN(stats?.collected30d), `${stats?.collected30dCount || 0} payments`, 'text-emerald-300'],
            ['Pending', stats?.pending ?? 0, 'not yet paid'],
            ['Overdue', stats?.overdue ?? 0, 'past due date', stats?.overdue ? 'text-red-300' : ''],
            ['To reconcile', stats?.pendingWithPaystackRef ?? 0, 'started on Paystack', stats?.pendingWithPaystackRef ? 'text-amber-200' : ''],
          ].map(([l, v, h, c]) => (
            <div key={l} className="rounded-xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5">
              <p className="text-[11px] text-white/55">{l}</p>
              <p className={`mt-0.5 text-[17px] font-semibold tabular-nums ${c || 'text-white'}`}>{v}</p>
              <p className="text-[10.5px] text-white/40">{h}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {/* Account switcher + filters */}
        <div className="px-5 pt-4 border-b border-[#F2F4F7]">
          <div className="flex gap-6">
            {[
              { id: 'payments', label: 'Statement', hint: 'Resident dues' },
              { id: 'ledger', label: 'Paystack inflow', hint: unlinked ? `${unlinked} unlinked` : 'Gateway captures' },
            ].map(({ id, label, hint }) => (
              <button key={id} onClick={() => setTab(id)} className={`pb-3 border-b-2 text-left -mb-px ${tab === id ? 'border-[#059669]' : 'border-transparent'}`}>
                <span className={`block text-[13.5px] ${tab === id ? 'font-semibold text-[#101828]' : 'font-medium text-[#667085]'}`}>{label}</span>
                <span className={`block text-[11px] ${id === 'ledger' && unlinked ? 'text-[#B42318]' : 'text-[#98A2B3]'}`}>{hint}</span>
              </button>
            ))}
          </div>
        </div>

        {tab === 'payments' && (
          <>
            <div className="px-5 py-3 border-b border-[#F2F4F7] flex flex-col lg:flex-row gap-2 lg:items-center">
              <div className="tabs overflow-x-auto">
                {[['', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['overdue', 'Overdue'], ['waived', 'Waived']].map(([v, l]) => (
                  <button key={l} className={`tab ${filters.status === v ? 'active' : ''}`} onClick={() => setFilters((f) => ({ ...f, status: v }))}>{l}</button>
                ))}
              </div>
              <div className="lg:ml-auto flex flex-col sm:flex-row gap-2">
                <select className="input-field sm:!w-[190px] !h-9 !py-0" value={filters.estateId} onChange={(e) => setFilters((f) => ({ ...f, estateId: e.target.value }))}>
                  <option value="">All estates</option>
                  {estates.map((e) => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
                <div className="flex items-center gap-2 h-9 px-3 rounded-lg border border-[#D0D5DD] sm:w-72">
                  <Search size={14} className="text-[#98A2B3]" />
                  <input className="flex-1 min-w-0 bg-transparent outline-none text-[13px]" placeholder="Resident, estate or reference"
                    value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') loadPayments(); }} />
                </div>
              </div>
            </div>

            {loading ? <TableSkeleton cols={4} /> : filteredPayments.length === 0 ? (
              <Empty icon={Receipt} title="No payments found" hint="Try a different status, estate or search term." />
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {Object.entries(groupByDay(filteredPayments)).map(([day, rows]) => (
                  <div key={day}>
                    <div className="sticky top-0 z-[1] flex justify-between px-5 py-1.5 bg-[#F9FAFB] border-y border-[#F2F4F7] text-[11.5px]">
                      <span className="font-semibold text-[#475467]">{dayTitle(day)}</span>
                      <span className="text-[#98A2B3] tabular-nums">{sumPaid(rows) ? `+${fmtNGN(sumPaid(rows))} received` : `${rows.length} item${rows.length === 1 ? '' : 's'}`}</span>
                    </div>
                    {rows.map((p) => {
                      const st = STATUS[p.status] || STATUS.pending;
                      const Icon = ROW_ICON[p.status] || Clock;
                      const d = dateOf(p);
                      return (
                        <div key={p._id} className="flex items-center gap-3 px-5 py-3 border-b border-[#F9FAFB] last:border-0 hover:bg-[#FCFCFD]">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${ROW_TONE[p.status] || ROW_TONE.pending}`}><Icon size={16} /></span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#101828] truncate">{p.residentId?.name || 'Resident'} <span className="font-normal text-[#667085]">· {p.scheduleId?.title || 'Dues'}</span></p>
                            <p className="text-[11.5px] text-[#98A2B3] truncate flex items-center gap-1">
                              <Building2 size={10} /> {p.estateId?.name || '—'}
                              {!Number.isNaN(d.getTime()) && <> · {format(d, 'HH:mm')}</>}
                              {p.paystackReference && <> · <span className="font-mono">{p.paystackReference}</span></>}
                              {p.method && <> · {p.method}</>}
                            </p>
                          </div>
                          {p.status !== 'paid' && p.paystackReference && (
                            <button onClick={() => handleReconcile(p)} disabled={reconciling === p._id} className="btn-outline !px-2.5 !py-1 !text-[12px] hidden sm:inline-flex">
                              <RefreshCw size={12} className={reconciling === p._id ? 'animate-spin' : ''} /> Reconcile
                            </button>
                          )}
                          <div className="text-right flex-shrink-0 w-28">
                            <p className={`text-[13.5px] font-semibold tabular-nums ${p.status === 'paid' ? 'text-[#067647]' : p.status === 'waived' ? 'text-[#98A2B3] line-through' : 'text-[#101828]'}`}>
                              {p.status === 'paid' ? '+' : ''}{fmtNGN(p.amount)}
                            </p>
                            <p className={`text-[11px] ${p.status === 'overdue' ? 'text-[#B42318]' : p.status === 'pending' ? 'text-[#B54708]' : 'text-[#98A2B3]'}`}>
                              {p.status === 'pending' && p.paystackReference ? 'Awaiting Paystack' : st.label}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'ledger' && (
          <>
            <div className="px-5 py-3 border-b border-[#F2F4F7] flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="tabs">
                {[['all', 'All'], ['linked', 'Linked'], ['unlinked', `Not linked${unlinked ? ` ${unlinked}` : ''}`]].map(([v, l]) => (
                  <button key={v} className={`tab ${ledgerFilter === v ? 'active' : ''}`} onClick={() => setLedgerFilter(v)}>{l}</button>
                ))}
              </div>
              <p className="lg:ml-auto text-[12px] text-[#667085] flex items-start gap-1.5 max-w-xl">
                <AlertCircle size={13} className="text-[#B54708] mt-0.5 flex-shrink-0" />
                Straight from Paystack. <b className="font-semibold text-[#344054]">Not linked</b> captures aren’t tied to a resident yet — use Attach to record them.
              </p>
            </div>
            {loading ? <TableSkeleton cols={4} /> : ledgerShown.length === 0 ? (
              <Empty icon={Receipt} title="No Paystack transactions" hint="Captures will appear here as they come in." />
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {Object.entries(groupByDay(ledgerShown)).map(([day, rows]) => (
                  <div key={day}>
                    <div className="sticky top-0 z-[1] flex justify-between px-5 py-1.5 bg-[#F9FAFB] border-y border-[#F2F4F7] text-[11.5px]">
                      <span className="font-semibold text-[#475467]">{dayTitle(day)}</span>
                      <span className="text-[#98A2B3] tabular-nums">+{fmtNGN(sumPaid(rows))}</span>
                    </div>
                    {rows.map((tx) => {
                      const d = dateOf(tx);
                      return (
                        <div key={tx.reference} className="flex items-center gap-3 px-5 py-3 border-b border-[#F9FAFB] last:border-0 hover:bg-[#FCFCFD]">
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${tx.matched ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#FEF3F2] text-[#D92D20]'}`}>
                            {tx.matched ? <ArrowDownLeft size={16} /> : <Link2 size={15} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#101828] truncate">
                              {tx.customer?.name || tx.customer?.email || 'Paystack customer'}
                              {tx.payment?.estateId?.name && <span className="font-normal text-[#667085]"> · {tx.payment.estateId.name}</span>}
                            </p>
                            <p className="text-[11.5px] text-[#98A2B3] truncate">
                              {!Number.isNaN(d.getTime()) && `${format(d, 'HH:mm')} · `}<span className="font-mono">{tx.reference}</span>{tx.channel && ` · ${tx.channel.replace('_', ' ')}`}
                            </p>
                          </div>
                          <div className="hidden sm:block">
                            {tx.matched
                              ? (tx.payment?.status === 'paid'
                                ? <span className="badge badge-green">Linked</span>
                                : <button onClick={() => handleReconcile(tx.payment)} className="btn-outline !px-2.5 !py-1 !text-[12px]"><RefreshCw size={12} /> Reconcile</button>)
                              : <button onClick={() => openAttachModal(tx)} className="btn-primary !px-2.5 !py-1 !text-[12px]">Attach</button>}
                          </div>
                          <div className="text-right flex-shrink-0 w-28">
                            <p className="text-[13.5px] font-semibold tabular-nums text-[#067647]">+{fmtNGN(tx.amount)}</p>
                            <p className={`text-[11px] ${tx.matched ? 'text-[#98A2B3]' : 'text-[#B42318]'}`}>{tx.matched ? (tx.payment?.status === 'paid' ? 'Recorded' : `Linked · ${tx.payment?.status}`) : 'Not linked'}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Attach modal */}
      {attachFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="overlay-backdrop" aria-hidden="true" onClick={() => setAttachFor(null)} />
          <div className="relative card w-full max-w-md overflow-hidden shadow-xl">
            <div className="card-header">
              <div>
                <h3 className="text-[15px] font-semibold text-[#101828]">Attach Paystack capture</h3>
                <p className="text-[12px] mt-0.5 text-[#98A2B3]">Link <span className="tabular-nums">{fmtNGN(attachFor.amount)}</span> to an estate and resident</p>
              </div>
              <button onClick={() => setAttachFor(null)} className="btn-ghost !p-1.5"><X size={16}/></button>
            </div>
            <div className="p-5">
              <dl className="rounded-lg border border-[#E4E7EC] bg-[#F9FAFB] divide-y divide-[#EAECF0] text-[12.5px] mb-4">
                <div className="flex justify-between gap-3 px-3 py-2">
                  <dt className="text-[#475467]">Reference</dt>
                  <dd className="font-mono text-[#101828] truncate">{attachFor.reference}</dd>
                </div>
                <div className="flex justify-between gap-3 px-3 py-2">
                  <dt className="text-[#475467]">Customer</dt>
                  <dd className="text-[#101828] truncate">{attachFor.customer?.email || '—'}</dd>
                </div>
                <div className="flex justify-between gap-3 px-3 py-2">
                  <dt className="text-[#475467]">Paid</dt>
                  <dd className="text-[#101828] tabular-nums">{attachFor.paidAt ? format(new Date(attachFor.paidAt), 'MMM d, yyyy HH:mm') : '—'}</dd>
                </div>
              </dl>
              <div className="space-y-3">
                <div>
                  <label className="field-label">Estate</label>
                  <select className="input-field w-full" value={attachForm.estateId}
                    onChange={e => setAttachForm(f => ({ ...f, estateId: e.target.value, residentId: '', scheduleId: '' }))}>
                    <option value="">Select estate…</option>
                    {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Resident</label>
                  <select className="input-field w-full" value={attachForm.residentId}
                    onChange={e => setAttachForm(f => ({ ...f, residentId: e.target.value }))}
                    disabled={!attachForm.estateId}>
                    <option value="">{attachForm.estateId ? 'Select resident…' : 'Pick an estate first'}</option>
                    {estateResidents.map(r => <option key={r._id} value={r._id}>{r.name} · {r.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Payment schedule</label>
                  {estateSchedules.length > 0 ? (
                    <select className="input-field w-full" value={attachForm.scheduleId}
                      onChange={e => setAttachForm(f => ({ ...f, scheduleId: e.target.value }))}
                      disabled={!attachForm.estateId}>
                      <option value="">Select schedule…</option>
                      {estateSchedules.map(s => (
                        <option key={s._id} value={s._id}>
                          {s.title} · {fmtNGN(s.amount)} · {s.frequency || 'one-off'}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input className="input-field w-full" placeholder="Paste the schedule _id"
                        value={attachForm.scheduleId}
                        onChange={e => setAttachForm(f => ({ ...f, scheduleId: e.target.value }))}
                        disabled={!attachForm.estateId}/>
                      <p className="field-hint">
                        No schedules returned for this estate — paste the schedule id from the manager app.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-[#E4E7EC] bg-[#F9FAFB]">
              <button onClick={() => setAttachFor(null)} className="btn-outline">Cancel</button>
              <button onClick={submitAttach} disabled={attaching} className="btn-primary">
                {attaching ? 'Attaching…' : `Attach ${fmtNGN(attachFor.amount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
