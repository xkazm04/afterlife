// A snapshot is everything the live source serves, read from the index in one go after each poll cycle. Pages read it
// synchronously. What the index cannot yet serve (tracks, the loop, setup phases, the cockpit text) is the demo's
// catalogue, unchanged: see data/README.md for the list.
import type { DemoData, NeedsYouItem, Task } from '@/lib/demo/types';
import { clock, getActionClasses, getEvents, getFleet, getMaturity, getNeedsYou, getTasks } from '@/server/index/views';
import { getPairing } from '@/server/index/repositories/pairing';
import type { Queryable } from '@/server/index/repositories/sql';
import type { PolicyRules } from '../types';
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
}

export interface LiveSnapshot {
  at: Date;
  deep: string;
  data: LiveData;
}

export async function buildSnapshot(db: Queryable, at: Date, deep: string, catalogue: DemoData, policy: PolicyRules | null = null): Promise<LiveSnapshot> {
  const [fleet, classes, mat, tasks, events, needsYou, pairing] = await Promise.all([
    getFleet(db, at), getActionClasses(db, deep, at), getMaturity(db, deep), getTasks(db, deep, at), getEvents(db, deep), getNeedsYou(db, deep, at),
    getPairing(db, 'default'),
  ]);
  const group = pairing?.groupPath ?? 'not paired';
  const feed = fleet.projects.find((p) => p.id === deep)?.feed;
  return {
    at, deep,
    data: {
      fleet,
      portfolio: { group, projectsWatched: fleet.projects.filter((p) => p.state === 'watching').length, asOf: clock(at), projects: [] },
      actionClasses: classes.map(actionClass),
      maturity: maturity(mat),
      tasks: tasks.flatMap((t) => task(t) ?? []),
      events,
      needsYou,
      cockpit: { ...catalogue.cockpit, feed: { ...catalogue.cockpit.feed, lastPollSec: feed?.ageSec ?? 0 } },
      setup: { ...catalogue.setup, group, project: deep },
      policy,
    },
  };
}
