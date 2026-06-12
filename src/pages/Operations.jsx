import { useEffect, useState } from 'react';
import {
  AlertTriangle, Clock, Building2, CreditCard, RefreshCw, CheckCircle,
  XCircle, ArrowRight, UserX, Activity, Users, TrendingDown,
} from 'lucide-react';
import { planAPI, estateAPI } from '../api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';

function SectionCard({ title, count, icon: Icon, color, bg, children, emptyIcon: EmptyIcon, emptyMsg, actionLabel, actionTo }) {
  const navigate = useNavigate();
  return (
    <div className="glass-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: bg }}>
            <Icon size={15} style={{ color }} />
          </div>
          <h2 className="text-sm font-semibold" style={{ color: '#0F172A' }}>{title}</h2>
          {count > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: bg, color }}>
              {count}
            </span>
          )}
        </div>
        {count > 0 && actionTo && (
          <button onClick={() => navigate(actionTo)}
            className="flex items-center gap-1 text-xs font-medium transition-colors"
            style={{ color: '#94A3B8' }}
            onMouseEnter={e => e.currentTarget.style.color = '#059669'}
            onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
            {actionLabel || 'Manage'} <ArrowRight size={10} />
          </button>
        )}
      </div>
      {count === 0 ? (
        <div className="px-5 py-10 text-center">
          <CheckCircle size={22} className="mx-auto mb-2" style={{ color: '#10B981' }} />
          <p className="text-sm" style={{ color: '#94A3B8' }}>{emptyMsg || 'All clear'}</p>
        </div>
      ) : children}
    </div>
  );
}

export default function Operations() {
  const [subs, setSubs]       = useState([]);
  const [estates, setEstates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([planAPI.getSubscriptions(), estateAPI.getAll()])
      .then(([s, e]) => { setSubs(s.data.data); setEstates(e.data.data); })
      .catch(() => toast.error('Failed to load operations data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-32">
      <RefreshCw size={24} className="animate-spin" style={{ color: '#10B981' }} />
    </div>
  );

  const now    = new Date();
  const in14   = new Date(now.getTime() + 14 * 86400000);
  const in3    = new Date(now.getTime() + 3 * 86400000);

  const expiringSoon = subs
    .filter(s => s.status === 'trial' && s.trialEndsAt && new Date(s.trialEndsAt) <= in14)
    .sort((a, b) => new Date(a.trialEndsAt) - new Date(b.trialEndsAt));

  const subEstateIds   = new Set(subs.map(s => s.estateId?._id?.toString() || s.estateId?.toString()));
  const estatesNoSub   = estates.filter(e => !subEstateIds.has(e._id?.toString()));
  const estatesNoMgr   = estates.filter(e => !e.managerId);
  const inactiveEstates = estates.filter(e => !e.isActive);

  const lapsed = subs
    .filter(s => s.status === 'expired' || s.status === 'cancelled')
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

  const daysLeft = (date) => Math.ceil((new Date(date) - now) / 86400000);

  // Health score: 100 minus deductions
  const issues = [
    expiringSoon.length > 0,
    estatesNoSub.length > 0,
    estatesNoMgr.length > 0,
    lapsed.length > 0,
    inactiveEstates.length > 0,
  ].filter(Boolean).length;
  const healthScore = Math.max(0, 100 - issues * 20);
  const healthColor = healthScore >= 80 ? '#059669' : healthScore >= 60 ? '#D97706' : '#DC2626';
  const healthBg    = healthScore >= 80 ? 'rgba(5,150,105,0.08)' : healthScore >= 60 ? 'rgba(217,119,6,0.08)' : 'rgba(220,38,38,0.08)';

  const summaryItems = [
    {
      label: 'Trials Expiring',      count: expiringSoon.length,
      color: expiringSoon.length > 0 ? '#D97706' : '#059669',
      bg:    expiringSoon.length > 0 ? 'rgba(217,119,6,0.10)' : 'rgba(5,150,105,0.10)',
      icon: Clock, desc: 'Within 14 days',
    },
    {
      label: 'No Subscription',       count: estatesNoSub.length,
      color: estatesNoSub.length > 0 ? '#DC2626' : '#059669',
      bg:    estatesNoSub.length > 0 ? 'rgba(220,38,38,0.10)' : 'rgba(5,150,105,0.10)',
      icon: CreditCard, desc: 'Unassigned plan',
    },
    {
      label: 'No Manager',            count: estatesNoMgr.length,
      color: estatesNoMgr.length > 0 ? '#D97706' : '#059669',
      bg:    estatesNoMgr.length > 0 ? 'rgba(217,119,6,0.10)' : 'rgba(5,150,105,0.10)',
      icon: UserX, desc: 'Unmanaged estates',
    },
    {
      label: 'Lapsed Subscriptions',  count: lapsed.length,
      color: lapsed.length > 0 ? '#D97706' : '#059669',
      bg:    lapsed.length > 0 ? 'rgba(217,119,6,0.10)' : 'rgba(5,150,105,0.10)',
      icon: AlertTriangle, desc: 'Expired or cancelled',
    },
    {
      label: 'Inactive Estates',      count: inactiveEstates.length,
      color: inactiveEstates.length > 0 ? '#94A3B8' : '#059669',
      bg:    inactiveEstates.length > 0 ? 'rgba(148,163,184,0.10)' : 'rgba(5,150,105,0.10)',
      icon: Building2, desc: 'Deactivated',
    },
  ];

  const allClear = issues === 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Operations</h1>
          <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Platform health, watchlists, and operational oversight</p>
        </div>
        {/* Health Score */}
        <div className="glass-card px-5 py-3 flex items-center gap-4"
          style={{ border: `1px solid ${healthBg}` }}>
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none"
                stroke={healthColor} strokeWidth="3"
                strokeDasharray={`${healthScore} 100`}
                strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold" style={{ color: healthColor }}>{healthScore}</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: '#0F172A' }}>Health Score</div>
            <div className="text-xs" style={{ color: healthColor }}>
              {healthScore >= 80 ? 'Platform healthy' : healthScore >= 60 ? 'Needs attention' : 'Critical issues'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{issues} issue{issues !== 1 ? 's' : ''} detected</div>
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryItems.map(({ label, count, color, bg, icon: Icon, desc }) => (
          <div key={label} className="glass-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: bg }}>
              {count === 0 ? <CheckCircle size={18} style={{ color: '#10B981' }} /> : <Icon size={18} style={{ color }} />}
            </div>
            <div>
              <div className="text-xl font-bold" style={{ color: '#0F172A' }}>{count}</div>
              <div className="text-xs font-semibold" style={{ color }}>{label}</div>
              <div className="text-xs" style={{ color: '#94A3B8' }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {allClear ? (
        <div className="glass-card p-12 text-center">
          <CheckCircle size={32} className="mx-auto mb-3" style={{ color: '#10B981' }} />
          <h3 className="font-semibold text-lg mb-1" style={{ color: '#0F172A' }}>Platform is healthy</h3>
          <p className="text-sm" style={{ color: '#94A3B8' }}>
            No operational issues detected. All estates have active subscriptions and managers.
          </p>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Expiring Trials */}
            <SectionCard title="Trials Expiring Soon" count={expiringSoon.length}
              icon={Clock} color="#D97706" bg="rgba(217,119,6,0.10)"
              emptyMsg="No trials expiring in the next 14 days"
              actionLabel="Manage" actionTo="/subscriptions">
              {expiringSoon.map(sub => {
                const days   = daysLeft(sub.trialEndsAt);
                const urgent = days <= 3;
                return (
                  <div key={sub._id} className="px-5 py-3.5 flex items-center justify-between transition-colors"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                        style={{ background: urgent ? 'rgba(220,38,38,0.10)' : 'rgba(217,119,6,0.10)', color: urgent ? '#DC2626' : '#D97706' }}>
                        {sub.estateId?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#0F172A' }}>
                          {sub.estateId?.name || '—'}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                          {sub.planId?.name || '—'} plan · trial
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={urgent
                          ? { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }
                          : { background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                        {days <= 0 ? 'Expired' : `${days}d left`}
                      </span>
                      <button onClick={() => navigate('/subscriptions')}
                        className="text-xs font-medium transition-colors flex items-center gap-1"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                        Convert <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </SectionCard>

            {/* Estates Without Subscription */}
            <SectionCard title="Estates Without Subscription" count={estatesNoSub.length}
              icon={CreditCard} color="#DC2626" bg="rgba(220,38,38,0.10)"
              emptyMsg="All estates have subscriptions assigned"
              actionLabel="Assign" actionTo="/subscriptions">
              {estatesNoSub.map(estate => (
                <div key={estate._id} className="px-5 py-3.5 flex items-center justify-between transition-colors"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{ background: 'rgba(220,38,38,0.10)', color: '#DC2626' }}>
                      {estate.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{estate.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {estate.estateCode} · {estate.managerId?.name || 'No manager'} ·
                        <span className="ml-1">{estate.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => navigate('/subscriptions')}
                    className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                    <CreditCard size={11} /> Assign <ArrowRight size={10} />
                  </button>
                </div>
              ))}
            </SectionCard>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Unmanaged Estates */}
            <SectionCard title="Unmanaged Estates" count={estatesNoMgr.length}
              icon={UserX} color="#D97706" bg="rgba(217,119,6,0.10)"
              emptyMsg="All estates have managers assigned"
              actionLabel="Assign" actionTo="/users">
              {estatesNoMgr.map(estate => (
                <div key={estate._id} className="px-5 py-3.5 flex items-center justify-between transition-colors"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{ background: 'rgba(217,119,6,0.10)', color: '#D97706' }}>
                      {estate.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{estate.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {estate.estateCode} · Created {format(new Date(estate.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${estate.isActive ? 'badge-green' : 'badge-red'}`}
                      style={estate.isActive
                        ? { background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }
                        : { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                      {estate.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button onClick={() => navigate(`/estates/${estate._id}`)}
                      className="text-xs font-medium transition-colors flex items-center gap-1"
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                      View <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </SectionCard>

            {/* Inactive Estates */}
            <SectionCard title="Inactive Estates" count={inactiveEstates.length}
              icon={Building2} color="#94A3B8" bg="rgba(148,163,184,0.10)"
              emptyMsg="All estates are currently active"
              actionLabel="Manage" actionTo="/estates">
              {inactiveEstates.map(estate => (
                <div key={estate._id} className="px-5 py-3.5 flex items-center justify-between transition-colors"
                  style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0"
                      style={{ background: 'rgba(148,163,184,0.10)', color: '#94A3B8' }}>
                      {estate.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: '#0F172A' }}>{estate.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {estate.estateCode}
                        {estate.managerId ? ` · ${estate.managerId.name}` : ' · No manager'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => navigate(`/estates/${estate._id}`)}
                    className="text-xs font-medium transition-colors flex items-center gap-1"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                    Reactivate <ArrowRight size={10} />
                  </button>
                </div>
              ))}
            </SectionCard>
          </div>

          {/* Lapsed Subscriptions */}
          {lapsed.length > 0 && (
            <SectionCard title="Lapsed Subscriptions" count={lapsed.length}
              icon={AlertTriangle} color="#D97706" bg="rgba(217,119,6,0.10)"
              emptyMsg="No lapsed subscriptions"
              actionLabel="View all" actionTo="/subscriptions">
              {lapsed.slice(0, 10).map(sub => {
                const price = sub.cycle === 'annual' ? sub.planId?.price?.annual : sub.planId?.price?.monthly;
                return (
                  <div key={sub._id} className="px-5 py-3.5 flex items-center justify-between transition-colors"
                    style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <div className="flex items-center gap-3">
                      <XCircle size={14} style={{ color: '#DC2626', opacity: 0.6, flexShrink: 0 }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: '#0F172A' }}>
                          {sub.estateId?.name || '—'}
                        </div>
                        <div className="text-xs" style={{ color: '#94A3B8' }}>
                          {sub.planId?.name || '—'} ·
                          <span className="ml-1 capitalize">{sub.status}</span>
                          {price > 0 && <span className="ml-1">· ₦{price.toLocaleString()}/{sub.cycle === 'annual' ? 'yr' : 'mo'}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs hidden sm:block" style={{ color: '#CBD5E1' }}>
                        {formatDistanceToNow(new Date(sub.updatedAt), { addSuffix: true })}
                      </span>
                      <button onClick={() => navigate('/subscriptions')}
                        className="text-xs font-medium transition-colors flex items-center gap-1"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                        Reactivate <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {lapsed.length > 10 && (
                <div className="px-5 py-3 text-center" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                  <button onClick={() => navigate('/subscriptions')}
                    className="text-xs transition-colors"
                    style={{ color: '#94A3B8' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#059669'}
                    onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}>
                    View all {lapsed.length} lapsed subscriptions →
                  </button>
                </div>
              )}
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}
