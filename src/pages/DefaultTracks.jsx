import { useEffect, useMemo, useState } from 'react';
import {
  Music, Plus, RefreshCw, Search, Trash2, Edit3, X,
  Youtube, Eye, EyeOff, GripVertical, Download, Pencil, ExternalLink,
} from 'lucide-react';
import { defaultTrackAPI } from '../api';
import toast from 'react-hot-toast';

// Pull the 11-char YouTube videoId out of either a raw id or a full URL.
function extractVideoId(input) {
  if (!input) return '';
  const s = String(input).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|\/embed\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : s;
}

const BLANK = { videoId: '', title: '', artist: '', order: null, isActive: true };

function TrackThumb({ videoId, size = 48 }) {
  return (
    <img
      src={`https://i.ytimg.com/vi/${videoId}/default.jpg`}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 8, objectFit: 'cover', background: '#F1F5F9', flexShrink: 0 }}
      onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
    />
  );
}

export default function DefaultTracks() {
  const [tracks, setTracks]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState('all'); // all | active | hidden
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);
  const [reseeding, setReseeding] = useState(false);

  const load = () => {
    setLoading(true);
    defaultTrackAPI.getAll()
      .then(({ data }) => setTracks(data.data || []))
      .catch(() => toast.error('Failed to load tracks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => ({
    total:  tracks.length,
    active: tracks.filter((t) => t.isActive).length,
    hidden: tracks.filter((t) => !t.isActive).length,
  }), [tracks]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracks.filter((t) => {
      if (filter === 'active' && !t.isActive) return false;
      if (filter === 'hidden' && t.isActive)  return false;
      if (!q) return true;
      return [t.title, t.artist, t.videoId].filter(Boolean).join(' ').toLowerCase().includes(q);
    });
  }, [tracks, search, filter]);

  const openCreate = () => { setEditing(null); setForm(BLANK); setShowForm(true); };
  const openEdit   = (t) => {
    setEditing(t);
    setForm({ videoId: t.videoId, title: t.title, artist: t.artist || '', order: t.order, isActive: t.isActive });
    setShowForm(true);
  };

  const handleVideoIdBlur = () => {
    const normalized = extractVideoId(form.videoId);
    if (normalized !== form.videoId) setForm((f) => ({ ...f, videoId: normalized }));
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    const videoId = extractVideoId(form.videoId);
    if (!videoId || !form.title?.trim()) {
      toast.error('Video ID and title are required');
      return;
    }
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      toast.error('Not a valid YouTube video ID (expected 11 chars)');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        videoId,
        title: form.title.trim(),
        artist: (form.artist || '').trim(),
        isActive: form.isActive,
      };
      if (typeof form.order === 'number') payload.order = form.order;

      if (editing) {
        const { data } = await defaultTrackAPI.update(editing._id, payload);
        setTracks((prev) => prev.map((t) => (t._id === editing._id ? data.data : t)));
        toast.success('Track updated');
      } else {
        const { data } = await defaultTrackAPI.create(payload);
        setTracks((prev) => [...prev, data.data].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        toast.success('Added to house playlist');
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      const { data } = await defaultTrackAPI.update(t._id, { isActive: !t.isActive });
      setTracks((prev) => prev.map((x) => (x._id === t._id ? data.data : x)));
      toast.success(t.isActive ? 'Hidden from the lounge' : 'Visible again');
    } catch {
      toast.error('Failed');
    }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Remove "${t.title}" from the house playlist?`)) return;
    try {
      await defaultTrackAPI.delete(t._id);
      setTracks((prev) => prev.filter((x) => x._id !== t._id));
      toast.success('Removed');
    } catch {
      toast.error('Failed');
    }
  };

  const handleReseed = async () => {
    if (!confirm('Import the seed playlist? Already-present videoIds will be skipped.')) return;
    setReseeding(true);
    try {
      const { data } = await defaultTrackAPI.reseed();
      toast.success(data.message || 'Reseed complete');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reseed failed');
    } finally {
      setReseeding(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900" style={{ letterSpacing: '-0.02em' }}>
            Lounge House Playlist
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-xl">
            Default tracks seeded into every estate's Resident Lounge. Changes here apply to every estate instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleReseed} disabled={reseeding}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all"
            style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0' }}>
            <Download size={13} />{reseeding ? 'Importing…' : 'Import seed'}
          </button>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl text-white"
            style={{
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              boxShadow: '0 4px 12px rgba(124,58,237,0.30)',
            }}>
            <Plus size={14} /> Add track
          </button>
        </div>
      </div>

      {/* Stat strip */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatChip label="Total"   value={stats.total}   tone="slate" />
          <StatChip label="Active"  value={stats.active}  tone="green" />
          <StatChip label="Hidden"  value={stats.hidden}  tone="amber" />
        </div>
      )}

      {/* Search + filter */}
      {!loading && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, artist or video ID…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A' }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            {[
              { k: 'all',    label: 'All' },
              { k: 'active', label: 'Active' },
              { k: 'hidden', label: 'Hidden' },
            ].map(({ k, label }) => {
              const active = filter === k;
              return (
                <button key={k}
                  onClick={() => setFilter(k)}
                  className="inline-flex items-center text-xs font-bold px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg, #7C3AED, #4F46E5)' : '#FFFFFF',
                    color: active ? '#fff' : '#475569',
                    border: `1px solid ${active ? 'transparent' : '#E2E8F0'}`,
                    boxShadow: active ? '0 4px 12px rgba(124,58,237,0.25)' : 'none',
                  }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={22} className="animate-spin" style={{ color: '#94A3B8' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <Music size={28} className="mx-auto mb-2" style={{ color: '#CBD5E1' }} />
          <p className="text-sm font-semibold" style={{ color: '#334155' }}>No tracks match</p>
          {tracks.length === 0 && (
            <button onClick={handleReseed} disabled={reseeding}
              className="mt-3 text-xs font-bold" style={{ color: '#7C3AED' }}>
              Import the seed playlist →
            </button>
          )}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="px-4 py-2 flex items-center justify-between text-[11px] font-semibold"
            style={{ color: '#64748B', background: '#F8FAFC', borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
            <span>Showing {filtered.length} of {tracks.length}</span>
            <span>Scroll inside this list</span>
          </div>
          <div className="divide-y overflow-y-auto"
            style={{ borderColor: 'rgba(15,23,42,0.05)', maxHeight: 'calc(100vh - 420px)', minHeight: 320 }}>
            {filtered.map((t) => (
              <div key={t._id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50">
                <GripVertical size={14} style={{ color: '#CBD5E1' }} className="hidden sm:block flex-shrink-0" />
                <TrackThumb videoId={t.videoId} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{t.title}</span>
                    {!t.isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                        style={{ background: 'rgba(245,158,11,0.10)', color: '#B45309' }}>Hidden</span>
                    )}
                  </div>
                  <div className="text-xs truncate mt-0.5" style={{ color: '#64748B' }}>
                    {t.artist || <span style={{ color: '#94A3B8' }}>No artist</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px]" style={{ color: '#94A3B8' }}>
                    <span className="font-mono">{t.videoId}</span>
                    <a href={`https://youtu.be/${t.videoId}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-semibold hover:underline" style={{ color: '#7C3AED' }}>
                      <ExternalLink size={9} /> Preview
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(t)}
                    title={t.isActive ? 'Hide from lounge' : 'Show in lounge'}
                    className="p-2 rounded-lg transition-all"
                    style={{ color: t.isActive ? '#059669' : '#94A3B8' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                    {t.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>
                  <button onClick={() => openEdit(t)}
                    title="Edit"
                    className="p-2 rounded-lg transition-all"
                    style={{ color: '#475569' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(t)}
                    title="Delete"
                    className="p-2 rounded-lg transition-all"
                    style={{ color: '#CBD5E1' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#CBD5E1'; e.currentTarget.style.background = 'transparent'; }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, background: 'rgba(15,23,42,0.70)', backdropFilter: 'blur(6px)',
        }}>
          <form onSubmit={handleSave} style={{
            background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
            overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
              padding: '18px 20px', position: 'relative',
            }}>
              <button type="button" onClick={() => setShowForm(false)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  borderRadius: 8, width: 28, height: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#fff',
                }}><X size={14} /></button>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {editing ? 'Edit track' : 'Add to house playlist'}
              </div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 800, marginTop: 2 }}>
                {editing ? form.title || 'Edit track' : 'New track'}
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* VideoId */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  YouTube video ID or URL
                </label>
                <div style={{ position: 'relative' }}>
                  <Youtube size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#EF4444' }} />
                  <input
                    value={form.videoId}
                    onChange={(e) => setForm((f) => ({ ...f, videoId: e.target.value }))}
                    onBlur={handleVideoIdBlur}
                    placeholder="dQw4w9WgXcQ or https://youtu.be/…"
                    style={{
                      width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10,
                      border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none',
                      background: '#F8FAFC', color: '#0F172A', fontFamily: 'monospace',
                    }} />
                </div>
                {form.videoId && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrackThumb videoId={extractVideoId(form.videoId)} size={56} />
                    <a href={`https://youtu.be/${extractVideoId(form.videoId)}`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, fontWeight: 600, color: '#7C3AED', textDecoration: 'none' }}>
                      Preview on YouTube →
                    </a>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Title
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Calm Down"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none',
                    background: '#F8FAFC', color: '#0F172A',
                  }} />
              </div>

              {/* Artist */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                  Artist (optional)
                </label>
                <input
                  value={form.artist}
                  onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
                  placeholder="e.g. Rema"
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid #E2E8F0', fontSize: 13, outline: 'none',
                    background: '#F8FAFC', color: '#0F172A',
                  }} />
              </div>

              {/* Active toggle */}
              <button type="button" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12,
                  background: form.isActive ? 'rgba(16,185,129,0.06)' : '#F8FAFC',
                  border: `1.5px solid ${form.isActive ? 'rgba(16,185,129,0.22)' : '#E2E8F0'}`,
                  cursor: 'pointer', textAlign: 'left',
                }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: form.isActive ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.15)',
                  color: form.isActive ? '#059669' : '#64748B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {form.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                    {form.isActive ? 'Visible in every estate' : 'Hidden from the lounge'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    Toggle to show or hide this track without deleting it
                  </div>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 999, position: 'relative',
                  background: form.isActive ? '#10B981' : '#CBD5E1',
                }}>
                  <div style={{
                    position: 'absolute', top: 2,
                    left: form.isActive ? 'calc(100% - 20px)' : 2,
                    width: 18, height: 18, borderRadius: 999, background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                    transition: 'left 0.15s',
                  }} />
                </div>
              </button>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{
                    flex: 1, padding: '12px', background: '#F1F5F9',
                    color: '#64748B', border: 'none', borderRadius: 12,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  }}>Cancel</button>
                <button type="submit" disabled={saving}
                  style={{
                    flex: 2, padding: '12px',
                    background: saving ? '#94A3B8' : 'linear-gradient(135deg, #7C3AED, #4F46E5)',
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 13, fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: saving ? 'none' : '0 8px 20px rgba(124,58,237,0.30)',
                  }}>
                  {saving ? 'Saving…' : (editing ? 'Save changes' : 'Add track')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value, tone }) {
  const tones = {
    slate: { bg: 'rgba(15,23,42,0.05)',   color: '#0F172A' },
    green: { bg: 'rgba(16,185,129,0.08)', color: '#047857' },
    amber: { bg: 'rgba(245,158,11,0.08)', color: '#B45309' },
  }[tone] || {};
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: tones.bg, border: '1px solid rgba(15,23,42,0.06)' }}>
      <div className="text-xl font-black leading-none" style={{ color: tones.color }}>{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: tones.color, opacity: 0.75 }}>{label}</div>
    </div>
  );
}
