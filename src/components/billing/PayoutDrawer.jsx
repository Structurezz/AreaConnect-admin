import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Wallet, Zap, Copy, Clock, Building2, CheckCircle2, XCircle, Landmark, AlertTriangle, KeyRound, ArrowUpRight,
} from 'lucide-react';
import { Drawer, Section } from './BillingDrawers';
import { SiteTypeBadge, siteTypeOf, termsFor } from '../estates/siteTypes';

const STATUS = {
  pending: { label: 'Pending',  badge: 'yellow', icon: Clock },
  success: { label: 'Paid',     badge: 'green',  icon: CheckCircle2 },
  failed:  { label: 'Rejected', badge: 'red',    icon: XCircle },
};
const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const hasTransfer = (w) => w.paystackTransferCode
  && !w.paystackTransferCode.startsWith('MANUAL-') && w.paystackTransferCode !== 'TRF_test_mock';

function Pill({ status }) {
  const s = STATUS[status] || STATUS.pending;
  const Icon = s.icon;
  return <span className={`badge badge-${s.badge}`}><Icon size={11} /> {s.label}</span>;
}

const when = (d) => (d ? format(new Date(d), 'MMM d, yyyy · HH:mm') : null);
const copyText = (t) => { navigator.clipboard?.writeText(t); toast.success('Copied'); };

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

const CopyVal = ({ v }) => (
  <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
    <span className="break-all">{v}</span>
    <button type="button" onClick={() => copyText(String(v))} className="text-[#98A2B3] hover:text-[#059669]" title="Copy"><Copy size={12} /></button>
  </span>
);

// Side panel for one payout: amount, bank, who asked, the site, Paystack
// transfer state, history for that manager, and the same actions as the row.
export default function PayoutDrawer({ w, all = [], actions, onCopyBank, onClose }) {
  const user = w.userId || {};
  const estate = w.estateId || null;
  const T = termsFor(estate);
  const st = STATUS[w.status] || STATUS.pending;
  const others = all.filter((x) => x._id !== w._id && (x.userId?._id || x.userId) === (user._id || w.userId)).slice(0, 8);
  const manual = w.paystackTransferCode?.startsWith('MANUAL-');
  return (
    <Drawer title={`${fmt(w.amount)} payout`} subtitle={`Ref ${w.reference}`} icon={ArrowUpRight}
      tone={w.status === 'success' ? 'green' : w.status === 'failed' ? 'gray' : 'amber'} onClose={onClose} width={580}
      footer={<>
        {estate?._id && <Link to={`/estates/${estate._id}`} className="btn-outline" style={{ textDecoration: 'none' }}><Building2 size={14} /> Open {T.site.toLowerCase()}</Link>}
        <span className="flex-1" />
        {actions && <div className="flex flex-wrap gap-1.5 justify-end">{actions}</div>}
        <button className="btn-ghost" onClick={onClose}>Close</button>
      </>}>
      <div className="px-6 py-6 border-b border-[#F2F4F7] bg-[#FCFCFD]">
        <div className="flex items-center gap-2 flex-wrap">
          <Pill status={w.status} />
          {w.status === 'pending' && w.paystackStatus === 'otp' && <span className="badge badge-blue"><KeyRound size={10} /> Awaiting OTP</span>}
          <span className="badge badge-gray">{w.source === 'marketplace' ? 'Marketplace earnings' : `${T.site} wallet`}</span>
        </div>
        <p className={`mt-3 text-[34px] leading-none font-semibold tracking-tight tabular-nums text-[#101828] ${w.status === 'failed' ? 'line-through opacity-50' : ''}`}>−{fmt(w.amount)}</p>
        <p className="mt-2 text-[12.5px] text-[#667085]">Requested {when(w.createdAt)} · {formatDistanceToNow(new Date(w.createdAt))} ago</p>
        {w.failureReason && (
          <p className={`mt-3 text-[12px] flex items-start gap-1.5 ${w.status === 'failed' ? 'text-[#B42318]' : 'text-[#475467]'}`}>
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> {w.status === 'failed' ? 'Rejected: ' : 'Note: '}{w.failureReason}
          </p>
        )}
      </div>

      <Section icon={Landmark} title="Pay to" hint="Bank account on the request">
        <Rows rows={[
          ['Account name', w.accountName],
          ['Account number', w.accountNumber && <CopyVal v={w.accountNumber} />],
          ['Bank', w.bankName],
        ]} />
        <button onClick={() => (onCopyBank ? onCopyBank(w) : copyText(`${w.accountName}\n${w.accountNumber}\n${w.bankName}`))} className="btn-outline mt-3 !text-[12px]"><Copy size={12} /> Copy all bank details</button>
      </Section>

      <Section icon={Wallet} title={w.source === 'marketplace' ? 'Seller' : T.manager} hint="Who asked for the money">
        <Rows rows={[
          ['Name', user.name],
          ['Email', user.email && <a href={`mailto:${user.email}`} className="hover:underline">{user.email}</a>],
          ['Phone', user.phone && <a href={`tel:${user.phone}`} className="hover:underline tabular-nums">{user.phone}</a>],
        ]} />
      </Section>

      {estate && (
        <Section icon={Building2} title={T.site} hint="Wallet the payout comes from">
          <Rows rows={[
            ['Name', <Link to={`/estates/${estate._id}`} className="font-medium hover:underline inline-flex items-center gap-1">{estate.name}<ArrowUpRight size={12} /></Link>],
            ['Code', estate.estateCode && <CopyVal v={estate.estateCode} />],
            ['Type', <SiteTypeBadge type={siteTypeOf(estate)} />],
            ['Location', [estate.city, estate.state].filter(Boolean).join(', ')],
          ]} />
        </Section>
      )}

      <Section icon={Zap} title="Transfer" hint={manual ? 'Paid by hand' : hasTransfer(w) ? 'Sent through Paystack' : 'Not sent yet'}>
        <Rows rows={[
          ['Reference', <CopyVal v={w.reference} />],
          ['Method', manual ? 'Manual bank transfer' : hasTransfer(w) ? 'Paystack transfer' : w.status === 'pending' ? 'Not started' : null],
          ['Transfer code', w.paystackTransferCode && <CopyVal v={w.paystackTransferCode} />],
          ['Paystack status', w.paystackStatus && <span className="capitalize">{w.paystackStatus.replace(/_/g, ' ')}</span>],
          ['Requested', when(w.createdAt)],
          [w.status === 'pending' ? 'Last updated' : w.status === 'success' ? 'Paid' : 'Rejected', w.updatedAt !== w.createdAt && when(w.updatedAt)],
          ['Payout ID', <CopyVal v={w._id} />],
        ]} />
      </Section>

      <Section icon={Clock} title="Other payouts" hint={others.length ? `To ${user.name || 'this person'} · in this list` : undefined}>
        {!others.length ? <p className="text-[12.5px] text-[#98A2B3]">None in the current list.</p> : (
          <ul className="rounded-xl border border-[#EAECF0] divide-y divide-[#F2F4F7] overflow-hidden">
            {others.map((o) => (
              <li key={o._id} className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]">
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11.5px] text-[#475467] truncate">{o.reference}</span>
                  <span className="block text-[11.5px] text-[#98A2B3]">{when(o.createdAt)}</span>
                </span>
                <Pill status={o.status} />
                <span className="tabular-nums font-medium text-[#101828] w-24 text-right">{fmt(o.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Drawer>
  );
}
