import { useEffect, useState } from 'react';
import { analyticsAPI } from '../api';
import toast from 'react-hot-toast';
import {
  Eye, Globe, Users, Smartphone, RefreshCw, Link2, Flag,
  TrendingUp, Monitor, Tablet, Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const fmt = (n) => (n || 0).toLocaleString();

const DEVICE_ICON = { desktop: Monitor, mobile: Smartphone, tablet: Tablet };

function CountryTag({ code }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[24px] h-[18px] px-1 rounded border border-[#E4E7EC] bg-[#F9FAFB] text-[10px] font-semibold text-[#475467] uppercase tracking-wide">
      {code && code.length === 2 ? code : <Globe size={10} />}
    </span>
  );
}

function Sparkline({ data = [], color = '#059669' }) {
  if (!data.length) return <div className="text-[12px] text-[#98A2B3]">No data yet</div>;
  const w = 560, h = 64, pad = 3;
  const max = Math.max(...data.map(d => d.count), 1);
  const step = (w - pad * 2) / Math.max(data.length - 1, 1);
  const coords = data.map((d, i) => [pad + i * step, h - pad - ((d.count / max) * (h - pad * 2))]);
  const pts = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${pad},${h - pad} ${pts} ${(pad + (data.length - 1) * step).toFixed(1)},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-16 block">
      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="#F2F4F7" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      <polygon points={area} fill={color} fillOpacity="0.08" />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function RankTable({ title, rows, nameKey, countKey = 'count', emptyText, renderName }) {
  const total = rows.reduce((s, r) => s + (r[countKey] || 0), 0);
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h2 className="card-title">{title}</h2>
        {rows.length > 0 && <span className="text-[11.5px] text-[#98A2B3] tabular-nums">{fmt(total)}</span>}
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-[12.5px] text-[#98A2B3]">{emptyText}</div>
      ) : (
        <div className="p-5 space-y-3">
          {rows.map((r, i) => {
            const pct = total ? Math.round((r[countKey] / total) * 100) : 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between text-[12.5px] mb-1.5 gap-2">
                  <span className="text-[#101828] font-medium truncate min-w-0">
                    {renderName ? renderName(r) : r[nameKey]}
                  </span>
                  <span className="flex-shrink-0 tabular-nums text-[#475467]">
                    {fmt(r[countKey])} <span className="text-[#98A2B3] ml-1">{pct}%</span>
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-[#F2F4F7]">
                  <div className="h-full rounded-full bg-[#059669]" style={{ width: `${pct}%` }} />
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
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Visitor insights"
        description="Who's visiting areaconnect.pro, in real time."
        actions={(
          <button onClick={() => load(true)} className="btn-outline gap-2" disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        )}
      />

      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-[104px] !rounded-xl" />)}
          </div>
          <div className="skeleton h-32 !rounded-xl" />
          <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-48 !rounded-xl" />)}
          </div>
        </div>
      ) : !stats ? (
        <div className="card flex flex-col items-center justify-center py-14 text-center">
          <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
            <Eye size={18} className="text-[#98A2B3]" />
          </div>
          <p className="text-[14px] font-semibold text-[#101828]">No visitor data yet</p>
          <p className="text-[12.5px] text-[#98A2B3] mt-0.5">Beacon starts collecting on first production deploy.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPI stats */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visits today"    value={stats.totals.today} hint={`${fmt(stats.unique.today)} unique`} color="green"  icon={TrendingUp} />
            <StatCard label="Last 7 days"     value={stats.totals.week}  hint={`${fmt(stats.unique.week)} unique`}  color="blue"   icon={Users} />
            <StatCard label="Last 30 days"    value={stats.totals.month} hint={`${fmt(stats.unique.month)} unique`} color="amber"  icon={Globe} />
            <StatCard label="All-time visits" value={stats.totals.all}   hint={`${fmt(stats.unique.all)} unique visitors`} color="purple" icon={Eye} />
          </div>

          {/* Trend */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <div>
                <h2 className="card-title">Last 14 days</h2>
                <p className="card-sub">
                  <span className="font-semibold text-[#475467] tabular-nums">{fmt(stats.byDay.reduce((s, d) => s + d.count, 0))}</span> visits across {stats.byDay.length} day{stats.byDay.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              <Sparkline data={stats.byDay} />
            </div>
          </div>

          {/* Three-column rank tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RankTable
              title="Top pages"
              rows={stats.topPages}
              countKey="count"
              emptyText="No pages tracked yet"
              renderName={(r) => <span className="font-mono text-[12px] text-[#101828]">{r.path}</span>}
            />
            <RankTable
              title="Top referrers"
              rows={stats.topReferrers}
              countKey="count"
              emptyText="No referrers yet — mostly direct traffic"
              renderName={(r) => (
                <span className="flex items-center gap-1.5 min-w-0">
                  <Link2 size={12} className="text-[#98A2B3] flex-shrink-0" />
                  <span className="truncate">{r.host || 'Direct'}</span>
                </span>
              )}
            />
            <RankTable
              title="Top countries"
              rows={stats.topCountries}
              countKey="count"
              emptyText="Geo lookup in progress — fills in after first visits"
              renderName={(r) => (
                <span className="flex items-center gap-2 min-w-0">
                  <CountryTag code={r.countryCode} />
                  <span className="truncate">{r.country}</span>
                </span>
              )}
            />
          </div>

          {/* Device + Browser + UTM */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card overflow-hidden">
              <div className="card-header">
                <h2 className="card-title">By device</h2>
              </div>
              {stats.byDevice.length ? (
                <div className="grid grid-cols-3 divide-x divide-[#E4E7EC]">
                  {stats.byDevice.map(d => {
                    const Icon = DEVICE_ICON[d.device] || Monitor;
                    return (
                      <div key={d.device} className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-[12px] text-[#475467] capitalize">
                          <Icon size={13} className="text-[#98A2B3]" /> {d.device || 'unknown'}
                        </div>
                        <div className="text-[20px] font-semibold text-[#101828] tabular-nums mt-1">{fmt(d.count)}</div>
                      </div>
                    );
                  })}
                </div>
              ) : <div className="px-5 py-8 text-center text-[12.5px] text-[#98A2B3]">No device data yet</div>}
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
                  <span className="font-semibold text-[#101828]">{r.source}</span>
                  {r.medium && <span className="ml-1 text-[11.5px] text-[#98A2B3]">· {r.medium}</span>}
                </span>
              )}
            />
          </div>

          {/* Recent visits */}
          <div className="card overflow-hidden">
            <div className="card-header">
              <h2 className="card-title">Recent visits</h2>
              <span className="card-sub tabular-nums">{recent.length} shown</span>
            </div>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-9 h-9 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-2.5">
                  <Clock size={16} className="text-[#98A2B3]" />
                </div>
                <p className="text-[13px] font-semibold text-[#101828]">No visits recorded yet</p>
                <p className="text-[12px] text-[#98A2B3]">Visits will appear here as they happen.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table min-w-[720px]">
                  <thead>
                    <tr>
                      <th className="text-left">When</th>
                      <th className="text-left">Page</th>
                      <th className="text-left">From</th>
                      <th className="text-left">Location</th>
                      <th className="text-left">Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(v => {
                      const Icon = DEVICE_ICON[v.device] || Monitor;
                      return (
                        <tr key={v._id}>
                          <td className="whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                              <Clock size={12} className="text-[#98A2B3]" />
                              {formatDistanceToNow(new Date(v.visitedAt), { addSuffix: true })}
                            </span>
                          </td>
                          <td className="font-mono text-[12px] !text-[#101828]">{v.path}</td>
                          <td>
                            {v.referrer
                              ? <span className="truncate inline-block max-w-[180px] align-middle" title={v.referrer}>
                                  {v.referrer.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
                                </span>
                              : v.utm?.source
                                ? <span className="badge badge-yellow">utm:{v.utm.source}</span>
                                : <span className="text-[#98A2B3]">Direct</span>}
                          </td>
                          <td>
                            {v.country
                              ? <span className="inline-flex items-center gap-2">
                                  <CountryTag code={v.countryCode} />
                                  <span className="text-[#101828]">{v.city ? `${v.city}, ${v.country}` : v.country}</span>
                                </span>
                              : <span className="inline-flex items-center gap-1 text-[#98A2B3]">
                                  <Flag size={11} /> {v.timezone || 'Unknown'}
                                </span>}
                          </td>
                          <td>
                            <span className="inline-flex items-center gap-1.5 capitalize whitespace-nowrap">
                              <Icon size={13} className="text-[#98A2B3]" />
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
  );
}
