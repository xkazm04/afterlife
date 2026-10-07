// A class's record counters, counted from its tier-state.yml record's `since`, for its one holder. A counter comes only
// from a fact a task row or a ledger event states; one nothing states stays null (never zero, never a value that would
// make a class eligible). Where each counter comes from is listed in ../README.md. They are not stored: class_tier holds
// a record's counters all set or all null (migration 0001's check), and no-edit has no source; ./promotion.ts reads them.
import type { ClassRecord } from '@/lib/demo/types';
import type { LedgerEvent } from '@/schemas/ledger';
import type { TaskRow } from '@/server/index/repositories/work/task';

/** A record's counters, each on its own: null is one nothing states. The shape of Ladder's Counters. */
export type ClassCounters = { [K in keyof ClassRecord]: ClassRecord[K] | null };

const DAY_MS = 86_400_000;

export type CountedTask = Pick<TaskRow, 'agent' | 'actionClass' | 'state' | 'finishedAt' | 'mrIid'>;
export type CountedEvent = Pick<LedgerEvent, 'agent' | 'action_class' | 'kind' | 'at' | 'subject'>;

/** What the poller holds for one project: its indexed tasks and its imported ledger. */
export interface CounterSource {
  tasks: readonly CountedTask[];
  events: readonly CountedEvent[];
  /**
   * trust-policy.yml demotes on a revert (demotion.one_step_on or quarantine_on): the tripwire then rewrites the record,
   * so `since` post-dates any revert it saw. Only then are "no revert since" and the clean days a fact.
   */
  revertDemotes: boolean;
}

export interface Holder {
  agent: string;
  classId: string;
  /** The record's since; null: nothing can be counted. */
  since: Date | null;
}

const NONE: ClassCounters = { accepted: null, needed: null, noEdit: null, cleanDays: null, reverts: null };

export function countRecord(src: CounterSource, h: Holder, now: Date): ClassCounters {
  if (!h.since) return NONE;
  const from = h.since.getTime();
  const mine = src.tasks.filter((t) => t.agent === h.agent && t.actionClass === h.classId && t.finishedAt !== null && t.finishedAt.getTime() >= from);
  const reverted = new Set(mine.filter((t) => t.state === 'reverted').map((t) => t.mrIid));
  const merged = new Set<number | null>();
  for (const t of mine) if (t.state === 'merged') merged.add(t.mrIid);
  for (const e of src.events) {
    if (e.kind !== 'merged' || e.agent !== h.agent || e.action_class !== h.classId || e.subject.type !== 'mr') continue;
    const at = Date.parse(e.at);
    if (!Number.isNaN(at) && at >= from) merged.add(e.subject.iid);
  }
  for (const iid of reverted) merged.delete(iid); // a reverted merge request is not an accepted output
  merged.delete(null);
  const reverts = src.revertDemotes ? reverted.size : null;
  return {
    accepted: merged.size,
    needed: null, // not in trust-policy.yml: the screens show the policy's own threshold
    noEdit: null, // no row or event says whether a person edited a merge request before it merged
    reverts,
    cleanDays: reverts === 0 ? Math.max(0, Math.floor((now.getTime() - from) / DAY_MS)) : null,
  };
}

/** The policy's demotion triggers name a revert. */
export const demotesOnRevert = (demotion: { one_step_on?: unknown; quarantine_on?: unknown } | undefined): boolean =>
  [demotion?.one_step_on, demotion?.quarantine_on].some((l) => Array.isArray(l) && l.includes('revert'));
