import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  Receipt, CreditCard, UserRound, Building2, FileText, History, Copy, RefreshCw, Link2, ArrowUpRight,
  Mail, Phone, Home, ShieldCheck, AlertTriangle, Clock, ArrowDownLeft, MinusCircle, Globe, Hash, Landmark,
} from 'lucide-react';
import { adminPaymentAPI } from '../../api';
import { Drawer, Section } from './BillingDrawers';
import Spinner from '../ui/Spinner';
import { SiteTypeBadge, siteTypeOf, termsFor } from '../estates/siteTypes';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const when  = (d) => (d && !Number.isNaN(new Date(d).getTime()) ? format(new Date(d), 'MMM d, yyyy · HH:mm') : null);
const ago   = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '');
const label = (s) => (s ? String(s).replace(/_/g, ' ') : '');

const STATUS = {
  paid:    { text: 'Paid',    cls: 'badge-green',  icon: ArrowDownLeft, tone: 'green' },
  pending: { text: 'Pending', cls: 'badge-yellow', icon: Clock,         tone: 'amber' },
  overdue: { text: 'Overdue', cls: 'badge-red',    icon: AlertTriangle, tone: 'amber' },
  waived:  { text: 'Waived',  cls: 'badge-gray',   icon: MinusCircle,   tone: 'gray' },
};
const BILL_TYPE = { security_dues: 'Security dues', maintenance: 'Maintenance', levy: 'Levy', contribution: 'Contribution', other: 'Other' };
const FREQ = { one_time: 'One-time', monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual' };

function copy(text) { navigator.clipboard?.writeText(text); toast.success('Copied'); }

function Rows({ rows }) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '' && v !== false);
  if (!shown.length) return <p className="text-[12.5px] text-[#98A2B3]">Nothing on record.</p>;
  return (
    <dl className="divide-y divide-[#F2F4F7] rounded-xl border border-[#EAECF0] overflow-hidden">
      {shown.map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 px-3.5 py-2.5 text-[12.5px]">
          <dt className="text-[#667085] flex-shrink-0">{k}</dt>
          <dd className="text-[#101828] text-right min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const Mono = ({ children, copyable }) => (
  <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
    <span className="break-all">{children}</span>
    {copyable && <button type="button" onClick={() => copy(String(children))} className="text-[#98A2B3] hover:text-[#059669]" title="Copy"><Copy size={12} /></button>}
  </span>
);

/**
 * Side panel for one transaction. Pass `paymentId` for a statement row, or
 * `capture` (a Paystack ledger row) for the gateway view — a linked capture
 * loads its payment in full.
 */
export default function TransactionDrawer({ paymentId, capture, onClose, onReconcile, onAttach, reconciling }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const id = paymentId || capture?.payment?._id || null;

  const load = async () => {
    setLoading(true);
    try {
      if (id) {
        const { data: r } = await adminPaymentAPI.get(id);
        setData(r.data);
      } else if (capture?.reference) {
        const { data: r } = await adminPaymentAPI.paystackGet(capture.reference);
        setData({ payment: r.data.payment, gateway: r.data.gateway, history: [] });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load the transaction');
      setData(null);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id, capture?.reference]); // eslint-disable-line react-hooks/exhaustive-deps

  const p  = data?.payment || null;
  const g  = data?.gateway && !data.gateway.error ? data.gateway : null;
  const st = p ? (STATUS[p.status] || STATUS.pending) : null;
  const amount = p?.amount ?? g?.amount ?? capture?.amount ?? 0;
  const ref = p?.paystackReference || capture?.reference || null;
  const estate = p?.estateId || null;
  const T = termsFor(estate);
  const member = p?.residentId || null;
  const unit = member?.unitId;
  const bill = p?.scheduleId || null;

  const title = p ? `${member?.name || T.member} · ${bill?.title || 'Payment'}` : (g?.customer?.name || g?.customer?.email || capture?.customer?.email || 'Paystack capture');
  const subtitle = ref ? `Ref ${ref}` : (p ? `Payment ${p._id}` : '');

  const canReconcile = p && p.status !== 'paid' && ref;
  const canAttach = !p && capture && onAttach;

  return (
    <Drawer title={title} subtitle={subtitle} icon={Receipt} tone={st?.tone || (p ? 'green' : 'amber')} onClose={onClose} width={600}
      footer={
        <>
          {estate?._id && <Link to={`/estates/${estate._id}`} className="btn-outline" style={{ textDecoration: 'none' }}><Building2 size={14} /> Open {T.site.toLowerCase()}</Link>}
          <span className="flex-1" />
          {canReconcile && (
            <button className="btn-outline" disabled={reconciling} onClick={async () => { await onReconcile?.(p); load(); }}>
              <RefreshCw size={14} className={reconciling ? 'animate-spin' : ''} /> Reconcile with Paystack
            </button>
          )}
          {canAttach && <button className="btn-primary" onClick={() => onAttach(capture)}><Link2 size={14} /> Attach to a {T.member.toLowerCase()}</button>}
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </>
      }>
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : (
        <>
          {/* Amount hero */}
          <div className="px-6 py-6 border-b border-[#F2F4F7] bg-[#FCFCFD]">
            <div className="flex items-center gap-2 flex-wrap">
              {st && <span className={`badge ${st.cls}`}>{st.text}</span>}
              {!p && <span className="badge badge-red">Not linked to a {T.member.toLowerCase()}</span>}
              {g?.status && <span className={`badge ${g.status === 'success' ? 'badge-green' : 'badge-yellow'}`}>Paystack · {label(g.status)}</span>}
              {p?.method && <span className="badge badge-gray capitalize">{label(p.method)}</span>}
            </div>
            <p className={`mt-3 text-[34px] leading-none font-semibold tracking-tight tabular-nums ${p?.status === 'waived' ? 'text-[#98A2B3] line-through' : 'text-[#101828]'}`}>{naira(amount)}</p>
            <p className="mt-2 text-[12.5px] text-[#667085]">
              {p?.status === 'paid' && p.paidAt ? <>Paid {when(p.paidAt)} · {ago(p.paidAt)}</>
                : g?.paidAt ? <>Captured {when(g.paidAt)} · {ago(g.paidAt)}</>
                : p ? <>Created {when(p.createdAt)}{bill?.dueDate && <> · due {format(new Date(bill.dueDate), 'MMM d, yyyy')}</>}</> : null}
            </p>
            {g?.fees != null && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[['Gross', naira(g.amount)], ['Paystack fees', naira(g.fees)], ['Net', naira(g.amount - g.fees)]].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-[#EAECF0] bg-white px-3 py-2">
                    <p className="text-[11px] text-[#98A2B3]">{k}</p>
                    <p className="text-[14px] font-semibold tabular-nums text-[#101828]">{v}</p>
                  </div>
                ))}
              </div>
            )}
            {p?.status !== 'paid' && ref && g?.status === 'success' && (
              <p className="mt-3 text-[12px] text-[#B54708] flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> Paystack shows this as paid but the bill isn’t marked paid — reconcile it.</p>
            )}
            {data?.gateway?.error && <p className="mt-3 text-[12px] text-[#B42318]">Paystack: {data.gateway.error}</p>}
          </div>

          {/* Member */}
          {p && (
            <Section icon={UserRound} title={T.member} hint="Who the bill belongs to">
              <Rows rows={[
                ['Name', member?.name || 'Deleted account'],
                ['Email', member?.email && <a href={`mailto:${member.email}`} className="hover:underline inline-flex items-center gap-1"><Mail size={11} />{member.email}</a>],
                ['Phone', member?.phone && <a href={`tel:${member.phone}`} className="hover:underline inline-flex items-center gap-1 tabular-nums"><Phone size={11} />{member.phone}</a>],
                [T.unit, unit && <span className="inline-flex items-center gap-1"><Home size={11} />{unit.block ? `${T.block} ${unit.block} · ` : ''}{T.unit} {unit.unitNumber}{unit.type ? <span className="text-[#98A2B3] capitalize"> · {unit.type}</span> : null}</span>],
                ['Account', member && <span className={`badge ${member.isActive === false ? 'badge-red' : 'badge-green'}`}>{member.isActive === false ? 'Suspended' : 'Active'}</span>],
                ['Member since', member?.createdAt && format(new Date(member.createdAt), 'MMM d, yyyy')],
              ]} />
            </Section>
          )}

          {/* Bill */}
          {p && (
            <Section icon={FileText} title="Bill" hint={T.dues}>
              <Rows rows={[
                ['Title', bill?.title],
                ['Type', bill?.type && BILL_TYPE[bill.type]],
                ['Frequency', bill?.frequency && FREQ[bill.frequency]],
                ['Bill amount', bill?.amount != null && naira(bill.amount)],
                ['Due date', bill?.dueDate && format(new Date(bill.dueDate), 'MMM d, yyyy')],
                ['Schedule', bill && <span className={`badge ${bill.isActive === false ? 'badge-gray' : 'badge-green'}`}>{bill.isActive === false ? 'Inactive' : 'Active'}</span>],
                ['Description', bill?.description],
              ]} />
            </Section>
          )}

          {/* Site */}
          {estate && (
            <Section icon={Building2} title={T.site} hint="Where the money is collected">
              <Rows rows={[
                ['Name', <Link to={`/estates/${estate._id}`} className="font-medium hover:underline inline-flex items-center gap-1">{estate.name}<ArrowUpRight size={12} /></Link>],
                ['Code', estate.estateCode && <Mono copyable>{estate.estateCode}</Mono>],
                ['Type', <SiteTypeBadge type={siteTypeOf(estate)} />],
                ['Location', [estate.city, estate.state].filter(Boolean).join(', ')],
                [T.manager, estate.managerId?.name && <span>{estate.managerId.name}{estate.managerId.email && <span className="block text-[11.5px] text-[#98A2B3]">{estate.managerId.email}</span>}</span>],
              ]} />
            </Section>
          )}

          {/* Paystack */}
          {(g || ref) && (
            <Section icon={CreditCard} title="Paystack" hint={g ? 'Live from the gateway' : 'No gateway record'}>
              <Rows rows={[
                ['Reference', ref && <Mono copyable>{ref}</Mono>],
                ['Status', g?.status && <span className="capitalize">{label(g.status)}</span>],
                ['Gateway response', g?.gatewayResponse],
                ['Channel', g?.channel && <span className="capitalize">{label(g.channel)}</span>],
                ['Card', g?.card && <span className="inline-flex items-center gap-1 capitalize"><CreditCard size={11} />{g.card.brand} •••• {g.card.last4}{g.card.expiry && <span className="text-[#98A2B3]"> · exp {g.card.expiry}</span>}</span>],
                ['Issuing bank', g?.card?.bank || g?.bank],
                ['Customer', g?.customer && <span>{g.customer.name || '—'}<span className="block text-[11.5px] text-[#98A2B3]">{g.customer.email}{g.customer.phone ? ` · ${g.customer.phone}` : ''}</span></span>],
                ['Initiated', when(g?.createdAt)],
                ['Paid at', when(g?.paidAt)],
                ['IP address', g?.ipAddress && <span className="inline-flex items-center gap-1 font-mono text-[12px]"><Globe size={11} />{g.ipAddress}</span>],
                ['Mode', g?.domain && <span className={`badge ${g.domain === 'live' ? 'badge-green' : 'badge-yellow'}`}>{g.domain}</span>],
              ]} />
              {g?.log?.length > 0 && (
                <ol className="mt-3 relative border-l border-[#EAECF0] ml-1.5 space-y-2.5">
                  {g.log.map((h, i) => (
                    <li key={i} className="pl-4 relative text-[12px]">
                      <span className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-[#D0D5DD]" />
                      <span className="text-[#344054]">{h.message}</span>
                      <span className="text-[#98A2B3]"> · {h.time}s</span>
                    </li>
                  ))}
                </ol>
              )}
              {g?.metadata && Object.keys(g.metadata).length > 0 && (
                <details className="mt-3">
                  <summary className="text-[12px] text-[#475467] cursor-pointer">Metadata</summary>
                  <pre className="mt-2 text-[11px] bg-[#F9FAFB] border border-[#EAECF0] rounded-lg p-3 overflow-x-auto">{JSON.stringify(g.metadata, null, 2)}</pre>
                </details>
              )}
            </Section>
          )}

          {/* Record */}
          {p && (
            <Section icon={Hash} title="Record" hint="How this payment was recorded">
              <Rows rows={[
                ['Method', p.method && <span className="capitalize inline-flex items-center gap-1">{p.method === 'bank_transfer' ? <Landmark size={11} /> : null}{label(p.method)}</span>],
                ['Recorded by', p.recordedBy && <span className="inline-flex items-center gap-1"><ShieldCheck size={11} />{p.recordedBy.name}<span className="text-[#98A2B3] capitalize"> · {label(p.recordedBy.role)}</span></span>],
                ['Notes', p.notes],
                ['Created', when(p.createdAt)],
                ['Last updated', when(p.updatedAt)],
                ['Payment ID', <Mono copyable>{p._id}</Mono>],
              ]} />
            </Section>
          )}

          {/* History */}
          {p && (
            <Section icon={History} title={`${T.member}’s other payments`} hint={data.history?.length ? `Latest ${data.history.length}` : undefined}>
              {!data.history?.length ? <p className="text-[12.5px] text-[#98A2B3]">No other payments.</p> : (
                <ul className="rounded-xl border border-[#EAECF0] divide-y divide-[#F2F4F7] overflow-hidden">
                  {data.history.map((h) => {
                    const s = STATUS[h.status] || STATUS.pending;
                    return (
                      <li key={h._id} className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[#101828] truncate">{h.scheduleId?.title || 'Payment'}</span>
                          <span className="block text-[11.5px] text-[#98A2B3]">{when(h.paidAt || h.createdAt)}</span>
                        </span>
                        <span className={`badge ${s.cls}`}>{s.text}</span>
                        <span className="tabular-nums font-medium text-[#101828] w-24 text-right">{naira(h.amount)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          )}
        </>
      )}
    </Drawer>
  );
}
