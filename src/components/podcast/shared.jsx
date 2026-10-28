import { useEffect, useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Music, X, Check, Search, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { podcastAPI } from '../../api';

export const CATEGORIES = [
  { v: 'community',  label: 'Community',  color: '#059669' },
  { v: 'security',   label: 'Security',   color: '#D92D20' },
  { v: 'finance',    label: 'Money & dues', color: '#2E90FA' },
  { v: 'lifestyle',  label: 'Lifestyle',  color: '#EE46BC' },
  { v: 'news',       label: 'Estate news', color: '#F79009' },
  { v: 'interview',  label: 'Interview',  color: '#7A5AF8' },
  { v: 'events',     label: 'Events',     color: '#06AED4' },
];
export const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.v, c]));
export const ROLES = [
  { v: 'co_host',       label: 'Co-host',       color: '#7A5AF8' },
  { v: 'estate_leader', label: 'Estate leader', color: '#059669' },
  { v: 'expert',        label: 'Expert',        color: '#2E90FA' },
  { v: 'guest',         label: 'Guest',         color: '#667085' },
];
export const ROLE = Object.fromEntries(ROLES.map((r) => [r.v, r]));
export const GUEST_STATUS = {
  pending: ['Invited', 'bg-[#FFFAEB] text-[#B54708]'],
  joined:  ['Joined', 'bg-[#ECFDF3] text-[#067647]'],
  left:    ['Left', 'bg-[#F2F4F7] text-[#475467]'],
  revoked: ['Revoked', 'bg-[#FEF3F2] text-[#B42318]'],
};
export const fmtDur = (sec) => {
  const s = Math.round(sec || 0);
  if (!s) return '—';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${String(s % 60).padStart(2, '0')}s`;
};

export function CategoryPill({ v }) {
  const c = CAT[v] || CAT.community;
  return <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${c.color}14`, color: c.color }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />{c.label}</span>;
}

export function Cover({ src, title, size = 48, radius = 12 }) {
  const initials = (title || 'FM').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return src
    ? <img src={src} alt="" className="object-cover flex-shrink-0" style={{ width: size, height: size, borderRadius: radius }} />
    : <span className="flex items-center justify-center text-white font-bold flex-shrink-0" style={{ width: size, height: size, borderRadius: radius, fontSize: size * 0.3, background: 'linear-gradient(135deg,#7A5AF8,#0B1220)' }}>{initials}</span>;
}

// Upload an image or audio file to the server; returns the hosted URL via onDone
export function MediaUpload({ kind = 'image', value, onDone, label, hint }) {
  const ref = useRef(null);
  const [pct, setPct] = useState(null);
  const pick = async (file) => {
    if (!file) return;
    setPct(0);
    try {
      const { data } = await podcastAPI.upload(file, setPct);
      onDone(data.data.url, file, data.data);
      toast.success(kind === 'audio' ? 'Audio uploaded' : 'Image uploaded');
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setPct(null); }
  };
  return (
    <div>
      {label && <p className="text-[12.5px] font-medium text-[#344054] mb-1.5">{label}</p>}
      <div className="flex items-center gap-3">
        {kind === 'image'
          ? (value ? <img src={value} alt="" className="w-16 h-16 rounded-xl object-cover border border-[#EAECF0]" /> : <span className="w-16 h-16 rounded-xl border border-dashed border-[#D0D5DD] flex items-center justify-center text-[#98A2B3]"><ImageIcon size={20} /></span>)
          : (value ? <span className="w-16 h-16 rounded-xl bg-[#F4F3FF] text-[#6938EF] flex items-center justify-center"><Music size={22} /></span> : <span className="w-16 h-16 rounded-xl border border-dashed border-[#D0D5DD] flex items-center justify-center text-[#98A2B3]"><Music size={20} /></span>)}
        <div className="flex-1 min-w-0">
          <button type="button" onClick={() => ref.current?.click()} disabled={pct !== null} className="btn-outline !py-1.5 text-[12.5px]">
            {pct !== null ? <><RefreshCw size={13} className="animate-spin" /> Uploading {pct}%</> : <><Upload size={13} /> {value ? 'Replace' : 'Upload'}</>}
          </button>
          {value && <button type="button" onClick={() => onDone('')} className="ml-1.5 text-[12px] text-[#98A2B3] hover:text-[#B42318]"><X size={12} className="inline" /> Remove</button>}
          {pct !== null && <div className="mt-1.5 h-1 rounded-full bg-[#F2F4F7] overflow-hidden"><div className="h-full bg-[#7A5AF8] transition-all" style={{ width: `${pct}%` }} /></div>}
          {hint && pct === null && <p className="mt-1 text-[11px] text-[#98A2B3]">{hint}</p>}
          {kind === 'audio' && value && <audio src={value} controls className="mt-2 w-full h-9" />}
        </div>
        <input ref={ref} type="file" hidden accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : 'audio/*'} onChange={(e) => pick(e.target.files?.[0])} />
      </div>
    </div>
  );
}

// Pick estates for audience targeting
export function EstateMultiPicker({ value = [], onChange }) {
  const [estates, setEstates] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => { podcastAPI.estates().then(({ data }) => setEstates(data.data || [])).catch(() => setEstates([])); }, []);
  const ids = value.map(String);
  const list = (estates || []).filter((e) => !q || `${e.name} ${e.estateCode} ${e.city || ''}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-xl border border-[#E4E7EC] overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-10 border-b border-[#F2F4F7] bg-[#F9FAFB]">
        <Search size={14} className="text-[#98A2B3]" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search estates" className="flex-1 bg-transparent outline-none text-[13px]" />
        <span className="text-[11.5px] text-[#667085]">{ids.length} selected</span>
      </div>
      <div className="max-h-56 overflow-y-auto divide-y divide-[#F2F4F7]">
        {estates === null && <p className="p-3 text-[12px] text-[#98A2B3]">Loading…</p>}
        {list.map((e) => {
          const on = ids.includes(String(e._id));
          return (
            <button key={e._id} type="button" onClick={() => onChange(on ? ids.filter((x) => x !== String(e._id)) : [...ids, String(e._id)])}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${on ? 'bg-[#F6FEF9]' : 'hover:bg-[#F9FAFB]'}`}>
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-[#059669] border-[#059669]' : 'border-[#D0D5DD]'}`}>{on && <Check size={10} className="text-white" />}</span>
              <span className="flex-1 text-[13px] text-[#101828] truncate">{e.name}</span>
              <span className="text-[11px] text-[#98A2B3]">{[e.city, e.state].filter(Boolean).join(', ') || e.estateCode}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
