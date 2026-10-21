import { useState } from 'react';
import type { Exercise } from '../program';
import { getLog, isBarbell, isTimed, platesPerSide, repFloor, suggestions, weightStep, type Logs } from '../training';
import type { SetLog } from '../store';

type Props = {
  ex: Exercise;
  idx: number;
  logs: Logs;
  isNext: boolean;
  onLog: (patch: SetLog) => void;
  onDone: (values: { weight: string; reps: string }) => void;
  onUndo: () => void;
};

const field = 'h-12 w-full min-w-0 rounded-xl border border-line bg-bg text-center text-lg font-bold tabular-nums outline-none placeholder:text-muted/60 placeholder:font-semibold focus:border-accent-2';
const stepBtn = 'h-12 w-11 shrink-0 rounded-xl border border-line bg-bg text-xl font-bold active:scale-95 transition-transform';

/**
 * Text input + −/+ buttons. The input holds exactly what Billy types (an empty field stays empty);
 * the suggestion is only a placeholder. With an empty field, the first tap starts at `start`.
 */
function Stepper({ label, value, placeholder, start, step, decimal, onChange }: {
  label: string; value: string; placeholder: string; start: number | null; step: number; decimal?: boolean; onChange: (v: string) => void;
}) {
  const bump = (dir: number) => {
    const cur = parseFloat(value);
    const next = Number.isFinite(cur) ? Math.max(0, cur + dir * step) : start ?? (dir > 0 ? step : 0);
    onChange(String(Math.round(next * 10) / 10));
  };
  return (
    <div className="flex gap-1.5">
      <button type="button" className={stepBtn} aria-label={`Decrease ${label}`} onClick={() => bump(-1)}>−</button>
      <input className={field} type="text" inputMode={decimal ? 'decimal' : 'numeric'} enterKeyHint="done" autoComplete="off"
        aria-label={label} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      <button type="button" className={stepBtn} aria-label={`Increase ${label}`} onClick={() => bump(1)}>+</button>
    </div>
  );
}

export function SetRow({ ex, idx, logs, isNext, onLog, onDone, onUndo }: Props) {
  const set = ex.sets[idx];
  const log = getLog(logs, ex.id, idx);
  const timed = isTimed(set);
  const hint = suggestions(logs, ex, idx);
  const weight = log.weight ?? '';
  const reps = log.reps ?? '';
  const [editing, setEditing] = useState(false);
  const kind = timed ? 'Cardio' : set.kind === 'wu' ? 'Warm-up' : 'Working';
  const target = [set.reps, !timed && set.note].filter(Boolean).join(' · ');

  const head = (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="font-bold"><span className={set.kind === 'wu' ? 'text-wu' : 'text-accent'}>{kind}</span>{ex.sets.length > 1 && ` ${idx + 1}`}</span>
      {!log.done && <span className="text-muted">{target}</span>}
    </div>
  );

  if (log.done && !editing) {
    return (
      <div id={`set-${ex.id}__${idx}`} className="rounded-2xl border border-ok/40 bg-ok/5 p-3">
        {head}
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 font-bold tabular-nums">{timed ? reps || set.reps : `${weight ? `${weight} lb` : '—'} × ${reps || '—'}`}</span>
          {!timed && <button type="button" className="h-11 rounded-xl border border-line px-4 font-semibold active:scale-95" onClick={() => setEditing(true)}>Edit</button>}
          <button type="button" className="h-11 rounded-xl border border-line px-4 font-semibold active:scale-95" onClick={onUndo}>Undo</button>
        </div>
      </div>
    );
  }

  const shownWeight = weight || hint.weight;
  const plates = !timed && isBarbell(ex) ? platesPerSide(shownWeight) : '';
  // Done with an empty field accepts the suggestion shown as its placeholder.
  const finish = () => {
    setEditing(false);
    onDone(timed ? { weight: '', reps: reps || set.reps } : { weight: shownWeight, reps: reps || hint.reps });
  };
  return (
    <div id={`set-${ex.id}__${idx}`}
      className={`rounded-2xl border p-3 ${isNext ? 'border-accent-2 bg-accent-2/5 shadow-[0_0_0_1px_var(--color-accent-2)]' : 'border-line bg-surface-2'}`}>
      {head}
      {timed ? (
        <input className={`${field} mt-2`} type="text" autoComplete="off" aria-label="Duration" value={reps} placeholder={set.reps}
          onChange={e => onLog({ reps: e.target.value })} />
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Stepper label="weight" decimal value={weight} placeholder={hint.weight ? `${hint.weight} lb` : 'lb'}
              start={parseFloat(hint.weight) || null} step={weightStep(ex, parseFloat(shownWeight) || 0)}
              onChange={v => onLog({ weight: v })} />
            <Stepper label="reps" value={reps} placeholder={hint.reps || set.reps}
              start={parseFloat(hint.reps) || repFloor(set.reps)} step={1} onChange={v => onLog({ reps: v })} />
          </div>
          {/* Suggestions only on the unlogged set; an edited done set shows what was logged. */}
          {((hint.fromWarmup && !log.done) || plates) && (
            <p className="mt-1.5 text-xs text-muted">
              {hint.fromWarmup && !log.done && <>Suggested <strong className="text-accent-2">{hint.fromWarmup.weight} lb</strong> from warm-up {hint.fromWarmup.from}</>}
              {hint.fromWarmup && !log.done && plates && ' · '}
              {plates}
            </p>
          )}
        </>
      )}
      <button type="button" onClick={finish}
        className={`mt-2 h-13 w-full rounded-xl text-base font-extrabold active:scale-[0.98] transition-transform ${isNext ? 'bg-gradient-to-br from-accent to-accent-2 text-black' : 'border border-accent-2/60 text-accent-2'}`}>
        {log.done ? 'Save' : 'Done'}
      </button>
    </div>
  );
}
