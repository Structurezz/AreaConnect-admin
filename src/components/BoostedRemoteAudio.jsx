import { useEffect, useRef } from 'react';

/**
 * Plays a WebRTC remote MediaStream with a Web Audio GainNode boost so the
 * host's voice is loud and clearly audible on top of any background music.
 *
 * The <audio> element is kept muted (volume 0) just to satisfy Chrome's
 * requirement that MediaStream audio tracks have a sink attached — the
 * actual audible output goes through AudioContext → GainNode → destination.
 */
export default function BoostedRemoteAudio({ stream, gain = 2.0 }) {
  const audioRef = useRef(null);
  const ctxRef   = useRef(null);
  const srcRef   = useRef(null);
  const gainRef  = useRef(null);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !stream) return;

    el.srcObject = stream;
    el.muted = true;      // audible path = Web Audio; element is just the sink
    el.volume = 0;
    el.autoplay = true;
    el.playsInline = true;
    el.play().catch(() => {});

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = ctxRef.current || new AC();
      ctxRef.current = ctx;
      // Resume if the browser suspended it (common pre-gesture)
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});

      const source = ctx.createMediaStreamSource(stream);
      const node   = ctx.createGain();
      node.gain.value = gain;
      source.connect(node).connect(ctx.destination);
      srcRef.current = source;
      gainRef.current = node;
    } catch (e) {
      // Fallback: play through the element at full volume
      console.warn('[BoostedRemoteAudio] Web Audio unavailable, falling back to element', e);
      el.muted = false;
      el.volume = 1;
    }

    return () => {
      try { srcRef.current?.disconnect(); } catch {}
      try { gainRef.current?.disconnect(); } catch {}
      try { ctxRef.current?.close(); } catch {}
      srcRef.current = null;
      gainRef.current = null;
      ctxRef.current = null;
    };
  }, [stream, gain]);

  // Also allow runtime gain updates
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = gain;
  }, [gain]);

  return <audio ref={audioRef} />;
}
