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

// Copy of server/utils/siteTypes.js → TERMS / MODULES / DEFAULT_MODULES —
// keep in step. The admin shows each site in its own words.
export const TERMS = {
  estate:     { site: 'Estate',   sites: 'Estates',    member: 'Resident', members: 'Residents',        unit: 'Unit',       units: 'Units',        block: 'Block', manager: 'Estate manager',   dues: 'Estate bills' },
  school:     { site: 'Campus',   sites: 'Campuses',   member: 'Student',  members: 'Students & staff', unit: 'Class',      units: 'Classes',      block: 'Block', manager: 'Administrator',    dues: 'School fees' },
  university: { site: 'Campus',   sites: 'Campuses',   member: 'Student',  members: 'Students & staff', unit: 'Room',       units: 'Hostel rooms', block: 'Hall',  manager: 'Administrator',    dues: 'Hostel & fees' },
  hotel:      { site: 'Property', sites: 'Properties', member: 'Guest',    members: 'Guests',           unit: 'Room',       units: 'Rooms',        block: 'Block', manager: 'Front desk',       dues: 'Bills' },
  industrial: { site: 'Site',     sites: 'Sites',      member: 'Employee', members: 'Employees',        unit: 'Department', units: 'Departments',  block: 'Block', manager: 'Facility manager', dues: 'Charges' },
  hospital:   { site: 'Hospital', sites: 'Hospitals',  member: 'Patient',  members: 'Patients & staff', unit: 'Ward',       units: 'Wards',        block: 'Block', manager: 'Administrator',    dues: 'Bills' },
};

export const MODULES = {
  payments:    { label: 'Payments & dues',       description: 'Bills, dues and online payment' },
  marketplace: { label: 'Marketplace',           description: 'Members buy and sell to each other' },
  community:   { label: 'Community lounge',      description: 'Lounge, posts, polls, podcasts, DJ and the courtroom' },
  events:      { label: 'Events',                description: 'Event board and RSVPs' },
  neighbours:  { label: 'Directory & calls',     description: 'Members call and buzz each other' },
  household:   { label: 'Family / household',    description: 'Members add family with limited access' },
  gatelog:     { label: 'Deliveries & vehicles', description: 'Guards log deliveries and vehicles in and out' },
  shifts:      { label: 'Staff shifts',          description: 'Shift hours that guards can check at the gate' },
  stays:       { label: 'Guest stays',           description: 'Check-in / check-out dates; access ends at check-out' },
  visiting:    { label: 'Visiting hours',        description: 'Guards are warned when visitors arrive outside visiting hours' },
  requests:    { label: 'Requests',              description: 'Members send requests to the right staff' },
  rollcall:    { label: 'Emergency roll-call',   description: 'See who is safe and who is missing in an evacuation' },
};

const ALL_ON = { payments: true, marketplace: true, community: true, events: true, neighbours: true, household: true };
export const DEFAULT_MODULES = {
  estate:     { ...ALL_ON, gatelog: false, shifts: false, stays: false, visiting: false, requests: false, rollcall: false },
  school:     { ...ALL_ON, marketplace: false, neighbours: false, gatelog: false, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  university: { ...ALL_ON, household: false, gatelog: false, shifts: true, stays: false, visiting: true, requests: true, rollcall: true },
  hotel:      { ...ALL_ON, payments: false, marketplace: false, community: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: false, requests: true, rollcall: true },
  industrial: { ...ALL_ON, payments: false, marketplace: false, household: false, gatelog: true, shifts: true, stays: false, visiting: false, requests: true, rollcall: true },
  hospital:   { ...ALL_ON, payments: false, marketplace: false, community: false, events: false, neighbours: false, gatelog: false, shifts: true, stays: true, visiting: true, requests: true, rollcall: true },
};

const BY_VALUE = Object.fromEntries(SITE_TYPES.map((t) => [t.value, t]));
export const siteTypeOf = (estate) => (BY_VALUE[estate?.site?.type] ? estate.site.type : 'estate');
export const siteTypeInfo = (value) => BY_VALUE[value] || BY_VALUE.estate;
export const termsFor = (estate) => TERMS[siteTypeOf(estate)];

// Resolved modules: the type's defaults with this site's overrides on top.
export function modulesFor(estate) {
  const out = { ...DEFAULT_MODULES[siteTypeOf(estate)] };
  const o = estate?.site?.modules || {};
  for (const k of Object.keys(MODULES)) if (typeof o[k] === 'boolean') out[k] = o[k];
  return out;
}

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
