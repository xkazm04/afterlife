// A class's record counters, counted from its tier-state.yml record's `since`, for its one holder. A counter comes only
// from a fact a task row or a ledger event states; one nothing states stays null (never zero, never a value that would
// make a class eligible). Where each counter comes from is listed in ../README.md. ./tiers.ts stores them on the class's
// class_tier row (each counter nullable on its own since migration 0006), and ./promotion.ts reads them.
import type { RecordCounters } from '@/lib/demo/types';
import type { LedgerEvent } from '@/schemas/ledger';
import type { TaskRow } from '@/server/index/repositories/work/task';

/** A record's counters, each on its own: null is one nothing states. The shape of Ladder's Counters. */
export type ClassCounters = RecordCounters;

const DAY_MS = 86_400_000;

export type CountedTask = Pick<TaskRow, 'agent' | 'actionClass' | 'state' | 'stateLabel' | 'startedAt' | 'finishedAt' | 'mrIid'>;
export type CountedEvent = Pick<LedgerEvent, 'agent' | 'action_class' | 'kind' | 'at' | 'subject' | 'verdict'>;

/** What the poller holds for one project: its indexed tasks and its imported ledger. */
export interface CounterSource {
  tasks: readonly CountedTask[];
  events: readonly CountedEvent[];
  /**
   * trust-policy.yml demotes on a revert (demotion.one_step_on or quarantine_on): the tripwire then rewrites the record,
   * so `since` post-dates any revert it saw. Only then are "no revert since" and the clean days a fact.
   */
  revertDemotes: boolean;
  /** This poll read the project's belay-ledger (imported, or unchanged since the last import): its events are complete. */
  ledgerRead: boolean;
}

export interface Holder {
  agent: string;
  classId: string;
  /** The record's since; null: nothing can be counted. */
  since: Date | null;
  /** Count over the holder's last this many outputs (trust-policy.yml window_last, for an assisted class); else since `since`. */
  window?: number | null;
}

const NONE: ClassCounters = { accepted: null, needed: null, noEdit: null, cleanDays: null, reverts: null, guardrailBlocks: null, window: null };

type Outcome = 'merged' | 'reverted' | 'closed' | 'blocked';
const RANK: Record<Outcome, number> = { closed: 0, blocked: 1, merged: 2, reverted: 3 };

/**
 * The holder's outputs since `from`: its merge requests in the class with a stated outcome, each at the latest time stated
 * for it. Merged and reverted from a task row's finishedAt, merged from a ledger event; closed and blocked (never merged)
 * from a task row's startedAt. A merge request still in flight is not an output yet.
 */
function outputsOf(src: CounterSource, h: Holder, from: number): Map<number, { outcome: Outcome; at: number }> {
  const out = new Map<number, { outcome: Outcome; at: number }>();
  const add = (iid: number | null, outcome: Outcome, at: number | undefined) => {
    if (iid === null || at === undefined || Number.isNaN(at) || at < from) return;
    const was = out.get(iid);
    out.set(iid, { outcome: was && RANK[was.outcome] > RANK[outcome] ? was.outcome : outcome, at: Math.max(at, was?.at ?? at) });
  };
  for (const t of src.tasks) {
    if (t.agent !== h.agent || t.actionClass !== h.classId || !t.state) continue;
    if (t.state === 'merged' || t.state === 'reverted') add(t.mrIid, t.state, t.finishedAt?.getTime());
    else if (t.state === 'closed' || t.state === 'blocked') add(t.mrIid, t.state, t.startedAt?.getTime());
  }
  for (const e of src.events) {
    if (e.kind === 'merged' && e.agent === h.agent && e.action_class === h.classId && e.subject.type === 'mr') add(e.subject.iid, 'merged', Date.parse(e.at));
  }
  return out;
}

/**
 * Guardrail blocks among the counted outputs (and any merge request with a verdict that is not an output yet). A block is
 * stated by the ledger's guardrail_verdict event (`verdict: 'block'`, which gitlab/components/scripts/decide/apply-gate.mjs
 * writes from the guardrail's own verdict), or by a task row: state blocked with the label "blocked", which derive/task.ts
 * stateOf sets only from the guardrail::block label. A merge request blocked on any head counts, even if it passed later.
 * The gate emits a verdict event with every guardrail verdict, so when this poll read the ledger and every event in the
 * counts states pass, there was no block: 0. An event written before the ledger stated the verdict, which no task row
 * resolves, leaves the count unknown (null), unless a stated block already makes it at least one.
 */
function guardrailBlocks(src: CounterSource, h: Holder, from: number, outputs: ReadonlySet<number>, inScope: (iid: number) => boolean): number | null {
  const mine = (t: CountedTask) => t.agent === h.agent && t.actionClass === h.classId && t.mrIid !== null;
  const blocked = new Set(src.tasks.filter((t) => mine(t) && t.state === 'blocked' && t.stateLabel === 'blocked').map((t) => t.mrIid as number));
  const verdicts = new Set<number>();
  const unstated = new Set<number>();
  for (const e of src.events) {
    if (e.kind !== 'guardrail_verdict' || e.agent !== h.agent || e.action_class !== h.classId || e.subject.type !== 'mr') continue;
    if (Date.parse(e.at) < from) continue;
    verdicts.add(e.subject.iid);
    if (e.verdict === 'block') blocked.add(e.subject.iid);
    else if (e.verdict !== 'pass') unstated.add(e.subject.iid);
  }
  const stated = [...blocked].filter((iid) => (outputs.has(iid) || verdicts.has(iid)) && inScope(iid)).length;
  if (stated > 0) return stated;
  if (!src.ledgerRead) return null;
  return [...unstated].some((iid) => inScope(iid)) ? null : 0;
}

export function countRecord(src: CounterSource, h: Holder, now: Date): ClassCounters {
  if (!h.since) return NONE;
  const from = h.since.getTime();
  const all = outputsOf(src, h, from);
  const window = h.window ?? null;
  const counted = window === null ? [...all] : [...all].sort(([ia, a], [ib, b]) => b.at - a.at || ib - ia).slice(0, window);
  const inWindow = new Set(counted.map(([iid]) => iid));
  const n = (o: Outcome) => counted.filter(([, x]) => x.outcome === o).length;
  const reverts = src.revertDemotes ? n('reverted') : null;
  return {
    accepted: n('merged'), // a reverted merge request is not an accepted output
    needed: null, // not in trust-policy.yml: the screens show the policy's own threshold
    noEdit: null, // no row or event says whether a person edited a merge request before it merged
    reverts,
    cleanDays: reverts === 0 ? Math.max(0, Math.floor((now.getTime() - from) / DAY_MS)) : null,
    // in the window, an output outside it does not count; a merge request that is no output yet might be the next one
    guardrailBlocks: guardrailBlocks(src, h, from, new Set(all.keys()), (iid) => window === null || inWindow.has(iid) || !all.has(iid)),
    window,
  };
}

/** The policy's demotion triggers name a revert. */
export const demotesOnRevert = (demotion: { one_step_on?: unknown; quarantine_on?: unknown } | undefined): boolean =>
  [demotion?.one_step_on, demotion?.quarantine_on].some((l) => Array.isArray(l) && l.includes('revert'));
