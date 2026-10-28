import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Radio, Mic, MicOff, Users, Plus, Calendar, X, Hand, Check, UserX,
  Save, Loader2, Share2, Trash2, Edit3, Play, Pause, Headphones, Link as LinkIcon,
  Copy, ChevronRight, ChevronLeft, Crown, Volume2, Heart, MessageSquare, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { podcastAPI, defaultTrackAPI } from '../api';
import { useAuth }    from '../context/AuthContext';
import { useSocket }  from '../context/SocketContext';
import { useLiveAudio } from '../hooks/useLiveAudio';
import BoostedRemoteAudio from '../components/BoostedRemoteAudio';
import { Music, VolumeX, Volume1, Sliders } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const BRAND = '#059669'; // platform accent (emerald)

const fmtDur = (ms) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}` : `${m}:${String(r).padStart(2,'0')}`;
};

const niceDate = (d) => d ? new Date(d).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

const guestLink = (token) => `${window.location.origin}/live-guest/${token}`;

function AudioSinks({ streams }) {
  return (
    <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
      {Array.from(streams.entries()).map(([id, stream]) => <BoostedRemoteAudio key={id} stream={stream} />)}
    </div>
  );
}

// Shared modal chrome (overlay + white panel with header row)
function ModalShell({ title, subtitle, onClose, maxWidth = 480, z = 70, children, footer }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-[#101828]/50 backdrop-blur-[2px]" style={{ zIndex: z }}>
      <div className="bg-white rounded-xl w-full border border-[#E4E7EC] shadow-[0_20px_48px_-12px_rgba(16,24,40,0.25)] overflow-hidden flex flex-col max-h-[85vh] animate-fade-in"
        style={{ maxWidth }}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E4E7EC]">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[#101828]">{title}</div>
            {subtitle && <div className="text-[12px] text-[#98A2B3] mt-0.5">{subtitle}</div>}
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-md text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#101828] transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[#E4E7EC] bg-[#F9FAFB]">{footer}</div>}
      </div>
    </div>
  );
}

// Compact empty state used across the page
function Empty({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
        <Icon size={18} className="text-[#98A2B3]" />
      </div>
      <p className="text-[14px] font-semibold text-[#101828]">{title}</p>
      {hint && <p className="text-[13px] text-[#98A2B3] mt-0.5">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / edit show modal
// ─────────────────────────────────────────────────────────────────────────────

function ShowFormModal({ show, onSaved, onClose }) {
  const [form, setForm] = useState({
    title:       show?.title || '',
    description: show?.description || '',
    scheduledAt: show?.scheduledAt ? new Date(show.scheduledAt).toISOString().slice(0, 16) : '',
    isRecurring: show?.isRecurring || false,
    recurrence:  show?.recurrence || 'Friday Talk Show',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()) return toast.error('Title required');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        scheduledAt: form.scheduledAt || null,
        isRecurring: form.isRecurring,
        recurrence: form.isRecurring ? form.recurrence : '',
      };
      const { data } = show
        ? await podcastAPI.updateShow(show._id, payload)
        : await podcastAPI.createShow(payload);
      toast.success(show ? 'Updated' : 'Show scheduled');
      onSaved(data.data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <ModalShell
      title={show ? 'Edit show' : 'Schedule a show'}
      subtitle={show ? 'Update the details for this broadcast' : 'Plan a broadcast across every estate'}
      onClose={onClose}
      maxWidth={480}
      footer={(
        <>
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : <><Save size={13}/> {show ? 'Update' : 'Schedule'}</>}
          </button>
        </>
      )}
    >
      <div className="p-5 space-y-4">
        <div>
          <label className="field-label">Title</label>
          <input className="input-field"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Friday Talk Show — Estate Life" />
        </div>
        <div>
          <label className="field-label">Description</label>
          <textarea className="input-field resize-y" rows={3}
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="What is this episode about?" />
        </div>
        <div>
          <label className="field-label">Scheduled for <span className="text-[#98A2B3] font-normal">(optional)</span></label>
          <input className="input-field" type="datetime-local"
            value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 accent-[#059669]" checked={form.isRecurring}
            onChange={e => setForm({ ...form, isRecurring: e.target.checked })} />
          <span className="text-[13px] text-[#344054]">Recurring (e.g. every Friday)</span>
        </label>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invite guest modal
// ─────────────────────────────────────────────────────────────────────────────

function InviteModal({ show, onInvited, onClose }) {
  const [form, setForm] = useState({ name: '', estate: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const invite = async () => {
    if (!form.name.trim()) return toast.error('Guest name required');
    setSaving(true);
    try {
      const { data } = await podcastAPI.invite(show._id, form);
      onInvited(data.data);
      toast.success('Guest invited — copy their link to send');
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell
      title="Invite a guest"
      subtitle="Add a guest and share their one-click join link. They don't need an account."
      onClose={onClose}
      maxWidth={440}
      footer={(
        <>
          <button onClick={onClose} className="btn-outline">Cancel</button>
          <button onClick={invite} disabled={saving} className="btn-primary">
            {saving ? <><Loader2 size={14} className="animate-spin"/> Creating…</> : <><LinkIcon size={13}/> Generate invite link</>}
          </button>
        </>
      )}
    >
      <div className="p-5 space-y-4">
        <div>
          <label className="field-label">Name</label>
          <input className="input-field" placeholder="Name (e.g. Mr. Adebayo — Victoria Gardens)"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Estate <span className="text-[#98A2B3] font-normal">(optional)</span></label>
            <input className="input-field" placeholder="Estate (optional)"
              value={form.estate} onChange={e => setForm({ ...form, estate: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Phone <span className="text-[#98A2B3] font-normal">(optional)</span></label>
            <input className="input-field" placeholder="Phone (optional)"
              value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Studio — the broadcasting view
// ─────────────────────────────────────────────────────────────────────────────

export function LiveStudio({ show, onEnded, onBack }) {
  const { user } = useAuth();
  const { subscribe, emit } = useSocket() || {};
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(show.startedAt ? new Date(show.startedAt).getTime() : Date.now());
  const [peak, setPeak] = useState(show.peakListeners || 0);
  const [ending, setEnding] = useState(false);

  // Twitch-style engagement state
  const [chat, setChat]     = useState([]);
  const [likes, setLikes]   = useState(0);
  const [hostInput, setHostInput] = useState('');
  const [reactionBurst, setReactionBurst] = useState([]);  // ephemeral emojis
  const chatBoxRef = useRef(null);

  // Music + mixer state
  const [library, setLibrary]     = useState([]);
  const [currentTrack, setTrack]  = useState(show.nowPlaying?.videoId ? show.nowPlaying : null);
  const [showPicker, setShowPicker] = useState(false);
  const [musicVol, setMusicVol]   = useState(show.musicVolume ?? 35);
  const musicIframeRef = useRef(null);

  const voiceBlobRef = useRef(null);
  const recorderRef = useRef(null);

  const live = useLiveAudio({
    roomType: 'podcast',
    roomId:   show._id,
    role:     'host',
    enabled:  true,
  });

  // Peak + elapsed
  useEffect(() => { if (live.listenerCount > peak) setPeak(live.listenerCount); }, [live.listenerCount, peak]);

  // Chat / likes / reactions
  useEffect(() => {
    if (!subscribe) return;
    const u1 = subscribe('podcast:chat', (msg) => {
      if (String(msg.showId) !== String(show._id)) return;
      setChat(prev => [...prev.slice(-99), msg]);
    });
    const u2 = subscribe('podcast:like',     () => setLikes(n => n + 1));
    const u3 = subscribe('podcast:reaction', ({ emoji, at }) => {
      const id = `${at}-${Math.random().toString(36).slice(2, 6)}`;
      setReactionBurst(prev => [...prev.slice(-19), { id, emoji, x: 20 + Math.random() * 60 }]);
      setTimeout(() => setReactionBurst(prev => prev.filter(r => r.id !== id)), 3400);
    });
    // The server replays the last 50 chat messages + current music/likes/volume
    // on every (re)join. Important for the host coming back to their own show
    // after navigating away — chat picks up from where they left it.
    const u4 = subscribe('podcast:state-sync', (sync) => {
      if (!sync || String(sync.showId) !== String(show._id)) return;
      if (Array.isArray(sync.chat) && sync.chat.length) {
        setChat(sync.chat.slice(-99));
      }
      if (typeof sync.likes === 'number') setLikes(sync.likes);
      if (sync.nowPlaying && sync.nowPlaying.videoId) setTrack(sync.nowPlaying);
      if (typeof sync.musicVolume === 'number') setMusicVol(sync.musicVolume);
    });
    return () => { u1 && u1(); u2 && u2(); u3 && u3(); u4 && u4(); };
  }, [subscribe, show._id]);

  // Autoscroll chat
  useEffect(() => { if (chatBoxRef.current) chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight; }, [chat.length]);

  const sendHostChat = () => {
    const text = hostInput.trim();
    if (!text || !emit) return;
    emit('podcast:chat:send', { showId: show._id, text, userId: user?._id, userName: user?.name || 'Host', userPhoto: user?.profilePhoto });
    setHostInput('');
  };

  // ── Music mixer ───────────────────────────────────────────────────────
  useEffect(() => {
    defaultTrackAPI.getAll().then(({ data }) => setLibrary(data.data || [])).catch(() => {});
  }, []);

  const applyMusicVolume = (v) => {
    const clamped = Math.max(0, Math.min(100, Math.round(v)));
    setMusicVol(clamped);
    try { musicIframeRef.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'setVolume', args: [clamped] }), '*'); } catch {}
    emit?.('podcast:volume', { showId: show._id, volume: clamped });
  };

  const pickTrack = (t) => {
    const np = { videoId: t.videoId, title: t.title, artist: t.artist || '' };
    setTrack(np);
    setShowPicker(false);
    emit?.('podcast:music-change', { showId: show._id, nowPlaying: np });
  };

  const clearTrack = () => {
    setTrack(null);
    emit?.('podcast:music-change', { showId: show._id, nowPlaying: null });
  };
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(id);
  }, []);

  // Mic + recorder — host mic and every guest are mixed into one recording
  const chunksRef = useRef([]);
  const mixRef = useRef(null); // { ctx, dest, sources: Map<stream, node> }
  useEffect(() => {
    (async () => {
      try {
        const stream = await live.getLocalStream();
        try {
          let recStream = stream;
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const dest = ctx.createMediaStreamDestination();
            const src = ctx.createMediaStreamSource(stream);
            src.connect(dest);
            mixRef.current = { ctx, dest, sources: new Map([[stream, src]]) };
            recStream = dest.stream;
          } catch (e) { console.warn('mixing unavailable — recording host mic only', e); }
          const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
          const r = new MediaRecorder(recStream, { mimeType: mime, audioBitsPerSecond: 96000 });
          chunksRef.current = [];
          r.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
          r.start(1000);
          recorderRef.current = r;
        } catch (e) { console.warn('record unsupported', e); }
      } catch (e) {
        toast.error('Mic access required to host');
      }
    })();
    return () => { try { mixRef.current?.ctx.close(); } catch { /* ignore */ } };
    // eslint-disable-next-line
  }, []);

  // Add each guest's voice to the recording as they join
  useEffect(() => {
    const mix = mixRef.current;
    if (!mix) return;
    const streams = live.remoteStreams instanceof Map ? [...live.remoteStreams.values()] : Object.values(live.remoteStreams || {});
    streams.forEach((st) => {
      if (!st || mix.sources.has(st) || !st.getAudioTracks?.().length) return;
      try { const node = mix.ctx.createMediaStreamSource(st); node.connect(mix.dest); mix.sources.set(st, node); } catch { /* ignore */ }
    });
  }, [live.remoteStreams]);

  const uploadEpisode = async (blob) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!blob) return '';
    // No Cloudinary configured for the admin build — store on our own server instead
    if (!cloudName || !preset) {
      const file = new File([blob], `areaconnect-fm-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const { data } = await podcastAPI.upload(file);
      return data.data.url;
    }
    const form = new FormData();
    form.append('file', blob);
    form.append('upload_preset', preset);
    form.append('resource_type', 'video');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error('Upload failed');
    const j = await res.json();
    return j.secure_url;
  };

  const endShow = async () => {
    if (!confirm('End the show now?')) return;
    setEnding(true);
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        await new Promise(r => { recorderRef.current.onstop = () => r(); recorderRef.current.stop(); });
      }
      const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: 'audio/webm' }) : null;
      voiceBlobRef.current = blob;
      let audioUrl = '';
      if (blob && blob.size > 0) {
        try { audioUrl = await uploadEpisode(blob); }
        catch (err) {
          // Never lose a recording: save it to this computer so it can be uploaded later
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = `${(show.title || 'areaconnect-fm').replace(/[^\w-]+/g, '-')}-${Date.now()}.webm`; a.click();
          toast(`Couldn't upload the recording (${err.response?.data?.message || err.message || 'network error'}). It was downloaded to this computer — upload it from Episodes.`, { icon: '⚠️', duration: 12000 });
        }
      } else {
        toast('No audio was recorded for this show', { icon: '⚠️' });
      }
      await podcastAPI.endLive(show._id, {
        audioUrl,
        durationSec: Math.floor(elapsed / 1000),
        guestNames: (show.guests || []).filter(g => g.status === 'joined').map(g => g.name),
      });
      toast.success('Show ended' + (audioUrl ? ' and archived' : ''));
      onEnded();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to end');
    } finally { setEnding(false); }
  };


  const joinedGuests = (show.guests || []).filter(g => g.status === 'joined');

  return (
    <div className="relative space-y-4">
      <AudioSinks streams={live.remoteStreams} />

      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="btn-ghost !px-2">
          <ChevronLeft size={15}/> Back
        </button>
        <button onClick={endShow} disabled={ending} className="btn-danger">
          {ending ? <><Loader2 size={13} className="animate-spin"/> Ending…</> : <><X size={13}/> End show</>}
        </button>
      </div>

      {/* Show header */}
      <div className="card p-5">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-[#ECFDF3] text-[#059669] border border-[#ABEFC6] flex items-center justify-center flex-shrink-0">
              <Radio size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-[11px] font-semibold tracking-wide">
                  <span className="relative inline-flex w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-[#F04438]" style={{ animation: 'ping 1.6s infinite' }} />
                    <span className="relative w-2 h-2 rounded-full bg-[#F04438]" />
                  </span>
                  ON AIR
                </span>
                <span className="text-[12px] text-[#475467] tabular-nums font-medium">{fmtDur(elapsed)}</span>
                <span className="text-[11px] text-[#98A2B3]">· AreaConnect FM</span>
              </div>
              <div className="text-[18px] font-semibold text-[#101828] tracking-tight mt-1 truncate">{show.title}</div>
              <div className="text-[13px] text-[#475467] truncate">{show.description || 'Live broadcast across all estates'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px rounded-lg overflow-hidden border border-[#E4E7EC] bg-[#E4E7EC] flex-shrink-0">
            {[
              { label: 'Listeners', value: live.listenerCount },
              { label: 'Peak',      value: peak },
            ].map(k => (
              <div key={k.label} className="bg-white px-4 py-2.5 text-center min-w-[84px]">
                <div className="text-[11px] font-medium text-[#98A2B3]">{k.label}</div>
                <div className="text-[20px] font-semibold text-[#101828] leading-tight tabular-nums">{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mic + guests + raised hands grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Mic card */}
        <div className="card p-4 flex items-center gap-4">
          <button onClick={live.toggleMic}
            className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${live.micOn ? 'bg-[#059669] hover:bg-[#047857] text-white shadow-[0_0_0_4px_#D1FADF]' : 'bg-[#F2F4F7] hover:bg-[#EAECF0] text-[#475467] border border-[#D0D5DD]'}`}>
            {live.micOn ? <Mic size={22}/> : <MicOff size={22}/>}
          </button>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-[#98A2B3]">Your mic</div>
            <div className="text-[15px] font-semibold text-[#101828]">{live.micOn ? 'Open' : 'Muted'}</div>
            <div className="text-[12px] text-[#475467] truncate">{user?.name} · Host</div>
          </div>
        </div>

        {/* Guests */}
        <div className="card">
          <div className="card-header !py-3 !px-4">
            <div className="flex items-center gap-2">
              <Crown size={14} className="text-[#98A2B3]" />
              <span className="card-title">Speakers</span>
            </div>
            <span className="text-[12px] text-[#98A2B3] tabular-nums">{joinedGuests.length} in</span>
          </div>
          <div className="px-4 py-2">
            {joinedGuests.length === 0 && (
              <div className="text-[12px] text-[#98A2B3] py-2">Just you right now. Invite guests from the overview page.</div>
            )}
            {joinedGuests.map(g => (
              <div key={g._id} className="flex items-center gap-2 py-1.5 text-[13px]">
                <div className="w-6 h-6 rounded-full bg-[#F2F4F7] text-[#475467] flex items-center justify-center text-[10px] font-semibold">
                  {g.name[0]?.toUpperCase()}
                </div>
                <span className="text-[#101828] font-medium truncate">{g.name}</span>
                {g.estate && <span className="text-[#98A2B3] truncate">· {g.estate}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Raised hands */}
        <div className="card">
          <div className="card-header !py-3 !px-4">
            <div className="flex items-center gap-2">
              <Hand size={14} className="text-[#F79009]" />
              <span className="card-title">Raised hands</span>
            </div>
            <span className={`badge ${live.handRequests.length ? 'badge-yellow' : 'badge-gray'} tabular-nums`}>{live.handRequests.length}</span>
          </div>
          <div className="px-4 py-2">
            {live.handRequests.length === 0 && (
              <div className="text-[12px] text-[#98A2B3] py-2">No call-in requests yet.</div>
            )}
            {live.handRequests.map(r => (
              <div key={r.socketId} className="flex items-center gap-2 py-1.5">
                <div className="w-6 h-6 rounded-full bg-[#FFFAEB] text-[#B54708] flex items-center justify-center text-[10px] font-semibold">
                  {r.userName?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-[13px] text-[#101828] flex-1 truncate">{r.userName || 'Listener'}</span>
                <button onClick={() => live.approveHand(r.socketId)} title="Promote to speaker"
                  className="p-1.5 rounded-md bg-[#059669] hover:bg-[#047857] text-white transition-colors">
                  <Check size={13}/>
                </button>
                <button onClick={() => live.denyHand(r.socketId)} title="Dismiss"
                  className="p-1.5 rounded-md border border-[#D0D5DD] text-[#475467] hover:text-[#B42318] hover:bg-[#FEF3F2] hover:border-[#FECDCA] transition-colors">
                  <X size={13}/>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Mixer deck: music + mic sliders (vertical) ────────────────────── */}
      <div className="card">
        <div className="card-header flex-wrap !py-3 !px-4">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-[#98A2B3]"/>
            <span className="card-title">Mixer deck</span>
            <span className="card-sub hidden sm:inline">· broadcast to the room</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {currentTrack ? (
              <>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#ECFDF3] border border-[#ABEFC6] text-[12px] font-medium text-[#067647] max-w-[240px] min-w-0">
                  <Music size={12} className="flex-shrink-0"/> <span className="truncate">{currentTrack.title}</span>
                </div>
                <button onClick={() => setShowPicker(true)} className="btn-outline !py-1 !px-2.5 !text-[12px]">Change</button>
                <button onClick={clearTrack} className="btn-outline !py-1 !px-2.5 !text-[12px] hover:!text-[#B42318]">Stop</button>
              </>
            ) : (
              <button onClick={() => setShowPicker(true)} className="btn-primary !py-1 !px-2.5 !text-[12px]">
                <Music size={12}/> Add music
              </button>
            )}
          </div>
        </div>

        {/* Hidden YouTube iframe — plays the background music for the host */}
        {currentTrack?.videoId && (
          <iframe ref={musicIframeRef} key={currentTrack.videoId}
            src={`https://www.youtube.com/embed/${currentTrack.videoId}?autoplay=1&modestbranding=1&rel=0&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
            onLoad={() => setTimeout(() => applyMusicVolume(musicVol), 400)}
            allow="autoplay; encrypted-media"
            style={{ position: 'absolute', width: 1, height: 1, border: 0, opacity: 0, pointerEvents: 'none' }} />
        )}

        <div className="p-4 flex gap-3 flex-wrap">
          <Fader label="Music" value={musicVol} max={100} unit="%"
            disabled={!currentTrack}
            onChange={applyMusicVolume}
            color={BRAND}
            icon={musicVol === 0 ? <VolumeX size={13}/> : musicVol < 40 ? <Volume1 size={13}/> : <Volume2 size={13}/>}
            quickActions={[{ label: 'Duck', value: 15 }, { label: 'Up', value: 60 }]}
          />
          <Fader label="Mic" value={Math.round((live.micGain || 1) * 100)} max={200} unit="%"
            disabled={false}
            onChange={(v) => live.setMicGain((v || 0) / 100)}
            color="#2E90FA"
            icon={<Mic size={13}/>}
            quickActions={[{ label: 'Low',  value: 80 }, { label: 'Hot', value: 150 }]}
          />
        </div>
      </div>

      {/* ── Audience panel: live chat + reactions + likes ─────────────────── */}
      <div className="grid gap-4 studio-audience" style={{ gridTemplateColumns: 'minmax(0,1fr) 240px' }}>
        {/* Chat */}
        <div className="card flex flex-col overflow-hidden">
          <div className="card-header !py-3 !px-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-[#98A2B3]"/>
              <span className="card-title">Live chat</span>
            </div>
            <span className="text-[12px] text-[#98A2B3] tabular-nums">{chat.length}</span>
          </div>
          <div ref={chatBoxRef} className="flex-1 overflow-y-auto flex flex-col gap-1 px-3 py-3 bg-[#FCFCFD]" style={{ maxHeight: 280, minHeight: 160 }}>
            {chat.length === 0 && (
              <div className="text-[12px] text-[#98A2B3] text-center py-8">
                Audience chat will appear here as listeners type.
              </div>
            )}
            {chat.map(m => (
              <div key={m.id} className="flex gap-2 items-start px-2 py-1.5 rounded-md hover:bg-[#F2F4F7]">
                {m.userPhoto ? (
                  <img src={m.userPhoto} alt="" className="w-[22px] h-[22px] rounded-full object-cover flex-shrink-0"/>
                ) : (
                  <div className="w-[22px] h-[22px] rounded-full bg-[#EAECF0] text-[#475467] flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
                    {(m.userName?.[0] || 'L').toUpperCase()}
                  </div>
                )}
                <div className="text-[13px] text-[#344054] leading-snug min-w-0 flex-1">
                  <span className="font-semibold text-[#101828] mr-1.5">{m.userName || 'Listener'}</span>
                  <span className="break-words">{m.text}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 p-3 border-t border-[#E4E7EC]">
            <input value={hostInput} onChange={e => setHostInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendHostChat(); }}
              placeholder="Reply to the room…"
              className="input-field flex-1" />
            <button onClick={sendHostChat} disabled={!hostInput.trim()} className="btn-primary !px-3" title="Send">
              <Send size={13}/>
            </button>
          </div>
        </div>

        {/* Right rail: counters + reaction stream */}
        <div className="flex flex-col gap-4">
          <div className="card p-4 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#FEF3F2] text-[#F04438] flex items-center justify-center flex-shrink-0">
              <Heart size={15} fill="currentColor"/>
            </span>
            <div>
              <div className="text-[12px] font-medium text-[#475467]">Likes</div>
              <div className="text-[22px] font-semibold text-[#101828] leading-none tabular-nums mt-0.5">{likes}</div>
            </div>
          </div>
          <div className="card p-4 flex-1 relative overflow-hidden" style={{ minHeight: 140 }}>
            <div className="card-title">Reactions</div>
            <div className="card-sub mt-0.5">Live from the audience</div>
            <div className="absolute inset-0 pointer-events-none">
              {reactionBurst.map(r => (
                <div key={r.id} style={{ position: 'absolute', bottom: 10, left: `${r.x}%`, fontSize: 24, animation: 'rx-float 3.2s ease-out forwards' }}>
                  {r.emoji}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2.4); opacity: 0; } }
        @keyframes rx-float {
          0%   { transform: translateY(0) scale(0.7); opacity: 0; }
          15%  { transform: translateY(-10px) scale(1.1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(-140px) scale(1); opacity: 0; }
        }
        @media (max-width: 760px) {
          .studio-audience { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Music picker modal */}
      {showPicker && (
        <ModalShell title="Pick a background track" subtitle="From the lounge house playlist" onClose={() => setShowPicker(false)} maxWidth={480} z={80}>
          <div className="p-2">
            {library.length === 0 && <Empty icon={Music} title="No tracks" hint="No tracks in the shared library." />}
            {library.map(t => (
              <button key={t._id} onClick={() => pickTrack(t)}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-left rounded-lg hover:bg-[#F9FAFB] transition-colors">
                <div className="w-8 h-8 rounded-md bg-[#F2F4F7] text-[#475467] flex items-center justify-center flex-shrink-0"><Music size={13}/></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#101828] truncate">{t.title}</div>
                  <div className="text-[12px] text-[#98A2B3]">{t.artist || 'Shared library'}</div>
                </div>
                {currentTrack?.videoId === t.videoId && <span className="badge badge-green">Playing</span>}
              </button>
            ))}
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical fader (mixer channel strip)
// ─────────────────────────────────────────────────────────────────────────────

function Fader({ label, value, max = 100, unit = '%', color, icon, disabled, onChange, quickActions = [] }) {
  return (
    <div className={`flex-1 min-w-[150px] rounded-lg border p-3.5 flex flex-col items-center ${disabled ? 'bg-[#F9FAFB] border-[#EAECF0] opacity-60' : 'bg-white border-[#E4E7EC]'}`}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#475467]">
        {icon}{label}
      </div>
      <div className="text-[22px] font-semibold text-[#101828] mt-1 tabular-nums leading-tight">
        {value}<span className="text-[11px] text-[#98A2B3] ml-0.5 font-normal">{unit}</span>
      </div>
      <input type="range" min="0" max={max} value={value}
        disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          writingMode: 'bt-lr',
          WebkitAppearance: 'slider-vertical',
          width: 24, height: 140, margin: '10px 0',
          accentColor: color,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }} />
      {/* Fallback horizontal slider for browsers that ignore vertical */}
      <style>{`input[type=range][orient=vertical] { -webkit-appearance: slider-vertical; }`}</style>
      <div className="flex gap-1.5 mt-1">
        {quickActions.map(q => (
          <button key={q.label} disabled={disabled} onClick={() => onChange(q.value)}
            className="px-2.5 py-1 rounded-md border border-[#D0D5DD] bg-white text-[11px] font-medium text-[#344054] hover:bg-[#F9FAFB] disabled:cursor-not-allowed">
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Show detail — scheduled view with invites + go-live
// ─────────────────────────────────────────────────────────────────────────────

function ShowDetail({ show, onBack, onChanged, onGoLive }) {
  const [current, setCurrent] = useState(show);
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const refresh = async () => {
    try { const { data } = await podcastAPI.getShow(current._id); setCurrent(data.data); }
    catch {}
  };

  const copyLink = (token) => {
    navigator.clipboard.writeText(guestLink(token));
    toast.success('Link copied');
  };

  const revoke = async (inviteId) => {
    if (!confirm('Revoke this invite?')) return;
    try { await podcastAPI.revokeInvite(current._id, inviteId); refresh(); toast.success('Revoked'); }
    catch { toast.error('Failed'); }
  };

  const goLive = async () => {
    if (!confirm('Go live now?')) return;
    try {
      const { data } = await podcastAPI.goLive(current._id);
      onGoLive(data.data);
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const statusBadge = current.status === 'scheduled'
    ? <span className="badge badge-blue">Upcoming</span>
    : current.status === 'live'
      ? <span className="badge badge-red">Live now</span>
      : <span className="badge badge-gray">Past show</span>;

  const guestStatus = (g) => g.status === 'joined'
    ? <span className="badge badge-green">Joined</span>
    : g.status === 'revoked'
      ? <span className="badge badge-gray">Revoked</span>
      : <span className="badge badge-yellow">Awaiting join</span>;

  return (
    <div className="max-w-4xl">
      <button onClick={onBack} className="btn-ghost !px-2 mb-3">
        <ChevronLeft size={15}/> Back
      </button>

      <PageHeader
        heading title={current.title}
        description={current.description || undefined}
        actions={(
          <>
            {current.status !== 'live' && (
              <button onClick={() => setShowEdit(true)} className="btn-outline">
                <Edit3 size={13}/> Edit
              </button>
            )}
            <button onClick={() => setShowInvite(true)} className="btn-outline">
              <LinkIcon size={14}/> Invite guest
            </button>
            {current.status !== 'ended' && (
              <button onClick={goLive} className="btn-danger">
                <Radio size={14}/> Go live now
              </button>
            )}
          </>
        )}
      >
        <div className="flex items-center gap-3 flex-wrap text-[12.5px] text-[#475467]">
          {statusBadge}
          {current.scheduledAt && (
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-[#98A2B3]"/> {niceDate(current.scheduledAt)}
            </span>
          )}
          {current.isRecurring && <span className="badge badge-gray">Recurring</span>}
        </div>
      </PageHeader>

      {/* Guest invites */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <div className="card-title">Guests</div>
            <div className="card-sub">Estate reps who can join as speakers</div>
          </div>
          <span className="badge badge-gray tabular-nums">{current.guests?.length || 0}</span>
        </div>
        {(current.guests || []).length === 0 ? (
          <Empty icon={Users} title="No guests yet" hint="Invite estate reps to join as speakers." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Estate</th>
                  <th>Status</th>
                  <th className="!text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(current.guests || []).map(g => (
                  <tr key={g._id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#F2F4F7] text-[#475467] flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
                          {g.name[0]?.toUpperCase()}
                        </div>
                        <span className="cell-strong whitespace-nowrap">{g.name}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{g.estate || <span className="text-[#98A2B3]">—</span>}</td>
                    <td>{guestStatus(g)}</td>
                    <td>
                      {g.status !== 'revoked' && (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => copyLink(g.inviteToken)} title="Copy invite link"
                            className="btn-outline !py-1 !px-2 !text-[12px]">
                            <Copy size={12}/> Copy link
                          </button>
                          <button onClick={() => revoke(g._id)} title="Revoke"
                            className="p-1.5 rounded-md text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] transition-colors">
                            <Trash2 size={14}/>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showInvite && <InviteModal show={current} onInvited={() => { refresh(); setShowInvite(false); }} onClose={() => setShowInvite(false)} />}
      {showEdit   && <ShowFormModal show={current} onSaved={(s) => { setCurrent(s); onChanged?.(s); setShowEdit(false); }} onClose={() => setShowEdit(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function PodcastStudio() {
  const { user } = useAuth();
  const [shows, setShows]       = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null); // scheduled show detail
  const [liveShow, setLiveShow] = useState(null); // when going live

  const load = async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([podcastAPI.listShows(), podcastAPI.listEpisodes()]);
      setShows(s.data.data || []);
      setEpisodes(e.data.data || []);
      // Only drop *this* admin into LiveStudio if they're actually the host
      // of the show that's live. Other admins visiting the page while someone
      // else is live see the overview instead.
      const live = (s.data.data || []).find(x => x.status === 'live');
      if (live && String(live.hostUserId) === String(user?._id)) {
        setLiveShow(live);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const upcoming = useMemo(() => shows.filter(s => s.status === 'scheduled').sort((a, b) =>
    new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0)), [shows]);
  const past = useMemo(() => shows.filter(s => s.status === 'ended').sort((a, b) =>
    new Date(b.endedAt || b.createdAt || 0) - new Date(a.endedAt || a.createdAt || 0)), [shows]);


  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <div className="skeleton h-8 w-56 mb-2" />
        <div className="skeleton h-4 w-96 max-w-full mb-6" />
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-5">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-[92px]" />)}
        </div>
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (liveShow) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <LiveStudio
          show={liveShow}
          onBack={() => setLiveShow(null)}
          onEnded={() => { setLiveShow(null); load(); }}
        />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="max-w-[1400px] mx-auto">
        <ShowDetail
          show={selected}
          onBack={() => setSelected(null)}
          onChanged={(s) => setShows(prev => prev.map(x => x._id === s._id ? s : x))}
          onGoLive={(s) => { setSelected(null); setLiveShow(s); load(); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        title="Podcast studio"
        description="AreaConnect FM — schedule shows, invite estate reps and go live across every estate."
        actions={(
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={14}/> New show
          </button>
        )}
      />

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-5">
        <StatCard label="Upcoming shows" value={upcoming.length} icon={Calendar} color="blue" />
        <StatCard label="Archived episodes" value={episodes.length} icon={Headphones} color="green" />
        <StatCard label="Past shows" value={past.length} icon={Radio} color="amber" />
      </div>

      {/* Upcoming */}
      <div className="card overflow-hidden mb-5">
        <div className="card-header">
          <div>
            <div className="card-title">Upcoming</div>
            <div className="card-sub">Scheduled broadcasts — open one to invite guests or go live</div>
          </div>
          <span className="badge badge-gray tabular-nums">{upcoming.length}</span>
        </div>
        {upcoming.length === 0 ? (
          <Empty icon={Calendar} title="Nothing scheduled" hint="Click New show to plan a Friday Talk Show." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Show</th>
                  <th>Scheduled</th>
                  <th>Guests</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {upcoming.map(s => (
                  <tr key={s._id} onClick={() => setSelected(s)} className="cursor-pointer">
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-[#ECFDF3] text-[#059669] flex items-center justify-center flex-shrink-0">
                          <Radio size={15}/>
                        </div>
                        <div className="min-w-0">
                          <div className="cell-strong truncate max-w-[280px] sm:max-w-[420px]">{s.title}</div>
                          {s.isRecurring && <span className="badge badge-gray mt-0.5">Recurring</span>}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{s.scheduledAt ? niceDate(s.scheduledAt) : <span className="text-[#98A2B3]">Any time</span>}</td>
                    <td className="tabular-nums whitespace-nowrap">
                      {s.guests?.length > 0 ? `${s.guests.length} guest${s.guests.length !== 1 ? 's' : ''}` : <span className="text-[#98A2B3]">—</span>}
                    </td>
                    <td><ChevronRight size={16} className="text-[#98A2B3]"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past episodes */}
      <div className="card overflow-hidden">
        <div className="card-header">
          <div>
            <div className="card-title">Archive</div>
            <div className="card-sub">Recorded episodes from past broadcasts</div>
          </div>
          <span className="badge badge-gray tabular-nums">{episodes.length}</span>
        </div>
        {episodes.length === 0 ? (
          <Empty icon={Headphones} title="No episodes yet" hint="Past episodes will land here after they end." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Episode</th>
                  <th>Published</th>
                  <th className="!text-right">Duration</th>
                  <th className="!text-right">Peak listeners</th>
                  <th className="!text-right">Audio</th>
                </tr>
              </thead>
              <tbody>
                {episodes.map(ep => (
                  <tr key={ep._id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-[#F2F4F7] text-[#475467] flex items-center justify-center flex-shrink-0">
                          <Play size={13}/>
                        </div>
                        <span className="cell-strong truncate max-w-[280px] sm:max-w-[420px]">{ep.title}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {new Date(ep.publishedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">{Math.round((ep.durationSec || 0) / 60)} min</td>
                    <td className="text-right tabular-nums">{ep.peakListeners}</td>
                    <td className="text-right">
                      {ep.audioUrl ? (
                        <a href={ep.audioUrl} target="_blank" rel="noreferrer" title="Play recording"
                          className="btn-outline !py-1 !px-2 !text-[12px]">
                          <Volume2 size={12}/> Listen
                        </a>
                      ) : <span className="text-[#98A2B3]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && <ShowFormModal onSaved={(s) => { setShows(prev => [s, ...prev]); setShowForm(false); setSelected(s); }} onClose={() => setShowForm(false)} />}
    </div>
  );
}
