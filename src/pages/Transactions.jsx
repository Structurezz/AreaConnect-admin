import { useEffect, useMemo, useState } from 'react';
import {
  Search, RefreshCw, AlertCircle, X,
  Building2, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { adminPaymentAPI, estateAPI } from '../api';

const fmtNGN = (n) => `₦${Number(n || 0).toLocaleString()}`;

const STATUS = {
  paid:    { label: 'Paid',    bg: '#ECFDF5', color: '#047857', border: '#A7F3D0' },
  pending: { label: 'Pending', bg: '#FEF3C7', color: '#92400E', border: '#FDE68A' },
  overdue: { label: 'Overdue', bg: '#FEE2E2', color: '#B91C1C', border: '#FECACA' },
  waived:  { label: 'Waived',  bg: '#F1F5F9', color: '#475569', border: '#E2E8F0' },
};

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
    <div className="space-y-5 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Transactions</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>
            Cross-estate payments ledger and Paystack reconciliation
          </p>
        </div>
        <button onClick={() => tab === 'payments' ? loadPayments() : loadLedger()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#F1F5F9', color: '#0F172A' }}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {/* KPI strip */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Collected (all time)', value: fmtNGN(stats.collected),   sub: `${stats.collectedCount || 0} paid`, color: '#059669' },
            { label: 'Collected 30d',        value: fmtNGN(stats.collected30d),sub: `${stats.collected30dCount || 0} paid`, color: '#047857' },
            { label: 'Pending',              value: stats.pending || 0,         sub: 'Not yet paid', color: '#D97706' },
            { label: 'Overdue',              value: stats.overdue || 0,         sub: 'Past due', color: '#DC2626' },
            { label: 'Paystack-initiated',   value: stats.pendingWithPaystackRef || 0, sub: 'Reconcile candidates', color: '#4F46E5' },
          ].map(x => (
            <div key={x.label} className="glass-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>{x.label}</div>
              <div className="text-2xl font-black mt-1" style={{ color: '#0F172A' }}>{x.value}</div>
              <div className="text-[11px] mt-0.5" style={{ color: x.color }}>{x.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'payments', label: 'All payments' },
          { id: 'ledger',   label: 'Paystack ledger' },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
              tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-700'
            }`}>{label}</button>
        ))}
      </div>

      {/* Payments tab */}
      {tab === 'payments' && (
        <>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }}/>
              <input className="input-field pl-9"
                placeholder="Search resident, email, estate, or Paystack reference…"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') loadPayments(); }} />
            </div>
            <select className="input-field" style={{ width: 140 }}
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">Any status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="waived">Waived</option>
            </select>
            <select className="input-field" style={{ width: 180 }}
              value={filters.estateId}
              onChange={e => setFilters(f => ({ ...f, estateId: e.target.value }))}>
              <option value="">All estates</option>
              {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          </div>

          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin" style={{ color: '#4F46E5' }}/></div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>No payments match these filters</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Resident · Estate</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Schedule</th>
                      <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Status</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Paystack ref</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>When</th>
                      <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map(p => {
                      const s = STATUS[p.status] || STATUS.pending;
                      return (
                        <tr key={p._id} style={{ borderTop: '1px solid #F1F5F9' }}>
                          <td className="px-5 py-3">
                            <div className="font-medium" style={{ color: '#0F172A' }}>{p.residentId?.name || '—'}</div>
                            <div className="text-xs flex items-center gap-1" style={{ color: '#94A3B8' }}>
                              <Building2 size={10}/> {p.estateId?.name || '—'}
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: '#64748B' }}>{p.scheduleId?.title || '—'}</td>
                          <td className="px-5 py-3 text-right font-bold" style={{ color: p.status === 'paid' ? '#059669' : '#0F172A' }}>
                            {fmtNGN(p.amount)}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                              {s.label}
                            </span>
                            {p.status === 'pending' && p.paystackReference && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                   style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                                <Clock size={9}/> Awaiting Paystack
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 font-mono text-[11px]" style={{ color: '#64748B' }}>
                            {p.paystackReference || '—'}
                          </td>
                          <td className="px-5 py-3 text-xs" style={{ color: '#94A3B8' }}>
                            {p.paidAt
                              ? formatDistanceToNow(new Date(p.paidAt), { addSuffix: true })
                              : (p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }) : '—')}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {p.status !== 'paid' && p.paystackReference && (
                              <button onClick={() => handleReconcile(p)} disabled={reconciling === p._id}
                                className="text-xs font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
                                style={{ background: '#FEF3C7', color: '#B45309' }}>
                                <RefreshCw size={11} className={reconciling === p._id ? 'animate-spin' : ''}/> Reconcile
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
        </>
      )}

      {/* Paystack ledger tab */}
      {tab === 'ledger' && (
        <>
          <div className="glass-card p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg,#FEF3C7,#FFFBEB)', border: '1px solid #FDE68A' }}>
            <AlertCircle size={18} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }}/>
            <div className="text-xs" style={{ color: '#78350F', lineHeight: 1.55 }}>
              <strong>Direct Paystack view, cross-estate.</strong> Captures with <strong>Not linked</strong> aren't tied to any resident in the platform. Click <strong>Attach</strong> to pick the right estate + resident + schedule and record the payment.
            </div>
          </div>
          <div className="glass-card overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16"><RefreshCw size={20} className="animate-spin" style={{ color: '#4F46E5' }}/></div>
            ) : ledger.length === 0 ? (
              <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>No Paystack transactions</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>When</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Customer</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Reference</th>
                      <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Amount</th>
                      <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Status</th>
                      <th className="text-right px-5 py-3 text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map(tx => (
                      <tr key={tx.reference} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td className="px-5 py-3 text-xs" style={{ color: '#64748B' }}>
                          {tx.paidAt ? format(new Date(tx.paidAt), 'MMM d, HH:mm')
                            : tx.createdAt ? format(new Date(tx.createdAt), 'MMM d, HH:mm') : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{tx.customer?.name || '—'}</div>
                          <div className="text-xs" style={{ color: '#94A3B8' }}>{tx.customer?.email || ''}</div>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs" style={{ color: '#64748B' }}>{tx.reference}</td>
                        <td className="px-5 py-3 text-right font-bold" style={{ color: '#059669' }}>{fmtNGN(tx.amount)}</td>
                        <td className="px-5 py-3">
                          {tx.matched ? (
                            tx.payment?.status === 'paid' ? (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}>
                                ✓ Linked · paid
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                                Linked · {tx.payment?.status}
                              </span>
                            )
                          ) : (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                              Not linked
                            </span>
                          )}
                          {tx.payment?.estateId?.name && (
                            <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: '#94A3B8' }}>
                              <Building2 size={9}/> {tx.payment.estateId.name}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {tx.matched ? (
                            tx.payment?.status === 'paid' ? (
                              <span className="text-xs" style={{ color: '#94A3B8' }}>Done</span>
                            ) : (
                              <button onClick={() => handleReconcile(tx.payment)}
                                className="text-xs font-bold px-3 py-1 rounded-lg inline-flex items-center gap-1"
                                style={{ background: '#FEF3C7', color: '#B45309' }}>
                                <RefreshCw size={11}/> Reconcile
                              </button>
                            )
                          ) : (
                            <button onClick={() => openAttachModal(tx)}
                              className="text-xs font-bold px-3 py-1 rounded-lg"
                              style={{ background: '#059669', color: '#fff' }}>
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
        </>
      )}

      {/* Attach modal */}
      {attachFor && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#0F172A' }}>Attach Paystack capture</h3>
                <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>Link {fmtNGN(attachFor.amount)} to an estate + resident</p>
              </div>
              <button onClick={() => setAttachFor(null)} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}><X size={18}/></button>
            </div>
            <div className="rounded-xl p-3 mb-4 text-xs space-y-0.5" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div><strong style={{ color: '#0F172A' }}>Reference</strong>: <span className="font-mono" style={{ color: '#64748B' }}>{attachFor.reference}</span></div>
              <div><strong style={{ color: '#0F172A' }}>Customer</strong>: {attachFor.customer?.email || '—'}</div>
              <div><strong style={{ color: '#0F172A' }}>Paid</strong>: {attachFor.paidAt ? format(new Date(attachFor.paidAt), 'MMM d, yyyy HH:mm') : '—'}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Estate</label>
                <select className="input-field w-full" value={attachForm.estateId}
                  onChange={e => setAttachForm(f => ({ ...f, estateId: e.target.value, residentId: '', scheduleId: '' }))}>
                  <option value="">Select estate…</option>
                  {estates.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Resident</label>
                <select className="input-field w-full" value={attachForm.residentId}
                  onChange={e => setAttachForm(f => ({ ...f, residentId: e.target.value }))}
                  disabled={!attachForm.estateId}>
                  <option value="">{attachForm.estateId ? 'Select resident…' : 'Pick an estate first'}</option>
                  {estateResidents.map(r => <option key={r._id} value={r._id}>{r.name} · {r.email}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: '#475569' }}>Payment schedule</label>
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
                    <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>
                      No schedules returned for this estate — paste the schedule id from the manager app.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setAttachFor(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: '#F1F5F9', color: '#475569' }}>Cancel</button>
              <button onClick={submitAttach} disabled={attaching}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#10B981,#059669)', color: '#fff' }}>
                {attaching ? 'Attaching…' : `Attach ${fmtNGN(attachFor.amount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
