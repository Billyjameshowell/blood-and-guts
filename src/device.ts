import { useCallback, useEffect, useRef, useState } from 'react';

export const vibrate = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* unsupported */ } };

let audio: AudioContext | null = null;
function beep(times: number) {
  try {
    audio ??= new AudioContext();
    void audio.resume();
    for (let i = 0; i < times; i++) {
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime + i * 0.22;
      o.frequency.value = i === times - 1 ? 880 : 660;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.2);
    }
  } catch { /* no audio */ }
}

/** Rest countdown. `left` is null when no timer is showing. */
export function useRestTimer() {
  const [left, setLeft] = useState<number | null>(null);
  const [total, setTotal] = useState(60);
  const endAt = useRef(0);

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) {
      vibrate([100, 50, 100, 50, 200]);
      beep(4);
      const t = setTimeout(() => setLeft(null), 2200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLeft(Math.max(0, Math.round((endAt.current - Date.now()) / 1000))), 250);
    return () => clearTimeout(t);
  }, [left]);

  const start = useCallback((seconds = 60) => {
    endAt.current = Date.now() + seconds * 1000;
    setTotal(seconds);
    setLeft(seconds);
  }, []);
  const add = useCallback((seconds: number) => {
    endAt.current = Math.max(endAt.current, Date.now()) + seconds * 1000;
    setTotal(t => t + seconds);
    setLeft(Math.round((endAt.current - Date.now()) / 1000));
  }, []);
  const stop = useCallback(() => setLeft(null), []);
  return { left, total, start, add, stop };
}

/** Keep the screen awake during a workout (on by default, re-acquired when the app returns). */
export function useWakeLock() {
  const [wanted, setWanted] = useState(true);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!wanted || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
        setActive(true);
        lock.addEventListener('release', () => setActive(false));
      } catch { setActive(false); }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void acquire(); };
    void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); void lock?.release(); };
  }, [wanted]);
  return { active: wanted && active, toggle: () => setWanted(w => !w) };
}

/**
 * Home-screen web apps on iOS resume without reloading, so they can keep running an old build.
 * When the app comes back to the foreground, reload if a newer build is deployed (logs live in localStorage).
 */
export function useReloadOnNewBuild() {
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const current = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src;
    const check = async () => {
      if (document.visibilityState !== 'visible' || !current) return;
      try {
        const html = await (await fetch('/', { cache: 'no-store' })).text();
        const latest = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
        if (latest && new URL(latest, location.href).href !== current) location.reload();
      } catch { /* offline */ }
    };
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
}
