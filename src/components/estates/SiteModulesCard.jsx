import { useState } from 'react';
import toast from 'react-hot-toast';
import { Blocks, RotateCcw } from 'lucide-react';
import { estateAPI } from '../../api';
import { MODULES, DEFAULT_MODULES, siteTypeOf, siteTypeInfo, modulesFor, termsFor } from './siteTypes';

// Which modules this site's members get — the type's defaults plus any
// override. Switched-off modules are blocked for members only (403 MODULE_OFF);
// managers keep access.
export default function SiteModulesCard({ estate, onChange }) {
  const [saving, setSaving] = useState(null);
  const type     = siteTypeOf(estate);
  const T        = termsFor(estate);
  const defaults = DEFAULT_MODULES[type];
  const current  = modulesFor(estate);
  const overrides = estate.site?.modules || {};
  const overridden = Object.keys(MODULES).filter((k) => typeof overrides[k] === 'boolean' && overrides[k] !== defaults[k]);
  const onCount  = Object.values(current).filter(Boolean).length;

  const save = async (key, siteModules) => {
    setSaving(key);
    try {
      const { data } = await estateAPI.update(estate._id, { siteModules });
      onChange?.(data.data);
      toast.success('Modules updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update modules');
    } finally { setSaving(null); }
  };

  const toggle = (k) => {
    const next = !current[k];
    save(k, { [k]: next === defaults[k] ? null : next });
  };
  const reset = () => save('reset', Object.fromEntries(Object.keys(MODULES).map((k) => [k, null])));

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title flex items-center gap-1.5"><Blocks size={14} className="text-[#059669]" /> Modules</div>
          <div className="card-sub">
            {onCount} of {Object.keys(MODULES).length} on for {T.members.toLowerCase()} · {siteTypeInfo(type).short || siteTypeInfo(type).label} defaults
            {overridden.length > 0 && <> · {overridden.length} changed</>}
          </div>
        </div>
        {overridden.length > 0 && (
          <button onClick={reset} disabled={!!saving} className="btn-outline gap-1.5 text-[12px] disabled:opacity-50">
            <RotateCcw size={12} /> Reset to defaults
          </button>
        )}
      </div>
      <div className="p-3 grid sm:grid-cols-2 xl:grid-cols-3 gap-1">
        {Object.entries(MODULES).map(([k, m]) => {
          const on = current[k];
          const changed = overridden.includes(k);
          return (
            <button key={k} type="button" onClick={() => toggle(k)} disabled={!!saving}
              className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[#F9FAFB] transition-colors disabled:opacity-60">
              <span role="switch" aria-checked={on}
                className={`mt-0.5 relative w-8 h-[18px] rounded-full transition-colors flex-shrink-0 ${on ? 'bg-[#059669]' : 'bg-[#D0D5DD]'}`}>
                <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${on ? 'left-[16px]' : 'left-[2px]'}`} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#101828]">
                  {m.label}
                  {changed && <span className="text-[10px] font-semibold uppercase tracking-wide text-[#B54708]">Changed</span>}
                </span>
                <span className="block text-[11.5px] text-[#98A2B3] leading-snug">{m.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
