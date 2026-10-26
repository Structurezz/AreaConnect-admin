import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Send, RefreshCw, XCircle, Link2, Mail } from 'lucide-react';
import { onboardingAPI } from '../../api';
import { Field, SectionCard, CopyButton } from './shared';

const blank = () => ({ name: '', email: '', phone: '', estateName: '', estateAddress: '' });
const STATUS = {
  pending:  'badge-yellow',
  accepted: 'badge-green',
  revoked:  'badge-gray',
  expired:  'badge-red',
};
const ago = (d) => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function InviteManagers({ onDone }) {
  const [rows, setRows] = useState([blank()]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => onboardingAPI.invites().then(({ data }) => setInvites(data.data || [])).catch(() => setInvites([])), []);
  useEffect(() => { load(); }, [load]);

  const set = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  // Paste "name <email>" or plain emails, one per line, to fill many rows at once
  const pasteMany = (text) => {
    const found = text.split(/[\n,;]+/).map((l) => {
      const m = l.match(/^\s*(.*?)\s*<?([^\s<>@]+@[^\s<>@]+\.[^\s<>@]+)>?\s*$/);
      return m ? { ...blank(), name: m[1].replace(/["']/g, ''), email: m[2] } : null;
    }).filter(Boolean);
    if (found.length) { setRows((rs) => [...rs.filter((r) => r.email || r.name), ...found]); toast.success(`${found.length} added`); }
  };

  const send = async () => {
    const list = rows.filter((r) => r.email.trim());
    if (!list.length) return toast.error('Add at least one email');
    setSending(true);
    try {
      const { data } = await onboardingAPI.invite({ invites: list, note });
      const ok = data.data.filter((r) => r.ok).length;
      data.data.filter((r) => !r.ok).forEach((r) => toast.error(`${r.email}: ${r.error}`));
      if (ok) toast.success(`${ok} invitation${ok === 1 ? '' : 's'} sent`);
      setRows(data.data.filter((r) => !r.ok).length ? list.filter((r) => data.data.find((d) => d.email === r.email.toLowerCase() && !d.ok)) : [blank()]);
      load(); onDone?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send invitations');
    } finally { setSending(false); }
  };

  const act = async (fn, id, msg) => {
    try { await fn(id); toast.success(msg); load(); } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const shown = (invites || []).filter((i) => filter === 'all' || i.status === filter);
  const count = (s) => (invites || []).filter((i) => i.status === s).length;

  return (
    <div className="space-y-5">
      <SectionCard title="Invite managers to set up their own estate"
        description="They get an email with a link to the manager sign-up page with their details filled in. Their estate starts on a 14-day trial when they finish.">
        <div className="space-y-2.5">
          <div className="hidden md:grid grid-cols-[1fr_1.3fr_1fr_1.2fr_1.4fr_32px] gap-2 text-[11.5px] font-medium text-[#667085] px-0.5">
            <span>Name</span><span>Email *</span><span>Phone</span><span>Estate name</span><span>Estate address</span><span />
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid gap-2 md:grid-cols-[1fr_1.3fr_1fr_1.2fr_1.4fr_32px] p-3 md:p-0 rounded-xl border md:border-0 border-[#E4E7EC]">
              <input className="input-field" placeholder="Name" value={r.name} onChange={(e) => set(i, 'name', e.target.value)} />
              <input className="input-field" placeholder="manager@email.com" type="email" value={r.email} onChange={(e) => set(i, 'email', e.target.value)}
                onPaste={(e) => { const t = e.clipboardData.getData('text'); if (/[\n,;]/.test(t) && t.includes('@')) { e.preventDefault(); pasteMany(t); } }} />
              <input className="input-field" placeholder="+234 …" value={r.phone} onChange={(e) => set(i, 'phone', e.target.value)} />
              <input className="input-field" placeholder="Estate name" value={r.estateName} onChange={(e) => set(i, 'estateName', e.target.value)} />
              <input className="input-field" placeholder="Address (optional)" value={r.estateAddress} onChange={(e) => set(i, 'estateAddress', e.target.value)} />
              <button type="button" className="h-10 flex items-center justify-center text-[#98A2B3] hover:text-[#D92D20] disabled:opacity-30" disabled={rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 size={15} /></button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-ghost" onClick={() => setRows((rs) => [...rs, blank()])}><Plus size={14} /> Add another</button>
            <span className="text-[12px] text-[#98A2B3]">Tip: paste a list of emails into any email box to add them all.</span>
          </div>
        </div>
        <Field label="Personal note (optional)" className="mt-5" hint="Shown in the email above the button">
          <textarea className="input-field min-h-[70px]" value={note} onChange={(e) => setNote(e.target.value)} maxLength={600}
            placeholder="Great speaking with you today — here's the link to get your estate set up." />
        </Field>
        <div className="mt-5 pt-4 border-t border-[#F2F4F7] flex justify-end">
          <button className="btn-primary" disabled={sending} onClick={send}>
            <Send size={14} /> {sending ? 'Sending…' : `Send ${rows.filter((r) => r.email.trim()).length || ''} invitation${rows.filter((r) => r.email.trim()).length === 1 ? '' : 's'}`}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Invitations" description="Track who has signed up. Resending extends the link by 30 days."
        aside={<div className="tabs">
          {[['all', 'All'], ['pending', `Pending ${count('pending')}`], ['accepted', `Joined ${count('accepted')}`], ['expired', 'Expired']].map(([k, l]) => (
            <button key={k} className={`tab ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>}>
        <div className="overflow-x-auto -m-5">
          <table className="table">
            <thead><tr><th>Manager</th><th>Estate</th><th>Status</th><th>Sent</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {invites === null && <tr><td colSpan={5}><div className="skeleton h-8" /></td></tr>}
              {invites && !shown.length && <tr><td colSpan={5} className="text-center !py-10 text-[#98A2B3]"><Mail size={18} className="mx-auto mb-2" />No invitations here yet</td></tr>}
              {shown.map((inv) => (
                <tr key={inv._id}>
                  <td><span className="cell-strong">{inv.name || '—'}</span><br /><span className="text-[12px]">{inv.email}</span></td>
                  <td>{inv.estateId?.name || inv.estateName || '—'}{inv.estateId?.estateCode && <span className="font-mono text-[11.5px] text-[#98A2B3] ml-1.5">{inv.estateId.estateCode}</span>}</td>
                  <td><span className={STATUS[inv.status]}>{inv.status === 'accepted' ? 'Joined' : inv.status[0].toUpperCase() + inv.status.slice(1)}</span></td>
                  <td className="whitespace-nowrap">{ago(inv.lastSentAt || inv.createdAt)}{inv.sentCount > 1 && <span className="text-[#98A2B3]"> · ×{inv.sentCount}</span>}</td>
                  <td className="text-right whitespace-nowrap">
                    {inv.link && <CopyButton text={inv.link} label="Link" />}
                    {inv.status !== 'accepted' && <button className="btn-ghost !px-2 !py-1 text-[12px]" onClick={() => act(onboardingAPI.resendInvite, inv._id, 'Invitation resent')}><RefreshCw size={13} /> Resend</button>}
                    {inv.status === 'pending' && <button className="btn-ghost !px-2 !py-1 text-[12px] !text-[#B42318]" onClick={() => act(onboardingAPI.revokeInvite, inv._id, 'Invitation revoked')}><XCircle size={13} /> Revoke</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {invites?.length > 0 && <p className="mt-4 -mb-1 text-[11.5px] text-[#98A2B3] flex items-center gap-1.5"><Link2 size={12} /> Links open the manager sign-up page pre-filled with the invitee’s details.</p>}
      </SectionCard>
    </div>
  );
}
