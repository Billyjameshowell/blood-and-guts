import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { DAYS, type Exercise } from './program';
import { load, logKey, save, setKey, todayISO, type AppState, type SetLog } from './store';
import { archiveAndClearDay, chosenVariant, findFocus, getLog, isDone, isTimed, presentExercise, suggestions } from './training';
import { useReloadOnNewBuild, useRestTimer, useWakeLock, vibrate } from './device';
import { ExerciseCard, type Edit } from './components/ExerciseCard';
import type { Field } from './components/SetRow';
import { DayNav, ExerciseDetails, NextButton, RestTimer } from './components/Chrome';

const dayById = (id: number) => DAYS.find(d => d.id === id) ?? DAYS[0];

/** Skipped exercises count as completed. Progress follows whichever variant is selected for the slot. */
function dayProgress(logs: Record<string, SetLog>, skipped: Record<string, boolean>, picked: Record<string, string>, id: number) {
  const sets = dayById(id).exercises.flatMap(ex => {
    const variantId = chosenVariant(ex, picked).id;
    return ex.sets.map((_, i) => skipped[ex.id] || !!getLog(logs, ex.id, i, variantId).done);
  });
  const done = sets.filter(Boolean).length;
  return { done, total: sets.length, pct: sets.length ? done / sets.length : 0 };
}

/**
 * State ownership:
 * - `state.logs[set]` holds each set's values for the variant being logged. For an unlogged set that is the
 *   draft being typed (saved as typed, so it survives reloads); Done marks it logged. Each field change patches only that field.
 * - `state.history[variant]` is the previous session for that movement. Reset day files the current logs there and clears them.
 * - `state.variant[slot]` is the swap he picked for that slot, so the next session opens on it.
 * - `edit` is the draft for a done set being edited; the logged values are untouched until Save.
 * - Suggestions prefer last-time numbers for the selected variant, and are only ever placeholders / stepper start values.
 */
export default function App() {
  const [state, setState] = useState<AppState>(load);
  const [edit, setEdit] = useState<Edit | null>(null);
  const day = dayById(state.day);
  // The exercise Billy is actually working on (last one he touched), so "next" follows him, not program order.
  const [activeExId, setActiveExId] = useState(() => state.resumeKey?.split('__')[0] ?? null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const timer = useRestTimer();
  const wake = useWakeLock();
  useReloadOnNewBuild();

  const variantOf = (ex: Exercise) => chosenVariant(ex, state.variant);
  const focus = useMemo(
    () => findFocus(state.logs, day.exercises, activeExId, state.skipped, ex => chosenVariant(ex, state.variant).id),
    [state.logs, day, activeExId, state.skipped, state.variant],
  );
  const focusKey = focus ? setKey(focus.exId, focus.idx) : null;
  const focusEx = focus && day.exercises.find(e => e.id === focus.exId);
  const focusVariant = focusEx && variantOf(focusEx);
  const progress = dayProgress(state.logs, state.skipped, state.variant, day.id);
  const isCollapsed = (ex: Exercise) => state.collapsed[ex.id] ?? (isDone(state.logs, ex, variantOf(ex).id) || !!state.skipped[ex.id]);
  const detailsEx = detailsId ? DAYS.flatMap(d => d.exercises).find(e => e.id === detailsId) ?? null : null;
  const detailsVariant = detailsEx ? variantOf(detailsEx) : null;

  useEffect(() => save({ ...state, resumeKey: focusKey }), [state, focusKey]);

  // Restore the saved scroll position once, on page load; afterwards only Billy (and the Next button) scrolls.
  useLayoutEffect(() => {
    history.scrollRestoration = 'manual';
    window.scrollTo(0, state.scrollY);
    let t = 0;
    const onScroll = () => { clearTimeout(t); t = window.setTimeout(() => setState(s => ({ ...s, scrollY: Math.round(scrollY) })), 300); };
    addEventListener('scroll', onScroll, { passive: true });
    return () => { clearTimeout(t); removeEventListener('scroll', onScroll); };
  }, []);

  const patchLog = (ex: Exercise, idx: number, patch: SetLog, autoCollapse = false) =>
    setState(s => {
      const variantId = chosenVariant(ex, s.variant).id;
      const key = logKey(ex.id, idx, variantId);
      const collapsed = { ...s.collapsed };
      if (autoCollapse) delete collapsed[ex.id];
      return { ...s, collapsed, logs: { ...s.logs, [key]: { ...s.logs[key], ...patch } } };
    });

  const isEditing = (ex: Exercise, idx: number) => edit?.exId === ex.id && edit.idx === idx;

  const change = (ex: Exercise, idx: number, field: Field, v: string) => {
    if (isEditing(ex, idx)) return setEdit(e => e && { ...e, [field]: v });
    setActiveExId(ex.id);
    patchLog(ex, idx, { [field]: v });
  };

  // Done (or Save while editing): an empty field takes the suggestion shown as its placeholder.
  const done = (ex: Exercise, idx: number) => {
    const variant = variantOf(ex);
    const set = ex.sets[idx];
    const log = getLog(state.logs, ex.id, idx, variant.id);
    const draft = isEditing(ex, idx) && edit ? edit : { weight: log.weight ?? '', reps: log.reps ?? '' };
    const hint = suggestions(state.logs, ex, idx, variant, state.history[variant.id]?.sets[idx]);
    const values = isTimed(set)
      ? { weight: '', reps: draft.reps || hint.reps || set.reps }
      : { weight: draft.weight || hint.weight, reps: draft.reps || hint.reps };
    (document.activeElement as HTMLElement | null)?.blur();
    setEdit(null);
    if (log.done) return patchLog(ex, idx, values);
    vibrate([40, 30, 40]);
    setActiveExId(ex.id);
    patchLog(ex, idx, { ...values, done: true, at: todayISO() }, true);
    timer.start(60);
  };

  const startEdit = (ex: Exercise, idx: number) => {
    const log = getLog(state.logs, ex.id, idx, variantOf(ex).id);
    setEdit({ exId: ex.id, idx, weight: log.weight ?? '', reps: log.reps ?? '' });
  };

  const undo = (ex: Exercise, idx: number) => {
    vibrate(20);
    setActiveExId(ex.id);
    patchLog(ex, idx, { done: false }, true);
  };

  const pickVariant = (ex: Exercise, id: string) => {
    setActiveExId(ex.id);
    setEdit(e => e?.exId === ex.id ? null : e);
    setState(s => ({ ...s, variant: { ...s.variant, [ex.id]: id } }));
  };

  const toggle = (ex: Exercise) => {
    if (edit?.exId === ex.id) setEdit(null);
    setState(s => ({ ...s, collapsed: { ...s.collapsed, [ex.id]: !isCollapsed(ex) } }));
  };

  // Skip collapses the card; unskip reopens it. No scrolling either way.
  const setSkipped = (ex: Exercise, skip: boolean) => {
    vibrate(10);
    setState(s => {
      const skipped = { ...s.skipped }, collapsed = { ...s.collapsed };
      if (skip) skipped[ex.id] = true; else delete skipped[ex.id];
      delete collapsed[ex.id];
      return { ...s, skipped, collapsed };
    });
  };

  // The only programmatic scroll: expand the next exercise, then bring its set into view.
  const goNext = () => {
    if (!focus) return;
    vibrate(10);
    flushSync(() => {
      setActiveExId(focus.exId);
      setState(s => ({ ...s, collapsed: { ...s.collapsed, [focus.exId]: false } }));
    });
    document.getElementById(`set-${focusKey}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const selectDay = (id: number) => {
    vibrate(10);
    setEdit(null);
    setActiveExId(null);
    setDetailsId(null);
    setState(s => ({ ...s, day: id, scrollY: 0 }));
    window.scrollTo(0, 0);
  };

  const resetDay = () => {
    if (!confirm(`Reset Day ${day.id}? Sets are saved as last time.`)) return;
    setEdit(null);
    setActiveExId(null);
    timer.stop();
    setState(s => {
      const { logs, history } = archiveAndClearDay(s.logs, s.history, day.exercises, todayISO());
      const collapsed = { ...s.collapsed }, skipped = { ...s.skipped };
      day.exercises.forEach(ex => { delete collapsed[ex.id]; delete skipped[ex.id]; });
      return { ...s, logs, history, collapsed, skipped, scrollY: 0 };
    });
    window.scrollTo(0, 0);
  };

  const btn = 'h-12 rounded-xl border border-line px-4 text-sm font-bold active:scale-95';

  return (
    <div className="min-h-dvh pb-[50dvh]">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <button type="button" onClick={() => setState(s => ({ ...s, headerCollapsed: !s.headerCollapsed }))}
          aria-expanded={!state.headerCollapsed} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
          <span className="font-extrabold">Day {day.id} · {day.title}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="block h-full rounded-full bg-ok transition-[width]" style={{ width: `${progress.pct * 100}%` }} />
          </span>
          <span className="text-sm font-bold text-muted tabular-nums">{progress.done}/{progress.total}</span>
          <motion.span animate={{ rotate: state.headerCollapsed ? 0 : 180 }} className="text-muted" aria-hidden>▾</motion.span>
        </button>
        <AnimatePresence initial={false}>
          {!state.headerCollapsed && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="px-4 pb-3">
                <p className="text-sm text-muted">
                  Dorian Yates' Blood &amp; Guts. Rest at most 1 minute between sets; working sets heavy and close to failure.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={`${btn} text-[#ff8a8a]`} onClick={resetDay}>Reset day</button>
                  <button type="button" className={`${btn} border-transparent bg-accent text-black`} onClick={() => timer.start(60)}>Rest 60s</button>
                  <button type="button" className={`${btn} ${wake.active ? 'border-transparent bg-ok text-black' : 'text-muted'}`} onClick={wake.toggle}>
                    {wake.active ? 'Screen stays on' : 'Keep screen on'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex flex-col gap-3 p-3">
        {day.exercises.map(ex => {
          const variant = variantOf(ex);
          return (
            <ExerciseCard key={ex.id} ex={ex} variant={variant} logs={state.logs} last={state.history[variant.id]}
              edit={edit} focus={focus} collapsed={isCollapsed(ex)} skipped={!!state.skipped[ex.id]}
              onVariant={id => pickVariant(ex, id)}
              onToggle={() => toggle(ex)}
              onSkip={skip => setSkipped(ex, skip)}
              onShowDetails={() => setDetailsId(ex.id)}
              onChange={(i, f, v) => change(ex, i, f, v)}
              onDone={i => done(ex, i)}
              onEdit={i => startEdit(ex, i)}
              onCancelEdit={() => setEdit(null)}
              onUndo={i => undo(ex, i)} />
          );
        })}
        <footer className="mt-2 text-xs leading-relaxed text-muted">
          Program: <a className="text-accent-2" href="https://zajachealthandfitnessblog.wordpress.com/2013/04/14/7/" target="_blank" rel="noopener">Zajac Health &amp; Fitness</a>.
          Exercise GIFs: <a className="text-accent-2" href="https://oss.exercisedb.dev/docs" target="_blank" rel="noopener">ExerciseDB / AscendAPI</a> (non-commercial).
        </footer>
      </main>

      <NextButton
        targetId={focus && focusEx ? (isCollapsed(focusEx) ? `card-${focus.exId}` : `set-${focusKey}`) : null}
        label={focus && focusVariant ? `${focusVariant.name}${focusEx && focusEx.sets.length > 1 ? ` · ${focus.idx + 1}` : ''}` : ''}
        raised={timer.rest !== null}
        onGo={goNext} />
      <RestTimer rest={timer.rest} onAdd={() => timer.add(15)} onEnd={timer.stop} />
      <DayNav day={day.id} pctFor={id => dayProgress(state.logs, state.skipped, state.variant, id).pct} onSelect={selectDay} />
      <ExerciseDetails ex={detailsEx && detailsVariant ? presentExercise(detailsEx, detailsVariant) : null}
        variantId={detailsVariant?.id ?? ''} logs={state.logs} onClose={() => setDetailsId(null)} />
    </div>
  );
}
