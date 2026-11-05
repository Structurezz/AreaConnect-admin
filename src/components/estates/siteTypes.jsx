import { Building2, GraduationCap, School, Hotel, Factory, Hospital } from 'lucide-react';

// AreaConnect site types (server/utils/siteTypes.js). Stored on the estate as
// `site.type`; anything missing or unknown is an estate.
export const SITE_TYPES = [
  { value: 'estate',     label: 'Estate',     hint: 'Residents & units',        icon: Building2,     color: '#067647', bg: '#ECFDF3', border: '#ABEFC6' },
  { value: 'university', label: 'University / polytechnic', short: 'University', hint: 'Students, halls & hostel rooms', icon: GraduationCap, color: '#175CD3', bg: '#EFF8FF', border: '#B2DDFF' },
  { value: 'school',     label: 'School',     hint: 'Primary & secondary',      icon: School,        color: '#B54708', bg: '#FFFAEB', border: '#FEDF89' },
  { value: 'hotel',      label: 'Hotel',      hint: 'Guests & rooms',           icon: Hotel,         color: '#5925DC', bg: '#F4F3FF', border: '#D9D6FE' },
  { value: 'industrial', label: 'Industrial', hint: 'Employees & departments',  icon: Factory,       color: '#C4320A', bg: '#FFF6ED', border: '#F9DBAF' },
  { value: 'hospital',   label: 'Hospital',   hint: 'Patients & wards',         icon: Hospital,      color: '#C01048', bg: '#FFF1F3', border: '#FECDD6' },
];

const BY_VALUE = Object.fromEntries(SITE_TYPES.map((t) => [t.value, t]));
export const siteTypeOf = (estate) => (BY_VALUE[estate?.site?.type] ? estate.site.type : 'estate');
export const siteTypeInfo = (value) => BY_VALUE[value] || BY_VALUE.estate;

export function SiteTypeBadge({ type, className = '' }) {
  const t = siteTypeInfo(type);
  const Icon = t.icon;
  return (
    <span className={`badge ${className}`} style={{ background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
      <Icon size={11} /> {t.short || t.label}
    </span>
  );
}

// Card-style picker used by the estate editor and the onboarding wizard.
export function SiteTypePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {SITE_TYPES.map((t) => {
        const on = value === t.value;
        const Icon = t.icon;
        return (
          <button key={t.value} type="button" onClick={() => onChange(t.value)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${on ? 'border-[#059669] bg-[#F6FEF9] ring-2 ring-[#059669]/10' : 'border-[#E4E7EC] hover:border-[#D0D5DD] bg-white'}`}>
            <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: t.bg, color: t.color }}>
              <Icon size={14} />
            </span>
            <span className="min-w-0">
              <span className={`block text-[12.5px] ${on ? 'font-semibold text-[#101828]' : 'font-medium text-[#344054]'}`}>{t.label}</span>
              <span className="block text-[11px] text-[#98A2B3] truncate">{t.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
