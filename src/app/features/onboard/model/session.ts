// What this tab's Onboard session did, kept across a reload: the projects a batch or a person's step moved (a simulated
// read that landed, a write the server confirmed and its MR). Kept per org in sessionStorage, like the fleet's last look
// in localStorage (fleet/model/changes/baseline.ts): reading never throws, and storage blocked, cleared or holding garbage
// is no session, so the screen starts from the data.
import { ahead, type ProjectRun } from './batch';
import { STEPS } from './funnel';

/** Where the session is kept: sessionStorage in the browser, anything in a test. Either may throw. */
export interface SessionStore {
  read(key: string): string | null;
  write(key: string, value: string): void;
}

export const SESSION_KEY_PREFIX = 'belay.onboard.session.';
export const sessionKey = (org: string): string => `${SESSION_KEY_PREFIX}${org}`;

export const browserSession: SessionStore = {
  read: (k) => sessionStorage.getItem(k),
  write: (k, v) => sessionStorage.setItem(k, v),
};

const WAITING = new Set(['merge', 'token', 'setup', null]);
const optStr = (v: unknown) => v === undefined || typeof v === 'string';

function isRun(v: unknown): v is ProjectRun {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return (STEPS as readonly unknown[]).includes(r.step) && WAITING.has(r.waiting as string | null)
    && (r.mr === null || typeof r.mr === 'string') && optStr(r.mrRepo) && optStr(r.branch)
    && (r.simulated === undefined || typeof r.simulated === 'boolean');
}

/** The runs this session changed from where the data starts them: only those are kept. */
export function changedRuns(start: Readonly<Record<string, ProjectRun>>, now: Readonly<Record<string, ProjectRun>>): Record<string, ProjectRun> {
  const out: Record<string, ProjectRun> = {};
  for (const [id, r] of Object.entries(now)) if (JSON.stringify(r) !== JSON.stringify(start[id])) out[id] = r;
  return out;
}

/** The stored text back to the kept runs; anything malformed is none, and a malformed entry is dropped. */
export function decodeSession(raw: string | null): Record<string, ProjectRun> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as { v?: unknown; runs?: unknown };
    if (o?.v !== 1 || !o.runs || typeof o.runs !== 'object') return {};
    return Object.fromEntries(Object.entries(o.runs as Record<string, unknown>).filter((e): e is [string, ProjectRun] => isRun(e[1])));
  } catch {
    return {};
  }
}

/**
 * The kept runs over where the data starts each project. A project the data now shows further along (its MR merged, its
 * probe ran) takes the data's run; a project the data no longer lists is dropped.
 */
export function mergeSession(start: Readonly<Record<string, ProjectRun>>, kept: Readonly<Record<string, ProjectRun>>): Record<string, ProjectRun> {
  const out: Record<string, ProjectRun> = { ...start };
  for (const [id, k] of Object.entries(kept)) {
    const s = start[id];
    if (s && !ahead(s.step, k.step)) out[id] = k;
  }
  return out;
}

/** The kept runs for this org, or none when the store cannot be read. */
export function loadSession(store: SessionStore, org: string): Record<string, ProjectRun> {
  try {
    return decodeSession(store.read(sessionKey(org)));
  } catch {
    return {};
  }
}

/** Keeps what changed; false when the store refuses it (the session then lasts until the page is left). */
export function saveSession(store: SessionStore, org: string, changed: Readonly<Record<string, ProjectRun>>): boolean {
  try {
    store.write(sessionKey(org), JSON.stringify({ v: 1, runs: changed }));
    return true;
  } catch {
    return false;
  }
}
