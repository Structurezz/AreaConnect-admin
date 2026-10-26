// Google Maps view of an estate. Uses the exact pin when we have one, otherwise
// lets Google search the address itself (it handles landmarks like "off Bode Thomas").
export function mapsQuery(estate) {
  if (estate?.location?.lat != null && estate?.location?.lng != null) return `${estate.location.lat},${estate.location.lng}`;
  return [estate?.address, estate?.city, estate?.state, 'Nigeria'].filter(Boolean).join(', ');
}

export default function GoogleMapEmbed({ estate, height = 300, zoom = 16, type = 'm' }) {
  const q = mapsQuery(estate);
  if (!q) return null;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&t=${type}&hl=en&output=embed`;
  return (
    <iframe title={`Map of ${estate?.name || 'estate'}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade"
      className="w-full block border-0" style={{ height }} allowFullScreen />
  );
}
