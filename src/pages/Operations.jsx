import { useEffect, useState } from 'react';
import {
  AlertTriangle, KeyRound, RefreshCw, Wallet, Gift, CreditCard,
  Clock, Check, X, ArrowRight, Zap, Siren,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { planAPI, passwordResetAPI, alertAPI, withdrawalAPI } from '../api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';

const fmtNGN = (n) => `₦${Number(n || 0).toLocaleString()}`;

const TONE = {
  red:    { fg: '#B42318', bg: '#FEF3F2' },
  blue:   { fg: '#175CD3', bg: '#EFF8FF' },
  green:  { fg: '#067647', bg: '#ECFDF3' },
  amber:  { fg: '#B54708', bg: '#FFFAEB' },
};

function Section({ title, Icon, tone = 'green', count, children }) {
  const t = TONE[tone] || TONE.green;
  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: t.bg, color: t.fg }}>
            <Icon size={14} />
          </span>
          <h2 className="card-title truncate">{title}</h2>
        </div>
        <span className="badge badge-gray tabular-nums" style={count ? { background: t.bg, color: t.fg, borderColor: 'transparent' } : undefined}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ icon: Icon, message }) {
  return (
    <div className="px-5 py-10 flex flex-col items-center text-center">
      <div className="w-9 h-9 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-2.5">
        <Icon size={16} className="text-[#98A2B3]" />
      </div>
      <div className="text-[12.5px] text-[#98A2B3]">{message}</div>
    </div>
  );
}

const rowCls = 'px-5 py-3 flex items-center gap-3';
const titleCls = 'text-[13px] font-semibold text-[#101828] truncate';
const subCls = 'text-[12px] text-[#475467] truncate';
const metaCls = 'text-[11.5px] text-[#98A2B3] mt-0.5';
const smallBtn = '!h-8 !px-2.5 !text-[12px]';

export default function Operations() {
  const [loading, setLoading] = useState(true);
  const [failedRenewals, setFailedRenewals] = useState([]);
  const [pendingResets, setPendingResets]   = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [openAlerts, setOpenAlerts]         = useState([]);
  const [expiringComps, setExpiringComps]   = useState([]);
  const [subStats, setSubStats]             = useState(null);
  const [busy, setBusy] = useState({});

  const load = async () => {
    setLoading(true);
    const soon = new Date(Date.now() + 7 * 86400000);
    try {
      // Withdrawals returns { withdrawals, totals } under data; alerts needs
      // the platform-wide admin endpoint (not the estate-scoped one).
      const [fr, pr, pw, al, ss, allSubs] = await Promise.all([
        planAPI.getFailedRenewals().catch(() => ({ data: { data: [] } })),
        passwordResetAPI.listPending().catch(() => ({ data: { data: [] } })),
        withdrawalAPI.list({ status: 'pending' }).catch(() => ({ data: { data: { withdrawals: [] } } })),
        alertAPI.listAdmin({ status: 'open' }).catch(() => ({ data: { data: [] } })),
        planAPI.getSubscriptionStats().catch(() => ({ data: { data: null } })),
        planAPI.getSubscriptions().catch(() => ({ data: { data: [] } })),
      ]);

      const asArray = (v) => Array.isArray(v) ? v : (Array.isArray(v?.withdrawals) ? v.withdrawals : []);

      setFailedRenewals(Array.isArray(fr.data.data) ? fr.data.data : []);
      setPendingResets(Array.isArray(pr.data.data) ? pr.data.data : []);
      setPendingWithdrawals(asArray(pw.data.data));
      setOpenAlerts(Array.isArray(al.data.data) ? al.data.data : []);
      setSubStats(ss.data.data || null);

      // Comp expiring in 7 days
      const subs = Array.isArray(allSubs.data.data) ? allSubs.data.data : [];
      const nowMs = Date.now();
      setExpiringComps(subs.filter(s => {
        if (!s.comp?.isActive || !s.comp?.expiresAt) return false;
        const t = new Date(s.comp.expiresAt).getTime();
        return t > nowMs && t <= soon.getTime();
      }).sort((a, b) => new Date(a.comp.expiresAt) - new Date(b.comp.expiresAt)));
    } catch {
      toast.error('Failed to load operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const totalIssues = failedRenewals.length + pendingResets.length + pendingWithdrawals.length + openAlerts.length + expiringComps.length;
  const healthScore = Math.max(0, 100 - Math.min(totalIssues * 5, 100));
  const healthColor = healthScore >= 85 ? '#059669' : healthScore >= 60 ? '#DC6803' : '#D92D20';

  const markBusy = (id, v = true) => setBusy(prev => ({ ...prev, [id]: v }));

  const approveReset = async (req) => {
    markBusy(req._id);
    try {
      await passwordResetAPI.approve(req._id);
      toast.success('Temp password emailed');
      setPendingResets(prev => prev.filter(r => r._id !== req._id));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Approve failed');
    } finally { markBusy(req._id, false); }
  };

  const denyReset = async (req) => {
    const reason = window.prompt('Deny reason (optional)', '');
    if (reason === null) return;
    markBusy(req._id);
    try {
      await passwordResetAPI.deny(req._id, { reason });
      toast.success('Request denied');
      setPendingResets(prev => prev.filter(r => r._id !== req._id));
    } catch (err) {
      toast.error('Deny failed');
    } finally { markBusy(req._id, false); }
  };

  const ackAlert = async (alert) => {
    markBusy(alert._id);
    try {
      await alertAPI.acknowledge(alert._id);
      toast.success('Alert acknowledged');
      setOpenAlerts(prev => prev.filter(a => a._id !== alert._id));
    } catch { toast.error('Failed'); }
    finally { markBusy(alert._id, false); }
  };

  const resolveAlert = async (alert) => {
    markBusy(alert._id);
    try {
      await alertAPI.resolve(alert._id);
      toast.success('Alert resolved');
      setOpenAlerts(prev => prev.filter(a => a._id !== alert._id));
    } catch { toast.error('Failed'); }
    finally { markBusy(alert._id, false); }
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Operations"
        description="Platform-wide queues that need admin action."
        actions={(
          <button onClick={load} className="btn-outline gap-2" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      />

      {/* Health summary */}
      <div className="card p-5 mb-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          <div className="flex items-center gap-4 lg:min-w-[260px]">
            <span className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: healthColor + '14', color: healthColor }}>
              <Zap size={20} />
            </span>
            <div>
              <div className="text-[12px] font-medium text-[#475467]">Platform health</div>
              <div className="flex items-baseline gap-1">
                <span className="text-[28px] leading-tight font-semibold tracking-tight tabular-nums" style={{ color: healthColor }}>{healthScore}</span>
                <span className="text-[13px] text-[#98A2B3]">/100</span>
              </div>
              <div className="text-[12px] text-[#98A2B3]">
                {totalIssues === 0 ? 'All quiet — nothing needs admin action' : `${totalIssues} item${totalIssues === 1 ? '' : 's'} across 5 queues`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[#E4E7EC] border border-[#E4E7EC] rounded-lg overflow-hidden flex-1">
            {[
              { label: 'Failed renewals', value: failedRenewals.length,     color: '#B42318' },
              { label: 'Password resets', value: pendingResets.length,      color: '#175CD3' },
              { label: 'Withdrawals',     value: pendingWithdrawals.length, color: '#067647' },
              { label: 'Open alerts',     value: openAlerts.length,         color: '#B54708' },
              { label: 'Expiring comps',  value: expiringComps.length,      color: '#B54708' },
            ].map(x => (
              <div key={x.label} className="bg-white px-3 py-2.5">
                <div className="text-[11.5px] text-[#475467] truncate">{x.label}</div>
                <div className="text-[18px] font-semibold tabular-nums mt-0.5" style={{ color: x.value ? x.color : '#98A2B3' }}>{x.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Failed renewals */}
        <Section title="Failed auto-renewals" Icon={AlertTriangle} tone="red" count={failedRenewals.length}>
          {failedRenewals.length === 0 ? (
            <EmptyRow icon={AlertTriangle} message="No stuck renewals — all cards charging cleanly" />
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {failedRenewals.slice(0, 10).map(sub => (
                <div key={sub._id} className={rowCls}>
                  <div className="flex-1 min-w-0">
                    <div className={titleCls}>{sub.estateId?.name || 'Unknown'}</div>
                    <div className="text-[12px] text-[#B42318] truncate">{sub.lastRenewalError || 'Unknown error'}</div>
                    <div className={metaCls}>
                      {sub.renewalAttempts > 1 && <>{sub.renewalAttempts} attempts · </>}
                      {sub.lastRenewalAttemptAt && formatDistanceToNow(new Date(sub.lastRenewalAttemptAt), { addSuffix: true })}
                    </div>
                  </div>
                  <Link to={`/estates/${sub.estateId?._id || sub.estateId}`} className={`btn-outline ${smallBtn} gap-1`}>
                    Resolve <ArrowRight size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Pending password resets */}
        <Section title="Pending password resets" Icon={KeyRound} tone="blue" count={pendingResets.length}>
          {pendingResets.length === 0 ? (
            <EmptyRow icon={KeyRound} message="No pending reset requests" />
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {pendingResets.slice(0, 10).map(req => (
                <div key={req._id} className={rowCls}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={titleCls}>{req.requesterName || req.userId?.name || 'Unknown'}</span>
                      {req.requesterRole && <span className="badge badge-gray capitalize">{req.requesterRole}</span>}
                    </div>
                    <div className={subCls}>
                      {req.requesterEmail}
                      {req.requesterUnit ? ` · ${req.requesterUnit}` : ''}
                      {req.estateId?.name ? ` · ${req.estateId.name}` : ''}
                    </div>
                    <div className={`${metaCls} flex items-center gap-1`}>
                      <Clock size={11} />
                      {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => approveReset(req)} disabled={busy[req._id]} title="Approve"
                      className={`btn-primary ${smallBtn}`}>
                      {busy[req._id] ? '…' : <Check size={14} />}
                    </button>
                    <button onClick={() => denyReset(req)} disabled={busy[req._id]} title="Deny"
                      className={`btn-outline ${smallBtn} hover:!text-[#B42318]`}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Pending withdrawals */}
        <Section title="Pending withdrawals" Icon={Wallet} tone="green" count={pendingWithdrawals.length}>
          {pendingWithdrawals.length === 0 ? (
            <EmptyRow icon={Wallet} message="No manager payout requests pending" />
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {pendingWithdrawals.slice(0, 10).map(w => (
                <Link key={w._id} to="/withdrawals" className={`${rowCls} hover:bg-[#F9FAFB] transition-colors no-underline`}>
                  <div className="flex-1 min-w-0">
                    <div className={titleCls}>
                      <span className="tabular-nums">{fmtNGN(w.amount)}</span>
                      <span className="font-normal text-[12px] text-[#475467]"> · {w.estateId?.name || '—'}</span>
                    </div>
                    <div className={subCls}>{w.bankName || '—'} · {w.accountName || ''}</div>
                    <div className={metaCls}>
                      {w.createdAt && formatDistanceToNow(new Date(w.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-[#D0D5DD]" />
                </Link>
              ))}
              {pendingWithdrawals.length > 10 && (
                <Link to="/withdrawals" className="block px-5 py-2.5 text-center text-[12.5px] font-semibold text-[#059669] hover:bg-[#F9FAFB]">
                  View all {pendingWithdrawals.length} →
                </Link>
              )}
            </div>
          )}
        </Section>

        {/* Open security alerts */}
        <Section title="Open security alerts" Icon={Siren} tone="amber" count={openAlerts.length}>
          {openAlerts.length === 0 ? (
            <EmptyRow icon={Siren} message="No open alerts" />
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {openAlerts.slice(0, 10).map(a => (
                <div key={a._id} className={rowCls}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={titleCls}>{a.title || a.type || 'Alert'}</span>
                      {a.severity === 'critical' && <span className="badge badge-red">Critical</span>}
                      {a.isEmergencyBroadcast && <span className="badge badge-yellow">Broadcast</span>}
                    </div>
                    <div className={subCls}>
                      {(a.note || a.message || '').slice(0, 100)}
                      {a.estateId?.name ? ` · ${a.estateId.name}` : ''}
                    </div>
                    <div className={metaCls}>
                      {a.createdAt && formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => ackAlert(a)} disabled={busy[a._id]} title="Acknowledge"
                      className={`btn-outline ${smallBtn}`}>
                      {busy[a._id] ? '…' : 'Ack'}
                    </button>
                    <button onClick={() => resolveAlert(a)} disabled={busy[a._id]} title="Resolve"
                      className={`btn-primary ${smallBtn}`}>
                      <Check size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Comps expiring within 7 days */}
        <Section title="Comps expiring in 7 days" Icon={Gift} tone="amber" count={expiringComps.length}>
          {expiringComps.length === 0 ? (
            <EmptyRow icon={Gift} message="No comps expiring soon" />
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {expiringComps.map(sub => {
                const expires = new Date(sub.comp.expiresAt);
                const daysLeft = Math.max(1, Math.ceil((expires.getTime() - Date.now()) / 86400000));
                return (
                  <Link key={sub._id} to="/subscriptions" className={`${rowCls} hover:bg-[#F9FAFB] transition-colors no-underline`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={titleCls}>{sub.estateId?.name || '—'}</span>
                        <span className="badge badge-yellow"><Gift size={10} /> {sub.comp.planId?.name || 'Comp'}</span>
                      </div>
                      <div className={subCls}>{sub.comp.reason || 'No reason set'}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[14px] font-semibold text-[#B54708] tabular-nums">{daysLeft}d</div>
                      <div className="text-[11px] text-[#98A2B3]">left</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {/* MRR health summary */}
        <Section title="MRR health" Icon={CreditCard} tone="green" count={subStats?.trial ?? 0}>
          <div className="divide-y divide-[#F2F4F7]">
            {[
              { title: 'Paid MRR', sub: 'Live, excludes comps', value: fmtNGN(subStats?.mrrPaid || subStats?.mrr || 0), color: '#067647' },
              { title: 'Gift MRR foregone', sub: `${subStats?.activeComp || 0} live comp${subStats?.activeComp === 1 ? '' : 's'}`, value: fmtNGN(subStats?.mrrComp || 0), color: '#B54708' },
              { title: 'Trial pipeline', sub: `${subStats?.trial || 0} on trial`, value: fmtNGN(subStats?.trialPipelineMrr || 0), color: '#175CD3' },
            ].map(r => (
              <div key={r.title} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className={titleCls}>{r.title}</div>
                  <div className={subCls}>{r.sub}</div>
                </div>
                <div className="text-[16px] font-semibold tabular-nums" style={{ color: r.color }}>{r.value}</div>
              </div>
            ))}
            <div className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className={titleCls}>Renewals this week</div>
                <div className={subCls}>{subStats?.renewalsDue7d || 0} subs due</div>
              </div>
              <Link to="/revenue" className="text-[12.5px] font-semibold flex items-center gap-1 text-[#059669] hover:text-[#047857]">
                View schedule <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
