import type { Exercise, SetDef } from './program';
import { setKey, type SetLog } from './store';

export type Logs = Record<string, SetLog>;

export const isTimed = (s: SetDef) => s.mode === 'timed';
export const getLog = (logs: Logs, exId: string, i: number): SetLog => logs[setKey(exId, i)] || {};
export const isDone = (logs: Logs, ex: Exercise) => ex.sets.every((_, i) => getLog(logs, ex.id, i).done);

const num = (v: unknown) => { const n = parseFloat(String(v)); return Number.isFinite(n) && n > 0 ? n : null; };

export function parseStartWeight(hint?: string) {
  const m = hint?.match(/~\s*(\d+(?:\.\d+)?)/);
  return m ? m[1] : null;
}

export const isBarbell = (ex: Exercise) => /\(bar\)/i.test(ex.startHint || '') || /\bBB\b|Barbell|Deadlift|Skull/i.test(ex.name);
const isDumbbell = (ex: Exercise) => /per hand/i.test(ex.startHint || '') || /\bDB\b|Dumbbell/i.test(ex.name);
/** Weight step for the −/+ buttons and suggestion rounding. */
export const weightStep = (ex: Exercise, w: number) => (isDumbbell(ex) && w < 25 ? 2.5 : 5);
const roundTo = (w: number, step: number) => Math.round(w / step) * step;

/**
 * Working-set suggestion from the heaviest logged warm-up.
 * Warm-ups are submaximal, so reps + 3 (RIR) feed an Epley/Brzycki 1RM average; the load for the
 * low end of the working rep range is Epley-inverted and taken at 93% (hard top set, not a grind).
 */
export function suggestFromWarmup(logs: Logs, ex: Exercise, set: SetDef) {
  if (set.kind !== 'work' || isTimed(set)) return null;
  let best: { w: number; r: number; label: string } | null = null;
  ex.sets.forEach((s, i) => {
    if (s.kind !== 'wu' || isTimed(s)) return;
    const l = getLog(logs, ex.id, i);
    const w = num(l.weight), r = num(l.reps);
    if (w && r && (!best || w >= best.w)) best = { w, r, label: `${l.weight}×${l.reps}` };
  });
  if (!best) return null;
  const { w, r, label } = best as { w: number; r: number; label: string };
  const rEff = Math.min(36, r + 3);
  const orm = (w * (1 + rEff / 30) + (w * 36) / (37 - rEff)) / 2;
  const target = Number(set.reps.match(/\d+/)?.[0] ?? 8);
  const raw = (orm / (1 + target / 30)) * 0.93;
  const step = weightStep(ex, raw);
  return { weight: Math.max(roundTo(raw, step), roundTo(w, step)), from: label };
}

/** Lower bound of a rep target: '10-12' → 10, '15' → 15, '1×6' → 6, 'RP to fail' → null. */
export function repFloor(target: string) {
  const m = (target.includes('×') ? target.split('×')[1] : target).match(/\d+/);
  return m ? Number(m[0]) : null;
}

/**
 * Suggested values for a set, shown only as placeholders and used as the start point for the steppers
 * (never written into the inputs). Weight: last weight in this exercise for the same kind of set,
 * else the warm-up based estimate, else the program start weight.
 */
export function suggestions(logs: Logs, ex: Exercise, i: number) {
  const s = ex.sets[i];
  let prev: SetLog | null = null;
  for (let j = i - 1; j >= 0 && !prev; j--) {
    const d = ex.sets[j], l = getLog(logs, ex.id, j);
    if ((s.kind !== 'work' || (d.kind === 'work' && !isTimed(d))) && (l.weight || l.reps)) prev = l;
  }
  const fromWarmup = suggestFromWarmup(logs, ex, s);
  return {
    weight: prev?.weight || (fromWarmup ? String(fromWarmup.weight) : parseStartWeight(ex.startHint) ?? ''),
    reps: prev?.reps || '',
    fromWarmup,
  };
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

export function summary(logs: Logs, ex: Exercise) {
  const rows = ex.sets.map((s, i) => ({ s, l: getLog(logs, ex.id, i) }));
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
export function findFocus(logs: Logs, exercises: Exercise[], activeExId: string | null, skipped: Record<string, boolean>): Focus {
  const start = Math.max(0, exercises.findIndex(e => e.id === activeExId));
  const ordered = exercises.slice(start).concat(exercises.slice(0, start));
  for (const ex of ordered) {
    if (skipped[ex.id]) continue;
    const idx = ex.sets.findIndex((_, i) => !getLog(logs, ex.id, i).done);
    if (idx >= 0) return { exId: ex.id, idx };
  }
  return null;
}
