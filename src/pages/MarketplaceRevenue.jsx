import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ShoppingBag, RefreshCw, TrendingUp, Lock, Wallet, AlertTriangle, RotateCcw, Building2 } from 'lucide-react';
import { marketplaceAdminAPI } from '../api';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

// AreaConnect's marketplace revenue: the commission on every resident sale,
// money held in escrow, and what is owed to sellers.

const fmt = (n) => `₦${Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
const STATUS = {
  paid:      ['Awaiting delivery', 'yellow'],
  delivered: ['Delivered', 'blue'],
  disputed:  ['Disputed', 'red'],
  completed: ['Completed', 'green'],
  refunded:  ['Refunded', 'gray'],
  cancelled: ['Cancelled', 'gray'],
};
const RANGES = [[0, 'All time'], [30, '30 days'], [7, '7 days']];
const ORDER_TABS = [['all', 'All'], ['paid', 'Awaiting delivery'], ['delivered', 'Delivered'], ['disputed', 'Disputed'], ['completed', 'Completed'], ['refunded', 'Refunded'], ['refund_failed', 'Refund failed']];

function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <span className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
        <Icon size={18} className="text-[#98A2B3]" />
      </span>
      <p className="text-[13.5px] font-semibold text-[#101828]">{title}</p>
      {hint && <p className="mt-0.5 text-[12px] text-[#98A2B3]">{hint}</p>}
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
  const pct = Math.round((sum?.commissionRate ?? 0.2) * 100);

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in pb-12">
      <PageHeader
        title="Marketplace revenue"
        description={`${pct}% commission on every resident sale · paid through Paystack, held in escrow until delivery.`}
        actions={<>
          <div className="tabs">
            {RANGES.map(([d, l]) => <button key={d} onClick={() => setDays(d)} className={`tab ${days === d ? 'active' : ''}`}>{l}</button>)}
          </div>
          <button onClick={load} className="btn-outline !px-2.5" aria-label="Refresh"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </>}
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard icon={TrendingUp} label="Commission earned" value={fmt(sum?.commissionEarned)} color="green"
          hint={`+ ${fmt(sum?.commissionPending)} pending in escrow`} />
        <StatCard icon={ShoppingBag} label="Sales volume (GMV)" value={fmt(sum?.gmv)} color="blue"
          hint={`${sum?.orders || 0} orders · ${sum?.completed || 0} completed`} />
        <StatCard icon={Lock} label="Held in escrow" value={fmt(sum?.sellers?.escrow)} color="amber"
          hint="Released when buyers confirm" />
        <StatCard icon={Wallet} label="Owed to sellers" value={fmt(sum?.sellers?.available)} color="purple"
          hint={`${fmt(sum?.payouts?.success?.total)} paid out · ${fmt(sum?.payouts?.pending?.total)} processing`} />
      </div>
      {(sum?.disputed > 0 || sum?.refunded?.n > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {sum.disputed > 0 && <span className="badge badge-red !text-[12px] !px-2.5 !py-1"><AlertTriangle size={12} /> {sum.disputed} open dispute{sum.disputed > 1 ? 's' : ''} (estate managers resolve these)</span>}
          {sum.refunded?.n > 0 && <span className="badge badge-gray !text-[12px] !px-2.5 !py-1 tabular-nums">{sum.refunded.n} refunded · {fmt(sum.refunded.amount)}</span>}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="lg:col-span-2 card min-w-0">
          <div className="card-header">
            <div>
              <div className="card-title">Commission</div>
              <div className="card-sub">Last 30 days · completed sales</div>
            </div>
          </div>
          <div className="p-5">
            {(sum?.byDay || []).length === 0 ? <Empty icon={TrendingUp} title="No completed sales yet" hint="Daily commission will chart here." /> : (
              <div className="flex items-end gap-1 h-40 border-b border-[#F2F4F7]">
                {sum.byDay.map((d) => (
                  <div key={d._id} className="flex-1 max-w-[32px] flex flex-col items-center justify-end h-full group relative">
                    <div className="w-full rounded-t-[3px] bg-[#059669]/80 group-hover:bg-[#059669]" style={{ height: `${Math.max(4, (d.commission / maxDay) * 100)}%` }} />
                    <span className="absolute -top-6 text-[10px] font-medium text-[#344054] bg-white border border-[#E4E7EC] rounded px-1 opacity-0 group-hover:opacity-100 whitespace-nowrap tabular-nums z-10">{d._id.slice(5)} · {fmt(d.commission)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card min-w-0">
          <div className="card-header">
            <div>
              <div className="card-title">Top estates</div>
              <div className="card-sub">Completed sales → our cut</div>
            </div>
          </div>
          {(sum?.byEstate || []).length === 0 ? <Empty icon={Building2} title="No sales yet" /> : (
            <table className="table">
              <thead>
                <tr><th>Estate</th><th className="!text-right">Gross</th><th className="!text-right">Commission</th></tr>
              </thead>
              <tbody>
                {sum.byEstate.slice(0, 8).map((e) => (
                  <tr key={e.estateId}>
                    <td className="!py-2.5 max-w-[140px]"><div className="truncate text-[#101828]">{e.name}</div></td>
                    <td className="!py-2.5 text-right tabular-nums text-[12px] text-[#98A2B3] whitespace-nowrap">{fmt(e.gross)}</td>
                    <td className="!py-2.5 text-right tabular-nums font-semibold text-[#067647] whitespace-nowrap">{fmt(e.commission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <div className="card-title">Orders</div>
            <div className="card-sub">Every marketplace sale and where the money sits</div>
          </div>
        </div>
        <div className="px-4 py-3 border-b border-[#E4E7EC] overflow-x-auto">
          <div className="tabs">
            {ORDER_TABS.map(([id, l]) => (
              <button key={id} onClick={() => setStatus(id)} className={`tab ${status === id ? 'active' : ''}`}>{l}</button>
            ))}
          </div>
        </div>
        {orders === null ? (
          <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-9" />)}</div>
        ) : orders.length === 0 ? <Empty icon={ShoppingBag} title="No orders" hint="Nothing matches this status filter." /> : (
          <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
            <table className="table min-w-[900px]">
              <thead>
                <tr>
                  <th>Order</th><th>Estate</th><th>Buyer → Seller</th>
                  <th className="!text-right">Amount</th><th className="!text-right">Our {pct}%</th><th className="!text-right">Seller</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const [label, badge] = STATUS[o.status] || [o.status, 'gray'];
                  return (
                    <tr key={o._id}>
                      <td><div className="cell-strong">{o.title}{o.quantity > 1 ? ` ×${o.quantity}` : ''}</div><div className="text-[11px] text-[#98A2B3] mt-0.5"><span className="font-mono">{o.reference}</span>{o.paidAt ? ` · ${formatDistanceToNow(new Date(o.paidAt), { addSuffix: true })}` : ''}</div></td>
                      <td>{o.estateId?.name || '—'}</td>
                      <td>{o.buyerId?.name || '—'} → {o.sellerId?.name || '—'}</td>
                      <td className="text-right tabular-nums font-semibold text-[#101828] whitespace-nowrap">{fmt(o.amount)}</td>
                      <td className={`text-right tabular-nums font-semibold whitespace-nowrap ${o.status === 'completed' ? '!text-[#067647]' : o.status === 'refunded' ? '!text-[#D0D5DD] line-through' : '!text-[#98A2B3]'}`}>{fmt(o.commission)}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{fmt(o.sellerAmount)}</td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`badge badge-${badge}`}>{label}</span>
                          {o.refund?.status === 'failed' && (
                            <button onClick={() => retry(o)} className="btn-outline !px-2 !py-0.5 !text-[11.5px] !text-[#B42318]"><RotateCcw size={11} /> Retry refund</button>
                          )}
                        </div>
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
