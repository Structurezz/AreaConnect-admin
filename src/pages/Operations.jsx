import { useEffect, useState } from 'react';
import {
  AlertTriangle, KeyRound, RefreshCw, Wallet, Gift, CreditCard,
  Clock, Check, X, ArrowRight, Zap, Siren,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { planAPI, passwordResetAPI, alertAPI, withdrawalAPI } from '../api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const fmtNGN = (n) => `₦${Number(n || 0).toLocaleString()}`;

function Section({ title, Icon, color, count, children }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '14' }}>
            <Icon size={14} style={{ color }} />
          </div>
          <h2 className="text-sm font-bold" style={{ color: '#0F172A' }}>{title}</h2>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
          style={{ background: count ? color + '14' : '#F1F5F9', color: count ? color : '#64748B', border: `1px solid ${count ? color + '30' : '#E2E8F0'}` }}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

function EmptyRow({ icon: Icon, message }) {
  return (
    <div className="px-5 py-10 text-center">
      <Icon size={28} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
      <div className="text-xs" style={{ color: '#94A3B8' }}>{message}</div>
    </div>
  );
}

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
  const healthColor = healthScore >= 85 ? '#059669' : healthScore >= 60 ? '#D97706' : '#DC2626';

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
    <div className="space-y-5 animate-fade-in pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Operations</h1>
          <p className="text-sm mt-0.5" style={{ color: '#94A3B8' }}>Platform-wide queues that need admin action</p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ background: '#F1F5F9', color: '#0F172A' }} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Health hero */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                 style={{ background: healthColor + '14', color: healthColor }}>
              <Zap size={22} />
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Platform health</div>
              <div className="text-3xl font-black" style={{ color: healthColor }}>{healthScore}<span className="text-base" style={{ color: '#94A3B8' }}>/100</span></div>
              <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                {totalIssues === 0 ? 'All quiet — nothing needs admin action' : `${totalIssues} item${totalIssues === 1 ? '' : 's'} across 5 queues`}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center flex-1 min-w-[280px]">
            {[
              { label: 'Failed renewals', value: failedRenewals.length,     color: '#DC2626' },
              { label: 'Password resets', value: pendingResets.length,      color: '#4F46E5' },
              { label: 'Withdrawals',     value: pendingWithdrawals.length, color: '#059669' },
              { label: 'Open alerts',     value: openAlerts.length,         color: '#F59E0B' },
              { label: 'Expiring comps',  value: expiringComps.length,      color: '#B45309' },
            ].map(x => (
              <div key={x.label} className="rounded-lg py-2" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div className="text-xl font-black" style={{ color: x.value ? x.color : '#94A3B8' }}>{x.value}</div>
                <div className="text-[10px]" style={{ color: '#64748B' }}>{x.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Failed renewals */}
        <Section title="Failed auto-renewals" Icon={AlertTriangle} color="#DC2626" count={failedRenewals.length}>
          {failedRenewals.length === 0 ? (
            <EmptyRow icon={AlertTriangle} message="No stuck renewals — all cards charging cleanly" />
          ) : (
            <div className="divide-y divide-slate-50">
              {failedRenewals.slice(0, 10).map(sub => (
                <div key={sub._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#0F172A' }}>{sub.estateId?.name || 'Unknown'}</div>
                    <div className="text-xs truncate" style={{ color: '#DC2626' }}>{sub.lastRenewalError || 'Unknown error'}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                      {sub.renewalAttempts > 1 && <>{sub.renewalAttempts} attempts · </>}
                      {sub.lastRenewalAttemptAt && formatDistanceToNow(new Date(sub.lastRenewalAttemptAt), { addSuffix: true })}
                    </div>
                  </div>
                  <Link to={`/estates/${sub.estateId?._id || sub.estateId}`}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ background: '#FEE2E2', color: '#B91C1C' }}>
                    Resolve <ArrowRight size={10} className="inline"/>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Pending password resets */}
        <Section title="Pending password resets" Icon={KeyRound} color="#4F46E5" count={pendingResets.length}>
          {pendingResets.length === 0 ? (
            <EmptyRow icon={KeyRound} message="No pending reset requests" />
          ) : (
            <div className="divide-y divide-slate-50">
              {pendingResets.slice(0, 10).map(req => (
                <div key={req._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#0F172A' }}>
                      {req.requesterName || req.userId?.name || 'Unknown'}
                      <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize"
                            style={{ background: '#F1F5F9', color: '#475569' }}>{req.requesterRole}</span>
                    </div>
                    <div className="text-xs truncate" style={{ color: '#64748B' }}>
                      {req.requesterEmail}
                      {req.requesterUnit ? ` · ${req.requesterUnit}` : ''}
                      {req.estateId?.name ? ` · ${req.estateId.name}` : ''}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                      <Clock size={9} className="inline mr-1" />
                      {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => approveReset(req)} disabled={busy[req._id]}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ background: '#059669', color: '#fff' }}>
                      {busy[req._id] ? '…' : <Check size={13}/>}
                    </button>
                    <button onClick={() => denyReset(req)} disabled={busy[req._id]}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                      <X size={13}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Pending withdrawals */}
        <Section title="Pending withdrawals" Icon={Wallet} color="#059669" count={pendingWithdrawals.length}>
          {pendingWithdrawals.length === 0 ? (
            <EmptyRow icon={Wallet} message="No manager payout requests pending" />
          ) : (
            <div className="divide-y divide-slate-50">
              {pendingWithdrawals.slice(0, 10).map(w => (
                <Link key={w._id} to="/withdrawals"
                  className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                  style={{ textDecoration: 'none' }}>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate" style={{ color: '#0F172A' }}>
                      {fmtNGN(w.amount)} <span className="font-normal text-xs" style={{ color: '#64748B' }}>· {w.estateId?.name || '—'}</span>
                    </div>
                    <div className="text-xs truncate" style={{ color: '#64748B' }}>
                      {w.bankName || '—'} · {w.accountName || ''}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                      {w.createdAt && formatDistanceToNow(new Date(w.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <ArrowRight size={14} style={{ color: '#CBD5E1' }} />
                </Link>
              ))}
              {pendingWithdrawals.length > 10 && (
                <Link to="/withdrawals" className="block px-5 py-3 text-center text-xs font-semibold" style={{ color: '#059669' }}>
                  View all {pendingWithdrawals.length} →
                </Link>
              )}
            </div>
          )}
        </Section>

        {/* Open security alerts */}
        <Section title="Open security alerts" Icon={Siren} color="#F59E0B" count={openAlerts.length}>
          {openAlerts.length === 0 ? (
            <EmptyRow icon={Siren} message="No open alerts" />
          ) : (
            <div className="divide-y divide-slate-50">
              {openAlerts.slice(0, 10).map(a => (
                <div key={a._id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate flex items-center gap-1.5" style={{ color: '#0F172A' }}>
                      {a.title || a.type || 'Alert'}
                      {a.severity === 'critical' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: '#DC2626', color: '#fff' }}>CRITICAL</span>
                      )}
                      {a.isEmergencyBroadcast && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: '#F59E0B', color: '#fff' }}>BROADCAST</span>
                      )}
                    </div>
                    <div className="text-xs truncate" style={{ color: '#64748B' }}>
                      {(a.note || a.message || '').slice(0, 100)}
                      {a.estateId?.name ? ` · ${a.estateId.name}` : ''}
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: '#94A3B8' }}>
                      {a.createdAt && formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => ackAlert(a)} disabled={busy[a._id]}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}
                      title="Acknowledge">
                      {busy[a._id] ? '…' : <Check size={13}/>}
                    </button>
                    <button onClick={() => resolveAlert(a)} disabled={busy[a._id]}
                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ background: '#059669', color: '#fff' }}
                      title="Resolve">
                      ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Comps expiring within 7 days */}
        <Section title="Comps expiring in 7 days" Icon={Gift} color="#B45309" count={expiringComps.length}>
          {expiringComps.length === 0 ? (
            <EmptyRow icon={Gift} message="No comps expiring soon" />
          ) : (
            <div className="divide-y divide-slate-50">
              {expiringComps.map(sub => {
                const expires = new Date(sub.comp.expiresAt);
                const daysLeft = Math.max(1, Math.ceil((expires.getTime() - Date.now()) / 86400000));
                return (
                  <Link key={sub._id} to="/subscriptions"
                    className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    style={{ textDecoration: 'none' }}>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: '#0F172A' }}>
                        {sub.estateId?.name || '—'}
                        <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' }}>
                          <Gift size={9} className="inline"/> {sub.comp.planId?.name || 'Comp'}
                        </span>
                      </div>
                      <div className="text-xs" style={{ color: '#64748B' }}>
                        {sub.comp.reason || 'No reason set'}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-black" style={{ color: '#B45309' }}>{daysLeft}d</div>
                      <div className="text-[10px]" style={{ color: '#94A3B8' }}>left</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>

        {/* MRR health summary */}
        <Section title="MRR health" Icon={CreditCard} color="#059669" count={subStats?.trial ?? 0}>
          <div className="divide-y divide-slate-50">
            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Paid MRR</div>
                <div className="text-xs" style={{ color: '#64748B' }}>Live, excludes comps</div>
              </div>
              <div className="text-lg font-black" style={{ color: '#059669' }}>{fmtNGN(subStats?.mrrPaid || subStats?.mrr || 0)}</div>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Gift MRR foregone</div>
                <div className="text-xs" style={{ color: '#64748B' }}>{subStats?.activeComp || 0} live comp{subStats?.activeComp === 1 ? '' : 's'}</div>
              </div>
              <div className="text-lg font-black" style={{ color: '#B45309' }}>{fmtNGN(subStats?.mrrComp || 0)}</div>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Trial pipeline</div>
                <div className="text-xs" style={{ color: '#64748B' }}>{subStats?.trial || 0} on trial</div>
              </div>
              <div className="text-lg font-black" style={{ color: '#2563EB' }}>{fmtNGN(subStats?.trialPipelineMrr || 0)}</div>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Renewals this week</div>
                <div className="text-xs" style={{ color: '#64748B' }}>{subStats?.renewalsDue7d || 0} subs due</div>
              </div>
              <Link to="/revenue" className="text-xs font-semibold flex items-center gap-1" style={{ color: '#7C3AED' }}>
                View schedule <ArrowRight size={10}/>
              </Link>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
