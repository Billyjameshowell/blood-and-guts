import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Drawer } from 'vaul';
import { DAYS, type Exercise } from '../program';
import { getLog, isTimed, type Logs } from '../training';
import { beep, vibrate, type Rest } from '../device';
import { Thumb } from './ExerciseCard';

export function Ring({ pct, size, stroke, color }: { pct: number; size: number; stroke: number; color: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .3s' }} />
    </svg>
  );
}

export function DayNav({ day, pctFor, onSelect }: { day: number; pctFor: (id: number) => number; onSelect: (id: number) => void }) {
  return (
    <nav aria-label="Workout days"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-bg/95 px-2 pt-1.5 pb-[max(6px,env(safe-area-inset-bottom))] backdrop-blur">
      {DAYS.map(d => (
        <button key={d.id} type="button" onClick={() => onSelect(d.id)} aria-current={d.id === day ? 'page' : undefined}
          className={`flex min-h-13 flex-col items-center justify-center gap-0.5 text-xs font-bold ${d.id === day ? 'text-ink' : 'text-muted'}`}>
          <span className={`relative grid h-7 w-14 place-items-center rounded-full ${d.id === day ? 'bg-accent/20' : ''}`}>
            <Ring pct={pctFor(d.id)} size={26} stroke={3.5} color="var(--color-ok)" />
            <span className="absolute text-[11px] font-black text-ink">{d.id}</span>
          </span>
          {d.short}
        </button>
      ))}
    </nav>
  );
}

/** Countdown above the tab bar. Ticks on its own so the rest of the app doesn't re-render every second. */
export function RestTimer({ rest, onAdd, onEnd }: { rest: Rest; onAdd: () => void; onEnd: () => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);
  const left = rest ? Math.min(rest.total, Math.max(0, Math.ceil((rest.endAt - now) / 1000))) : null;
  const finished = left === 0;
  useEffect(() => {
    if (!finished) return;
    vibrate([100, 50, 100, 50, 200]);
    beep(4);
    const t = setTimeout(onEnd, 2200);
    return () => clearTimeout(t);
  }, [finished, onEnd]);

  return (
    <AnimatePresence>
      {rest && left !== null && (
        <motion.div role="status" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          className="fixed inset-x-2.5 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-3xl border border-accent/40 bg-[#1b1213] p-3 shadow-2xl">
          <span className="relative grid place-items-center">
            <Ring pct={left / rest.total} size={56} stroke={5} color={left <= 0 ? 'var(--color-ok)' : left <= 10 ? 'var(--color-accent-2)' : 'var(--color-accent)'} />
            <span className="absolute text-lg font-black tabular-nums">{left}</span>
          </span>
          <span className="flex-1 font-bold">{left > 0 ? 'Rest' : 'Go!'}</span>
          <button type="button" onClick={onAdd} className="h-12 rounded-xl border border-line px-4 font-bold active:scale-95">+15s</button>
          <button type="button" onClick={onEnd} className="h-12 rounded-xl bg-accent px-4 font-bold text-black active:scale-95">Skip</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Floating "Next" pill: shown when the next set is off-screen; the only thing that scrolls the page. */
export function NextButton({ targetId, label, raised, onGo }: { targetId: string | null; label: string; raised: boolean; onGo: () => void }) {
  const [offscreen, setOffscreen] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    const el = targetId && document.getElementById(targetId);
    if (!el) return setOffscreen(null);
    const io = new IntersectionObserver(([e]) =>
      setOffscreen(e.isIntersecting ? null : e.boundingClientRect.top < 0 ? 'up' : 'down'),
    { rootMargin: '-60px 0px -150px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  return (
    <AnimatePresence>
      {offscreen && (
        <motion.button type="button" onClick={onGo} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
          className={`fixed left-1/2 ${raised ? 'bottom-[calc(160px+env(safe-area-inset-bottom))]' : 'bottom-[calc(76px+env(safe-area-inset-bottom))]'} z-20 flex h-12 max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 truncate rounded-full bg-gradient-to-br from-accent to-accent-2 px-5 font-extrabold text-black shadow-xl`}>
          {offscreen === 'up' ? '↑' : '↓'} {label}
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function ExerciseDetails({ ex, logs, onClose }: { ex: Exercise | null; logs: Logs; onClose: () => void }) {
  return (
    <Drawer.Root open={!!ex} onOpenChange={open => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-surface px-4 pt-2 pb-[max(20px,env(safe-area-inset-bottom))] outline-none">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          {ex && (
            <>
              <div className="flex items-start gap-3">
                <Drawer.Title className="flex-1 text-xl font-bold">{ex.name}</Drawer.Title>
                <Drawer.Close className="-mt-1 h-11 rounded-xl border border-line px-4 text-sm font-bold active:scale-95">Close</Drawer.Close>
              </div>
              <Drawer.Description className="mt-1 text-sm text-muted">
                {[ex.startHint, ex.weak && 'Closest available demo'].filter(Boolean).join(' · ')}
              </Drawer.Description>
              <Thumb ex={ex} className="mt-3 aspect-square w-full rounded-2xl !object-contain" />
              <ol className="mt-3 space-y-1 text-sm">
                {ex.sets.map((s, i) => (
                  <li key={i} className="flex justify-between border-b border-line/60 py-1.5">
                    <span className={s.kind === 'wu' ? 'text-wu' : 'text-accent'}>{isTimed(s) ? 'Cardio' : s.kind === 'wu' ? 'Warm-up' : 'Working'}</span>
                    <span className="text-muted">{s.reps}{s.note && !isTimed(s) ? ` · ${s.note}` : ''}{getLog(logs, ex.id, i).done ? ' ✓' : ''}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
