/** localStorage format (key 'bag_tracker_v1') is shared with every earlier version of the app.
 *  `history`, `variant`, and `SetLog.at` were added later; older builds ignore them. */
export type SetLog = { weight?: string; reps?: string; done?: boolean; at?: string };
/** One logged set inside a past session. Null means that set was not done. */
export type HistSet = { weight?: string; reps?: string };
export type LastTime = { date: string; sets: (HistSet | null)[] };
export type History = Record<string, LastTime>; // key: variant id
export type AppState = {
  day: number;
  logs: Record<string, SetLog>; // key from logKey(): this session's draft, including done sets
  scrollY: number;
  resumeKey: string | null; // the next set to do, written on save
  headerCollapsed: boolean;
  collapsed: Record<string, boolean>; // per-exercise override; missing = collapse when all sets done
  skipped: Record<string, boolean>; // exercises skipped today: count as complete for progress, never 'next'
  history: History; // last finished session for each variant; survives Reset day
  variant: Record<string, string>; // slot id → variant id last picked for that slot
};

const STORAGE_KEY = 'bag_tracker_v1';

// Day 4 stretches used to be sets 1-4 of 'd4-cardio'; they are now separate exercises.
const LOG_KEY_MIGRATIONS: Record<string, string> = {
  'd4-cardio__1': 'd4-lowback-bent__0',
  'd4-cardio__2': 'd4-lowback-straight__0',
  'd4-cardio__3': 'd4-hamstring__0',
  'd4-cardio__4': 'd4-glute__0',
};

/** DOM id and the default-variant log key. Swap variants get their own key so they don't share a draft. */
export const setKey = (exId: string, idx: number) => `${exId}__${idx}`;
export const logKey = (slotId: string, idx: number, variantId = slotId) =>
  variantId === slotId ? setKey(slotId, idx) : `${slotId}__${variantId}__${idx}`;

const text = (v: unknown) => (typeof v === 'string' && v !== 'NaN' ? v : undefined);
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function todayISO(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function loadHistory(raw: unknown): History {
  if (!raw || typeof raw !== 'object') return {};
  const out: History = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object') continue;
    const row = v as { date?: unknown; sets?: unknown };
    if (!isDate(row.date) || !Array.isArray(row.sets)) continue;
    out[k] = {
      date: row.date as string,
      sets: row.sets.map(s => {
        if (!s || typeof s !== 'object') return null;
        const weight = text((s as HistSet).weight);
        const reps = text((s as HistSet).reps);
        return weight || reps ? { weight, reps } : null;
      }),
    };
  }
  return out;
}

function loadVariant(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string' && v) out[k] = v;
  return out;
}

export function load(): AppState {
  const fallback: AppState = {
    day: 1, logs: {}, scrollY: 0, resumeKey: null, headerCollapsed: false, collapsed: {}, skipped: {}, history: {}, variant: {},
  };
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!p) return fallback;
    // Keep only the known fields of each set log (older builds stored UI flags, and the pre-React build
    // could write reps/weight as the string 'NaN').
    const logs: Record<string, SetLog> = {};
    for (const [k, v] of Object.entries<SetLog>(p.logs || {})) {
      const row: SetLog = { weight: text(v?.weight), reps: text(v?.reps) };
      if (v?.done) row.done = true;
      if (isDate(v?.at)) row.at = v.at;
      logs[k] = row;
    }
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
      history: loadHistory(p.history),
      variant: loadVariant(p.variant),
    };
  } catch {
    return fallback;
  }
}

export function save(state: AppState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full/blocked */ }
}
