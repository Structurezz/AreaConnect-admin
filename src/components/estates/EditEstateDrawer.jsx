import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { X, Building2, MapPin, Phone, SlidersHorizontal, StickyNote, Power, Copy, Crosshair, RotateCcw, Check } from 'lucide-react';
import { estateAPI } from '../../api';
import { NG_STATES, ESTATE_TYPES } from '../onboarding/shared';

const SECTIONS = [
  { id: 'details',  label: 'Details',  icon: Building2 },
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'contact',  label: 'Contact',  icon: Phone },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
  { id: 'notes',    label: 'Notes',    icon: StickyNote },
];

const SETTINGS = [
  { key: 'requireVisitorApproval', label: 'Visitors need resident approval', hint: 'Guards wait for the host to approve before letting a visitor in.' },
  { key: 'marketplaceApproval',    label: 'Review marketplace listings',     hint: 'The manager approves listings before residents see them.' },
  { key: 'allowGuestChat',         label: 'Allow guest chat',                hint: 'Visitors can message their host from the visitor pass.' },
];

const fromEstate = (e) => ({
  name: e.name || '', estateType: e.estateType || '', unitCount: e.unitCount || '',
  address: e.address || '', city: e.city || '', state: e.state || '',
  contactPhone: e.contactPhone || '', contactEmail: e.contactEmail || '', adminNotes: e.adminNotes || '',
  settings: { requireVisitorApproval: false, marketplaceApproval: false, allowGuestChat: true, ...(e.settings || {}) },
  isActive: e.isActive !== false,
  pin: e.location?.lat != null ? { lat: e.location.lat, lng: e.location.lng } : null,
});

function Switch({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#059669]' : 'bg-[#D0D5DD]'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  );
}

function Row({ label, hint, children, wide }) {
  return (
    <div className={`grid gap-1.5 sm:gap-6 py-4 border-b border-[#F2F4F7] last:border-0 ${wide ? '' : 'sm:grid-cols-[180px_minmax(0,1fr)]'}`}>
      <div>
        <p className="text-[13px] font-medium text-[#344054]">{label}</p>
        {hint && <p className="text-[12px] text-[#98A2B3] mt-0.5">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// Click or drag to place the estate's pin
const PIN_ICON = L.divIcon({ className: '', iconSize: [30, 30], iconAnchor: [15, 30],
  html: '<svg width="30" height="30" viewBox="0 0 24 24" fill="#059669" stroke="#fff" stroke-width="1.5"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6" fill="#fff"/></svg>' });

function PinPicker({ pin, onChange }) {
  const el = useRef(null), map = useRef(null), marker = useRef(null);
  const changeRef = useRef(onChange); changeRef.current = onChange;

  const ensureMarker = (ll) => {
    if (!marker.current) {
      marker.current = L.marker(ll, { icon: PIN_ICON, draggable: true }).addTo(map.current);
      marker.current.on('dragend', () => { const p = marker.current.getLatLng(); changeRef.current({ lat: p.lat, lng: p.lng }); });
    } else marker.current.setLatLng(ll);
  };

  useEffect(() => {
    const start = pin ? [pin.lat, pin.lng] : [6.5244, 3.3792];
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView(start, pin ? 17 : 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap', maxZoom: 19 }).addTo(map.current);
    if (pin) ensureMarker(start);
    map.current.on('click', (ev) => { ensureMarker(ev.latlng); changeRef.current({ lat: ev.latlng.lat, lng: ev.latlng.lng }); });
    setTimeout(() => map.current?.invalidateSize(), 250);
    return () => { map.current.remove(); map.current = null; marker.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pin || !map.current) return;
    ensureMarker([pin.lat, pin.lng]);
    if (!map.current.getBounds().pad(-0.2).contains([pin.lat, pin.lng])) map.current.setView([pin.lat, pin.lng], 17);
  }, [pin?.lat, pin?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="h-[260px] rounded-xl border border-[#E4E7EC] overflow-hidden" style={{ isolation: 'isolate' }} />;
}

/**
 * Slide-over editor for an estate's profile, location pin, contact, settings and status.
 * estate: the estate document; onSaved(updated) is called after a successful save.
 */
export default function EditEstateDrawer({ estate, open, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [initial, setInitial] = useState(null);
  const [active, setActive] = useState('details');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [match, setMatch] = useState('');
  const bodyRef = useRef(null);

  useEffect(() => {
    if (open && estate) { const f = fromEstate(estate); setForm(f); setInitial(f); setActive('details'); }
  }, [open, estate?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const dirty = useMemo(() => form && initial && JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);
  const pinMoved = form?.pin && JSON.stringify(form.pin) !== JSON.stringify(initial?.pin);
  if (!open || !form) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const jump = (id) => { setActive(id); bodyRef.current?.querySelector(`#sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const onScroll = () => {
    const body = bodyRef.current; if (!body) return;
    const top = body.getBoundingClientRect().top;
    const cur = [...SECTIONS].reverse().find((s) => (body.querySelector(`#sec-${s.id}`)?.getBoundingClientRect().top ?? 1e9) - top < 80);
    if (cur && cur.id !== active) setActive(cur.id);
  };

  const locate = async () => {
    if (!form.address.trim()) return toast.error('Enter the street address first');
    setLocating(true);
    try {
      const { data } = await estateAPI.geocodePreview({ address: form.address, city: form.city, state: form.state });
      set('pin', { lat: data.data.lat, lng: data.data.lng });
      setMatch(data.data.formattedAddress);
    } catch (err) {
      setMatch('');
      toast.error(err.response?.data?.message || 'Couldn’t find that address — drop the pin on the map instead');
    } finally { setLocating(false); }
  };

  const save = async () => {
    if (!form.name.trim() || !form.address.trim()) { jump(!form.name.trim() ? 'details' : 'location'); return toast.error('Name and address are required'); }
    setSaving(true);
    try {
      const { pin, ...rest } = form;
      const payload = { ...rest, unitCount: Number(form.unitCount) || 0 };
      if (pinMoved) payload.location = { lat: pin.lat, lng: pin.lng };
      const { data } = await estateAPI.update(estate._id, payload);
      if (data.geocode === 'failed') toast('Saved — the new address couldn’t be found on the map. Drop the pin manually.', { icon: '📍' });
      else toast.success('Estate updated');
      onSaved?.(data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const close = () => { if (dirty && !window.confirm('Discard unsaved changes?')) return; onClose(); };

  return (
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] animate-fade-in" onClick={close} />
      <aside className="relative w-full max-w-[720px] h-full bg-white shadow-2xl flex flex-col animate-slide-in-right" role="dialog" aria-label={`Edit ${estate.name}`}>
        {/* Header */}
        <div className="px-6 pt-5 pb-0 border-b border-[#EAECF0]">
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-lg bg-[#ECFDF3] text-[#067647] border border-[#ABEFC6] flex items-center justify-center text-[15px] font-semibold flex-shrink-0">{(form.name || '?')[0].toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] text-[#98A2B3]">Edit estate</p>
              <h2 className="text-[17px] font-semibold text-[#101828] truncate">{form.name || 'Untitled estate'}</h2>
            </div>
            <button onClick={() => { navigator.clipboard?.writeText(estate.estateCode); toast.success('Code copied'); }}
              className="hidden sm:inline-flex items-center gap-1 font-mono text-[12px] text-[#475467] px-2 py-1 rounded-md border border-[#E4E7EC] hover:bg-[#F9FAFB]">{estate.estateCode} <Copy size={11} /></button>
            <button onClick={close} className="p-1.5 rounded-lg text-[#98A2B3] hover:text-[#101828] hover:bg-[#F2F4F7]" aria-label="Close"><X size={18} /></button>
          </div>
          <nav className="mt-4 flex gap-1 overflow-x-auto -mb-px">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => jump(id)}
                className={`inline-flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[13px] border-b-2 whitespace-nowrap transition-colors ${active === id ? 'border-[#059669] text-[#101828] font-semibold' : 'border-transparent text-[#667085] hover:text-[#344054]'}`}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Body */}
        <div ref={bodyRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-6 pb-10">
          <section id="sec-details" className="pt-5">
            <h3 className="text-[14px] font-semibold text-[#101828]">Details</h3>
            <p className="text-[12.5px] text-[#667085]">How the estate appears to residents, guards and in reports.</p>
            <div className="mt-2">
              <Row label="Estate name" hint="Shown across every app">
                <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Row>
              <Row label="Estate type">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ESTATE_TYPES.map((t) => (
                    <button key={t.value} type="button" onClick={() => set('estateType', t.value)}
                      className={`px-3 py-2 rounded-lg border text-left text-[12.5px] transition-all ${form.estateType === t.value ? 'border-[#059669] bg-[#F6FEF9] text-[#101828] font-medium ring-2 ring-[#059669]/10' : 'border-[#E4E7EC] text-[#475467] hover:border-[#D0D5DD]'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Planned units" hint="Total houses or flats when full">
                <input type="number" min="0" className="input-field max-w-[200px]" value={form.unitCount} onChange={(e) => set('unitCount', e.target.value)} placeholder="e.g. 48" />
              </Row>
            </div>
          </section>

          <section id="sec-location" className="pt-8">
            <h3 className="text-[14px] font-semibold text-[#101828]">Location</h3>
            <p className="text-[12.5px] text-[#667085]">Used for the platform map, guard directions and visitor passes.</p>
            <div className="mt-2">
              <Row label="Street address" hint="Include landmarks, e.g. “off Bode Thomas”">
                <div className="flex gap-2">
                  <input className="input-field flex-1" value={form.address} onChange={(e) => { set('address', e.target.value); setMatch(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); locate(); } }} />
                  <button type="button" onClick={locate} disabled={locating} className="btn-outline whitespace-nowrap">
                    <Crosshair size={14} className={locating ? 'animate-spin' : ''} /> {locating ? 'Finding…' : 'Find on map'}
                  </button>
                </div>
                {match && <p className="mt-1.5 text-[12px] text-[#067647] flex items-center gap-1"><Check size={12} /> Google matched: {match}</p>}
              </Row>
              <Row label="City & state">
                <div className="grid grid-cols-2 gap-2">
                  <input className="input-field" placeholder="City / area" value={form.city} onChange={(e) => set('city', e.target.value)} />
                  <select className="input-field" value={form.state} onChange={(e) => set('state', e.target.value)}>
                    <option value="">State</option>
                    {NG_STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </Row>
              <Row label="Map pin" hint="Use “Find on map”, then click the map or drag the pin to the exact gate" wide>
                <PinPicker pin={form.pin} onChange={(p) => set('pin', p)} />
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]">
                  <span className="inline-flex items-center gap-1.5 font-mono text-[#475467]"><Crosshair size={12} />{form.pin ? `${form.pin.lat.toFixed(5)}, ${form.pin.lng.toFixed(5)}` : 'No pin yet'}</span>
                  {pinMoved && <span className="badge badge-blue">Pin moved — saved on Save</span>}
                  {pinMoved && <button type="button" className="text-[#667085] hover:text-[#101828] inline-flex items-center gap-1" onClick={() => set('pin', initial.pin)}><RotateCcw size={11} /> Reset pin</button>}
                </div>
              </Row>
            </div>
          </section>

          <section id="sec-contact" className="pt-8">
            <h3 className="text-[14px] font-semibold text-[#101828]">Estate office contact</h3>
            <p className="text-[12.5px] text-[#667085]">The estate’s own line — separate from the manager’s account.</p>
            <div className="mt-2">
              <Row label="Phone"><input className="input-field" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="+234 …" /></Row>
              <Row label="Email"><input type="email" className="input-field" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="office@estate.ng" /></Row>
            </div>
          </section>

          <section id="sec-settings" className="pt-8">
            <h3 className="text-[14px] font-semibold text-[#101828]">Settings</h3>
            <p className="text-[12.5px] text-[#667085]">The manager can also change these from their dashboard.</p>
            <div className="mt-3 rounded-xl border border-[#E4E7EC] divide-y divide-[#F2F4F7]">
              {SETTINGS.map((s) => (
                <label key={s.key} className="flex items-start justify-between gap-4 px-4 py-3.5 cursor-pointer">
                  <span><span className="block text-[13px] font-medium text-[#101828]">{s.label}</span><span className="block text-[12px] text-[#667085]">{s.hint}</span></span>
                  <Switch checked={!!form.settings[s.key]} onChange={(v) => set('settings', { ...form.settings, [s.key]: v })} />
                </label>
              ))}
            </div>
            <div className={`mt-4 rounded-xl border px-4 py-3.5 flex items-start justify-between gap-4 ${form.isActive ? 'border-[#E4E7EC]' : 'border-[#FECDCA] bg-[#FFFBFA]'}`}>
              <span className="flex items-start gap-3">
                <Power size={16} className={`mt-0.5 ${form.isActive ? 'text-[#059669]' : 'text-[#D92D20]'}`} />
                <span>
                  <span className="block text-[13px] font-medium text-[#101828]">{form.isActive ? 'Estate is active' : 'Estate is deactivated'}</span>
                  <span className="block text-[12px] text-[#667085]">Deactivated estates are hidden from residents and guards can’t log visitors.</span>
                </span>
              </span>
              <Switch checked={form.isActive} onChange={(v) => set('isActive', v)} />
            </div>
          </section>

          <section id="sec-notes" className="pt-8">
            <h3 className="text-[14px] font-semibold text-[#101828]">Internal notes</h3>
            <p className="text-[12.5px] text-[#667085]">Only AreaConnect admins can see these.</p>
            <textarea className="input-field mt-3 min-h-[120px]" value={form.adminNotes} onChange={(e) => set('adminNotes', e.target.value)}
              placeholder="Agreed terms, key contacts, follow-ups…" />
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#EAECF0] bg-[#FCFCFD] flex items-center gap-3">
          <span className="text-[12px] text-[#667085] flex items-center gap-1.5">
            {dirty ? <><span className="w-1.5 h-1.5 rounded-full bg-[#F79009]" /> Unsaved changes</> : <><Check size={12} className="text-[#059669]" /> All changes saved</>}
          </span>
          <div className="ml-auto flex gap-2">
            <button className="btn-outline" onClick={close}>Cancel</button>
            <button className="btn-primary" disabled={!dirty || saving} onClick={save}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
