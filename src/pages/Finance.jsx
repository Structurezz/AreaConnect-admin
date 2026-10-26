import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, Receipt, ArrowUpRight, CreditCard } from 'lucide-react';
import { withdrawalAPI } from '../api';
import Revenue from './Revenue';
import Transactions from './Transactions';
import Withdrawals from './Withdrawals';
import Subscriptions from './Subscriptions';

// One money hub: revenue overview, subscription billing, dues statement and manager payouts.
const TABS = [
  { id: 'overview',     label: 'Overview',     hint: 'Balance & revenue',  icon: LayoutDashboard, Page: Revenue },
  { id: 'billing',      label: 'Billing',      hint: 'Estate subscriptions', icon: CreditCard,    Page: Subscriptions },
  { id: 'transactions', label: 'Transactions', hint: 'Dues statement',     icon: Receipt,         Page: Transactions },
  { id: 'payouts',      label: 'Payouts',      hint: 'Manager withdrawals', icon: ArrowUpRight,   Page: Withdrawals },
];

export default function Finance() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get('tab')) || TABS[0];
  const [pending, setPending] = useState(0);

  useEffect(() => {
    withdrawalAPI.list({ status: 'pending', limit: 1 })
      .then(({ data }) => setPending(data.data?.totals?.pending?.count || 0)).catch(() => {});
  }, [tab.id]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-4 flex gap-1 p-1 rounded-xl bg-white border border-[#E4E7EC] w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ id, label, hint, icon: Icon }) => {
          const on = tab.id === id;
          return (
            <button key={id} onClick={() => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })}
              className={`flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-left transition-colors flex-1 sm:flex-none ${on ? 'bg-[#0B1220] text-white' : 'text-[#475467] hover:bg-[#F9FAFB]'}`}>
              <Icon size={16} className={on ? 'text-[#34D399]' : 'text-[#98A2B3]'} />
              <span className="leading-tight whitespace-nowrap">
                <span className="block text-[13px] font-semibold">{label}</span>
                <span className={`block text-[11px] ${on ? 'text-white/55' : 'text-[#98A2B3]'}`}>{hint}</span>
              </span>
              {id === 'payouts' && pending > 0 && (
                <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-[#F79009] text-white text-[11px] font-semibold flex items-center justify-center">{pending}</span>
              )}
            </button>
          );
        })}
      </div>
      <tab.Page key={tab.id} />
    </div>
  );
}
