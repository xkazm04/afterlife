// A snapshot is everything the live source serves, read from the index in one go after each poll cycle. Pages read it
// synchronously. What the index cannot yet serve (tracks, the loop, setup phases, the cockpit text) is the demo's
// catalogue, unchanged: see data/README.md for the list.
import type { DemoData, NeedsYouItem, Task } from '@/lib/demo/types';
import type { LedgerEvent } from '@/schemas/ledger';
import { clock, getActionClasses, getEvents, getFleet, getMaturity, getNeedsYou, getTasks } from '@/server/index/views';
import { getProjectRow } from '@/server/index/repositories/fleet/project';
import { readLedger } from '@/server/index/repositories/ledger/ledger';
import { getPairing, type PairingRow } from '@/server/index/repositories/pairing';
import { listPollStates } from '@/server/index/repositories/pollState';
import type { Queryable } from '@/server/index/repositories/sql';
import type { PolicyRules, TiersStale } from '../types';
import { isSeeded } from './seeded';
import { actionClass, maturity, task } from './narrow';

export interface LiveData {
  fleet: DemoData['fleet'];
  portfolio: DemoData['portfolio'];
  actionClasses: DemoData['actionClasses'];
  maturity: DemoData['maturity'];
  tasks: Task[];
  /** The deep project's recent events, from its tasks, proofs and poll state (never the catalogue's). */
  events: DemoData['events'];
  needsYou: NeedsYouItem[];
  cockpit: DemoData['cockpit'];
  setup: DemoData['setup'];
  /** trust-policy.yml's rules as the last poll read them from belay-policy; null until one was read. */
  policy: PolicyRules | null;
  /** Set while the last poll could not read belay-policy (its poll_state source failed): the class tiers are stale. */
  tiersStale: TiersStale | null;
  /** The pairing row the last poll wrote (group, host, checkout), for Setup's reads; null before any poll paired one. */
  pairing: PairingRow | null;
  /** The deep project's ledger events as the index holds them (verified on import), in seq order; [] without one. */
  ledger: readonly LedgerEvent[];
}

export interface LiveSnapshot {
  at: Date;
  deep: string;
  data: LiveData;
}

export async function buildSnapshot(db: Queryable, at: Date, deep: string, catalogue: DemoData, policy: PolicyRules | null = null): Promise<LiveSnapshot> {
  const [fleet, classes, mat, tasks, events, needsYou, pairing, policyReads, ledger] = await Promise.all([
    getFleet(db, at), getActionClasses(db, deep, at), getMaturity(db, deep), getTasks(db, deep, at), getEvents(db, deep), getNeedsYou(db, deep, at),
    getPairing(db, 'default'), listPollStates(db, 'policy:'), deepLedger(db, deep),
  ]);
  const failedRead = policyReads.find((s) => s.lastError !== null);
  const tiersStale = failedRead ? { reason: failedRead.lastError ?? '', lastOk: failedRead.lastOk?.toISOString() ?? null } : null;
  const group = pairing?.groupPath ?? 'not paired';
  // Live counts only what /needs-you shows: the index keeps the demo's seeded items, the data source does not count them.
  const unseeded = needsYou.filter((n) => !isSeeded(n.id)).length;
  const shown = { ...fleet, projects: fleet.projects.map((p) => (p.id === deep ? { ...p, needsYou: unseeded } : p)) };
  const feed = fleet.projects.find((p) => p.id === deep)?.feed;
  return {
    at, deep,
    data: {
      fleet: shown,
      portfolio: { group, projectsWatched: shown.projects.filter((p) => p.state === 'watching').length, asOf: clock(at), projects: [] },
      actionClasses: classes.map(actionClass),
      maturity: maturity(mat),
      tasks: tasks.flatMap((t) => task(t) ?? []),
      events,
      needsYou,
      cockpit: { ...catalogue.cockpit, feed: { ...catalogue.cockpit.feed, lastPollSec: feed?.ageSec ?? 0 } },
      setup: { ...catalogue.setup, group, project: deep },
      policy,
      tiersStale,
      pairing,
      ledger,
    },
  };
}

/** The deep project's ledger, which the index keys by its GitLab id: a project with none (not linked) has no ledger. */
async function deepLedger(db: Queryable, deep: string): Promise<LedgerEvent[]> {
  const gitlabId = (await getProjectRow(db, deep))?.gitlabId ?? null;
  return gitlabId === null ? [] : readLedger(db, gitlabId);
}
