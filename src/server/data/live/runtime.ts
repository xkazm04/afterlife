// The live runtime: one port, one index, one poller, one snapshot, per server process. Kept on globalThis because Next
// evaluates the instrumentation hook and the page bundles as separate module graphs (and dev reloads them).
import type { PGlite } from '@electric-sql/pglite';
import { DEMO } from '@/lib/demo';
import type { GitLabPort } from '@/server/gitlab/port';
import { getIndex, openIndex } from '@/server/index/db';
import { seedDemo } from '@/server/index/seed';
import { createMemory, pollIntervalMs, runPollCycle, startScheduler, type CycleResult, type PollMemory, type Scheduler } from '@/server/poller';
import type { DataConfig } from '../config';
import type { Clock } from './clock';
import { createLivePort } from './ports';
import { rulesOf } from '../policy';
import { buildSnapshot, type LiveSnapshot } from './snapshot';

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

const STARTING = Symbol.for('belay.liveRuntime.starting');
const READY = Symbol.for('belay.liveRuntime.ready');
const FAILED = Symbol.for('belay.liveRuntime.failed');
type Holder = { [STARTING]?: Promise<LiveRuntime>; [READY]?: LiveRuntime; [FAILED]?: StartFailure };

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
export const startInFlight = (): boolean => (globalThis as Holder)[STARTING] !== undefined;

async function create(cfg: DataConfig, onError: (e: unknown) => void): Promise<LiveRuntime> {
  const { port, clock, seeded } = await createLivePort(cfg.gitlab);
  const db = seeded ? await openIndex({ memory: true }) : await getIndex();
  if (seeded) await seedDemo(db);
  const rt: LiveRuntime = {
    cfg, port, db, clock, mem: createMemory(), snapshot: null, last: null, scheduler: null,
    refresh: () => Promise.resolve(),
  };
  let inFlight: Promise<void> | null = null;
  rt.refresh = () => {
    inFlight ??= (async () => {
      try {
        rt.last = await runPollCycle(port, db, clock.poll(), { mem: rt.mem });
      } catch (e) {
        onError(e); // a cycle that throws (not one that reports a failed project) still leaves the index readable
      }
      // The policy the cycle read; a cycle that could not read one keeps the last good one, as the class tiers do.
      const policy = rt.last?.policy ? rulesOf(rt.last.policy) : (rt.snapshot?.data.policy ?? null);
      rt.snapshot = await buildSnapshot(db, clock.read(), cfg.deepProject, DEMO, policy);
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };
  await rt.refresh();
  rt.scheduler = startScheduler(rt.refresh, pollIntervalMs(), onError);
  return rt;
}

/** Starts the runtime once; every later call gets the same one. A start that fails is cleared, so the next call starts afresh. */
export function startRuntime(cfg: DataConfig, onError: (e: unknown) => void = (e) => console.error('belay: poll failed', e)): Promise<LiveRuntime> {
  const holder = globalThis as Holder;
  holder[STARTING] ??= create(cfg, onError).then(
    (rt) => {
      delete holder[FAILED];
      return (holder[READY] = rt);
    },
    (e: unknown) => {
      delete holder[STARTING];
      holder[FAILED] = { message: e instanceof Error ? e.message : String(e), at: Date.now() };
      throw e;
    },
  );
  return holder[STARTING];
}
