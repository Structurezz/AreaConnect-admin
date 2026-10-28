import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { format, formatDistanceToNowStrict } from 'date-fns';
import {
  Megaphone, Pencil, Play, Pause, Copy, Trash2, Send, Mail, BellRing, FlaskConical, Users, CalendarClock, Repeat, Flag, History, RefreshCw, Link2,
} from 'lucide-react';
import { campaignAPI } from '../../api';
import { Drawer, Section } from '../billing/BillingDrawers';
import Preview from './Preview';
import { PhaseBadge, GoalPill, CHANNEL, TrendChart, nf, pct, audienceSummary } from './shared';

const FREQ = { until_dismissed: 'Until dismissed', once: 'Show once', until_clicked: 'Until clicked' };
const PRIO = { 1: 'High', 2: 'Normal', 3: 'Low' };

export default function CampaignPanel({ id, onClose, onChanged, onEdit, onDuplicate, onDelete, onStatus }) {
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState('');
  const [view, setView] = useState('');

  const load = () => campaignAPI.stats(id).then(({ data }) => {
    setD(data.data);
    setView((v) => v || data.data.campaign.placements?.[0] || 'modal');
  }).catch(() => toast.error('Could not load campaign'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = d?.campaign;
  const f = d?.funnel || {};

  const run = async (key, fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(key);
    try { await fn(); load(); onChanged?.(); }
    catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
    finally { setBusy(''); }
  };

  const sendEmail = () => run('email', async () => {
    const { data } = await campaignAPI.sendEmail(c._id);
    toast.success(`Email sent to ${nf(data.data.sent)} of ${nf(data.data.targeted)} people`);
  }, 'Send this email to everyone in the audience now?');
  const sendPush = () => run('push', async () => {
    const { data } = await campaignAPI.sendPush(c._id);
    toast.success(`Notified ${nf(data.data.targeted)} people · ${nf(data.data.devices)} on their phones`);
  }, 'Send this push + bell notification to everyone in the audience now?');
  const testEmail = () => run('test', async () => {
    const { data } = await campaignAPI.testEmail(c._id);
    toast.success(`Test sent to ${data.data.to}`);
  });

  return (
    <Drawer title={c?.name || 'Campaign'} subtitle={c ? audienceSummary(c.audience) : 'Loading…'} icon={Megaphone} onClose={onClose} width={640}
      footer={c && <>
        <button onClick={() => onDelete(c)} className="btn-outline !text-[#B42318] hover:!bg-[#FEF3F2]"><Trash2 size={14} /></button>
        <button onClick={() => onDuplicate(c)} className="btn-outline"><Copy size={14} /> Duplicate</button>
        <span className="mr-auto" />
        {c.status === 'active'
          ? <button onClick={async () => { await onStatus(c, 'paused'); load(); }} className="btn-outline"><Pause size={14} /> Pause</button>
          : <button onClick={async () => { await onStatus(c, 'active'); load(); }} className="btn-outline"><Play size={14} /> Go live</button>}
        <button onClick={() => onEdit(c._id)} className="btn-primary"><Pencil size={14} /> Edit</button>
      </>}>
      {!c ? <div className="p-6 space-y-3"><div className="skeleton h-24" /><div className="skeleton h-48" /></div> : (
        <>
          <div className="px-6 pt-5 flex flex-wrap items-center gap-2">
            <PhaseBadge phase={c.phase} /><GoalPill v={c.goal} />
            {c.createdBy?.name && <span className="text-[11.5px] text-[#98A2B3]">by {c.createdBy.name} · {formatDistanceToNowStrict(new Date(c.createdAt))} ago</span>}
          </div>

          {/* Funnel */}
          <div className="px-6 pt-4">
            <div className="grid grid-cols-4 rounded-xl border border-[#EAECF0] divide-x divide-[#EAECF0]">
              {[
                ['Reached', nf(f.reach), 'unique people'],
                ['Views', nf(f.impressions), `${f.reach ? (f.impressions / f.reach).toFixed(1) : 0} per person`],
                ['Clicks', nf(f.clicks), `${pct(f.clicks, f.impressions)} CTR`],
                ['Dismissed', nf(f.dismissals), pct(f.dismissals, f.impressions)],
              ].map(([l, v, s]) => (
                <div key={l} className="px-3 py-2.5">
                  <p className="text-[11px] text-[#667085]">{l}</p>
                  <p className="text-[18px] font-semibold text-[#101828] tabular-nums">{v}</p>
                  <p className="text-[10.5px] text-[#98A2B3]">{s}</p>
                </div>
              ))}
            </div>
          </div>

          <Section icon={Flag} title="Last 30 days">
            <TrendChart series={d.series} height={150} keys={[['impressions', '#059669', 'Views'], ['clicks', '#2E90FA', 'Clicks'], ['dismissals', '#F79009', 'Dismissed']]} />
          </Section>

          <Section icon={Send} title="Send now" hint="Email and push go out on demand to everyone who matches the audience">
            <div className="grid sm:grid-cols-3 gap-2">
              <button disabled={!c.placements.includes('email') || !!busy} onClick={sendEmail} className="btn-outline justify-center disabled:opacity-50">{busy === 'email' ? <RefreshCw size={14} className="animate-spin" /> : <Mail size={14} />} Send email</button>
              <button disabled={!c.placements.includes('email') || !!busy} onClick={testEmail} className="btn-outline justify-center disabled:opacity-50">{busy === 'test' ? <RefreshCw size={14} className="animate-spin" /> : <FlaskConical size={14} />} Test to me</button>
              <button disabled={!c.placements.includes('push') || !!busy} onClick={sendPush} className="btn-outline justify-center disabled:opacity-50">{busy === 'push' ? <RefreshCw size={14} className="animate-spin" /> : <BellRing size={14} />} Send push</button>
            </div>
            {!c.placements.includes('email') && !c.placements.includes('push') && <p className="text-[11.5px] text-[#98A2B3] mt-2">Turn on the Email or Push channel in Edit to send directly.</p>}
            {c.email?.sendOnUserSignup && <p className="text-[11.5px] text-[#067647] mt-2">✓ Email also goes out automatically when a matching person signs up.</p>}
          </Section>

          <Section icon={Megaphone} title="Preview">
            <div className="flex flex-wrap gap-1 mb-3">
              {c.placements.map((p) => CHANNEL[p] && (
                <button key={p} onClick={() => setView(p)} className={`h-7 px-2.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1.5 ${view === p ? 'bg-[#0B1220] text-white' : 'bg-[#F2F4F7] text-[#475467]'}`}>
                  {(() => { const I = CHANNEL[p].Icon; return <I size={12} />; })()}{CHANNEL[p].short}
                </button>
              ))}
            </div>
            <div className="max-w-[420px]"><Preview channel={view} form={c} /></div>
          </Section>

          <Section icon={Users} title="Setup">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
              <div><dt className="text-[#98A2B3]">Audience</dt><dd className="text-[#101828]">{audienceSummary(c.audience)}</dd></div>
              <div><dt className="text-[#98A2B3] flex items-center gap-1"><Link2 size={11} /> Button opens</dt><dd className="text-[#101828] font-mono text-[12px]">{c.content?.ctaUrl || '—'}</dd></div>
              <div><dt className="text-[#98A2B3] flex items-center gap-1"><CalendarClock size={11} /> Schedule</dt><dd className="text-[#101828]">{c.schedule?.startAt ? format(new Date(c.schedule.startAt), 'd MMM yyyy, HH:mm') : 'Immediately'} → {c.schedule?.endAt ? format(new Date(c.schedule.endAt), 'd MMM yyyy') : 'no end'}</dd></div>
              <div><dt className="text-[#98A2B3] flex items-center gap-1"><Repeat size={11} /> Frequency · priority</dt><dd className="text-[#101828]">{FREQ[c.frequency] || FREQ.until_dismissed} · {PRIO[c.priority] || 'Normal'}</dd></div>
            </dl>
            {c.notes && <p className="mt-3 text-[12.5px] text-[#475467] bg-[#F9FAFB] rounded-lg p-2.5 whitespace-pre-wrap">{c.notes}</p>}
          </Section>

          <Section icon={History} title="Send history">
            {!d.sends.length ? <p className="text-[12.5px] text-[#98A2B3]">Nothing sent yet.</p> : (
              <div className="divide-y divide-[#F2F4F7]">
                {d.sends.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 text-[12.5px]">
                    <span className="w-7 h-7 rounded-lg bg-[#F2F4F7] flex items-center justify-center text-[#475467]">{s.channel === 'push' ? <BellRing size={13} /> : s.channel === 'test_email' ? <FlaskConical size={13} /> : <Mail size={13} />}</span>
                    <span className="flex-1 text-[#101828]">{s.channel === 'push' ? 'Push + bell' : s.channel === 'test_email' ? 'Test email' : 'Email blast'}<span className="text-[#98A2B3]"> · {s.by?.name || 'Admin'}</span></span>
                    <span className="tabular-nums text-[#475467]">{nf(s.sent)}{s.channel !== 'test_email' && ` / ${nf(s.targeted)}`}</span>
                    <span className="w-28 text-right text-[11.5px] text-[#98A2B3]">{format(new Date(s.at), 'd MMM, HH:mm')}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}
    </Drawer>
  );
}
