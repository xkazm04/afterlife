// The live runtime: one port, one index, one poller, one snapshot, per server process. Kept on globalThis because Next
// evaluates the instrumentation hook and the page bundles as separate module graphs (and dev reloads them).
import type { PGlite } from '@electric-sql/pglite';
import { DEMO } from '@/lib/demo';
import type { GitLabPort } from '@/server/gitlab/port';
import { getIndex, openIndex } from '@/server/index/db';
import { seedDemo } from '@/server/index/seed';
import { createMemory, pollIntervalMs, runPollCycle, startScheduler, type CycleResult, type PollMemory, type Scheduler } from '@/server/poller';
import { serverEnv } from '@/server/env/env';
import { readDataConfig, type DataConfig } from '../config';
import type { Clock } from './clock';
import { createLivePort } from './ports';
import { rulesOf } from '../policy';
import { buildSnapshot, type LiveSnapshot } from './snapshot';
import { recordFleetDay } from './day';
import { cycleLine, cycleProblems } from './cycleLog';
import { scopeToGroup } from './scope';
import { messageOf } from '@/lib/format/error';

export interface LiveRuntime {
  cfg: DataConfig;
  port: GitLabPort;
  db: PGlite;
  clock: Clock;
  mem: PollMemory;
  snapshot: LiveSnapshot | null;
  last: CycleResult | null;
  scheduler: Scheduler | null;
  /** One poll cycle, then a fresh snapshot. Concurrent callers share the cycle in flight. */
  refresh(): Promise<void>;
}

const STARTING = Symbol.for('afterlife.liveRuntime.starting');
const READY = Symbol.for('afterlife.liveRuntime.ready');
const FAILED = Symbol.for('afterlife.liveRuntime.failed');
const RESTARTING = Symbol.for('afterlife.liveRuntime.restarting');
const RESTARTED = Symbol.for('afterlife.liveRuntime.restarted');
type Holder = {
  [STARTING]?: Promise<LiveRuntime>; [READY]?: LiveRuntime; [FAILED]?: StartFailure;
  [RESTARTING]?: Promise<RestartOutcome>; [RESTARTED]?: true;
};

/** A live start that threw: what it said and when. Kept until a start succeeds. */
export interface StartFailure {
  message: string;
  at: number;
}

/** The runtime once it has finished starting, synchronously: pages call this, never the promise. Null in demo mode. */
export const readyRuntime = (): LiveRuntime | null => (globalThis as Holder)[READY] ?? null;

/** The last start's failure, or null when none failed since the last success (or none has run). */
export const lastStartFailure = (): StartFailure | null => (globalThis as Holder)[FAILED] ?? null;

/** Whether a start is in flight right now: begun, neither ready nor failed. */
export const startInFlight = (): boolean => (globalThis as Holder)[STARTING] !== undefined && readyRuntime() === null;

async function create(cfg: DataConfig, onError: (e: unknown) => void, log: (line: string) => void, strict: boolean): Promise<LiveRuntime> {
  const { port, clock, seeded } = await createLivePort(cfg.gitlab);
  const db = seeded ? await openIndex({ memory: true }) : await getIndex();
  if (seeded) await seedDemo(db);
  const rt: LiveRuntime = {
    cfg, port, db, clock, mem: createMemory(), snapshot: null, last: null, scheduler: null,
    refresh: () => Promise.resolve(),
  };
  let inFlight: Promise<void> | null = null;
  let started = false;
  let said: string[] | null = null; // the last cycle's problems, as the last line named them
  let group: string | null = null; // the watched group's full path, from the pairing row its last good cycle wrote (scope.ts)
  rt.refresh = () => {
    inFlight ??= (async () => {
      try {
        rt.last = await runPollCycle(port, db, clock.poll(), { mem: rt.mem });
        const problems = cycleProblems(rt.last);
        const line = cycleLine(said, problems);
        if (line) log(line);
        said = problems;
      } catch (e) {
        // The first cycle's throw (a live config the poller refuses) fails the start, which the pages name and retry: an
        // index no cycle read must not serve as if it were real. Later, a cycle that throws still leaves the index readable.
        if (!started) throw e;
        onError(e);
      }
      // The policy the cycle read; a cycle that could not read one keeps the last good one, as the class tiers do.
      const policy = rt.last?.policy ? rulesOf(rt.last.policy) : (rt.snapshot?.data.policy ?? null);
      const snap = await buildSnapshot(db, clock.read(), cfg.deepProject, DEMO, policy);
      // The day's trend row is written after the snapshot, not after the cycle: it records what the Fleet shows, and the
      // snapshot is where that is settled (the deep project's needs leave the seed's items out only there).
      if (rt.last && !rt.last.error) group = snap.data.pairing?.groupPath ?? group;
      rt.snapshot = await recordFleetDay(db, await scopeToGroup(db, snap, group, strict), onError);
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
  try {
    await rt.refresh();
    started = true;
  } catch (e) {
    // The seeded index is this start's own and the retry opens another; the real one is a singleton and stays open.
    if (seeded) await db.close().catch(() => undefined);
    throw e;
  }
  rt.scheduler = startScheduler(rt.refresh, pollIntervalMs(), onError);
  return rt;
}

/**
 * Starts the runtime once; every later call gets the same one. A start that fails is cleared, so the next call starts afresh.
 * `log` gets one line when a cycle's warnings, project issues or group error differ from the last cycle's.
 */
export function startRuntime(
  cfg: DataConfig,
  onError: (e: unknown) => void = (e) => console.error('afterlife: poll failed', e),
  log: (line: string) => void = (line) => console.warn(line),
): Promise<LiveRuntime> {
  const holder = globalThis as Holder;
  holder[STARTING] ??= create(cfg, onError, log, holder[RESTARTED] === true).then(
    (rt) => {
      delete holder[FAILED];
      return (holder[READY] = rt);
    },
    (e: unknown) => {
      delete holder[STARTING];
      holder[FAILED] = { message: messageOf(e), at: Date.now() };
      throw e;
    },
  );
  return holder[STARTING];
}

/** What a restart left running: demo (no runtime), or a live start that finished (its first poll's project count) or failed. */
export type RestartOutcome = { mode: 'demo' } | { mode: 'live'; ok: true; projects: number } | { mode: 'live'; ok: false; reason: string };

/**
 * Starts the runtime again on the config as it reads now (/start's set-setup wrote the settings): stops the scheduler,
 * forgets the ready runtime, the failure and the start in flight, and in live mode starts afresh. Demo only drops it.
 * Concurrent calls share the restart in flight. From then on the snapshot is scoped strictly to the group (scope.ts).
 */
export function restartRuntime(env: Record<string, string | undefined> = serverEnv(), onError?: (e: unknown) => void): Promise<RestartOutcome> {
  const holder = globalThis as Holder;
  holder[RESTARTING] ??= (async (): Promise<RestartOutcome> => {
    const before = holder[READY] ?? (await holder[STARTING]?.catch(() => null)) ?? null;
    before?.scheduler?.stop();
    delete holder[READY];
    delete holder[FAILED];
    delete holder[STARTING];
    const cfg = readDataConfig(env);
    if (cfg.mode !== 'live') return { mode: 'demo' };
    holder[RESTARTED] = true;
    try {
      const rt = await startRuntime(cfg, onError);
      return { mode: 'live', ok: true, projects: rt.snapshot?.data.fleet.projects.length ?? 0 };
    } catch (e) {
      return { mode: 'live', ok: false, reason: messageOf(e) };
    }
  })().finally(() => {
    delete holder[RESTARTING];
  });
  return holder[RESTARTING];
}
