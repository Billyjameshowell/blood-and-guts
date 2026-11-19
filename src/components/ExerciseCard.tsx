import { AnimatePresence, motion } from 'motion/react';
import { gifUrl, type Exercise } from '../program';
import {
  getLog, isDone, isTimed, lastSummary, presentExercise, priorLabel, suggestions, summary, variantsFor, weightStep,
  type Focus, type Logs, type Variant,
} from '../training';
import type { LastTime } from '../store';
import { SetRow, type Draft, type Field } from './SetRow';

/** A done set being edited: its draft lives here until Save or Cancel, so the logged values stay intact. */
export type Edit = { exId: string; idx: number } & Draft;

type Props = {
  ex: Exercise;
  variant: Variant;
  logs: Logs;
  last: LastTime | undefined;
  edit: Edit | null;
  focus: Focus;
  collapsed: boolean;
  skipped: boolean;
  onVariant: (id: string) => void;
  onSkip: (skip: boolean) => void;
  onToggle: () => void;
  onShowDetails: () => void;
  onChange: (idx: number, field: Field, v: string) => void;
  onDone: (idx: number) => void;
  onEdit: (idx: number) => void;
  onCancelEdit: () => void;
  onUndo: (idx: number) => void;
};

export function Thumb({ ex, className }: { ex: Exercise; className: string }) {
  if (ex.exerciseId) return <img src={gifUrl(ex.exerciseId)} alt="" loading="lazy" className={`${className} bg-white object-cover`} />;
  const glyph = ex.placeholder === 'cardio' ? '⚡' : ex.placeholder === 'stretch' ? '🧘' : '🏋️';
  return <div className={`${className} grid place-items-center bg-bg text-2xl`} aria-hidden>{glyph}</div>;
}

function MovementSelect({ programmed, variant, variants, onVariant }: {
  programmed: string; variant: Variant; variants: Variant[]; onVariant: (id: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <select aria-label={`${programmed} movement`} value={variant.id} onChange={e => onVariant(e.target.value)}
        className="h-11 w-full appearance-none truncate rounded-xl border border-line bg-bg pl-3 pr-8 text-base font-bold outline-none focus:border-accent-2">
        {variants.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-sm text-muted" aria-hidden>▾</span>
    </div>
  );
}

export function ExerciseCard({
  ex, variant, logs, last, edit, focus, collapsed, skipped, onVariant, onSkip, onToggle, onShowDetails,
  onChange, onDone, onEdit, onCancelEdit, onUndo,
}: Props) {
  const shown = presentExercise(ex, variant);
  const done = isDone(logs, ex, variant.id);
  const doneCount = ex.sets.filter((_, i) => getLog(logs, ex.id, i, variant.id).done).length;
  const progressText = summary(logs, ex, variant.id);
  const lastText = lastSummary(last, ex);
  const subtitle = skipped ? 'Skipped' : doneCount === 0 ? (lastText || shown.startHint || progressText) : progressText;
  const priorLine = lastText && subtitle !== lastText ? lastText : '';

  return (
    <article id={`card-${ex.id}`}
      className={`overflow-hidden rounded-3xl border bg-surface ${done ? 'border-ok/40' : focus?.exId === ex.id && collapsed ? 'border-accent-2/60' : 'border-line'}`}>
      <div className="flex items-start gap-3 p-3">
        <button type="button" onClick={onShowDetails} aria-label={`${shown.name} details`}
          className="relative shrink-0 overflow-hidden rounded-2xl active:scale-95 transition-transform">
          <Thumb ex={shown} className="h-18 w-18" />
          {skipped && !done && <span className="absolute inset-0 grid place-items-center bg-bg/75 text-sm font-bold text-muted">Skipped</span>}
          {done && <span className="absolute inset-0 grid place-items-center bg-ok/80 text-2xl font-black text-black">✓</span>}
        </button>
        <div className="flex min-w-0 flex-1 flex-col">
          <MovementSelect programmed={ex.name} variant={variant} variants={variantsFor(ex)} onVariant={onVariant} />
          <button type="button" onClick={onToggle} aria-expanded={!collapsed}
            aria-label={collapsed ? `Expand ${shown.name}` : `Collapse ${shown.name}`}
            className="mt-1 flex min-h-11 w-full items-center gap-1 text-left">
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-sm ${done && !skipped ? 'text-ok' : 'text-muted'}`}>{subtitle}</span>
              {priorLine && <span className="block truncate text-xs font-semibold tabular-nums text-muted">{priorLine}</span>}
            </span>
            <motion.span animate={{ rotate: collapsed ? 0 : 180 }} className="grid h-11 w-8 shrink-0 place-items-center text-muted" aria-hidden>▾</motion.span>
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div key="sets" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
            <div className="flex flex-col gap-2 px-3 pb-3">
              {ex.sets.map((set, i) => {
                const log = getLog(logs, ex.id, i, variant.id);
                const editing = edit?.exId === ex.id && edit.idx === i;
                const kind = isTimed(set) ? 'Cardio' : set.kind === 'wu' ? 'Warm-up' : 'Working';
                return (
                  <div key={i} id={`set-${ex.id}__${i}`}>
                    <SetRow set={set} label={ex.sets.length > 1 ? `${kind} ${i + 1}` : kind}
                      value={editing ? edit : { weight: log.weight ?? '', reps: log.reps ?? '' }}
                      hint={suggestions(logs, ex, i, variant, last?.sets[i])} prior={priorLabel(last, set, i)}
                      barbell={variant.barbell} weightStep={w => weightStep(variant.dumbbell, w)}
                      done={!!log.done} editing={editing} isNext={focus?.exId === ex.id && focus.idx === i}
                      onChange={(f, v) => onChange(i, f, v)} onDone={() => onDone(i)} onEdit={() => onEdit(i)}
                      onCancel={onCancelEdit} onUndo={() => onUndo(i)} />
                  </div>
                );
              })}
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
