import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Nigeria-wide default view
const NG_CENTER = [9.08, 8.68];
const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = '&copy; OpenStreetMap contributors';

export const STATUS_COLOR = {
  active: '#059669', trial: '#2E90FA', comp: '#F79009', risk: '#D92D20', expired: '#D92D20', none: '#98A2B3', inactive: '#667085',
};

export function estateTone(e) {
  const s = e.subscription;
  if (!e.isActive) return 'inactive';
  if (!s) return 'none';
  if (s.renewalIssue) return 'risk';
  if (s.compActive) return 'comp';
  if (s.status === 'trial') return 'trial';
  if (s.status === 'active') return 'active';
  return 'expired';
}

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function pinIcon(color, selected, label) {
  const size = selected ? 34 : 26;
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px">
      ${selected ? `<span style="position:absolute;inset:-8px;border-radius:50%;background:${color};opacity:.18;animation:acPulse 1.8s ease-out infinite"></span>` : ''}
      <span style="position:absolute;inset:0;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 4px 12px rgba(16,24,40,.25);display:flex;align-items:center;justify-content:center;color:#fff;font:700 ${selected ? 12 : 10}px Inter,sans-serif">${esc(label)}</span>
    </div>`,
  });
}

/**
 * Map of estates. `estates` need location.lat/lng; others are skipped.
 * selectedId highlights + pans to a pin; onSelect(estate) fires on pin click.
 */
export default function EstatesMap({ estates, selectedId, onSelect, height = 420, single = false, color }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true })
      .setView(NG_CENTER, 6);
    L.tileLayer(TILE, { attribution: ATTR, maxZoom: 19, className: 'ac-tiles' }).addTo(map);
    map.on('click', () => map.scrollWheelZoom.enable());
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(elRef.current);
    return () => { ro.disconnect(); map.remove(); mapRef.current = null; };
  }, []);

  const located = estates.filter((e) => e.location?.lat != null && e.location?.lng != null);

  useEffect(() => {
    const map = mapRef.current, layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    located.forEach((e) => {
      const on = e._id === selectedId;
      const m = L.marker([e.location.lat, e.location.lng], {
        icon: pinIcon(color || STATUS_COLOR[estateTone(e)], on || single, (e.name || '?')[0].toUpperCase()),
        zIndexOffset: on ? 1000 : 0,
        title: e.name,
      });
      if (!single) {
        m.bindTooltip(`<b>${esc(e.name)}</b><br><span style="color:#667085">${esc(e.counts?.residents ?? 0)} residents · ${esc(e.estateCode || '')}</span>`, { direction: 'top', offset: [0, -14] });
        m.on('click', () => onSelect?.(e));
      }
      m.addTo(layer);
    });
    if (!fittedRef.current && located.length) {
      fittedRef.current = true;
      if (located.length === 1) map.setView([located[0].location.lat, located[0].location.lng], single ? 15 : 12);
      else map.fitBounds(L.latLngBounds(located.map((e) => [e.location.lat, e.location.lng])), { padding: [40, 40], maxZoom: 12 });
    }
  }, [located.map((e) => `${e._id}:${estateTone(e)}`).join(','), selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const e = located.find((x) => x._id === selectedId);
    if (e && mapRef.current) mapRef.current.flyTo([e.location.lat, e.location.lng], Math.max(mapRef.current.getZoom(), 13), { duration: 0.6 });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative" style={{ height }}>
      <style>{'@keyframes acPulse{0%{transform:scale(.6);opacity:.5}100%{transform:scale(1.8);opacity:0}}.leaflet-container{font-family:Inter,sans-serif;background:#F2F4F7}.ac-tiles{filter:saturate(.55) brightness(1.04) contrast(.95)}.leaflet-tooltip{border-radius:8px;border:1px solid #E4E7EC;box-shadow:0 8px 20px -6px rgba(16,24,40,.18);font-size:12px;padding:6px 9px}'}</style>
      <div ref={elRef} className="absolute inset-0 rounded-[inherit]" style={{ zIndex: 0 }} />
      {!located.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="px-3 py-1.5 rounded-lg bg-white/95 border border-[#E4E7EC] text-[12.5px] text-[#475467] shadow-sm">
            {single ? 'Location not geocoded yet' : 'No estates have map coordinates yet'}
          </span>
        </div>
      )}
    </div>
  );
}
