import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

const idKey = (roomType) => (roomType === 'dj' ? 'sessionId' : 'showId');

/**
 * Live-audio hook for both DJ sessions and admin podcasts.
 *
 *   roomType : 'dj' | 'podcast'
 *   roomId   : sessionId or showId
 *   role     : 'host' | 'guest' | 'listener' | 'caller'
 *   enabled  : when false the hook is inert
 *   meta     : extra signaling payload (e.g. guestId, name)
 *
 * Returns listener count, remote streams, mic controls, and (for listeners)
 * call-in state + raise/lower-hand helpers.
 */
export function useLiveAudio({ roomType, roomId, role, enabled = true, meta = {} }) {
  const { socket, emit, subscribe } = useSocket();
  const [micOn, setMicOn]           = useState(role !== 'listener');
  const [remoteStreams, setRemote]  = useState(() => new Map());
  const [listenerCount, setCount]   = useState(0);
  const [handRaised, setHandRaised] = useState(false);
  const [calledIn, setCalledIn]     = useState(false);
  const [handRequests, setRequests] = useState([]);   // host-only queue

  const localStreamRef   = useRef(null);  // RAW mic (what MediaRecorder sees)
  const outboundRef      = useRef(null);  // PROCESSED stream fed to peers (raw → gain → dest)
  const micCtxRef        = useRef(null);
  const micSourceRef     = useRef(null);
  const micGainNodeRef   = useRef(null);
  const [micGainLevel, setMicGainLevel] = useState(1.0);  // 0–2 range (0% – 200%)
  const peersRef       = useRef(new Map());  // socketId -> RTCPeerConnection
  const roleRef        = useRef(role);
  const metaRef        = useRef(meta);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { metaRef.current = meta; }, [meta]);

  const isPublisher = (r) => ['host', 'guest', 'caller'].includes(r);

  const getLocalStream = useCallback(async () => {
    if (outboundRef.current) return outboundRef.current;
    // noiseSuppression off: it over-attenuates soft voices and makes the
    // host sound faint on listeners' ends. AGC + echo cancellation are
    // kept — they normalize level without crushing the signal.
    const raw = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: false,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: 48000,
      },
      video: false,
    });
    localStreamRef.current = raw;

    // Build a processed outbound stream: raw → GainNode → MediaStream destination.
    // Peers consume the processed stream so the host can boost/duck their mic
    // live via setMicGain().
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        const ctx    = new AC();
        const source = ctx.createMediaStreamSource(raw);
        const gain   = ctx.createGain();
        gain.gain.value = 1.0;
        const dest   = ctx.createMediaStreamDestination();
        source.connect(gain).connect(dest);
        micCtxRef.current      = ctx;
        micSourceRef.current   = source;
        micGainNodeRef.current = gain;
        outboundRef.current    = dest.stream;
      } else {
        outboundRef.current = raw;
      }
    } catch (e) {
      console.warn('[useLiveAudio] mic gain pipeline failed; using raw stream', e);
      outboundRef.current = raw;
    }
    return outboundRef.current;
  }, []);

  // Sets outbound mic gain. `level` is 0..2 (1.0 = unity).
  const setMicGain = useCallback((level) => {
    const clamped = Math.max(0, Math.min(2, Number(level) || 0));
    setMicGainLevel(clamped);
    if (micGainNodeRef.current) micGainNodeRef.current.gain.value = clamped;
  }, []);

  // RAW stream for MediaRecorder (unprocessed, preserves what the host
  // originally said; recorder shouldn't double-apply any boost).
  const getRawStream = useCallback(() => localStreamRef.current, []);

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (outboundRef.current && outboundRef.current !== localStreamRef.current) {
      try { outboundRef.current.getTracks().forEach(t => t.stop()); } catch {}
      outboundRef.current = null;
    }
    try { micSourceRef.current?.disconnect(); } catch {}
    try { micGainNodeRef.current?.disconnect(); } catch {}
    try { micCtxRef.current?.close(); } catch {}
    micSourceRef.current = null;
    micGainNodeRef.current = null;
    micCtxRef.current = null;
  }, []);

  const createPeer = useCallback(async (remoteSocketId, isInitiator) => {
    if (peersRef.current.has(remoteSocketId)) return peersRef.current.get(remoteSocketId);
    const pc = new RTCPeerConnection(RTC_CONFIG);
    peersRef.current.set(remoteSocketId, pc);

    pc.onicecandidate = (ev) => {
      if (ev.candidate) emit('rtc:ice', { to: remoteSocketId, candidate: ev.candidate, meta: metaRef.current });
    };
    pc.ontrack = (ev) => {
      const [stream] = ev.streams;
      setRemote(prev => { const n = new Map(prev); n.set(remoteSocketId, stream); return n; });
    };
    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        peersRef.current.delete(remoteSocketId);
        setRemote(prev => { const n = new Map(prev); n.delete(remoteSocketId); return n; });
      }
    };

    if (isPublisher(roleRef.current)) {
      const stream = await getLocalStream();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
    }

    if (isInitiator) {
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);
      emit('rtc:offer', { to: remoteSocketId, sdp: pc.localDescription, meta: metaRef.current });
    }
    return pc;
  }, [emit, getLocalStream]);

  const closePeer = useCallback((socketId) => {
    const pc = peersRef.current.get(socketId);
    if (pc) { try { pc.close(); } catch {} peersRef.current.delete(socketId); }
    setRemote(prev => { const n = new Map(prev); n.delete(socketId); return n; });
  }, []);

  // ── Signaling + state subs ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !enabled || !roomId) return;

    // Announce ourselves to the room
    if (role === 'host') {
      emit(`${roomType}:host-ready`, { [idKey(roomType)]: roomId });
    } else if (role === 'guest' && roomType === 'podcast') {
      emit('podcast:guest-ready', { showId: roomId, guestId: meta?.guestId, name: meta?.name });
    } else if (role === 'listener') {
      emit(`${roomType}:listener-ready`, { [idKey(roomType)]: roomId });
    }

    const unsubs = [];

    unsubs.push(subscribe('dj:new-listener', async ({ socketId }) => {
      if (roleRef.current !== 'host' || roomType !== 'dj') return;
      await createPeer(socketId, true);
    }));
    unsubs.push(subscribe('podcast:new-listener', async ({ socketId }) => {
      if (roleRef.current !== 'host' || roomType !== 'podcast') return;
      await createPeer(socketId, true);
    }));
    unsubs.push(subscribe('podcast:new-guest', async ({ socketId, guestId, name }) => {
      if (roleRef.current !== 'host' || roomType !== 'podcast') return;
      await createPeer(socketId, true);
    }));

    unsubs.push(subscribe('rtc:offer', async ({ from, sdp }) => {
      const pc = await createPeer(from, false);
      await pc.setRemoteDescription(sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emit('rtc:answer', { to: from, sdp: pc.localDescription, meta: metaRef.current });
    }));
    unsubs.push(subscribe('rtc:answer', async ({ from, sdp }) => {
      const pc = peersRef.current.get(from);
      if (pc) await pc.setRemoteDescription(sdp);
    }));
    unsubs.push(subscribe('rtc:ice', async ({ from, candidate }) => {
      const pc = peersRef.current.get(from);
      if (pc && candidate) { try { await pc.addIceCandidate(candidate); } catch {} }
    }));

    unsubs.push(subscribe(`${roomType}:listener-count`, ({ count }) => setCount(count)));

    // Host-only: receive hand raise requests
    unsubs.push(subscribe('podcast:hand-raised', (req) => {
      if (roleRef.current !== 'host' || roomType !== 'podcast') return;
      setRequests(prev => prev.find(r => r.socketId === req.socketId) ? prev : [...prev, req]);
    }));
    unsubs.push(subscribe('podcast:hand-lowered', ({ socketId }) => {
      setRequests(prev => prev.filter(r => r.socketId !== socketId));
    }));
    unsubs.push(subscribe('podcast:caller-promoted', ({ socketId }) => {
      setRequests(prev => prev.filter(r => r.socketId !== socketId));
    }));

    // Listener-side: hand approval
    unsubs.push(subscribe('podcast:hand-approved', async () => {
      roleRef.current = 'caller';
      setCalledIn(true);
      setHandRaised(false);
      // Rejoin as a guest-like speaker so host creates a two-way peer
      try {
        await getLocalStream();
        // Tear down one-way listener peers; host will send a fresh offer to us
        peersRef.current.forEach((pc) => { try { pc.close(); } catch {} });
        peersRef.current.clear();
        setRemote(new Map());
        emit('podcast:guest-ready', { showId: roomId, guestId: null, name: metaRef.current?.name || 'Caller' });
      } catch (e) {
        console.warn('mic permission denied for caller', e);
      }
    }));
    unsubs.push(subscribe('podcast:hand-denied', () => setHandRaised(false)));
    unsubs.push(subscribe('podcast:caller-removed', () => {
      roleRef.current = 'listener';
      setCalledIn(false);
      stopLocalStream();
      peersRef.current.forEach(pc => { try { pc.close(); } catch {} });
      peersRef.current.clear();
      setRemote(new Map());
      emit(`${roomType}:listener-ready`, { [idKey(roomType)]: roomId });
    }));

    return () => {
      unsubs.forEach(fn => fn && fn());
      if (roomType === 'dj') emit('dj:leave', { sessionId: roomId });
      else emit('podcast:leave', { showId: roomId });
      peersRef.current.forEach(pc => { try { pc.close(); } catch {} });
      peersRef.current.clear();
      setRemote(new Map());
      stopLocalStream();
    };
  }, [socket, enabled, roomId, roomType, role]); // eslint-disable-line

  // ── Public actions ─────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const raiseHand = useCallback((userInfo = {}) => {
    if (roomType !== 'podcast') return;
    emit('podcast:raise-hand', { showId: roomId, ...userInfo });
    setHandRaised(true);
  }, [roomType, roomId, emit]);

  const lowerHand = useCallback(() => {
    emit('podcast:lower-hand', { showId: roomId });
    setHandRaised(false);
  }, [roomId, emit]);

  const approveHand = useCallback((socketId) => {
    emit('podcast:approve-hand', { showId: roomId, socketId });
  }, [roomId, emit]);

  const denyHand = useCallback((socketId) => {
    emit('podcast:deny-hand', { showId: roomId, socketId });
    setRequests(prev => prev.filter(r => r.socketId !== socketId));
  }, [roomId, emit]);

  const removeCaller = useCallback((socketId) => {
    emit('podcast:remove-caller', { showId: roomId, socketId });
  }, [roomId, emit]);

  return {
    micOn, toggleMic,
    listenerCount,
    remoteStreams,
    handRaised, calledIn,
    raiseHand, lowerHand,
    handRequests, approveHand, denyHand, removeCaller,
    getLocalStream, getRawStream,
    micGain: micGainLevel, setMicGain,
  };
}
