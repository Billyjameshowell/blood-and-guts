import { useCallback, useEffect, useState } from 'react';

export const vibrate = (pattern: number | number[]) => { try { navigator.vibrate?.(pattern); } catch { /* unsupported */ } };

let audio: AudioContext | null = null;
export function beep(times: number) {
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

/** Rest period: when it ends and how long it was. The countdown display ticks inside RestTimer. */
export type Rest = { endAt: number; total: number } | null;

export function useRestTimer() {
  const [rest, setRest] = useState<Rest>(null);
  const start = useCallback((seconds = 60) => setRest({ endAt: Date.now() + seconds * 1000, total: seconds }), []);
  const add = useCallback((seconds: number) =>
    setRest(r => r && { endAt: Math.max(r.endAt, Date.now()) + seconds * 1000, total: r.total + seconds }), []);
  const stop = useCallback(() => setRest(null), []);
  return { rest, start, add, stop };
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
