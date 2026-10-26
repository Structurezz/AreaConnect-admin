import { useState, useEffect, useMemo } from 'react';
import { pitchAPI } from '../api';
import toast from 'react-hot-toast';
import { X, Zap, RefreshCw, MapPin, Check, Globe } from 'lucide-react';

const chip = (active) => ({
  fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${active ? '#059669' : '#D0D5DD'}`,
  background: active ? '#ECFDF3' : '#fff', color: active ? '#047857' : '#344054',
  display: 'inline-flex', alignItems: 'center', gap: 5,
});

const label = { fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 8 };

const toggle = (list, v) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

// Coverage heat: fewer leads = warmer, so gaps across Nigeria stand out
const heat = (n, max) => {
  if (n === 0) return '#FEF3F2';
  const r = n / Math.max(max, 1);
  return r < 0.25 ? '#FFFAEB' : r < 0.6 ? '#ECFDF3' : '#D1FADF';
};

export default function LeadSearchPanel({ open, onClose, onDone }) {
  const [opts, setOpts] = useState(null);
  const [mode, setMode] = useState('nationwide'); // nationwide | zones | states
  const [zones, setZones] = useState([]);
  const [states, setStates] = useState([]);
  const [types, setTypes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [keywords, setKeywords] = useState('');
  const [count, setCount] = useState(25);
  const [statesPerRun, setStatesPerRun] = useState(3);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState([]);

  const loadOptions = () =>
    pitchAPI.searchOptions().then(r => setOpts(r.data.data)).catch(() => toast.error('Failed to load search options'));

  useEffect(() => { if (open) loadOptions(); }, [open]);

  const maxCount = useMemo(() => Math.max(0, ...(opts?.states || []).map(s => s.count)), [opts]);
  const uncovered = (opts?.states || []).filter(s => s.count === 0).length;

  const visibleStates = (opts?.states || []).filter(s => mode !== 'zones' || zones.length === 0 || zones.includes(s.zone));

  const run = async () => {
    if (mode === 'zones' && zones.length === 0) return toast.error('Pick at least one zone');
    if (mode === 'states' && states.length === 0) return toast.error('Pick at least one state');
    setRunning(true);
    try {
      const res = await pitchAPI.generate({
        count, types, roles, keywords, statesPerRun,
        zones:  mode === 'zones'  ? zones  : [],
        states: mode === 'states' ? states : [],
      });
      const { added = 0, searched = [] } = res.data;
      setLog(prev => [{ at: new Date(), added, searched }, ...prev].slice(0, 8));
      added ? toast.success(`Added ${added} leads from ${searched.join(', ')}`) : toast('No new unique leads — try again or widen the search');
      loadOptions();
      onDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Lead search failed');
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(16,24,40,0.45)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(560px, 100%)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 32px rgba(16,24,40,0.12)', borderLeft: '1px solid #E4E7EC' }}>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E4E7EC', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF3', border: '1px solid #ABEFC6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={16} color="#059669" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: '#101828', fontSize: 15 }}>Find leads across Nigeria</div>
            <div style={{ fontSize: 12, color: '#98A2B3' }}>
              {opts ? `${opts.states.length - uncovered}/${opts.states.length} states covered · ${uncovered} with no leads yet` : 'Loading…'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#98A2B3', padding: 4, borderRadius: 6 }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* Where */}
          <section>
            <div style={label}>Where to search</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              {[['nationwide', 'Nationwide (auto-rotate)'], ['zones', 'By geopolitical zone'], ['states', 'Pick states']].map(([k, l]) => (
                <button key={k} onClick={() => setMode(k)} style={chip(mode === k)}>{mode === k && <Check size={12} />}{l}</button>
              ))}
            </div>

            {mode === 'nationwide' && (
              <div style={{ fontSize: 12, color: '#475467', background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: '10px 12px' }}>
                <Globe size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
                Each run targets the {statesPerRun} least-covered states, so repeated runs work their way through all 36 states + FCT.
              </div>
            )}

            {mode === 'zones' && opts && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {Object.entries(opts.zones).map(([k, l]) => (
                  <button key={k} onClick={() => setZones(z => toggle(z, k))} style={chip(zones.includes(k))}>{l}</button>
                ))}
              </div>
            )}

            {opts && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 6, marginTop: mode === 'nationwide' ? 12 : 0 }}>
                  {visibleStates.map(s => {
                    const picked = states.includes(s.name);
                    const selectable = mode === 'states';
                    return (
                      <button key={s.name} disabled={!selectable}
                        onClick={() => setStates(v => toggle(v, s.name))}
                        title={s.cities.join(', ')}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                          cursor: selectable ? 'pointer' : 'default',
                          border: `1px solid ${picked ? '#059669' : '#EAECF0'}`,
                          background: picked ? '#ECFDF3' : heat(s.count, maxCount), color: '#101828',
                        }}>
                        <span>{s.name}</span>
                        <span style={{ fontSize: 11, color: '#667085', fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#98A2B3', flexWrap: 'wrap' }}>
                  {[['#FEF3F2', 'No leads'], ['#FFFAEB', 'Few'], ['#ECFDF3', 'Some'], ['#D1FADF', 'Well covered']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c, border: '1px solid #EAECF0' }} />{l}</span>
                  ))}
                  {mode === 'states' && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                      <button onClick={() => setStates(opts.states.filter(s => s.count === 0).map(s => s.name))} style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Select uncovered</button>
                      <button onClick={() => setStates([])} style={{ background: 'none', border: 'none', color: '#98A2B3', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>Clear</button>
                    </span>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Who */}
          {opts && (
            <section>
              <div style={label}>Organisation type <span style={{ fontWeight: 400, color: '#98A2B3' }}>(none = all)</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(opts.types).map(([k, l]) => (
                  <button key={k} onClick={() => setTypes(t => toggle(t, k))} style={chip(types.includes(k))}>{l}</button>
                ))}
              </div>
            </section>
          )}

          {opts && (
            <section>
              <div style={label}>Decision-maker role <span style={{ fontWeight: 400, color: '#98A2B3' }}>(none = CEO, MD, Founder, Director, Estate Manager)</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {opts.roles.map(r => (
                  <button key={r} onClick={() => setRoles(v => toggle(v, r))} style={chip(roles.includes(r))}>{r}</button>
                ))}
              </div>
            </section>
          )}

          <section>
            <div style={label}>Extra keywords</div>
            <input className="input-field" value={keywords} onChange={e => setKeywords(e.target.value)} maxLength={200}
              placeholder="e.g. gated estate, serviced apartments, Lekki Phase 1, REDAN member"
              style={{ width: '100%' }} />
          </section>

          <section style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={label}>Leads per run</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[10, 25, 50].map(n => <button key={n} onClick={() => setCount(n)} style={chip(count === n)}>{n}</button>)}
              </div>
            </div>
            <div>
              <div style={label}>States per run</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 3, 5].map(n => <button key={n} onClick={() => setStatesPerRun(n)} style={chip(statesPerRun === n)}>{n}</button>)}
              </div>
            </div>
          </section>

          {log.length > 0 && (
            <section>
              <div style={label}>This session</div>
              {log.map((l, i) => (
                <div key={i} style={{ fontSize: 12, color: '#475467', padding: '6px 0', borderBottom: '1px solid #F2F4F7', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{l.searched.join(', ')}</span>
                  <span style={{ fontWeight: 600, color: l.added ? '#059669' : '#98A2B3', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>+{l.added}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #E4E7EC', background: '#F9FAFB' }}>
          <button onClick={run} disabled={running} className="btn-primary w-full justify-center"
            style={{ height: 40, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.7 : 1 }}>
            {running ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
            {running ? 'Searching the web…' : `Find ${count} leads`}
          </button>
        </div>
      </div>
    </div>
  );
}
