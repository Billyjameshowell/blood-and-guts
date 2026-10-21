import type { FocusEvent } from 'react';
import type { SetDef } from '../program';
import { isTimed, platesPerSide, repFloor, type Suggestion } from '../training';

export type Draft = { weight: string; reps: string };
export type Field = keyof Draft;

type Props = {
  set: SetDef;
  label: string;
  value: Draft;
  hint: Suggestion;
  barbell: boolean;
  weightStep: (w: number) => number;
  done: boolean;
  editing: boolean;
  isNext: boolean;
  onChange: (field: Field, v: string) => void;
  onDone: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onUndo: () => void;
};

const field = 'h-12 w-full min-w-0 rounded-xl border border-line bg-bg text-center text-lg font-bold tabular-nums outline-none placeholder:text-muted/60 placeholder:font-semibold focus:border-accent-2';
const stepBtn = 'h-12 w-11 shrink-0 rounded-xl border border-line bg-bg text-xl font-bold active:scale-95 transition-transform';
const smallBtn = 'h-11 rounded-xl border border-line px-4 font-semibold active:scale-95';

/** Tapping a filled field selects its contents, so typing replaces the number instead of splicing into it. */
const selectAll = (e: FocusEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  // After the tap places the caret (WebKit ignores a selection made synchronously in focus).
  setTimeout(() => el.setSelectionRange(0, el.value.length));
};

/**
 * Text input + −/+ buttons. The input shows exactly what Billy typed (an empty field stays empty);
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
        aria-label={label} value={value} placeholder={placeholder} onFocus={selectAll} onChange={e => onChange(e.target.value)} />
      <button type="button" className={stepBtn} aria-label={`Increase ${label}`} onClick={() => bump(1)}>+</button>
    </div>
  );
}

/** One set. Purely presentational: the values and the editing flag are owned by App. */
export function SetRow({ set, label, value, hint, barbell, weightStep, done, editing, isNext, onChange, onDone, onEdit, onCancel, onUndo }: Props) {
  const timed = isTimed(set);
  const head = (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="font-bold"><span className={set.kind === 'wu' ? 'text-wu' : 'text-accent'}>{label}</span></span>
      {!done && <span className="text-muted">{[set.reps, !timed && set.note].filter(Boolean).join(' · ')}</span>}
    </div>
  );

  if (done && !editing) {
    return (
      <div className="rounded-2xl border border-ok/40 bg-ok/5 p-3">
        {head}
        <div className="mt-2 flex items-center gap-2">
          <span className="flex-1 font-bold tabular-nums">
            {timed ? value.reps || set.reps : `${value.weight ? `${value.weight} lb` : '—'} × ${value.reps || '—'}`}
          </span>
          {!timed && <button type="button" className={smallBtn} onClick={onEdit}>Edit</button>}
          <button type="button" className={smallBtn} onClick={onUndo}>Undo</button>
        </div>
      </div>
    );
  }

  const shownWeight = value.weight || hint.weight;
  const plates = !timed && barbell ? platesPerSide(shownWeight) : '';
  const warmupNote = !done && hint.fromWarmup;
  return (
    <div className={`rounded-2xl border p-3 ${isNext ? 'border-accent-2 bg-accent-2/5 shadow-[0_0_0_1px_var(--color-accent-2)]' : 'border-line bg-surface-2'}`}>
      {head}
      {timed ? (
        <input className={`${field} mt-2`} type="text" autoComplete="off" aria-label="Duration" value={value.reps} placeholder={set.reps}
          onFocus={selectAll} onChange={e => onChange('reps', e.target.value)} />
      ) : (
        <>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Stepper label="weight" decimal value={value.weight} placeholder={hint.weight ? `${hint.weight} lb` : 'lb'}
              start={parseFloat(hint.weight) || null} step={weightStep(parseFloat(shownWeight) || 0)}
              onChange={v => onChange('weight', v)} />
            <Stepper label="reps" value={value.reps} placeholder={hint.reps || set.reps}
              start={parseFloat(hint.reps) || repFloor(set.reps)} step={1} onChange={v => onChange('reps', v)} />
          </div>
          {(warmupNote || plates) && (
            <p className="mt-1.5 text-xs text-muted">
              {warmupNote && <>Suggested <strong className="text-accent-2">{warmupNote.weight} lb</strong> from warm-up {warmupNote.from}</>}
              {warmupNote && plates && ' · '}
              {plates}
            </p>
          )}
        </>
      )}
      {editing ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} className="h-13 rounded-xl border border-line font-bold active:scale-[0.98]">Cancel</button>
          <button type="button" onClick={onDone} className="h-13 rounded-xl bg-ok font-extrabold text-black active:scale-[0.98]">Save</button>
        </div>
      ) : (
        <button type="button" onClick={onDone}
          className={`mt-2 h-13 w-full rounded-xl text-base font-extrabold active:scale-[0.98] transition-transform ${isNext ? 'bg-gradient-to-br from-accent to-accent-2 text-black' : 'border border-accent-2/60 text-accent-2'}`}>
          Done
        </button>
      )}
    </div>
  );
}
