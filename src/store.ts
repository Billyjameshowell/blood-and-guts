/** localStorage format (key 'bag_tracker_v1') is shared with every earlier version of the app. */
export type SetLog = { weight?: string; reps?: string; done?: boolean };
export type AppState = {
  day: number;
  logs: Record<string, SetLog>; // key: `${exerciseId}__${setIndex}`
  scrollY: number;
  resumeKey: string | null; // the next set to do, written on save
  headerCollapsed: boolean;
  collapsed: Record<string, boolean>; // per-exercise override; missing = collapse when all sets done
  skipped: Record<string, boolean>; // exercises skipped today: count as complete for progress, never 'next'
};

const STORAGE_KEY = 'bag_tracker_v1';

// Day 4 stretches used to be sets 1-4 of 'd4-cardio'; they are now separate exercises.
const LOG_KEY_MIGRATIONS: Record<string, string> = {
  'd4-cardio__1': 'd4-lowback-bent__0',
  'd4-cardio__2': 'd4-lowback-straight__0',
  'd4-cardio__3': 'd4-hamstring__0',
  'd4-cardio__4': 'd4-glute__0',
};

export const setKey = (exId: string, idx: number) => `${exId}__${idx}`;

export function load(): AppState {
  const fallback: AppState = { day: 1, logs: {}, scrollY: 0, resumeKey: null, headerCollapsed: false, collapsed: {}, skipped: {} };
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!p) return fallback;
    // Keep only the known fields of each set log (older builds stored UI flags, and the pre-React build
    // could write reps/weight as the string 'NaN').
    const value = (v: unknown) => (typeof v === 'string' && v !== 'NaN' ? v : undefined);
    const logs: Record<string, SetLog> = {};
    for (const [k, v] of Object.entries<SetLog>(p.logs || {})) logs[k] = { weight: value(v.weight), reps: value(v.reps), done: v.done };
    for (const [from, to] of Object.entries(LOG_KEY_MIGRATIONS)) {
      if (logs[from] && !logs[to]) logs[to] = logs[from];
      delete logs[from];
    }
    return {
      day: p.day || 1,
      logs,
      scrollY: typeof p.scrollY === 'number' ? p.scrollY : 0,
      resumeKey: p.resumeKey || null,
      headerCollapsed: !!p.headerCollapsed,
      collapsed: p.collapsed && typeof p.collapsed === 'object' ? p.collapsed : {},
      skipped: p.skipped && typeof p.skipped === 'object' ? p.skipped : {},
    };
  } catch {
    return fallback;
  }
}

export function save(state: AppState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
}
