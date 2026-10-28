import { useState } from 'react';
import toast from 'react-hot-toast';
import { Headphones, Users, Globe2, Building2, Check, RefreshCw, Star, Eye, Trash2, FileText } from 'lucide-react';
import { podcastAPI } from '../../api';
import { Drawer, Section } from '../billing/BillingDrawers';
import { CATEGORIES, MediaUpload, EstateMultiPicker } from './shared';

export default function EpisodeEditor({ episode, onClose, onSaved }) {
  const isNew = !episode?._id;
  const [f, setF] = useState(() => ({
    title: episode?.title || '', description: episode?.description || '', showNotes: episode?.showNotes || '',
    coverImage: episode?.coverImage || '', audioUrl: episode?.audioUrl || '', durationSec: episode?.durationSec || 0,
    hostName: episode?.hostName || '', guestNames: (episode?.guestNames || []).join(', '),
    category: episode?.category || 'community', tags: (episode?.tags || []).join(', '), seriesName: episode?.seriesName || '', episodeNumber: episode?.episodeNumber || '',
    isPublished: episode?.isPublished !== false, featured: !!episode?.featured,
    scope: episode?.audience?.scope || 'all', estateIds: (episode?.audience?.estateIds || []).map((e) => String(e._id || e)),
  }));
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const onAudio = (url, file) => {
    set('audioUrl', url);
    if (!file) return;
    if (!f.title) set('title', file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
    const a = new Audio(); a.preload = 'metadata'; a.src = URL.createObjectURL(file);
    a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) set('durationSec', Math.round(a.duration)); URL.revokeObjectURL(a.src); };
  };

  const save = async (e) => {
    e.preventDefault();
    if (!f.title.trim()) return toast.error('Give the episode a title');
    if (isNew && !f.audioUrl) return toast.error('Upload the audio first');
    setSaving(true);
    const payload = {
      title: f.title.trim(), description: f.description, showNotes: f.showNotes, coverImage: f.coverImage, hostName: f.hostName || undefined,
      guestNames: f.guestNames.split(',').map((x) => x.trim()).filter(Boolean), category: f.category,
      tags: f.tags.split(',').map((x) => x.trim()).filter(Boolean), seriesName: f.seriesName, episodeNumber: Number(f.episodeNumber) || 0,
      isPublished: f.isPublished, featured: f.featured, audience: { scope: f.scope, estateIds: f.scope === 'estates' ? f.estateIds : [] },
      ...(isNew ? { audioUrl: f.audioUrl, durationSec: f.durationSec } : {}),
    };
    try {
      const { data } = isNew ? await podcastAPI.createEpisode(payload) : await podcastAPI.updateEpisode(episode._id, payload);
      toast.success(isNew ? 'Episode published' : 'Episode updated');
      onSaved?.(data.data); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!window.confirm(`Delete "${episode.title}" for everyone? This can’t be undone.`)) return;
    try { await podcastAPI.deleteEpisode(episode._id); toast.success('Episode deleted'); onSaved?.(); onClose(); }
    catch (err) { toast.error(err.response?.data?.message || 'Could not delete'); }
  };

  return (
    <Drawer title={isNew ? 'Upload an episode' : 'Edit episode'} subtitle={isNew ? 'Publish a pre-recorded interview, sermon, town-hall or announcement.' : 'Update details, visibility and who can listen.'} icon={Headphones} onClose={onClose} width={600}
      footer={<>
        {!isNew && <button type="button" onClick={remove} className="btn-outline !text-[#B42318] hover:!bg-[#FEF3F2]"><Trash2 size={14} /> Delete</button>}
        <span className="mr-auto" />
        <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
        <button type="submit" form="ep-form" disabled={saving} className="btn-primary">{saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} {isNew ? 'Publish' : 'Save'}</button>
      </>}>
      <form id="ep-form" onSubmit={save}>
        <Section step="1" icon={Headphones} title="Audio">
          {isNew ? <MediaUpload kind="audio" value={f.audioUrl} onDone={onAudio} hint="MP3, M4A, WAV, OGG or WebM · up to 120MB" />
            : <audio src={f.audioUrl} controls className="w-full" />}
        </Section>
        <Section step="2" icon={FileText} title="Details">
          <div className="space-y-2.5">
            <input className="input-field !text-[15px] !font-semibold" placeholder="Episode title" value={f.title} onChange={(e) => set('title', e.target.value)} />
            <textarea className="input-field min-h-[70px]" placeholder="Short description" value={f.description} onChange={(e) => set('description', e.target.value)} />
            <textarea className="input-field min-h-[90px]" placeholder="Show notes — timestamps, links, key points" value={f.showNotes} onChange={(e) => set('showNotes', e.target.value)} />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.v} type="button" onClick={() => set('category', c.v)} className={`h-8 px-3 rounded-full border text-[12.5px] font-medium ${f.category === c.v ? 'text-white border-transparent' : 'border-[#E4E7EC] text-[#475467]'}`} style={f.category === c.v ? { background: c.color } : undefined}>{c.label}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label><span className="field-label">Host</span><input className="input-field" value={f.hostName} onChange={(e) => set('hostName', e.target.value)} placeholder="AreaConnect FM" /></label>
              <label><span className="field-label">Guests</span><input className="input-field" value={f.guestNames} onChange={(e) => set('guestNames', e.target.value)} placeholder="Comma separated" /></label>
              <label><span className="field-label">Series</span><input className="input-field" value={f.seriesName} onChange={(e) => set('seriesName', e.target.value)} /></label>
              <label><span className="field-label">Episode no.</span><input type="number" min="0" className="input-field" value={f.episodeNumber} onChange={(e) => set('episodeNumber', e.target.value)} /></label>
            </div>
            <label className="block"><span className="field-label">Tags</span><input className="input-field" value={f.tags} onChange={(e) => set('tags', e.target.value)} placeholder="Comma separated" /></label>
            <MediaUpload kind="image" label="Cover art" value={f.coverImage} onDone={(url) => set('coverImage', url)} />
          </div>
        </Section>
        <Section step="3" icon={Users} title="Visibility & audience">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <label className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer ${f.isPublished ? 'border-[#059669] bg-[#F6FEF9]' : 'border-[#E4E7EC]'}`}>
              <input type="checkbox" className="accent-[#059669]" checked={f.isPublished} onChange={(e) => set('isPublished', e.target.checked)} /><Eye size={15} className="text-[#667085]" /><span className="text-[13px]">Published</span>
            </label>
            <label className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer ${f.featured ? 'border-[#F79009] bg-[#FFFAEB]' : 'border-[#E4E7EC]'}`}>
              <input type="checkbox" className="accent-[#F79009]" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} /><Star size={15} className="text-[#667085]" /><span className="text-[13px]">Featured</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[['all', 'All estates', Globe2], ['estates', 'Selected estates', Building2]].map(([v, l, I]) => (
              <button key={v} type="button" onClick={() => set('scope', v)} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${f.scope === v ? 'border-[#059669] bg-[#F6FEF9] font-semibold' : 'border-[#E4E7EC]'}`}><I size={15} />{l}</button>
            ))}
          </div>
          {f.scope === 'estates' && <EstateMultiPicker value={f.estateIds} onChange={(v) => set('estateIds', v)} />}
        </Section>
      </form>
    </Drawer>
  );
}
