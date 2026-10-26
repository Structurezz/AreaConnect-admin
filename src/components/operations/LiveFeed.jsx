import { useEffect, useRef, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Siren, ShieldAlert, DoorOpen, LogOut, Wallet, KeyRound, Rocket, Bell, Radio, Pause, Play, Trash2 } from 'lucide-react';

// One line per platform event — what happened, where, and how serious
export function describe(ev, estateName) {
  const where = estateName || 'An estate';
  switch (ev.kind) {
    case 'alert': {
      const crit = ev.severity === 'high' || ev.severity === 'critical' || ev.isEmergencyBroadcast;
      if (ev.status === 'resolved') return { icon: Siren, tone: 'green', title: `Alert resolved · ${where}`, body: ev.title || ev.type };
      if (ev.status === 'acknowledged') return { icon: Siren, tone: 'blue', title: `Alert acknowledged · ${where}`, body: ev.title || ev.type };
      return { icon: crit ? ShieldAlert : Siren, tone: crit ? 'red' : 'amber', title: `${ev.isEmergencyBroadcast ? 'Emergency broadcast' : `${String(ev.type || 'Security').replace(/^\w/, (c) => c.toUpperCase())} alert`} · ${where}`, body: ev.note || ev.title || '', critical: crit };
    }
    case 'visitor':
      return ev.checkedOut
        ? { icon: LogOut, tone: 'gray', title: `Visitor left · ${where}`, body: ev.name || '' }
        : { icon: DoorOpen, tone: 'green', title: `${ev.status === 'checked-in' ? 'Visitor checked in' : 'Visitor pass'} · ${where}`, body: ev.name || '' };
    case 'withdrawal':
      return { icon: Wallet, tone: 'amber', title: `Payout requested · ₦${Number(ev.amount || 0).toLocaleString()}`, body: `${ev.name || 'Manager'} · ${where}${ev.source === 'marketplace' ? ' · marketplace' : ''}` };
    case 'password_reset':
      return { icon: KeyRound, tone: 'blue', title: `Password reset requested · ${where}`, body: `${ev.name || 'User'}${ev.role ? ` (${ev.role})` : ''}` };
    case 'estate_signup':
      return { icon: Rocket, tone: 'green', title: `New estate signed up`, body: `${ev.name || 'Estate'} · ${ev.manager || ''}` };
    default:
      return { icon: Bell, tone: 'gray', title: `${ev.title || 'Activity'} · ${where}`, body: ev.body || '' };
  }
}

const TONE = {
  red: 'bg-[#FEF3F2] text-[#D92D20]', amber: 'bg-[#FFFAEB] text-[#DC6803]', green: 'bg-[#ECFDF3] text-[#079455]',
  blue: 'bg-[#EFF8FF] text-[#1570EF]', gray: 'bg-[#F2F4F7] text-[#475467]',
};

export default function LiveFeed({ events, connected, estateNames, paused, onTogglePause, onClear, filter, height = 360 }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 15000); return () => clearInterval(t); }, []);
  const listRef = useRef(null);
  const list = filter ? events.filter(filter) : events;

  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <div>
          <div className="card-title flex items-center gap-2">
            <Radio size={15} className="text-[#059669]" /> Live activity
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${connected ? 'bg-[#ECFDF3] text-[#067647]' : 'bg-[#F2F4F7] text-[#667085]'}`}>
              <span className="relative flex w-1.5 h-1.5">
                {connected && !paused && <span className="absolute inset-0 rounded-full bg-[#12B76A] animate-ping opacity-70" />}
                <span className={`relative w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#12B76A]' : 'bg-[#98A2B3]'}`} />
              </span>
              {connected ? (paused ? 'Paused' : 'Live') : 'Offline'}
            </span>
          </div>
          <div className="card-sub">Alerts, visitors, payouts and sign-ups as they happen</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onTogglePause} title={paused ? 'Resume' : 'Pause'} className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]">{paused ? <Play size={14} /> : <Pause size={14} />}</button>
          <button onClick={onClear} title="Clear" className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]"><Trash2 size={14} /></button>
        </div>
      </div>
      <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: height }}>
        {!list.length && (
          <div className="px-5 py-10 text-center">
            <span className="mx-auto w-10 h-10 rounded-full bg-[#F2F4F7] text-[#98A2B3] flex items-center justify-center"><Radio size={17} /></span>
            <p className="mt-2.5 text-[12.5px] text-[#667085]">{connected ? 'Listening… new activity appears here instantly.' : 'Connecting to the live feed…'}</p>
          </div>
        )}
        {list.map((ev) => {
          const m = describe(ev, estateNames[ev.estateId]);
          return (
            <div key={ev._key} className="flex items-start gap-3 px-4 py-2.5 border-b border-[#F9FAFB] last:border-0" style={{ animation: ev._fresh ? 'feedIn .5s cubic-bezier(.22,1,.36,1)' : undefined }}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TONE[m.tone]}`}><m.icon size={14} /></span>
              <div className="min-w-0 flex-1">
                <p className={`text-[12.5px] font-medium truncate ${m.critical ? 'text-[#B42318]' : 'text-[#101828]'}`}>{m.title}</p>
                {m.body && <p className="text-[11.5px] text-[#667085] truncate">{m.body}</p>}
              </div>
              <span className="text-[10.5px] text-[#98A2B3] whitespace-nowrap mt-0.5">{formatDistanceToNowStrict(new Date(ev.at))}</span>
            </div>
          );
        })}
      </div>
      <style>{'@keyframes feedIn{from{opacity:0;transform:translateY(-6px);background:#F6FEF9}to{opacity:1;transform:none;background:transparent}}'}</style>
    </div>
  );
}
