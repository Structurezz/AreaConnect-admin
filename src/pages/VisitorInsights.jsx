import { useEffect, useState } from 'react';
import { analyticsAPI } from '../api';
import toast from 'react-hot-toast';
import {
  Eye, Globe, Users, Smartphone, RefreshCw, Link2, Flag,
  TrendingUp, Monitor, Tablet, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const fmt = (n) => (n || 0).toLocaleString();

const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

function flagEmoji(code) {
  if (!code || code.length !== 2) return '🌐';
  const base = 0x1f1a5;
  return String.fromCodePoint(base + code.charCodeAt(0) - 60) +
         String.fromCodePoint(base + code.charCodeAt(1) - 60);
}

function Sparkline({ data = [], color = '#10B981' }) {
  if (!data.length) return <div className="text-xs" style={{ color: '#CBD5E1' }}>No data yet</div>;
  const w = 180, h = 36, pad = 2;
  const max = Math.max(...data.map(d => d.count), 1);
  const step = (w - pad * 2) / Math.max(data.length - 1, 1);
  const pts = data.map((d, i) => {
    const x = pad + i * step;
    const y = h - pad - ((d.count / max) * (h - pad * 2));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

function StatCard({ label, value, sub, color = '#10B981', icon: Icon }) {
  return (
    <div className="glass-card p-4 relative overflow-hidden">
      {Icon && (
        <div className="absolute -right-3 -top-3 opacity-10">
          <Icon size={64} style={{ color }} />
        </div>
      )}
      <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>{label}</div>
      <div className="text-2xl font-black mt-1 tracking-tight" style={{ color: '#0F172A' }}>{fmt(value)}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color }}>{sub}</div>}
    </div>
  );
}

function RankTable({ title, rows, nameKey, countKey = 'count', emptyText, renderName }) {
  const total = rows.reduce((s, r) => s + (r[countKey] || 0), 0);
  return (
    <div className="glass-card p-5">
      <div className="text-sm font-bold mb-3" style={{ color: '#0F172A' }}>{title}</div>
      {rows.length === 0 ? (
        <div className="text-xs py-4 text-center" style={{ color: '#CBD5E1' }}>{emptyText}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r, i) => {
            const pct = total ? Math.round((r[countKey] / total) * 100) : 0;
            return (
              <div key={i} className="relative">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: '#0F172A' }} className="font-medium truncate pr-2">
                    {renderName ? renderName(r) : r[nameKey]}
                  </span>
                  <span style={{ color: '#64748B' }} className="font-mono flex-shrink-0">
                    {fmt(r[countKey])} <span style={{ color: '#CBD5E1' }}>· {pct}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F1F5F9' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#10B981,#059669)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VisitorInsights() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [s, r] = await Promise.all([
        analyticsAPI.getStats(),
        analyticsAPI.getRecent({ limit: 50 }),
      ]);
      setStats(s.data.data);
      setRecent(r.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load visitor insights');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="h-full flex flex-col" style={{ minHeight: 0 }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between flex-shrink-0 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'linear-gradient(135deg,#10B981,#059669)' }}>
            <Eye size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>Visitor Insights</h1>
            <p className="text-sm" style={{ color: '#94A3B8' }}>Who's visiting areaconnect.pro — in real time</p>
          </div>
        </div>
        <button onClick={() => load(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: '#F1F5F9', color: '#0F172A' }}
          disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw size={22} className="animate-spin" style={{ color: '#10B981' }} />
          </div>
        ) : !stats ? (
          <div className="py-16 text-center text-sm" style={{ color: '#94A3B8' }}>No visitor data yet. Beacon starts collecting on first production deploy.</div>
        ) : (
          <div className="space-y-5">
            {/* Hero stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Visits today"    value={stats.totals.today} sub={`${fmt(stats.unique.today)} unique`} color="#10B981" icon={TrendingUp} />
              <StatCard label="Last 7 days"     value={stats.totals.week}  sub={`${fmt(stats.unique.week)} unique`}  color="#6366F1" icon={Users} />
              <StatCard label="Last 30 days"    value={stats.totals.month} sub={`${fmt(stats.unique.month)} unique`} color="#F59E0B" icon={Globe} />
              <StatCard label="All-time visits" value={stats.totals.all}   sub={`${fmt(stats.unique.all)} unique visitors`} color="#EC4899" icon={Eye} />
            </div>

            {/* Sparkline */}
            <div className="glass-card p-5 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Last 14 days</div>
                <div className="text-sm mt-1" style={{ color: '#0F172A' }}>
                  <span className="font-bold">{fmt(stats.byDay.reduce((s, d) => s + d.count, 0))}</span> visits across {stats.byDay.length} day{stats.byDay.length === 1 ? '' : 's'}
                </div>
              </div>
              <Sparkline data={stats.byDay} />
            </div>

            {/* Three-column rank tables */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <RankTable
                title="Top pages"
                rows={stats.topPages}
                countKey="count"
                emptyText="No pages tracked yet"
                renderName={(r) => (
                  <span className="font-mono" style={{ color: '#0F172A' }}>{r.path}</span>
                )}
              />
              <RankTable
                title="Top referrers"
                rows={stats.topReferrers}
                countKey="count"
                emptyText="No referrers yet — mostly direct traffic"
                renderName={(r) => (
                  <span className="flex items-center gap-1.5">
                    <Link2 size={11} style={{ color: '#64748B' }} />
                    <span>{r.host || 'Direct'}</span>
                  </span>
                )}
              />
              <RankTable
                title="Top countries"
                rows={stats.topCountries}
                countKey="count"
                emptyText="Geo lookup in progress — fills in after first visits"
                renderName={(r) => (
                  <span className="flex items-center gap-1.5">
                    <span>{flagEmoji(r.countryCode)}</span>
                    <span>{r.country}</span>
                  </span>
                )}
              />
            </div>

            {/* Device + Browser + UTM */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="glass-card p-5">
                <div className="text-sm font-bold mb-3" style={{ color: '#0F172A' }}>By device</div>
                <div className="flex gap-2 flex-wrap">
                  {stats.byDevice.length ? stats.byDevice.map(d => {
                    const Icon = DEVICE_ICON[d.device] || Monitor;
                    return (
                      <div key={d.device} className="flex-1 min-w-[90px] p-3 rounded-xl text-center"
                           style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <Icon size={16} className="mx-auto mb-1" style={{ color: '#10B981' }} />
                        <div className="text-lg font-black" style={{ color: '#0F172A' }}>{fmt(d.count)}</div>
                        <div className="text-[11px] capitalize" style={{ color: '#64748B' }}>{d.device || 'unknown'}</div>
                      </div>
                    );
                  }) : <div className="text-xs py-4 text-center w-full" style={{ color: '#CBD5E1' }}>No device data yet</div>}
                </div>
              </div>

              <RankTable
                title="Top browsers"
                rows={stats.byBrowser}
                countKey="count"
                emptyText="No browser data yet"
                renderName={(r) => r.browser || 'Other'}
              />

              <RankTable
                title="Top UTM sources"
                rows={stats.bySource}
                countKey="count"
                emptyText="No campaign-tagged visits yet"
                renderName={(r) => (
                  <span>
                    <span className="font-semibold" style={{ color: '#0F172A' }}>{r.source}</span>
                    {r.medium && <span className="ml-1 text-[11px]" style={{ color: '#94A3B8' }}>· {r.medium}</span>}
                  </span>
                )}
              />
            </div>

            {/* Recent visits timeline */}
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #E2E8F0' }}>
                <div className="text-sm font-bold" style={{ color: '#0F172A' }}>Recent visits</div>
                <div className="text-xs" style={{ color: '#94A3B8' }}>{recent.length} shown</div>
              </div>
              {recent.length === 0 ? (
                <div className="py-10 text-center text-sm" style={{ color: '#94A3B8' }}>No visits recorded yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#F8FAFC', color: '#94A3B8' }}>
                        <th className="text-left px-5 py-2 font-semibold uppercase tracking-wider text-[10px]">When</th>
                        <th className="text-left px-5 py-2 font-semibold uppercase tracking-wider text-[10px]">Page</th>
                        <th className="text-left px-5 py-2 font-semibold uppercase tracking-wider text-[10px]">From</th>
                        <th className="text-left px-5 py-2 font-semibold uppercase tracking-wider text-[10px]">Location</th>
                        <th className="text-left px-5 py-2 font-semibold uppercase tracking-wider text-[10px]">Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map(v => {
                        const Icon = DEVICE_ICON[v.device] || Monitor;
                        return (
                          <tr key={v._id} style={{ borderTop: '1px solid #F1F5F9' }}>
                            <td className="px-5 py-2.5" style={{ color: '#64748B' }}>
                              <span className="inline-flex items-center gap-1.5">
                                <Clock size={11} style={{ color: '#CBD5E1' }} />
                                {formatDistanceToNow(new Date(v.visitedAt), { addSuffix: true })}
                              </span>
                            </td>
                            <td className="px-5 py-2.5 font-mono" style={{ color: '#0F172A' }}>{v.path}</td>
                            <td className="px-5 py-2.5" style={{ color: '#64748B' }}>
                              {v.referrer
                                ? <span className="truncate inline-block max-w-[180px]" title={v.referrer}>
                                    {v.referrer.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                                  </span>
                                : v.utm?.source
                                  ? <span className="text-amber-600">utm:{v.utm.source}</span>
                                  : <span style={{ color: '#CBD5E1' }}>Direct</span>}
                            </td>
                            <td className="px-5 py-2.5">
                              {v.country
                                ? <span className="inline-flex items-center gap-1.5">
                                    <span>{flagEmoji(v.countryCode)}</span>
                                    <span style={{ color: '#0F172A' }}>{v.city ? `${v.city}, ${v.country}` : v.country}</span>
                                  </span>
                                : <span style={{ color: '#CBD5E1' }} className="inline-flex items-center gap-1">
                                    <Flag size={10} /> {v.timezone || 'Unknown'}
                                  </span>}
                            </td>
                            <td className="px-5 py-2.5">
                              <span className="inline-flex items-center gap-1.5 capitalize" style={{ color: '#64748B' }}>
                                <Icon size={12} style={{ color: '#10B981' }} />
                                {v.device || 'desktop'} · {v.browser || 'Other'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
