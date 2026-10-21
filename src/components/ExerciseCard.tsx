import { AnimatePresence, motion } from 'motion/react';
import { gifUrl, type Exercise } from '../program';
import { getLog, isDone, summary, type Focus, type Logs } from '../training';
import type { SetLog } from '../store';
import { SetRow } from './SetRow';

type Props = {
  ex: Exercise;
  logs: Logs;
  focus: Focus;
  collapsed: boolean;
  skipped: boolean;
  onSkip: (skip: boolean) => void;
  onToggle: () => void;
  onShowDetails: () => void;
  onLog: (idx: number, patch: SetLog) => void;
  onDone: (idx: number, values: { weight: string; reps: string }) => void;
  onUndo: (idx: number) => void;
};

export function Thumb({ ex, className }: { ex: Exercise; className: string }) {
  return ex.exerciseId
    ? <img src={gifUrl(ex.exerciseId)} alt={`${ex.name} demo`} loading="lazy" className={`${className} bg-white object-cover`} />
    : <div className={`${className} grid place-items-center bg-bg text-2xl text-muted`} aria-hidden>{ex.placeholder === 'cardio' ? '⚡' : '🧘'}</div>;
}

export function ExerciseCard({ ex, logs, focus, collapsed, skipped, onSkip, onToggle, onShowDetails, onLog, onDone, onUndo }: Props) {
  const done = isDone(logs, ex);
  const doneCount = ex.sets.filter((_, i) => getLog(logs, ex.id, i).done).length;
  const subtitle = skipped ? 'Skipped' : doneCount === 0 && ex.startHint ? ex.startHint : summary(logs, ex);

  return (
    <article id={`card-${ex.id}`}
      className={`overflow-hidden rounded-3xl border bg-surface ${done ? 'border-ok/40' : focus?.exId === ex.id && collapsed ? 'border-accent-2/60' : 'border-line'}`}>
      <div className="flex items-center gap-3 p-3">
        <button type="button" onClick={onShowDetails} aria-label={`${ex.name} details`}
          className="relative shrink-0 overflow-hidden rounded-2xl active:scale-95 transition-transform">
          <Thumb ex={ex} className="h-18 w-18" />
          {skipped && !done && <span className="absolute inset-0 grid place-items-center bg-bg/75 text-sm font-bold text-muted">Skipped</span>}
          {done && <span className="absolute inset-0 grid place-items-center bg-ok/80 text-2xl font-black text-black">✓</span>}
        </button>
        <button type="button" onClick={onToggle} aria-expanded={!collapsed}
          className="flex min-h-18 min-w-0 flex-1 items-center gap-2 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-bold">{ex.name}</span>
            <span className={`block truncate text-sm ${done && !skipped ? 'text-ok' : 'text-muted'}`}>{subtitle}</span>
          </span>
          <motion.span animate={{ rotate: collapsed ? 0 : 180 }} className="grid h-11 w-11 shrink-0 place-items-center text-muted" aria-hidden>▾</motion.span>
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div key="sets" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="flex flex-col gap-2 px-3 pb-3">
              {ex.sets.map((_, i) => (
                <SetRow key={i} ex={ex} idx={i} logs={logs} isNext={focus?.exId === ex.id && focus.idx === i}
                  onLog={patch => onLog(i, patch)} onDone={v => onDone(i, v)} onUndo={() => onUndo(i)} />
              ))}
              {!done && (
                <button type="button" onClick={() => onSkip(!skipped)}
                  className="h-11 self-center px-4 text-sm font-semibold text-muted active:scale-95">
                  {skipped ? 'Unskip exercise' : 'Skip exercise'}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
