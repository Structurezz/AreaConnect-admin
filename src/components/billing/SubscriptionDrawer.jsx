import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInCalendarDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
  CreditCard, Building2, Layers, CalendarClock, RefreshCw, Sparkles, Copy, ArrowUpRight, StickyNote,
  Edit3, Gift, Trash2, AlertTriangle, Infinity as InfinityIcon, CheckCircle2, XCircle,
} from 'lucide-react';
import { Drawer, Section } from './BillingDrawers';
import { SiteTypeBadge, siteTypeOf, termsFor } from '../estates/siteTypes';

const naira = (n) => (Number(n || 0) === 0 ? 'Free' : `₦${Number(n).toLocaleString()}`);
const day   = (d) => (d ? format(new Date(d), 'MMM d, yyyy') : null);
const when  = (d) => (d ? format(new Date(d), 'MMM d, yyyy · HH:mm') : null);
const rel   = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '');

const STATUS = {
  active:    { label: 'Active',    badge: 'badge-green',  tone: 'green' },
  trial:     { label: 'Trial',     badge: 'badge-blue',   tone: 'green' },
  expired:   { label: 'Expired',   badge: 'badge-red',    tone: 'amber' },
  suspended: { label: 'Suspended', badge: 'badge-yellow', tone: 'amber' },
  cancelled: { label: 'Cancelled', badge: 'badge-gray',   tone: 'gray' },
};

const FEATURES = [
  ['visitorManagement', 'Visitor management'], ['residentManagement', 'Member management'], ['unitManagement', 'Unit management'],
  ['announcements', 'Announcements'], ['communityChat', 'Community chat'], ['nkechiAI', 'AI assistant'],
  ['marketplace', 'Marketplace'], ['paymentSystem', 'Payments'], ['securityPortal', 'Security portal'], ['emergencyBroadcast', 'Emergency broadcast'],
];

function copy(t) { navigator.clipboard?.writeText(t); toast.success('Copied'); }

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

const Mono = ({ v }) => (
  <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">
    <span className="break-all">{v}</span>
    <button type="button" onClick={() => copy(String(v))} className="text-[#98A2B3] hover:text-[#059669]" title="Copy"><Copy size={12} /></button>
  </span>
);

/** Side panel for one site subscription: plan, billing, card, renewals, comp and site. */
export default function SubscriptionDrawer({ sub, compLive, onEdit, onGrantComp, onRevokeComp, revoking, onClose }) {
  const estate = sub.estateId && typeof sub.estateId === 'object' ? sub.estateId : null;
  const T = termsFor(estate);
  const plan = sub.planId || null;
  const compPlan = compLive ? sub.comp?.planId : null;
  const st = STATUS[sub.status] || STATUS.expired;
  const price = sub.cycle === 'annual' ? plan?.price?.annual : plan?.price?.monthly;
  const perMember = plan?.price?.perResident || 0;
  const billed = sub.billingModel === 'per_resident' ? perMember * (sub.residentCount || 0) : price;
  const monthly = billed ? Math.round(sub.cycle === 'annual' && sub.billingModel !== 'per_resident' ? billed / 12 : billed) : 0;
  const auth = sub.paystackAuth || {};
  const trialLeft = sub.status === 'trial' && sub.trialEndsAt ? differenceInCalendarDays(new Date(sub.trialEndsAt), new Date()) : null;
  const f = (compPlan || plan)?.features || null;

  return (
    <Drawer title={estate?.name || 'Subscription'} subtitle={`${(compPlan || plan)?.name || 'No plan'} · ${st.label}`} icon={CreditCard}
      tone={compLive ? 'amber' : st.tone} onClose={onClose} width={600}
      footer={<>
        {estate?._id && <Link to={`/estates/${estate._id}`} className="btn-outline" style={{ textDecoration: 'none' }}><Building2 size={14} /> Open {T.site.toLowerCase()}</Link>}
        <span className="flex-1" />
        {compLive && onRevokeComp && <button className="btn-outline !text-[#B42318]" disabled={revoking} onClick={onRevokeComp}>{revoking ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />} Revoke comp</button>}
        {!compLive && onGrantComp && <button className="btn-outline" onClick={onGrantComp}><Gift size={14} /> Grant comp</button>}
        {onEdit && <button className="btn-primary" onClick={onEdit}><Edit3 size={14} /> Edit</button>}
      </>}>
      <div className="px-6 py-6 border-b border-[#F2F4F7] bg-[#FCFCFD]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${st.badge}`}>{st.label}</span>
          {compLive && <span className="badge badge-yellow"><Sparkles size={10} /> Comp · free</span>}
          {estate && <SiteTypeBadge type={siteTypeOf(estate)} />}
          {estate?.isActive === false && <span className="badge badge-red">{T.site} deactivated</span>}
        </div>
        <p className="mt-3 text-[34px] leading-none font-semibold tracking-tight tabular-nums text-[#101828]">
          {compLive ? 'Free' : monthly ? `₦${monthly.toLocaleString()}` : naira(0)}
          {!compLive && monthly > 0 && <span className="text-[14px] font-medium text-[#98A2B3]"> / month</span>}
        </p>
        <p className="mt-2 text-[12.5px] text-[#667085]">
          {sub.status === 'trial' && sub.trialEndsAt
            ? <>Trial ends {day(sub.trialEndsAt)} · {trialLeft >= 0 ? `${trialLeft} day${trialLeft === 1 ? '' : 's'} left` : 'ended'}</>
            : sub.nextBillingDate ? <>Next billing {day(sub.nextBillingDate)} · {rel(sub.nextBillingDate)}</> : 'No billing date set'}
        </p>
        {sub.lastRenewalError && sub.status !== 'active' && (
          <p className="mt-3 text-[12px] text-[#B42318] flex items-start gap-1.5"><AlertTriangle size={13} className="mt-0.5 flex-shrink-0" /> Last renewal failed: {sub.lastRenewalError}</p>
        )}
      </div>

      {compLive && (
        <Section icon={Sparkles} title="Comp access" hint="Overrides billing until it ends">
          <Rows rows={[
            ['Comp plan', compPlan?.name],
            ['Reason', sub.comp.reason],
            ['Ends', sub.comp.expiresAt ? <>{day(sub.comp.expiresAt)} <span className="text-[#98A2B3]">· {rel(sub.comp.expiresAt)}</span></> : <span className="inline-flex items-center gap-1"><InfinityIcon size={12} /> Never</span>],
            ['Granted by', sub.comp.grantedBy?.name],
            ['Granted', when(sub.comp.grantedAt)],
            ['Underlying plan', plan?.name],
          ]} />
        </Section>
      )}

      <Section icon={Layers} title="Plan & pricing" hint={plan ? undefined : 'No plan assigned'}>
        <Rows rows={[
          ['Plan', plan && <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: plan.color || '#98A2B3' }} />{plan.name}</span>],
          ['Cycle', <span className="capitalize">{sub.cycle}</span>],
          ['Billing model', sub.billingModel === 'per_resident' ? `Per ${T.member.toLowerCase()}` : 'Flat fee'],
          ['Plan price', price != null && `${naira(price)} / ${sub.cycle === 'annual' ? 'year' : 'month'}`],
          ['Per member', sub.billingModel === 'per_resident' && `${naira(perMember)} × ${sub.residentCount || 0} ${T.members.toLowerCase()}`],
          ['Billed each cycle', !compLive && billed != null && naira(billed)],
          ['Pending change', sub.pendingPlanId && `${naira(sub.pendingAmount)} · ${sub.pendingCycle || ''} (awaiting payment)`],
        ]} />
        {f && (
          <>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[[`Max ${T.members.toLowerCase()}`, f.maxResidents], [`Max ${T.units.toLowerCase()}`, f.maxUnits], ['Visitors / mo', f.maxVisitorsPerMonth]].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-[#EAECF0] px-3 py-2">
                  <p className="text-[11px] text-[#98A2B3] truncate">{k}</p>
                  <p className="text-[14px] font-semibold tabular-nums text-[#101828]">{v == null || v === -1 ? 'Unlimited' : Number(v).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {FEATURES.map(([k, l]) => (
                <span key={k} className={`badge ${f[k] ? 'badge-green' : 'badge-gray'} inline-flex items-center gap-1`}>
                  {f[k] ? <CheckCircle2 size={10} /> : <XCircle size={10} />} {l}
                </span>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section icon={CalendarClock} title="Dates">
        <Rows rows={[
          ['Started', day(sub.startDate)],
          ['Trial ends', sub.trialEndsAt && day(sub.trialEndsAt)],
          ['Next billing', day(sub.nextBillingDate)],
          ['Ends', day(sub.endDate)],
          ['Created', when(sub.createdAt)],
          ['Last updated', sub.updatedAt && <>{when(sub.updatedAt)}{sub.updatedBy?.name && <span className="text-[#98A2B3]"> · {sub.updatedBy.name}</span>}</>],
        ]} />
      </Section>

      <Section icon={CreditCard} title="Card & renewals" hint={auth.authorizationCode ? 'Renews automatically' : 'No card on file — will expire instead of renewing'}>
        <Rows rows={[
          ['Card', auth.cardLast4 && <span className="capitalize">{auth.cardBrand || 'Card'} •••• {auth.cardLast4}</span>],
          ['Bank', auth.bank],
          ['Channel', auth.channel && <span className="capitalize">{auth.channel.replace(/_/g, ' ')}</span>],
          ['Billing email', auth.customerEmail],
          ['Reusable', auth.authorizationCode ? (auth.reusable ? 'Yes' : 'No') : null],
          ['Saved', when(auth.savedAt)],
          ['Last successful renewal', when(sub.lastSuccessfulRenewalAt)],
          ['Last attempt', sub.lastRenewalAttemptAt && <>{when(sub.lastRenewalAttemptAt)}{sub.renewalAttempts ? <span className="text-[#B42318]"> · {sub.renewalAttempts} failed</span> : null}</>],
          ['Last error', sub.lastRenewalError && <span className="text-[#B42318]">{sub.lastRenewalError}</span>],
          ['Last reference', sub.lastRenewalReference && <Mono v={sub.lastRenewalReference} />],
          ['Pending checkout', sub.pendingRef && <Mono v={sub.pendingRef} />],
        ]} />
      </Section>

      {estate && (
        <Section icon={Building2} title={T.site}>
          <Rows rows={[
            ['Name', <Link to={`/estates/${estate._id}`} className="font-medium hover:underline inline-flex items-center gap-1">{estate.name}<ArrowUpRight size={12} /></Link>],
            ['Code', estate.estateCode && <Mono v={estate.estateCode} />],
            ['Address', estate.address],
            ['Location', [estate.city, estate.state].filter(Boolean).join(', ')],
            [T.manager, estate.managerId?.name && <span>{estate.managerId.name}<span className="block text-[11.5px] text-[#98A2B3]">{[estate.managerId.email, estate.managerId.phone].filter(Boolean).join(' · ')}</span></span>],
          ]} />
        </Section>
      )}

      {sub.notes && (
        <Section icon={StickyNote} title="Notes">
          <p className="text-[12.5px] text-[#475467] whitespace-pre-line rounded-xl bg-[#F9FAFB] border border-[#F2F4F7] px-3.5 py-2.5">{sub.notes}</p>
        </Section>
      )}

      <div className="px-6 py-4 text-[11.5px] text-[#98A2B3] flex items-center gap-1.5">Subscription ID <Mono v={sub._id} /></div>
    </Drawer>
  );
}
