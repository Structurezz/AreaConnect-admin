import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Radio, Mic, MicOff, Users, Plus, Calendar, X, Hand, Check, UserX,
  Save, Loader2, Share2, Trash2, Edit3, Play, Pause, Headphones, Link as LinkIcon,
  Copy, ChevronRight, Crown, Volume2, Heart, MessageSquare, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { podcastAPI, defaultTrackAPI } from '../api';
import { useAuth }    from '../context/AuthContext';
import { useSocket }  from '../context/SocketContext';
import { useLiveAudio } from '../hooks/useLiveAudio';
import BoostedRemoteAudio from '../components/BoostedRemoteAudio';
import { Music, VolumeX, Volume1, Sliders } from 'lucide-react';

const BRAND = '#8B5CF6'; // violet to differentiate from estate green
const BRAND_DARK = '#6D28D9';

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 22, width: '100%', maxWidth: 480, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{show ? 'Edit show' : 'Schedule a show'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18}/></button>
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title</label>
        <input className="input-field" style={{ marginTop: 6, marginBottom: 12 }}
          value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="e.g. Friday Talk Show — Estate Life" />

        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</label>
        <textarea className="input-field" rows={3} style={{ marginTop: 6, marginBottom: 12, resize: 'vertical' }}
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="What is this episode about?" />

        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scheduled for (optional)</label>
        <input className="input-field" type="datetime-local" style={{ marginTop: 6, marginBottom: 12 }}
          value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}>
          <input type="checkbox" checked={form.isRecurring}
            onChange={e => setForm({ ...form, isRecurring: e.target.checked })} />
          <span style={{ fontSize: 13, color: '#334155' }}>Recurring (e.g. every Friday)</span>
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: '0 0 auto', padding: '10px 18px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={save} disabled={saving}
            style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, color: '#fff',
              fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : <><Save size={13}/> {show ? 'Update' : 'Schedule'}</>}
          </button>
        </div>
      </div>
    </div>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(2,6,23,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 22, width: '100%', maxWidth: 440, border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Invite a guest</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18}/></button>
        </div>
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 14 }}>
          Add a guest and share their one-click join link. They don't need an account.
        </div>
        <input className="input-field" placeholder="Name (e.g. Mr. Adebayo — Victoria Gardens)"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ marginBottom: 10 }} />
        <input className="input-field" placeholder="Estate (optional)"
          value={form.estate} onChange={e => setForm({ ...form, estate: e.target.value })} style={{ marginBottom: 10 }} />
        <input className="input-field" placeholder="Phone (optional)"
          value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ marginBottom: 14 }} />
        <button onClick={invite} disabled={saving}
          style={{ width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
            background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, color: '#fff', fontWeight: 700, fontSize: 13,
            cursor: saving ? 'wait' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <><Loader2 size={14} className="animate-spin"/> Creating…</> : <><LinkIcon size={13}/> Generate invite link</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Studio — the broadcasting view
// ─────────────────────────────────────────────────────────────────────────────

function LiveStudio({ show, onEnded, onBack }) {
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

  // Mic + recorder
  useEffect(() => {
    (async () => {
      try {
        const stream = await live.getLocalStream();
        try {
          const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
          const r = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 96000 });
          const chunks = [];
          r.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
          r.onstop = () => { voiceBlobRef.current = new Blob(chunks, { type: 'audio/webm' }); };
          r.start(1000);
          recorderRef.current = r;
        } catch (e) { console.warn('record unsupported', e); }
      } catch (e) {
        toast.error('Mic access required to host');
      }
    })();
    // eslint-disable-next-line
  }, []);

  const uploadEpisode = async (blob) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset    = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !preset || !blob) return '';
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
        await new Promise(r => { recorderRef.current.onstop = () => { voiceBlobRef.current = new Blob(recorderRef.current._chunks || [], { type: 'audio/webm' }); r(); }; recorderRef.current.stop(); });
      }
      const blob = voiceBlobRef.current;
      let audioUrl = '';
      if (blob) {
        try { audioUrl = await uploadEpisode(blob); }
        catch { toast('Audio upload failed — show saved without archive', { icon: '⚠️' }); }
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

  return (
    <div style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E1B4B 100%)', borderRadius: 18, minHeight: '70vh', color: '#fff', padding: 20, position: 'relative' }}>
      <AudioSinks streams={live.remoteStreams} />

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#CBD5E1', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10 }}>
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#EF4444', animation: 'ping 1.6s infinite' }} />
            <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: '#FCA5A5' }}>ON AIR</span>
          <span style={{ fontSize: 12, color: '#94A3B8', marginLeft: 4 }}>{fmtDur(elapsed)}</span>
        </div>
        <button onClick={endShow} disabled={ending}
          style={{ padding: '8px 14px', borderRadius: 10, background: '#EF4444', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: ending ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {ending ? <><Loader2 size={13} className="animate-spin"/> Ending…</> : <><X size={13}/> End show</>}
        </button>
      </div>

      {/* Center — show info + listener/peak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 10px 24px rgba(139,92,246,0.4)' }}>
          <Radio size={30} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#A5B4FC', letterSpacing: '0.14em', textTransform: 'uppercase' }}>AreaConnect FM</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{show.title}</div>
          <div style={{ fontSize: 13, color: '#CBD5E1' }}>{show.description || 'Live broadcast across all estates'}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Listeners</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{live.listenerCount}</div>
          </div>
          <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '12px 18px', minWidth: 90 }}>
            <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Peak</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{peak}</div>
          </div>
        </div>
      </div>

      {/* Mic + guests + raised hands grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {/* Mic card */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={live.toggleMic}
            style={{ width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: live.micOn ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : '#334155',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: live.micOn ? '0 8px 20px rgba(139,92,246,0.5)' : 'none' }}>
            {live.micOn ? <Mic size={24}/> : <MicOff size={24}/>}
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#A5B4FC', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your mic</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{live.micOn ? 'Open' : 'Muted'}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{user?.name} · Host</div>
          </div>
        </div>

        {/* Guests */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Crown size={14} color="#FDE68A" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Speakers</span>
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto' }}>{(show.guests || []).filter(g => g.status === 'joined').length} in</span>
          </div>
          {(show.guests || []).filter(g => g.status === 'joined').length === 0 && (
            <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>Just you right now. Invite guests from the overview page.</div>
          )}
          {(show.guests || []).filter(g => g.status === 'joined').map(g => (
            <div key={g._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 12, color: '#CBD5E1' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                {g.name[0]?.toUpperCase()}
              </div>
              <span>{g.name}</span>
              {g.estate && <span style={{ color: '#64748B' }}>· {g.estate}</span>}
            </div>
          ))}
        </div>

        {/* Raised hands */}
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Hand size={14} color="#FBBF24" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Raised hands</span>
            <span style={{ fontSize: 11, color: '#FBBF24', marginLeft: 'auto', fontWeight: 700 }}>{live.handRequests.length}</span>
          </div>
          {live.handRequests.length === 0 && (
            <div style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>No call-in requests yet.</div>
          )}
          {live.handRequests.map(r => (
            <div key={r.socketId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff' }}>
                {r.userName?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize: 12, color: '#fff', flex: 1 }}>{r.userName || 'Listener'}</span>
              <button onClick={() => live.approveHand(r.socketId)} title="Promote to speaker"
                style={{ padding: 5, borderRadius: 8, background: '#10B981', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Check size={13}/>
              </button>
              <button onClick={() => live.denyHand(r.socketId)} title="Dismiss"
                style={{ padding: 5, borderRadius: 8, background: 'rgba(239,68,68,0.2)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer' }}>
                <X size={13}/>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mixer deck: music + mic sliders (vertical) ────────────────────── */}
      <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <Sliders size={14} color="#C4B5FD"/>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Mixer deck</span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>· broadcast to the room</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {currentTrack ? (
              <>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, background: 'rgba(139,92,246,0.2)', border: `1px solid ${BRAND}44`, fontSize: 11, fontWeight: 700, color: '#fff', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Music size={11}/> {currentTrack.title}
                </div>
                <button onClick={() => setShowPicker(true)} style={{ padding: '5px 10px', borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Change</button>
                <button onClick={clearTrack} style={{ padding: '5px 10px', borderRadius: 999, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.14)', color: '#FCA5A5', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Stop</button>
              </>
            ) : (
              <button onClick={() => setShowPicker(true)} style={{ padding: '5px 12px', borderRadius: 999, border: 'none', background: `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})`, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Music size={11}/> Add music
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

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
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
            color="#10B981"
            icon={<Mic size={13}/>}
            quickActions={[{ label: 'Low',  value: 80 }, { label: 'Hot', value: 150 }]}
          />
        </div>
      </div>

      {/* ── Audience panel: live chat + reactions + likes ─────────────────── */}
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 220px', gap: 14 }} className="studio-audience">
        {/* Chat */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MessageSquare size={14} color="#C4B5FD"/>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Live chat</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>· {chat.length}</span>
          </div>
          <div ref={chatBoxRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, paddingRight: 4 }}>
            {chat.length === 0 && (
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center', padding: '28px 0', fontStyle: 'italic' }}>
                Audience chat will appear here as listeners type.
              </div>
            )}
            {chat.map(m => (
              <div key={m.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 8px', borderRadius: 10, background: 'rgba(0,0,0,0.3)' }}>
                {m.userPhoto ? (
                  <img src={m.userPhoto} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}/>
                ) : (
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                    {(m.userName?.[0] || 'L').toUpperCase()}
                  </div>
                )}
                <div style={{ fontSize: 13, color: '#fff', lineHeight: 1.4, minWidth: 0, flex: 1 }}>
                  <span style={{ fontWeight: 700, color: '#C4B5FD', marginRight: 6 }}>{m.userName || 'Listener'}</span>
                  <span style={{ wordBreak: 'break-word' }}>{m.text}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <input value={hostInput} onChange={e => setHostInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendHostChat(); }}
              placeholder="Reply to the room…"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: '#fff', fontSize: 13, outline: 'none' }}/>
            <button onClick={sendHostChat} disabled={!hostInput.trim()}
              style={{ padding: '0 14px', borderRadius: 10, border: 'none', cursor: hostInput.trim() ? 'pointer' : 'default',
                background: hostInput.trim() ? `linear-gradient(135deg, ${BRAND}, ${BRAND_DARK})` : 'rgba(255,255,255,0.08)',
                color: '#fff', fontWeight: 700, fontSize: 13, opacity: hostInput.trim() ? 1 : 0.5,
                display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Send size={13}/>
            </button>
          </div>
        </div>

        {/* Right rail: counters + reaction stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: 'rgba(244,63,94,0.14)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 16, padding: 14, textAlign: 'center' }}>
            <Heart size={16} color="#F43F5E" fill="#F43F5E" style={{ margin: '0 auto 4px' }}/>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#FDA4AF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Likes</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, marginTop: 2 }}>{likes}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, flex: 1, position: 'relative', overflow: 'hidden', minHeight: 120 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#C4B5FD', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Reactions</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>live from the audience</div>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.72)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Pick a background track</div>
              <button onClick={() => setShowPicker(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={16}/></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {library.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No tracks in the shared library.</div>}
              {library.map(t => (
                <button key={t._id} onClick={() => pickTrack(t)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${BRAND}18`, color: BRAND_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Music size={13}/></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.artist || 'Shared library'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical fader (mixer channel strip)
// ─────────────────────────────────────────────────────────────────────────────

function Fader({ label, value, max = 100, unit = '%', color, icon, disabled, onChange, quickActions = [] }) {
  return (
    <div style={{
      flex: 1, minWidth: 150,
      background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.25)',
      border: `1px solid ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
      borderRadius: 14, padding: 14,
      opacity: disabled ? 0.55 : 1,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#CBD5E1', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {icon}{label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>{value}<span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 2 }}>{unit}</span></div>
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
      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
        {quickActions.map(q => (
          <button key={q.label} disabled={disabled} onClick={() => onChange(q.value)}
            style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 10, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer' }}>
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

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748B', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, padding: 0 }}>← Back</button>

      <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #FAF5FF)', border: '1px solid #DDD6FE', borderRadius: 18, padding: 22, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: BRAND_DARK, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>
          {current.status === 'scheduled' ? 'Upcoming' : current.status === 'live' ? 'Live now' : 'Past show'}
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>{current.title}</div>
        {current.description && <div style={{ fontSize: 14, color: '#475569', marginTop: 6, lineHeight: 1.55 }}>{current.description}</div>}
        {current.scheduledAt && (
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={13}/> {niceDate(current.scheduledAt)}
            {current.isRecurring && <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 999, background: '#EDE9FE', color: BRAND_DARK, fontWeight: 700, fontSize: 11 }}>Recurring</span>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {current.status !== 'ended' && (
            <button onClick={goLive}
              style={{ padding: '10px 18px', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                background: `linear-gradient(135deg, #EF4444, #DC2626)`, color: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Radio size={14}/> Go live now
            </button>
          )}
          <button onClick={() => setShowInvite(true)}
            style={{ padding: '10px 18px', borderRadius: 12, border: '1px solid #DDD6FE', background: '#fff', color: BRAND_DARK, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <LinkIcon size={14}/> Invite guest
          </button>
          {current.status !== 'live' && (
            <button onClick={() => setShowEdit(true)}
              style={{ padding: '10px 14px', borderRadius: 12, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={13}/> Edit
            </button>
          )}
        </div>
      </div>

      {/* Guest invites */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Users size={14} color={BRAND_DARK} />
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>Guests ({current.guests?.length || 0})</div>
        </div>
        {(current.guests || []).length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: 13 }}>
            No guests yet. Invite estate reps to join as speakers.
          </div>
        )}
        {(current.guests || []).map(g => (
          <div key={g._id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            borderRadius: 12, border: '1px solid #F1F5F9', background: '#FAFAFA', marginBottom: 6,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: `${BRAND}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND_DARK, fontWeight: 800, fontSize: 13 }}>
              {g.name[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{g.name}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                {g.estate ? `${g.estate} · ` : ''}{g.status === 'joined' ? '✓ Joined' : g.status === 'revoked' ? 'Revoked' : 'Awaiting join'}
              </div>
            </div>
            {g.status !== 'revoked' && (
              <>
                <button onClick={() => copyLink(g.inviteToken)}
                  style={{ padding: 6, borderRadius: 9, background: '#EEF2FF', color: BRAND_DARK, border: '1px solid #C7D2FE', cursor: 'pointer' }} title="Copy invite link">
                  <Copy size={13}/>
                </button>
                <button onClick={() => revoke(g._id)}
                  style={{ padding: 6, borderRadius: 9, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', cursor: 'pointer' }} title="Revoke">
                  <Trash2 size={13}/>
                </button>
              </>
            )}
          </div>
        ))}
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

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 className="animate-spin" size={22} color={BRAND}/></div>;

  if (liveShow) {
    return (
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 16px 40px' }}>
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
      <div style={{ padding: '20px 16px 40px' }}>
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
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px 40px' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #8B5CF6 100%)',
        borderRadius: 20, padding: 22, marginBottom: 20, color: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Radio size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', opacity: 0.8 }}>AREACONNECT FM</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15 }}>Podcast Studio</h1>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>Schedule shows, invite estate reps, go live across every estate.</div>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: '#fff', color: BRAND_DARK, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14}/> New show
          </button>
        </div>
      </div>

      {/* Upcoming */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Calendar size={14} color={BRAND_DARK}/>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Upcoming</h2>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>· {upcoming.length}</span>
        </div>
        {upcoming.length === 0 && (
          <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            Nothing scheduled. Click <strong>New show</strong> to plan a Friday Talk Show.
          </div>
        )}
        {upcoming.map(s => (
          <button key={s._id} onClick={() => setSelected(s)}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, cursor: 'pointer', marginBottom: 8 }}
            onMouseEnter={e => e.currentTarget.style.borderColor = BRAND}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `${BRAND}18`, color: BRAND_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Radio size={18}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                {s.scheduledAt ? niceDate(s.scheduledAt) : 'Any time'}
                {s.isRecurring && <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 999, background: '#EDE9FE', color: BRAND_DARK, fontWeight: 700, fontSize: 10 }}>Recurring</span>}
                {s.guests?.length > 0 && <span> · {s.guests.length} guest{s.guests.length !== 1 ? 's' : ''}</span>}
              </div>
            </div>
            <ChevronRight size={16} color="#94A3B8"/>
          </button>
        ))}
      </div>

      {/* Past episodes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Headphones size={14} color={BRAND_DARK}/>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Archive</h2>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>· {episodes.length}</span>
        </div>
        {episodes.length === 0 && (
          <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
            Past episodes will land here after they end.
          </div>
        )}
        {episodes.map(ep => (
          <div key={ep._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${BRAND}18`, color: BRAND_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Play size={14}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.title}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>
                {new Date(ep.publishedAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} · {Math.round((ep.durationSec || 0) / 60)} min · peak {ep.peakListeners}
              </div>
            </div>
            {ep.audioUrl && (
              <a href={ep.audioUrl} target="_blank" rel="noreferrer"
                style={{ padding: 7, borderRadius: 9, background: '#F1F5F9', color: '#64748B', border: '1px solid #E2E8F0' }}>
                <Volume2 size={13}/>
              </a>
            )}
          </div>
        ))}
      </div>

      {showForm && <ShowFormModal onSaved={(s) => { setShows(prev => [s, ...prev]); setShowForm(false); setSelected(s); }} onClose={() => setShowForm(false)} />}
    </div>
  );
}
