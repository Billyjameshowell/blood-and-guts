import type { Exercise, SetDef } from './program';
import { SWAPS, type Swap } from './substitutes';
import { logKey, type History, type HistSet, type LastTime, type SetLog } from './store';

export type Logs = Record<string, SetLog>;

export type Variant = {
  id: string;
  name: string;
  exerciseId?: string;
  startHint?: string;
  barbell: boolean;
  dumbbell: boolean;
  placeholder?: 'cardio' | 'stretch';
};

export const isTimed = (s: SetDef) => s.mode === 'timed';
export const getLog = (logs: Logs, slotId: string, i: number, variantId = slotId): SetLog =>
  logs[logKey(slotId, i, variantId)] || {};
export const isDone = (logs: Logs, ex: Exercise, variantId = ex.id) =>
  ex.sets.every((_, i) => getLog(logs, ex.id, i, variantId).done);

const num = (v: unknown) => { const n = parseFloat(String(v)); return Number.isFinite(n) && n > 0 ? n : null; };

export function parseStartWeight(hint?: string) {
  const m = hint?.match(/~\s*(\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

export const isBarbell = (ex: Exercise) => /\(bar\)/i.test(ex.startHint || '') || /\bBB\b|Barbell|Deadlift|Skull/i.test(ex.name);
const isDumbbell = (ex: Exercise) => /per hand/i.test(ex.startHint || '') || /\bDB\b|Dumbbell/i.test(ex.name);
/** Weight step for the −/+ buttons and suggestion rounding. */
export const weightStep = (dumbbell: boolean, w: number) => (dumbbell && w < 25 ? 2.5 : 5);
const roundTo = (w: number, step: number) => Math.round(w / step) * step;

function asVariant(swap: Swap): Variant {
  return { barbell: false, dumbbell: false, ...swap };
}

/** Programmed movement first, then the curated swaps. */
export function variantsFor(ex: Exercise): Variant[] {
  const programmed: Variant = {
    id: ex.id,
    name: ex.name,
    exerciseId: ex.exerciseId,
    startHint: ex.startHint,
    barbell: isBarbell(ex),
    dumbbell: isDumbbell(ex),
    placeholder: ex.placeholder,
  };
  return [programmed, ...(SWAPS[ex.id] ?? []).map(asVariant)];
}

export function chosenVariant(ex: Exercise, picked?: Record<string, string>): Variant {
  const all = variantsFor(ex);
  return all.find(v => v.id === picked?.[ex.id]) ?? all[0];
}

/** What the card and the details sheet should show for the selected variant.
 *  A swap with no demo of its own keeps the slot's GIF so the card stays recognizable. */
export function presentExercise(ex: Exercise, variant: Variant): Exercise {
  return {
    ...ex,
    name: variant.name,
    exerciseId: variant.exerciseId ?? ex.exerciseId,
    startHint: variant.startHint,
    weak: variant.id === ex.id ? ex.weak : false,
    placeholder: (variant.exerciseId ?? ex.exerciseId) ? undefined : (variant.placeholder ?? ex.placeholder),
  };
}

/**
 * Working-set suggestion from the heaviest logged warm-up.
 * Warm-ups are submaximal, so reps + 3 (RIR) feed an Epley/Brzycki 1RM average; the load for the
 * low end of the working rep range is Epley-inverted and taken at 93% (hard top set, not a grind).
 */
export function suggestFromWarmup(logs: Logs, ex: Exercise, set: SetDef, variant: Variant) {
  if (set.kind !== 'work' || isTimed(set)) return null;
  let best: { w: number; r: number; label: string } | null = null;
  ex.sets.forEach((s, i) => {
    if (s.kind !== 'wu' || isTimed(s)) return;
    const l = getLog(logs, ex.id, i, variant.id);
    const w = num(l.weight), r = num(l.reps);
    if (w && r && (!best || w >= best.w)) best = { w, r, label: `${l.weight}×${l.reps}` };
  });
  if (!best) return null;
  const { w, r, label } = best as { w: number; r: number; label: string };
  const rEff = Math.min(36, r + 3);
  const orm = (w * (1 + rEff / 30) + (w * 36) / (37 - rEff)) / 2;
  const target = Number(set.reps.match(/\d+/)?.[0] ?? 8);
  const raw = (orm / (1 + target / 30)) * 0.93;
  const step = weightStep(variant.dumbbell, raw);
  return { weight: Math.max(roundTo(raw, step), roundTo(w, step)), from: label };
}

/** Lower bound of a rep target: '10-12' → 10, '15' → 15, '1×6' → 6, 'RP to fail' → null. */
export function repFloor(target: string) {
  const m = (target.includes('×') ? target.split('×')[1] : target).match(/\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * Suggested values for a set, shown only as placeholders and used as the start point for the steppers
 * (never written into the inputs). Weight: last time this variant was done, else the previous set
 * this session, else the warm-up estimate, else the program start weight.
 */
export function suggestions(logs: Logs, ex: Exercise, i: number, variant?: Variant, prior?: HistSet | null) {
  const v = variant ?? variantsFor(ex)[0];
  const s = ex.sets[i];
  let prev: SetLog | null = null;
  for (let j = i - 1; j >= 0 && !prev; j--) {
    const d = ex.sets[j], l = getLog(logs, ex.id, j, v.id);
    if ((s.kind !== 'work' || (d.kind === 'work' && !isTimed(d))) && (l.weight || l.reps)) prev = l;
  }
  const fromWarmup = prior?.weight ? null : suggestFromWarmup(logs, ex, s, v);
  return {
    weight: prior?.weight || prev?.weight || (fromWarmup ? String(fromWarmup.weight) : parseStartWeight(v.startHint) ?? ''),
    reps: prior?.reps || prev?.reps || '',
    fromWarmup,
  };
}

export type Suggestion = ReturnType<typeof suggestions>;

export function formatWhen(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatPerformed(set: HistSet, timed: boolean) {
  if (timed) return set.reps || '';
  if (set.weight && set.reps) return `${set.weight}×${set.reps}`;
  if (set.weight) return `${set.weight} lb`;
  return set.reps || '';
}

/** "Nov 19 · 135×12 · 185×8", or '' when this variant has never been logged. */
export function lastSummary(last: LastTime | undefined, ex: Exercise) {
  if (!last) return '';
  const parts = ex.sets.map((s, i) => {
    const row = last.sets[i];
    return row ? formatPerformed(row, isTimed(s)) : '';
  }).filter(Boolean);
  return parts.length ? `${formatWhen(last.date)} · ${parts.join(' · ')}` : '';
}

export function priorLabel(last: LastTime | undefined, set: SetDef, i: number) {
  const row = last?.sets[i];
  if (!last || !row) return '';
  const performed = formatPerformed(row, isTimed(set));
  return performed ? `${formatWhen(last.date)} · ${performed}` : '';
}

export function platesPerSide(total: string) {
  const t = num(total);
  if (!t || t < 45) return '';
  let rem = (t - 45) / 2;
  if (rem === 0) return 'Bar only';
  const counts: Record<number, number> = {};
  for (const p of [45, 35, 25, 10, 5, 2.5]) while (rem + 1e-9 >= p) { counts[p] = (counts[p] || 0) + 1; rem -= p; }
  const parts = Object.keys(counts).map(Number).sort((a, b) => b - a).map(p => (counts[p] > 1 ? `${counts[p]}×${p}` : `${p}`));
  return `${parts.join(' + ')} per side${rem > 0.01 ? ` (+${rem})` : ''}`;
}

export function summary(logs: Logs, ex: Exercise, variantId = ex.id) {
  const rows = ex.sets.map((s, i) => ({ s, l: getLog(logs, ex.id, i, variantId) }));
  const done = rows.filter(r => r.l.done).length;
  const n = ex.sets.length;
  const sets = `${n} ${n === 1 ? 'set' : 'sets'}`;
  if (done < n) return `${done}/${sets}`;
  if (rows.every(r => isTimed(r.s))) return rows.map(r => r.l.reps || r.s.reps).join(', ');
  const top = rows.reduce<{ w: number; reps?: string } | null>((t, r) => {
    const w = num(r.l.weight);
    return w && (!t || w > t.w) ? { w, reps: r.l.reps } : t;
  }, null);
  return top ? `${sets}, top ${top.w} lb${top.reps ? ` × ${top.reps}` : ''}` : sets;
}

export type Focus = { exId: string; idx: number } | null;

/** Next set to do: rest of the active exercise, then the next unfinished one below it, wrapping around. */
export function findFocus(
  logs: Logs,
  exercises: Exercise[],
  activeExId: string | null,
  skipped: Record<string, boolean>,
  variantIdOf: (ex: Exercise) => string = ex => ex.id,
): Focus {
  const start = Math.max(0, exercises.findIndex(e => e.id === activeExId));
  const ordered = exercises.slice(start).concat(exercises.slice(0, start));
  for (const ex of ordered) {
    if (skipped[ex.id]) continue;
    const variantId = variantIdOf(ex);
    const idx = ex.sets.findIndex((_, i) => !getLog(logs, ex.id, i, variantId).done);
    if (idx >= 0) return { exId: ex.id, idx };
  }
  return null;
}

/** Copy finished sets into last-time history, then drop this day's drafts. Other days stay. */
export function archiveAndClearDay(logs: Logs, history: History, exercises: Exercise[], today: string) {
  const nextLogs = { ...logs };
  const nextHistory: History = { ...history };
  for (const ex of exercises) {
    for (const variant of variantsFor(ex)) {
      const dates: string[] = [];
      const sets = ex.sets.map((_, i) => {
        const l = getLog(logs, ex.id, i, variant.id);
        delete nextLogs[logKey(ex.id, i, variant.id)];
        if (!l.done) return null;
        if (l.at) dates.push(l.at);
        const weight = l.weight || undefined;
        const reps = l.reps || undefined;
        return weight || reps ? { weight, reps } : null;
      });
      if (sets.some(Boolean)) nextHistory[variant.id] = { date: dates.sort().at(-1) || today, sets };
    }
  }
  return { logs: nextLogs, history: nextHistory };
}
