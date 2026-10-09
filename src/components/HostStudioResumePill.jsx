import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { podcastAPI } from '../api';

/**
 * Floating pill that only shows when:
 *   - the current admin is hosting a live podcast
 *   - and they are *not* currently on /podcast
 *
 * One tap takes them back to the Studio. The pill polls /api/podcast/live
 * every 30s and reacts live to `podcast:started` / `podcast:ended` sockets
 * so it appears/disappears without manual refresh.
 */
export default function HostStudioResumePill() {
  const { user } = useAuth();
  const { subscribe } = useSocket() || {};
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [liveShow, setLiveShow] = useState(null);

  const refresh = async () => {
    try {
      const { data } = await podcastAPI.getLive();
      setLiveShow(data?.data || null);
    } catch {
      /* best effort */
    }
  };

  useEffect(() => {
    if (!user) return;
    refresh();
    const t = setInterval(refresh, 30_000);
    const onVis = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [user?._id]);

  useEffect(() => {
    if (!subscribe) return;
    const u1 = subscribe('podcast:started', (s) => setLiveShow(prev => prev ?? s));
    const u2 = subscribe('podcast:ended',   () => setLiveShow(null));
    return () => { u1 && u1(); u2 && u2(); };
  }, [subscribe]);

  if (!user || !liveShow) return null;

  // Only this specific host sees the pill.
  const isHost = String(liveShow.hostUserId) === String(user._id);
  if (!isHost) return null;

  // Don't nag the host while they're already on the studio page.
  if (pathname === '/podcast') return null;

  return (
    <button
      onClick={() => navigate('/podcast')}
      style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 60,
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '12px 16px', borderRadius: 999, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
        color: '#fff',
        boxShadow: '0 14px 36px rgba(139,92,246,0.55)',
        fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em',
        maxWidth: '72vw',
        animation: 'hr-pulse 2.4s ease-in-out infinite',
      }}
      title="Return to the live studio"
    >
      <span style={{ position: 'relative', display: 'inline-flex', width: 10, height: 10, flexShrink: 0 }}>
        <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#F87171', animation: 'hr-ping 1.6s infinite' }} />
        <span style={{ position: 'relative', width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
      </span>
      <Radio size={14} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Return to Studio · {liveShow.title}
      </span>
      <style>{`
        @keyframes hr-pulse { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes hr-ping  { 75%,100% { transform: scale(2.4); opacity: 0; } }
      `}</style>
    </button>
  );
}
