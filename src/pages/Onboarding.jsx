import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Wand2, FileSpreadsheet, Send, Briefcase, Building2, Clock, UserX, Mail, ArrowUpRight } from 'lucide-react';
import { onboardingAPI } from '../api';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import WizardFlow from '../components/onboarding/WizardFlow';
import BulkImport from '../components/onboarding/BulkImport';
import InviteManagers from '../components/onboarding/InviteManagers';
import Portfolio from '../components/onboarding/Portfolio';

const METHODS = [
  { key: 'wizard',    icon: Wand2,           title: 'Guided setup',      desc: 'One estate with its full profile, manager and plan, step by step.', best: 'Signed deals' },
  { key: 'bulk',      icon: FileSpreadsheet, title: 'Bulk import',       desc: 'Upload a CSV or paste from a spreadsheet to create many estates at once.', best: 'Partners & associations' },
  { key: 'invite',    icon: Send,            title: 'Invite to self-onboard', desc: 'Email managers a pre-filled sign-up link; they finish the setup themselves.', best: 'Warm leads' },
  { key: 'portfolio', icon: Briefcase,       title: 'Add to portfolio',  desc: 'Give an existing manager more estates, or hand over estates between managers.', best: 'Multi-estate managers' },
];

const SOURCE = {
  wizard: ['Guided', 'badge-green'], bulk: ['Bulk import', 'badge-blue'], invite: ['Invitation', 'badge-purple'],
  portfolio: ['Portfolio', 'badge-gold'], self: ['Self sign-up', 'badge-gray'], legacy: ['Legacy', 'badge-gray'],
};

export default function Onboarding() {
  const [params, setParams] = useSearchParams();
  const method = METHODS.some((m) => m.key === params.get('method')) ? params.get('method') : 'wizard';
  const [summary, setSummary] = useState(null);

  const load = useCallback(() => onboardingAPI.summary().then(({ data }) => setSummary(data.data)).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const choose = (key) => setParams(key === 'wizard' ? {} : { method: key }, { replace: true });
  const by = summary?.bySource || {};

  return (
    <div className="max-w-[1400px] mx-auto">
      <PageHeader title="Onboard estates"
        description="Bring estates onto AreaConnect four ways — set one up in detail, import many at once, invite managers to self-serve, or extend a manager's portfolio."
        actions={<Link to="/estates" className="btn-outline" style={{ textDecoration: 'none' }}><Building2 size={14} /> All estates</Link>} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard label="Onboarded · last 30 days" value={summary?.last30 ?? 0} icon={Building2} color="green"
          hint={summary ? `${by.wizard || 0} guided · ${by.bulk || 0} bulk · ${by.self || 0} self` : ' '} />
        <StatCard label="Pending invitations" value={summary?.pendingInvites ?? 0} icon={Mail} color="purple" hint="Awaiting sign-up" />
        <StatCard label="Via portfolio" value={by.portfolio || 0} icon={Briefcase} color="blue" hint="Last 30 days" />
        <StatCard label="Without a manager" value={summary?.unassigned ?? 0} icon={UserX} color={summary?.unassigned ? 'amber' : 'green'} hint="Assign via portfolio" />
      </div>

      {/* Method picker */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-6" role="tablist">
        {METHODS.map(({ key, icon: Icon, title, desc, best }) => {
          const on = method === key;
          return (
            <button key={key} role="tab" aria-selected={on} onClick={() => choose(key)}
              className={`text-left rounded-xl border p-4 transition-all bg-white ${on ? 'border-[#059669] ring-4 ring-[#059669]/10' : 'border-[#E4E7EC] hover:border-[#D0D5DD] hover:shadow-sm'}`}>
              <div className="flex items-center justify-between">
                <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${on ? 'bg-[#059669] text-white' : 'bg-[#F2F4F7] text-[#475467]'}`}><Icon size={17} /></span>
                <span className="text-[11px] text-[#98A2B3]">Best for: {best}</span>
              </div>
              <p className="mt-3 text-[14px] font-semibold text-[#101828]">{title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[#667085]">{desc}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-8">
        {method === 'wizard' && <WizardFlow onDone={load} />}
        {method === 'bulk' && <BulkImport onDone={load} />}
        {method === 'invite' && <InviteManagers onDone={load} />}
        {method === 'portfolio' && <Portfolio onDone={load} />}
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title flex items-center gap-2"><Clock size={15} className="text-[#98A2B3]" /> Recently onboarded</h3>
            <p className="card-sub">The latest estates added to the platform, by any method</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead><tr><th>Estate</th><th>Location</th><th>Manager</th><th>Method</th><th>Added</th><th /></tr></thead>
            <tbody>
              {!summary && [0, 1, 2].map((i) => <tr key={i}><td colSpan={6}><div className="skeleton h-6" /></td></tr>)}
              {summary?.recent?.map((e) => {
                const [label, cls] = SOURCE[e.onboarding?.source || 'self'] || SOURCE.self;
                return (
                  <tr key={e._id}>
                    <td><span className="cell-strong">{e.name}</span> <span className="font-mono text-[11.5px] text-[#98A2B3]">{e.estateCode}</span></td>
                    <td className="max-w-[260px] truncate">{[e.city, e.state].filter(Boolean).join(', ') || e.address}</td>
                    <td>{e.managerId ? <>{e.managerId.name}<br /><span className="text-[12px] text-[#98A2B3]">{e.managerId.email}</span></> : <span className="badge-yellow">Unassigned</span>}</td>
                    <td><span className={cls}>{label}</span></td>
                    <td className="whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="text-right"><Link to={`/estates/${e._id}`} className="btn-ghost !px-2 !py-1 text-[12px]" style={{ textDecoration: 'none' }}>Open <ArrowUpRight size={13} /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
