import { useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, AlertCircle, X,
  Building2, Clock, Wallet, TrendingUp, Hourglass, AlertTriangle, Link2, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { adminPaymentAPI, estateAPI } from '../api';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const fmtNGN = (n) => `₦${Number(n || 0).toLocaleString()}`;

const STATUS = {
  paid:    { label: 'Paid',    badge: 'green' },
  pending: { label: 'Pending', badge: 'yellow' },
  overdue: { label: 'Overdue', badge: 'red' },
  waived:  { label: 'Waived',  badge: 'gray' },
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

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Transactions"
        description="Cross-estate payments ledger and Paystack reconciliation."
        actions={
          <button onClick={() => tab === 'payments' ? loadPayments() : loadLedger()} className="btn-outline">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        }
      />

      {/* KPI strip */}
      {stats && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-5 mb-6">
          <StatCard label="Collected (all time)" value={fmtNGN(stats.collected)} icon={Wallet} color="green"
            hint={`${stats.collectedCount || 0} paid`} />
          <StatCard label="Collected 30d" value={fmtNGN(stats.collected30d)} icon={TrendingUp} color="blue"
            hint={`${stats.collected30dCount || 0} paid`} />
          <StatCard label="Pending" value={stats.pending || 0} icon={Hourglass} color="amber" hint="Not yet paid" />
          <StatCard label="Overdue" value={stats.overdue || 0} icon={AlertTriangle} color="red" hint="Past due" />
          <StatCard label="Paystack-initiated" value={stats.pendingWithPaystackRef || 0} icon={Link2} color="purple"
            hint="Reconcile candidates" />
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 max-w-full overflow-x-auto">
        <div className="tabs">
          {[
            { id: 'payments', label: 'All payments' },
            { id: 'ledger',   label: 'Paystack ledger' },
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setTab(id)} className={`tab ${tab === id ? 'active' : ''}`}>{label}</button>
          ))}
        </div>
      </div>

      {/* Payments tab */}
      {tab === 'payments' && (
        <div className="card overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center px-4 py-3 border-b border-[#E4E7EC]">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]"/>
              <input className="input-field pl-9"
                placeholder="Search resident, email, estate, or Paystack reference…"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') loadPayments(); }} />
            </div>
            <div className="flex gap-2">
              <select className="input-field sm:!w-[140px]"
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">Any status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="waived">Waived</option>
              </select>
              <select className="input-field sm:!w-[190px]"
                value={filters.estateId}
                onChange={e => setFilters(f => ({ ...f, estateId: e.target.value }))}>
                <option value="">All estates</option>
                {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <TableSkeleton cols={6} />
          ) : filteredPayments.length === 0 ? (
            <Empty icon={Receipt} title="No payments found" hint="Try a different status, estate or search term." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table min-w-[900px]">
                <thead>
                  <tr>
                    <th>Resident · Estate</th>
                    <th>Schedule</th>
                    <th className="!text-right">Amount</th>
                    <th>Status</th>
                    <th>Paystack ref</th>
                    <th>When</th>
                    <th className="!text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map(p => {
                    const s = STATUS[p.status] || STATUS.pending;
                    return (
                      <tr key={p._id}>
                        <td>
                          <div className="cell-strong">{p.residentId?.name || '—'}</div>
                          <div className="text-[12px] text-[#98A2B3] flex items-center gap-1 mt-0.5">
                            <Building2 size={11}/> {p.estateId?.name || '—'}
                          </div>
                        </td>
                        <td>{p.scheduleId?.title || '—'}</td>
                        <td className="text-right tabular-nums font-semibold text-[#101828] whitespace-nowrap">
                          {fmtNGN(p.amount)}
                        </td>
                        <td>
                          <div className="flex flex-col items-start gap-1">
                            <span className={`badge badge-${s.badge}`}>{s.label}</span>
                            {p.status === 'pending' && p.paystackReference && (
                              <span className="badge badge-yellow !text-[10px]">
                                <Clock size={10}/> Awaiting Paystack
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="font-mono text-[11.5px] text-[#475467]">
                          {p.paystackReference || '—'}
                        </td>
                        <td className="text-[12px] text-[#98A2B3] whitespace-nowrap">
                          {p.paidAt
                            ? formatDistanceToNow(new Date(p.paidAt), { addSuffix: true })
                            : (p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }) : '—')}
                        </td>
                        <td className="text-right">
                          {p.status !== 'paid' && p.paystackReference && (
                            <button onClick={() => handleReconcile(p)} disabled={reconciling === p._id}
                              className="btn-outline !px-2.5 !py-1 !text-[12px]">
                              <RefreshCw size={12} className={reconciling === p._id ? 'animate-spin' : ''}/> Reconcile
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Paystack ledger tab */}
      {tab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-[10px] border border-[#FEDF89] bg-[#FFFAEB] px-4 py-3">
            <AlertCircle size={16} className="text-[#B54708] flex-shrink-0 mt-0.5"/>
            <p className="text-[12.5px] leading-relaxed text-[#93370D]">
              <span className="font-semibold">Direct Paystack view, cross-estate.</span> Captures marked <span className="font-semibold">Not linked</span> aren't tied to any resident in the platform. Click <span className="font-semibold">Attach</span> to pick the right estate, resident and schedule and record the payment.
            </p>
          </div>
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <div className="card-title">Paystack captures</div>
                <div className="card-sub">Most recent 100 transactions</div>
              </div>
            </div>
            {loading ? (
              <TableSkeleton cols={6} />
            ) : ledger.length === 0 ? (
              <Empty icon={Receipt} title="No Paystack transactions" hint="Captures will appear here as they come in." />
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[900px]">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Customer</th>
                      <th>Reference</th>
                      <th className="!text-right">Amount</th>
                      <th>Status</th>
                      <th className="!text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(tx => (
                      <tr key={tx.reference}>
                        <td className="text-[12px] whitespace-nowrap tabular-nums">
                          {tx.paidAt ? format(new Date(tx.paidAt), 'MMM d, HH:mm')
                            : tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, HH:mm') : '—'}
                        </td>
                        <td>
                          <div className="cell-strong">{tx.customer?.name || '—'}</div>
                          <div className="text-[12px] text-[#98A2B3]">{tx.customer?.email || ''}</div>
                        </td>
                        <td className="font-mono text-[11.5px]">{tx.reference}</td>
                        <td className="text-right tabular-nums font-semibold text-[#101828] whitespace-nowrap">{fmtNGN(tx.amount)}</td>
                        <td>
                          {tx.matched ? (
                            tx.payment?.status === 'paid' ? (
                              <span className="badge badge-green">Linked · paid</span>
                            ) : (
                              <span className="badge badge-yellow">Linked · {tx.payment?.status}</span>
                            )
                          ) : (
                            <span className="badge badge-red">Not linked</span>
                          )}
                          {tx.payment?.estateId?.name && (
                            <div className="text-[11px] mt-1 flex items-center gap-1 text-[#98A2B3]">
                              <Building2 size={10}/> {tx.payment.estateId.name}
                            </div>
                          )}
                        </td>
                        <td className="text-right">
                          {tx.matched ? (
                            tx.payment?.status === 'paid' ? (
                              <span className="text-[12px] text-[#98A2B3]">Done</span>
                            ) : (
                              <button onClick={() => handleReconcile(tx.payment)}
                                className="btn-outline !px-2.5 !py-1 !text-[12px]">
                                <RefreshCw size={12}/> Reconcile
                              </button>
                            )
                          ) : (
                            <button onClick={() => openAttachModal(tx)}
                              className="btn-primary !px-2.5 !py-1 !text-[12px]">
                              Attach
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attach modal */}
      {attachFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-md overflow-hidden shadow-xl">
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
