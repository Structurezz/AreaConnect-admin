import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ShoppingBag, RefreshCw, TrendingUp, Lock, Wallet, AlertTriangle, RotateCcw, Building2 } from 'lucide-react';
import { marketplaceAdminAPI } from '../api';

// AreaConnect's marketplace revenue: the commission on every resident sale,
// money held in escrow, and what is owed to sellers.

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const STATUS = {
  paid:      ['Awaiting delivery', '#FEF3C7', '#92400E'],
  delivered: ['Delivered', '#E0F2FE', '#0369A1'],
  disputed:  ['Disputed', '#FEE2E2', '#B91C1C'],
  completed: ['Completed', '#ECFDF5', '#047857'],
  refunded:  ['Refunded', '#F1F5F9', '#475569'],
  cancelled: ['Cancelled', '#F1F5F9', '#64748B'],
};
const RANGES = [[0, 'All time'], [30, '30 days'], [7, '7 days']];

function Stat({ icon: Icon, label, value, sub, tone = '#4F46E5' }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Icon size={14} style={{ color: tone }} /> {label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function MarketplaceRevenue() {
  const [days, setDays] = useState(0);
  const [sum, setSum] = useState(null);
  const [orders, setOrders] = useState(null);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([
        marketplaceAdminAPI.summary(days),
        marketplaceAdminAPI.orders(status === 'refund_failed' ? { status: 'refunded', refundFailed: 1 } : { status }),
      ]);
      setSum(s.data.data); setOrders(o.data.data);
    } catch { toast.error('Failed to load marketplace revenue'); }
    finally { setLoading(false); }
  }, [days, status]);
  useEffect(() => { load(); }, [load]);

  const retry = async (o) => {
    try { const { data } = await marketplaceAdminAPI.retryRefund(o._id); data.success ? toast.success('Refund sent') : toast.error(data.message); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Retry failed'); }
  };

  const maxDay = Math.max(1, ...(sum?.byDay || []).map((d) => d.commission));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShoppingBag size={22} className="text-indigo-600" /> Marketplace revenue</h1>
          <p className="text-sm text-slate-500">{Math.round((sum?.commissionRate ?? 0.2) * 100)}% commission on every resident sale · paid through Paystack, held in escrow until delivery</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-slate-100">
            {RANGES.map(([d, l]) => <button key={d} onClick={() => setDays(d)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${days === d ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>{l}</button>)}
          </div>
          <button onClick={load} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center" aria-label="Refresh"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={TrendingUp} label="Commission earned" value={fmt(sum?.commissionEarned)} sub={`+ ${fmt(sum?.commissionPending)} pending in escrow`} tone="#059669" />
        <Stat icon={ShoppingBag} label="Sales volume (GMV)" value={fmt(sum?.gmv)} sub={`${sum?.orders || 0} orders · ${sum?.completed || 0} completed`} />
        <Stat icon={Lock} label="Held in escrow" value={fmt(sum?.sellers?.escrow)} sub="Released when buyers confirm" tone="#D97706" />
        <Stat icon={Wallet} label="Owed to sellers" value={fmt(sum?.sellers?.available)} sub={`${fmt(sum?.payouts?.success?.total)} paid out · ${fmt(sum?.payouts?.pending?.total)} processing`} tone="#7C3AED" />
      </div>
      {(sum?.disputed > 0 || sum?.refunded?.n > 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {sum.disputed > 0 && <span className="px-3 py-1.5 rounded-full bg-red-50 text-red-700 font-semibold inline-flex items-center gap-1.5"><AlertTriangle size={14} /> {sum.disputed} open dispute{sum.disputed > 1 ? 's' : ''} (estate managers resolve these)</span>}
          {sum.refunded?.n > 0 && <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-semibold">{sum.refunded.n} refunded · {fmt(sum.refunded.amount)}</span>}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-900 mb-3">Commission · last 30 days</p>
          {(sum?.byDay || []).length === 0 ? <p className="text-sm text-slate-400 py-10 text-center">No completed sales yet</p> : (
            <div className="flex items-end gap-1 h-40 border-b border-slate-100">
              {sum.byDay.map((d) => (
                <div key={d._id} className="flex-1 max-w-[32px] flex flex-col items-center justify-end h-full group relative">
                  <div className="w-full rounded-t-md bg-indigo-500/80 group-hover:bg-indigo-600" style={{ height: `${Math.max(4, (d.commission / maxDay) * 100)}%` }} />
                  <span className="absolute -top-6 text-[10px] font-semibold text-slate-700 opacity-0 group-hover:opacity-100 whitespace-nowrap">{d._id.slice(5)} · {fmt(d.commission)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-900 mb-3">Top estates <span className="font-normal text-xs text-slate-400">· completed sales → our cut</span></p>
          {(sum?.byEstate || []).length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">No sales yet</p> : (
            <ul className="space-y-2.5">
              {sum.byEstate.slice(0, 8).map((e) => (
                <li key={e.estateId} className="flex items-center gap-2 text-sm">
                  <Building2 size={14} className="text-slate-400 shrink-0" />
                  <span className="flex-1 truncate text-slate-700">{e.name}</span>
                  <span className="text-xs text-slate-400">{fmt(e.gross)}</span>
                  <span className="font-semibold text-emerald-700 w-20 text-right">{fmt(e.commission)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-slate-100 overflow-x-auto">
          {[['all', 'All'], ['paid', 'Awaiting delivery'], ['delivered', 'Delivered'], ['disputed', 'Disputed'], ['completed', 'Completed'], ['refunded', 'Refunded'], ['refund_failed', 'Refund failed']].map(([id, l]) => (
            <button key={id} onClick={() => setStatus(id)} className={`shrink-0 px-3 py-1.5 rounded-full text-[13px] font-semibold ${status === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>
          ))}
        </div>
        {orders === null ? <div className="py-12 flex justify-center"><RefreshCw size={20} className="animate-spin text-slate-400" /></div>
          : orders.length === 0 ? <p className="py-12 text-center text-sm text-slate-400">No orders</p> : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr><th className="text-left p-3">Order</th><th className="text-left p-3">Estate</th><th className="text-left p-3">Buyer → Seller</th><th className="text-right p-3">Amount</th><th className="text-right p-3">Our 20%</th><th className="text-right p-3">Seller</th><th className="text-left p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const [label, bg, color] = STATUS[o.status] || [o.status, '#F1F5F9', '#475569'];
                  return (
                    <tr key={o._id} className="hover:bg-slate-50">
                      <td className="p-3"><div className="font-semibold text-slate-900">{o.title}{o.quantity > 1 ? ` ×${o.quantity}` : ''}</div><div className="text-[11px] text-slate-400">{o.reference} · {o.paidAt ? formatDistanceToNow(new Date(o.paidAt), { addSuffix: true }) : ''}</div></td>
                      <td className="p-3 text-slate-600">{o.estateId?.name || '—'}</td>
                      <td className="p-3 text-slate-600">{o.buyerId?.name || '—'} → {o.sellerId?.name || '—'}</td>
                      <td className="p-3 text-right font-semibold">{fmt(o.amount)}</td>
                      <td className={`p-3 text-right font-semibold ${o.status === 'completed' ? 'text-emerald-700' : o.status === 'refunded' ? 'text-slate-300 line-through' : 'text-slate-400'}`}>{fmt(o.commission)}</td>
                      <td className="p-3 text-right text-slate-600">{fmt(o.sellerAmount)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ background: bg, color }}>{label}</span>
                        {o.refund?.status === 'failed' && (
                          <button onClick={() => retry(o)} className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-red-600"><RotateCcw size={11} /> Retry refund</button>
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
    </div>
  );
}
