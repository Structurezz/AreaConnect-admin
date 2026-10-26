import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, Rocket, Building2, CornerDownLeft, X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Sidebar, { NAV } from './Sidebar';
import { estateAPI } from '../../api';

const PAGES = NAV.flatMap(({ section, links }) => links.map((l) => ({ ...l, section })));
const EXTRA_TITLES = [
  [/^\/estates\/new/, 'Estates', 'Onboarding wizard'],
  [/^\/estates\/[^/]+/, 'Estates', 'Estate details'],
  [/^\/campaigns\/new/, 'Growth', 'New campaign'],
  [/^\/campaigns\/[^/]+/, 'Growth', 'Campaign'],
];

function titleFor(pathname) {
  const exact = PAGES.find((p) => p.to === pathname);
  if (exact) return [exact.section, exact.label];
  const extra = EXTRA_TITLES.find(([re]) => re.test(pathname));
  if (extra) return [extra[1], extra[2]];
  const prefix = [...PAGES].sort((a, b) => b.to.length - a.to.length).find((p) => pathname.startsWith(p.to));
  return prefix ? [prefix.section, prefix.label] : ['AreaConnect', 'Admin'];
}

// ⌘K: jump to any page or estate
function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [estates, setEstates] = useState(null);
  const [i, setI] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(''); setI(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    if (!estates) estateAPI.getAll().then(({ data }) => setEstates(data.data || [])).catch(() => setEstates([]));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    const pages = PAGES.filter((p) => !term || `${p.label} ${p.section}`.toLowerCase().includes(term))
      .map((p) => ({ key: p.to, label: p.label, sub: p.section, Icon: p.icon, to: p.to }));
    const est = term ? (estates || []).filter((e) => `${e.name} ${e.estateCode || ''} ${e.address || ''}`.toLowerCase().includes(term)).slice(0, 6)
      .map((e) => ({ key: e._id, label: e.name, sub: `Estate · ${e.estateCode || ''}`, Icon: Building2, to: `/estates/${e._id}` })) : [];
    return [...est, ...pages].slice(0, 12);
  }, [q, estates]);

  const go = (r) => { if (!r) return; onClose(); navigate(r.to); };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-slate-100">
          <Search size={16} className="text-slate-400" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, results.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
              if (e.key === 'Enter') go(results[i]);
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Search pages and estates…" className="flex-1 text-[14px] outline-none bg-transparent" />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1.5">
          {results.length === 0 && <p className="px-4 py-6 text-center text-[13px] text-slate-400">No matches</p>}
          {results.map((r, k) => (
            <button key={r.key} onMouseEnter={() => setI(k)} onClick={() => go(r)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left ${k === i ? 'bg-slate-50' : ''}`}>
              <span className="w-7 h-7 rounded-md border border-slate-200 flex items-center justify-center text-slate-500"><r.Icon size={14} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-slate-900 truncate">{r.label}</span>
                <span className="block text-[11px] text-slate-400 truncate">{r.sub}</span>
              </span>
              {k === i && <CornerDownLeft size={13} className="text-slate-400" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();
  const [section, title] = titleFor(pathname);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50" />
          <div className="absolute left-0 top-0 bottom-0 z-50 animate-slide-in" onClick={(e) => e.stopPropagation()}>
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="hidden lg:flex flex-shrink-0"><Sidebar /></div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 flex items-center gap-3 px-4 lg:px-6 bg-white" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="min-w-0 leading-tight">
            <div className="text-[11px] text-slate-400">{section}</div>
            <div className="text-[14px] font-semibold text-slate-900 truncate">{title}</div>
          </div>

          <button onClick={() => setPaletteOpen(true)}
            className="ml-auto hidden md:flex items-center gap-2 w-72 h-9 px-3 rounded-lg border text-[13px] text-slate-400 hover:border-slate-300 transition-colors"
            style={{ borderColor: 'var(--border-md)', background: '#F9FAFB' }}>
            <Search size={14} /> <span className="flex-1 text-left">Search pages and estates…</span>
            <span className="text-[11px] px-1.5 rounded border border-slate-200 text-slate-400">⌘K</span>
          </button>
          <button onClick={() => setPaletteOpen(true)} className="md:hidden ml-auto p-2 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Search"><Search size={18} /></button>

          {!pathname.startsWith('/onboarding') && (
            <Link to="/onboarding" className="btn-primary !py-2" style={{ textDecoration: 'none' }}>
              <Rocket size={14} /> <span className="hidden sm:inline">Onboard estates</span>
            </Link>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:px-8 lg:py-7" style={{ background: 'var(--bg)' }}>
          {children}
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <Toaster position="top-right" toastOptions={{
        style: { background: '#FFFFFF', color: '#101828', border: '1px solid #E4E7EC', borderRadius: '10px', fontSize: '0.8125rem', boxShadow: '0 12px 24px -8px rgba(16,24,40,0.15)' },
        success: { iconTheme: { primary: '#059669', secondary: '#ECFDF3' } },
        error: { iconTheme: { primary: '#D92D20', secondary: '#FEF3F2' } },
      }} />
    </div>
  );
}
