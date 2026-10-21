import { useState, useEffect, useMemo } from 'react';
import { pitchAPI } from '../api';
import toast from 'react-hot-toast';
import { X, Zap, RefreshCw, MapPin, Check, Globe } from 'lucide-react';

const chip = (active) => ({
  fontSize: 12, fontWeight: 600, padding: '5px 11px', borderRadius: 20, cursor: 'pointer',
  border: `1px solid ${active ? '#7C3AED' : '#E2E8F0'}`,
  background: active ? '#F5F3FF' : '#fff', color: active ? '#6D28D9' : '#475569',
  display: 'inline-flex', alignItems: 'center', gap: 5,
});

const label = { fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 };

const toggle = (list, v) => list.includes(v) ? list.filter(x => x !== v) : [...list, v];

// Coverage heat: fewer leads = warmer, so gaps across Nigeria stand out
const heat = (n, max) => {
  if (n === 0) return '#FEE2E2';
  const r = n / Math.max(max, 1);
  return r < 0.25 ? '#FEF3C7' : r < 0.6 ? '#DCFCE7' : '#BBF7D0';
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 50, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 'min(560px, 100%)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgba(0,0,0,0.12)' }}>

        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MapPin size={16} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#0F172A', fontSize: 15 }}>Find Leads Across Nigeria</div>
            <div style={{ fontSize: 12, color: '#64748B' }}>
              {opts ? `${opts.states.length - uncovered}/${opts.states.length} states covered · ${uncovered} with no leads yet` : 'Loading…'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
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
              <div style={{ fontSize: 12, color: '#64748B', background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
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
                          padding: '6px 9px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          cursor: selectable ? 'pointer' : 'default',
                          border: `1px solid ${picked ? '#7C3AED' : 'transparent'}`,
                          background: picked ? '#F5F3FF' : heat(s.count, maxCount), color: '#0F172A',
                        }}>
                        <span>{s.name}</span>
                        <span style={{ fontSize: 10, color: '#64748B' }}>{s.count}</span>
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 10, color: '#94A3B8', flexWrap: 'wrap' }}>
                  {[['#FEE2E2', 'No leads'], ['#FEF3C7', 'Few'], ['#DCFCE7', 'Some'], ['#BBF7D0', 'Well covered']].map(([c, l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />{l}</span>
                  ))}
                  {mode === 'states' && (
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                      <button onClick={() => setStates(opts.states.filter(s => s.count === 0).map(s => s.name))} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>Select uncovered</button>
                      <button onClick={() => setStates([])} style={{ background: 'none', border: 'none', color: '#94A3B8', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>Clear</button>
                    </span>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Who */}
          {opts && (
            <section>
              <div style={label}>Organisation type <span style={{ textTransform: 'none', fontWeight: 500 }}>(none = all)</span></div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(opts.types).map(([k, l]) => (
                  <button key={k} onClick={() => setTypes(t => toggle(t, k))} style={chip(types.includes(k))}>{l}</button>
                ))}
              </div>
            </section>
          )}

          {opts && (
            <section>
              <div style={label}>Decision-maker role <span style={{ textTransform: 'none', fontWeight: 500 }}>(none = CEO, MD, Founder, Director, Estate Manager)</span></div>
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
              style={{ height: 38, fontSize: 13, width: '100%' }} />
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
                <div key={i} style={{ fontSize: 12, color: '#475569', padding: '6px 0', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span>{l.searched.join(', ')}</span>
                  <span style={{ fontWeight: 700, color: l.added ? '#059669' : '#94A3B8', whiteSpace: 'nowrap' }}>+{l.added}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #F1F5F9' }}>
          <button onClick={run} disabled={running}
            style={{ width: '100%', height: 42, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8B5CF6,#7C3AED)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: running ? 'not-allowed' : 'pointer', opacity: running ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {running ? <RefreshCw size={15} className="animate-spin" /> : <Zap size={15} />}
            {running ? 'Searching the web…' : `Find ${count} leads`}
          </button>
        </div>
      </div>
    </div>
  );
}
