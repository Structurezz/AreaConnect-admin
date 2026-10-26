import { useEffect, useMemo, useState } from 'react';
import {
  Music, Plus, RefreshCw, Search, Trash2, Edit3, X,
  Youtube, Eye, EyeOff, GripVertical, Download, Pencil, ExternalLink,
} from 'lucide-react';
import { defaultTrackAPI } from '../api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

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
      style={{ borderRadius: 6, objectFit: 'cover', background: '#F2F4F7', flexShrink: 0, border: '1px solid #E4E7EC' }}
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

  const FILTERS = [
    { k: 'all',    label: 'All',    count: stats.total },
    { k: 'active', label: 'Active', count: stats.active },
    { k: 'hidden', label: 'Hidden', count: stats.hidden },
  ];

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in">
      <PageHeader
        title="Lounge house playlist"
        description="Default tracks seeded into every estate's Resident Lounge. Changes here apply to every estate instantly."
        actions={(
          <>
            <button onClick={handleReseed} disabled={reseeding} className="btn-outline">
              <Download size={14} />{reseeding ? 'Importing…' : 'Import seed'}
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus size={14} /> Add track
            </button>
          </>
        )}
      />

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 mb-5">
        {loading ? (
          [0, 1, 2].map((i) => <div key={i} className="skeleton h-[92px]" />)
        ) : (
          <>
            <StatCard label="Total tracks" value={stats.total} icon={Music} color="blue" />
            <StatCard label="Active" value={stats.active} icon={Eye} color="green" />
            <StatCard label="Hidden" value={stats.hidden} icon={EyeOff} color="amber" />
          </>
        )}
      </div>

      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="card-header flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 w-full sm:max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, artist or video ID…"
              className="input-field !pl-9"
            />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-[12px] text-[#98A2B3] tabular-nums whitespace-nowrap">
              {loading ? '—' : `${filtered.length} of ${tracks.length}`}
            </span>
            <div className="tabs">
              {FILTERS.map(({ k, label, count }) => (
                <button key={k} type="button" onClick={() => setFilter(k)}
                  className={`tab ${filter === k ? 'active' : ''}`}>
                  {label}
                  {!loading && <span className="ml-1.5 text-[11px] text-[#98A2B3] tabular-nums">{count}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="p-4 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-11" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-[#F2F4F7] flex items-center justify-center mb-3">
              <Music size={18} className="text-[#98A2B3]" />
            </div>
            <p className="text-[14px] font-semibold text-[#101828]">No tracks match</p>
            <p className="text-[13px] text-[#98A2B3] mt-0.5">
              {tracks.length === 0 ? 'The house playlist is empty.' : 'Try a different search or filter.'}
            </p>
            {tracks.length === 0 && (
              <button onClick={handleReseed} disabled={reseeding} className="btn-outline mt-4">
                <Download size={14} /> Import the seed playlist
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: 320 }}>
            <table className="table">
              <thead className="sticky top-0 z-[1]">
                <tr>
                  <th className="w-8 hidden sm:table-cell" />
                  <th>Track</th>
                  <th className="hidden md:table-cell">Video ID</th>
                  <th>Status</th>
                  <th className="!text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t._id}>
                    <td className="hidden sm:table-cell !pr-0">
                      <GripVertical size={14} className="text-[#D0D5DD]" />
                    </td>
                    <td>
                      <div className="flex items-center gap-3 min-w-0">
                        <TrackThumb videoId={t.videoId} size={40} />
                        <div className="min-w-0">
                          <div className="cell-strong truncate max-w-[220px] sm:max-w-[360px]">{t.title}</div>
                          <div className="text-[12px] text-[#475467] truncate max-w-[220px] sm:max-w-[360px]">
                            {t.artist || <span className="text-[#98A2B3]">No artist</span>}
                          </div>
                          <div className="md:hidden font-mono text-[11px] text-[#98A2B3] mt-0.5">{t.videoId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] text-[#475467]">{t.videoId}</span>
                        <a href={`https://youtu.be/${t.videoId}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#059669] hover:underline">
                          <ExternalLink size={11} /> Preview
                        </a>
                      </div>
                    </td>
                    <td>
                      {t.isActive
                        ? <span className="badge badge-green">Active</span>
                        : <span className="badge badge-yellow">Hidden</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-0.5">
                        <button onClick={() => toggleActive(t)}
                          title={t.isActive ? 'Hide from lounge' : 'Show in lounge'}
                          className={`p-2 rounded-md hover:bg-[#F2F4F7] transition-colors ${t.isActive ? 'text-[#059669]' : 'text-[#98A2B3]'}`}>
                          {t.isActive ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>
                        <button onClick={() => openEdit(t)} title="Edit"
                          className="p-2 rounded-md text-[#475467] hover:bg-[#F2F4F7] transition-colors">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => handleDelete(t)} title="Delete"
                          className="p-2 rounded-md text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#101828]/50 backdrop-blur-[2px]">
          <form onSubmit={handleSave}
            className="bg-white rounded-xl w-full max-w-[460px] overflow-hidden border border-[#E4E7EC] shadow-[0_20px_48px_-12px_rgba(16,24,40,0.25)] animate-fade-in">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E4E7EC]">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-[#101828] truncate">
                  {editing ? form.title || 'Edit track' : 'Add track'}
                </div>
                <div className="text-[12px] text-[#98A2B3] mt-0.5">
                  {editing ? 'Edit track in the house playlist' : 'Add to house playlist'}
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)}
                className="p-1.5 rounded-md text-[#98A2B3] hover:bg-[#F2F4F7] hover:text-[#101828] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* VideoId */}
              <div>
                <label className="field-label">YouTube video ID or URL</label>
                <div className="relative">
                  <Youtube size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F04438]" />
                  <input
                    value={form.videoId}
                    onChange={(e) => setForm((f) => ({ ...f, videoId: e.target.value }))}
                    onBlur={handleVideoIdBlur}
                    placeholder="dQw4w9WgXcQ or https://youtu.be/…"
                    className="input-field !pl-9 font-mono" />
                </div>
                {form.videoId && (
                  <div className="mt-2 flex items-center gap-3">
                    <TrackThumb videoId={extractVideoId(form.videoId)} size={48} />
                    <a href={`https://youtu.be/${extractVideoId(form.videoId)}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#059669] hover:underline">
                      <ExternalLink size={11} /> Preview on YouTube
                    </a>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="field-label">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Calm Down"
                  className="input-field" />
              </div>

              {/* Artist */}
              <div>
                <label className="field-label">Artist <span className="text-[#98A2B3] font-normal">(optional)</span></label>
                <input
                  value={form.artist}
                  onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))}
                  placeholder="e.g. Rema"
                  className="input-field" />
              </div>

              {/* Active toggle */}
              <button type="button" onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-[#E4E7EC] hover:bg-[#F9FAFB] text-left transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-[#101828]">
                    {form.isActive ? 'Visible in every estate' : 'Hidden from the lounge'}
                  </div>
                  <div className="text-[12px] text-[#98A2B3] mt-0.5">
                    Toggle to show or hide this track without deleting it
                  </div>
                </div>
                <div className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${form.isActive ? 'bg-[#059669]' : 'bg-[#D0D5DD]'}`}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all"
                    style={{ left: form.isActive ? 'calc(100% - 18px)' : 2 }} />
                </div>
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t border-[#E4E7EC] bg-[#F9FAFB]">
              <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Saving…' : (editing ? 'Save changes' : 'Add track')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
