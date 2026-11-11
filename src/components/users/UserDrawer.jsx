import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
  UserRound, Mail, Phone, Building2, Users, CreditCard, UserCheck, AlertTriangle, PhoneCall,
  Wallet, ShoppingBag, ShieldAlert, Copy, ArrowUpRight, KeyRound, UserX, Edit3, RefreshCw,
  Clock, BedDouble, Layers,
} from 'lucide-react';
import { userAPI } from '../../api';
import { Drawer, Section } from '../billing/BillingDrawers';
import Spinner from '../ui/Spinner';
import { SiteTypeBadge, siteTypeOf, termsFor } from '../estates/siteTypes';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;
const day   = (d) => (d ? format(new Date(d), 'MMM d, yyyy') : null);
const when  = (d) => (d ? format(new Date(d), 'MMM d, yyyy · HH:mm') : null);
const rel   = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '');
const words = (s) => (s ? String(s).replace(/_/g, ' ') : '');
const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ROLE = {
  super_admin:    { label: 'Super admin', badge: 'badge-gray',   bg: '#F2F4F7', fg: '#344054' },
  estate_manager: { label: 'Site manager', badge: 'badge-green', bg: '#ECFDF3', fg: '#067647' },
  resident:       { label: 'Member',      badge: 'badge-blue',   bg: '#EFF8FF', fg: '#175CD3' },
  security:       { label: 'Security',    badge: 'badge-yellow', bg: '#FFFAEB', fg: '#B54708' },
};
const PAY = { paid: 'badge-green', pending: 'badge-yellow', overdue: 'badge-red', waived: 'badge-gray' };
const VIS = { checked_in: 'badge-green', checked_out: 'badge-gray', pending: 'badge-yellow', expired: 'badge-gray', cancelled: 'badge-red' };

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

function List({ items, empty, render }) {
  if (!items?.length) return <p className="text-[12.5px] text-[#98A2B3]">{empty}</p>;
  return <ul className="rounded-xl border border-[#EAECF0] divide-y divide-[#F2F4F7] overflow-hidden">{items.map(render)}</ul>;
}

const Item = ({ k, title, sub, right }) => (
  <li key={k} className="flex items-center gap-3 px-3.5 py-2.5 text-[12.5px]">
    <span className="min-w-0 flex-1">
      <span className="block text-[#101828] truncate">{title}</span>
      {sub && <span className="block text-[11.5px] text-[#98A2B3] truncate">{sub}</span>}
    </span>
    {right}
  </li>
);

const Tile = ({ label, value, sub, tone }) => (
  <div className="rounded-lg border border-[#EAECF0] bg-white px-3 py-2 min-w-0">
    <p className="text-[11px] text-[#98A2B3] truncate">{label}</p>
    <p className={`text-[15px] font-semibold tabular-nums truncate ${tone || 'text-[#101828]'}`}>{value}</p>
    {sub && <p className="text-[10.5px] text-[#98A2B3] truncate">{sub}</p>}
  </div>
);

/** Side panel for one account, with everything the platform knows about it. */
export default function UserDrawer({ userId, onClose, onEdit, onResetPassword, onToggleActive, busy }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await userAPI.detail(userId);
      setD(data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load the user');
      onClose();
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const u = d?.user;
  const role = ROLE[u?.role] || ROLE.resident;
  const estate = u?.estateId && typeof u.estateId === 'object' ? u.estateId : null;
  const T = termsFor(estate);
  const isMember = u?.role === 'resident';
  const unitText = (x) => (x ? `${x.block ? `${T.block} ${x.block} · ` : ''}${T.unit} ${x.unitNumber}` : null);
  const pay = d?.payments?.byStatus || {};
  const owing = (pay.pending?.total || 0) + (pay.overdue?.total || 0);
  const restr = u?.duesRestriction;

  return (
    <Drawer title={u?.name || 'User'} subtitle={u ? `${role.label}${estate ? ` · ${estate.name}` : ''}` : ''} icon={UserRound} tone="gray" onClose={onClose} width={620}
      footer={u && <>
        {estate?._id && <Link to={`/estates/${estate._id}`} className="btn-outline" style={{ textDecoration: 'none' }}><Building2 size={14} /> Open {T.site.toLowerCase()}</Link>}
        <span className="flex-1" />
        {u.role !== 'super_admin' && <>
          <button className="btn-outline" disabled={busy} onClick={async () => { await onResetPassword(u); load(); }}><KeyRound size={14} /> Reset password</button>
          <button className={`btn-outline ${u.isActive ? '!text-[#B42318]' : '!text-[#067647]'}`} disabled={busy} onClick={async () => { await onToggleActive(u); load(); }}>
            {busy ? <RefreshCw size={14} className="animate-spin" /> : u.isActive ? <UserX size={14} /> : <UserCheck size={14} />} {u.isActive ? 'Suspend' : 'Activate'}
          </button>
        </>}
        <button className="btn-primary" onClick={() => onEdit(u)}><Edit3 size={14} /> Edit</button>
      </>}>
      {loading || !u ? <div className="flex justify-center py-20"><Spinner size={28} /></div> : (
        <>
          {/* Header */}
          <div className="px-6 py-6 border-b border-[#F2F4F7] bg-[#FCFCFD]">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center text-[22px] font-semibold flex-shrink-0" style={{ background: role.bg, color: role.fg }}>
                {u.profilePhoto ? <img src={u.profilePhoto} alt="" className="w-full h-full object-cover" /> : u.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`badge ${role.badge}`}>{role.label}</span>
                  {u.siteRole && <span className="badge badge-gray capitalize">{words(u.siteRole)}</span>}
                  <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Active' : 'Suspended'}</span>
                  {u.mustChangePassword && <span className="badge badge-yellow"><ShieldAlert size={10} /> Must reset password</span>}
                  {u.householdRole === 'member' && <span className="badge badge-blue">{T.family || 'Family member'}</span>}
                  {restr?.status && restr.status !== 'none' && <span className="badge badge-red">Dues {restr.status === 'active' ? 'restricted' : 'notice'}</span>}
                </div>
                <p className="mt-2 text-[12.5px] text-[#667085]">
                  Last seen {u.lastSeen ? rel(u.lastSeen) : 'never'} · joined {day(u.createdAt)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {isMember ? <>
                <Tile label="Paid" value={naira(pay.paid?.total)} sub={`${pay.paid?.count || 0} payments`} tone="text-[#067647]" />
                <Tile label="Owing" value={naira(owing)} sub={pay.overdue?.count ? `${pay.overdue.count} overdue` : 'nothing overdue'} tone={owing ? 'text-[#B42318]' : undefined} />
                <Tile label="Visitor passes" value={d.visitors.total} />
                <Tile label="Call credits" value={u.callCredits || 0} sub={`${d.calls.total} calls`} />
              </> : u.role === 'security' ? <>
                <Tile label="Visitors verified" value={d.visitors.verified} />
                <Tile label="Alerts" value={d.alerts.total} />
                <Tile label="Calls" value={d.calls.total} />
                <Tile label="Last seen" value={u.lastSeen ? rel(u.lastSeen) : 'Never'} />
              </> : <>
                <Tile label={`${T.sites} managed`} value={u.managedEstates?.length || (estate ? 1 : 0)} />
                <Tile label="Wallet" value={naira(u.walletBalance)} />
                <Tile label="Payouts" value={d.withdrawals.length} sub="latest 5" />
                <Tile label="Calls" value={d.calls.total} />
              </>}
            </div>
          </div>

          <Section icon={Mail} title="Contact & account">
            <Rows rows={[
              ['Email', <span className="inline-flex items-center gap-1.5"><a href={`mailto:${u.email}`} className="hover:underline">{u.email}</a><button onClick={() => copy(u.email)} className="text-[#98A2B3] hover:text-[#059669]"><Copy size={12} /></button></span>],
              ['Phone', u.phone && <a href={`tel:${u.phone}`} className="hover:underline tabular-nums inline-flex items-center gap-1"><Phone size={11} />{u.phone}</a>],
              ['ID number', u.memberProfile?.idNumber],
              ['Title', u.memberProfile?.title],
              ['Class / group', u.memberProfile?.className],
              ['Specialty', u.roleInfo?.specialty],
              ['On call', u.roleInfo?.onCall && `Yes · since ${when(u.roleInfo.onCallSince)}`],
              ['Team role', u.role === 'estate_manager' && u.teamRole && <span className="capitalize">{u.teamRole}</span>],
              ['Permissions', u.permissions?.length > 0 && u.permissions.map(words).join(', ')],
              ['Invited by', u.invitedBy?.name],
              ['Directory', u.isDiscoverable === false ? 'Hidden' : 'Listed'],
              ['Joined', when(u.createdAt)],
              ['Last updated', when(u.updatedAt)],
              ['User ID', <span className="inline-flex items-center gap-1.5 font-mono text-[12px]">{u._id}<button onClick={() => copy(u._id)} className="text-[#98A2B3] hover:text-[#059669]"><Copy size={12} /></button></span>],
            ]} />
          </Section>

          {(estate || u.requestedEstateId) && (
            <Section icon={Building2} title={T.site}>
              <Rows rows={[
                ['Name', estate && <Link to={`/estates/${estate._id}`} className="font-medium hover:underline inline-flex items-center gap-1">{estate.name}<ArrowUpRight size={12} /></Link>],
                ['Type', estate && <SiteTypeBadge type={siteTypeOf(estate)} />],
                ['Code', estate?.estateCode && <span className="font-mono text-[12px]">{estate.estateCode}</span>],
                ['Location', estate && [estate.city, estate.state].filter(Boolean).join(', ')],
                [T.manager, estate?.managerId?.name],
                [T.unit, unitText(u.unitId)],
                ['Occupancy', u.unitId?.status && <span className="capitalize">{words(u.unitId.status)}</span>],
                ['Requested to join', u.requestedEstateId?.name],
                ['Status', estate?.isActive === false && <span className="badge badge-red">{T.site} deactivated</span>],
              ]} />
              {d.subscription && (
                <p className="mt-2 text-[12px] text-[#667085]">Plan: <b className="text-[#101828]">{d.subscription.planId?.name || '—'}</b> · <span className="capitalize">{d.subscription.status}</span>
                  {d.subscription.nextBillingDate && <> · next billing {day(d.subscription.nextBillingDate)}</>}</p>
              )}
            </Section>
          )}

          {u.managedEstates?.length > 0 && (
            <Section icon={Layers} title="Portfolio" hint={`${u.managedEstates.length} managed`}>
              <List items={u.managedEstates} render={(e) => (
                <Item k={e._id} title={<Link to={`/estates/${e._id}`} className="hover:underline">{e.name}</Link>} sub={e.estateCode}
                  right={<SiteTypeBadge type={siteTypeOf(e)} />} />
              )} />
            </Section>
          )}

          {(u.stay?.status && u.stay.status !== 'none') || u.shift?.start ? (
            <Section icon={u.stay?.status && u.stay.status !== 'none' ? BedDouble : Clock} title="Stay & shift">
              <Rows rows={[
                ['Stay', u.stay?.status && u.stay.status !== 'none' && <span className="capitalize">{words(u.stay.status)}</span>],
                ['Check-in', when(u.stay?.checkIn)],
                ['Check-out', when(u.stay?.checkOut)],
                ['Room', unitText(u.stay?.roomId)],
                ['Shift', u.shift?.start && `${u.shift.start}–${u.shift.end}`],
                ['Days', u.shift?.days?.length > 0 && u.shift.days.map((x) => DAYS[x]).join(', ')],
              ]} />
            </Section>
          ) : null}

          {(u.householdHead || d.household.length > 0 || u.assignedTo?.length > 0) && (
            <Section icon={Users} title={T.household || 'Household'}>
              {u.householdHead && (
                <Rows rows={[
                  ['Head', <span>{u.householdHead.name}<span className="block text-[11.5px] text-[#98A2B3]">{u.householdHead.email}</span></span>],
                  ['Relationship', u.relationship],
                  ['Status', u.householdStatus && <span className="capitalize">{u.householdStatus}</span>],
                  ['Access', u.householdPermissions?.length > 0 && u.householdPermissions.map(words).join(', ')],
                ]} />
              )}
              {d.household.length > 0 && (
                <div className={u.householdHead ? 'mt-3' : ''}>
                  <List items={d.household} render={(h) => (
                    <Item k={h._id} title={h.name} sub={[h.relationship, h.email].filter(Boolean).join(' · ')}
                      right={<span className={`badge ${h.householdStatus === 'pending' ? 'badge-yellow' : h.isActive === false ? 'badge-red' : 'badge-green'}`}>{h.householdStatus === 'pending' ? 'Pending' : h.isActive === false ? 'Suspended' : 'Active'}</span>} />
                  )} />
                </div>
              )}
              {u.assignedTo?.length > 0 && (
                <p className="mt-3 text-[12px] text-[#667085]">Care team: {u.assignedTo.map((a) => `${a.name}${a.siteRole ? ` (${words(a.siteRole)})` : ''}`).join(', ')}</p>
              )}
            </Section>
          )}

          {restr?.status && restr.status !== 'none' && (
            <Section icon={ShieldAlert} title="Dues restriction">
              <Rows rows={[
                ['Status', <span className="capitalize">{restr.status}</span>],
                ['Owed', naira(restr.amountOwed)],
                ['Paused services', restr.services?.length > 0 && restr.services.map(words).join(', ')],
                ['Notice sent', when(restr.noticeAt)],
                ['Takes effect', when(restr.effectiveAt)],
                ['Applied', when(restr.appliedAt)],
                ['Note', restr.note],
                ['Dispute', restr.dispute?.message && `${restr.dispute.message} · ${when(restr.dispute.at)}`],
              ]} />
            </Section>
          )}

          {isMember && (
            <Section icon={CreditCard} title="Payments" hint={T.dues}>
              <List items={d.payments.recent} empty="No bills yet." render={(p) => (
                <Item k={p._id} title={p.scheduleId?.title || 'Payment'} sub={`${when(p.paidAt || p.createdAt)}${p.method ? ` · ${words(p.method)}` : ''}`}
                  right={<><span className={`badge ${PAY[p.status] || 'badge-gray'} capitalize`}>{p.status}</span><span className="tabular-nums font-medium w-24 text-right">{naira(p.amount)}</span></>} />
              )} />
              {d.payments.recent.length > 0 && <Link to="/finance?tab=transactions" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#059669] hover:underline">All transactions <ArrowUpRight size={12} /></Link>}
            </Section>
          )}

          {(isMember || d.visitors.total > 0) && (
            <Section icon={UserCheck} title="Visitor passes" hint={`${d.visitors.total} created`}>
              <List items={d.visitors.recent} empty="No visitor passes yet." render={(v) => (
                <Item k={v._id} title={<>{v.visitorName} <span className="text-[#98A2B3]">· {v.purpose}</span></>}
                  sub={`${v.category && v.category !== 'guest' ? `${words(v.category)} · ` : ''}${when(v.entryTime || v.expectedDate)}${v.visitorCode ? ` · ${v.visitorCode}` : ''}`}
                  right={<span className={`badge ${VIS[v.status] || 'badge-gray'} capitalize`}>{words(v.status)}</span>} />
              )} />
            </Section>
          )}

          {d.alerts.total > 0 && (
            <Section icon={AlertTriangle} title="Alerts raised" hint={`${d.alerts.total} total`}>
              <List items={d.alerts.recent} render={(a) => (
                <Item k={a._id} title={a.title || `${words(a.type)} alert`} sub={when(a.createdAt)}
                  right={<span className={`badge ${a.status === 'resolved' ? 'badge-gray' : 'badge-red'} capitalize`}>{words(a.status)}</span>} />
              )} />
            </Section>
          )}

          {(d.calls.total > 0 || d.credits.length > 0) && (
            <Section icon={PhoneCall} title="Calls & credits" hint={`${d.calls.total} calls · ${u.callCredits || 0} credits left`}>
              <List items={d.calls.recent} empty="No calls yet." render={(c) => {
                const out = String(c.callerId?._id) === String(u._id);
                return (
                  <Item k={c._id} title={`${out ? 'To' : 'From'} ${(out ? c.calleeId : c.callerId)?.name || 'someone'}`}
                    sub={`${when(c.createdAt)}${c.durationSec ? ` · ${Math.ceil(c.durationSec / 60)} min` : ''}${c.kind !== 'standard' ? ` · ${c.kind}` : ''}`}
                    right={<span className="badge badge-gray capitalize">{words(c.status)}</span>} />
                );
              }} />
              {d.credits.length > 0 && (
                <div className="mt-3">
                  <List items={d.credits} render={(t) => (
                    <Item k={t._id} title={t.description || words(t.type)} sub={when(t.createdAt)}
                      right={<span className={`tabular-nums font-medium ${t.amount >= 0 ? 'text-[#067647]' : 'text-[#101828]'}`}>{t.amount >= 0 ? '+' : ''}{t.amount} <span className="text-[#98A2B3] font-normal">→ {t.balanceAfter}</span></span>} />
                  )} />
                </div>
              )}
            </Section>
          )}

          {(u.accountNumber || d.withdrawals.length > 0 || u.walletBalance > 0) && (
            <Section icon={Wallet} title="Wallet & payouts">
              <Rows rows={[
                ['Wallet balance', naira(u.walletBalance)],
                ['Bank', u.bankName],
                ['Account', u.accountNumber && <span className="font-mono text-[12px]">{u.accountNumber}{u.accountName ? ` · ${u.accountName}` : ''}</span>],
                ['Paystack recipient', u.paystackRecipientCode ? 'Saved' : null],
              ]} />
              {d.withdrawals.length > 0 && (
                <div className="mt-3">
                  <List items={d.withdrawals} render={(w) => (
                    <Item k={w._id} title={<span className="font-mono text-[11.5px]">{w.reference}</span>} sub={`${when(w.createdAt)}${w.source === 'marketplace' ? ' · marketplace' : ''}`}
                      right={<><span className={`badge ${w.status === 'success' ? 'badge-green' : w.status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>{w.status === 'success' ? 'Paid' : w.status === 'failed' ? 'Rejected' : 'Pending'}</span><span className="tabular-nums font-medium w-24 text-right">{naira(w.amount)}</span></>} />
                  )} />
                  <Link to="/finance?tab=payouts" className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#059669] hover:underline">All payouts <ArrowUpRight size={12} /></Link>
                </div>
              )}
            </Section>
          )}

          {(d.marketplace.bought.count > 0 || d.marketplace.sold.count > 0 || d.requests > 0) && (
            <Section icon={ShoppingBag} title="Marketplace & requests">
              <div className="grid grid-cols-3 gap-2">
                <Tile label="Bought" value={d.marketplace.bought.count} sub={naira(d.marketplace.bought.total)} />
                <Tile label="Sold" value={d.marketplace.sold.count} sub={`${naira(d.marketplace.sold.total)} earned`} />
                <Tile label="Requests sent" value={d.requests} />
              </div>
            </Section>
          )}
        </>
      )}
    </Drawer>
  );
}
