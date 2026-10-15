// A class's record counters, counted from its tier-state.yml record's `since`, for its one holder. A counter comes only
// from a fact a task row or a ledger event states; one nothing states stays null (never zero, never a value that would
// make a class eligible). Where each counter comes from is listed in ../README.md. ./tiers.ts stores them on the class's
// class_tier row (each counter nullable on its own since migration 0006), and ./promotion.ts reads them. The outputs are
// selected once (tallyOf): countRecord totals them and ./sources.ts lists them, so a count and its list never disagree.
import type { RecordCounters } from '@/lib/demo/types';
import type { LedgerEvent } from '@/schemas/ledger';
import type { TaskDetail, TaskRow } from '@/server/index/repositories/work/task';
import { gatedSetOf, trialOf, type TrialTally } from './gate';

/** A record's counters, each on its own: null is one nothing states. The shape of Ladder's Counters. */
export type ClassCounters = RecordCounters;

const DAY_MS = 86_400_000;

export type CountedTask = Pick<TaskRow, 'agent' | 'actionClass' | 'state' | 'stateLabel' | 'startedAt' | 'finishedAt' | 'mrIid'> & {
  detail?: Pick<TaskDetail, 'edited' | 'closedBy'>;
};
/** `tier_at_time`, `would` and `seq` are read from a tier_decision only (./gate.ts); a test's event may leave them out. */
export type CountedEvent = Pick<LedgerEvent, 'agent' | 'action_class' | 'kind' | 'at' | 'subject' | 'verdict'> & Partial<Pick<LedgerEvent, 'tier_at_time' | 'would' | 'seq'>>;

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
  /** The project's GitLab web URL, which the sources link an MR under (./sources.ts). Absent or null: not known. */
  web?: string | null;
}

export interface Holder {
  agent: string;
  classId: string;
  /** The record's since; null: nothing can be counted. */
  since: Date | null;
  /** Count over the holder's last this many outputs (trust-policy.yml window_last, for an assisted class); else since `since`. */
  window?: number | null;
}

export const NONE: ClassCounters = { accepted: null, needed: null, noEdit: null, cleanDays: null, reverts: null, guardrailBlocks: null, window: null, gated: null, trial: null };

export type Outcome = 'merged' | 'reverted' | 'closed' | 'blocked';
const RANK: Record<Outcome, number> = { closed: 0, blocked: 1, merged: 2, reverted: 3 };
/** One output: its stated outcome, at the latest time stated for it (ms). */
export interface Output { outcome: Outcome; at: number }

/**
 * The holder's outputs since `from`: its merge requests in the class with a stated outcome, each at the latest time stated
 * for it. Merged and reverted from a task row's finishedAt, merged from a ledger event; closed and blocked (never merged)
 * from a task row's startedAt. A merge request still in flight is not an output yet. A task row and a ledger event for
 * the same MR are one output.
 */
function outputsOf(src: CounterSource, h: Holder, from: number): Map<number, Output> {
  const out = new Map<number, Output>();
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

/** The guardrail blocks: the MRs counted as one, the verdicts in scope that state neither, and the count (null: unknown). */
export interface Blocks { iids: number[]; unstated: number[]; count: number | null }

/**
 * Guardrail blocks among the counted outputs (and any merge request with a verdict that is not an output yet). A block is
 * stated by the ledger's guardrail_verdict event (`verdict: 'block'`, which gitlab/components/scripts/decide/apply-gate.mjs
 * writes from the guardrail's own verdict), or by a task row: state blocked with the label "blocked", which derive/task.ts
 * stateOf sets only from the guardrail::block label. A merge request blocked on any head counts, even if it passed later.
 * The gate emits a verdict event with every guardrail verdict, so when this poll read the ledger and every event in the
 * counts states pass, there was no block: 0. An event written before the ledger stated the verdict, which no task row
 * resolves, leaves the count unknown (null), unless a stated block already makes it at least one.
 */
function blocksOf(src: CounterSource, h: Holder, from: number, outputs: ReadonlyMap<number, Output>, inScope: (iid: number) => boolean): Blocks {
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
  const iids = [...blocked].filter((iid) => (outputs.has(iid) || verdicts.has(iid)) && inScope(iid));
  const unknown = [...unstated].filter(inScope);
  const count = iids.length > 0 ? iids.length : !src.ledgerRead || unknown.length > 0 ? null : 0;
  return { iids, unstated: unknown, count };
}

/**
 * Whether anyone but the holder pushed to each of its MRs before it merged, as a task row states it (`detail.edited`,
 * derive/task.ts, from the MR's push notes). An MR with no such row (a merge known only from the ledger, or a row indexed
 * before it was read) is not in the map.
 */
function editsOf(src: CounterSource, h: Holder): Map<number, boolean> {
  const facts = new Map<number, boolean>();
  for (const t of src.tasks) {
    const edited = t.detail?.edited;
    if (t.agent === h.agent && t.actionClass === h.classId && t.mrIid !== null && typeof edited === 'boolean') facts.set(t.mrIid, edited || facts.get(t.mrIid) === true);
  }
  return facts;
}

/**
 * Merged without edits: the counted merged outputs no commit reached from anyone but the holder before they merged, over
 * the counted merged outputs. Null when any counted merged output has no edit fact, and when there is no merged output:
 * never a ratio from facts nobody stated.
 */
function noEditOf(merged: readonly number[], edits: ReadonlyMap<number, boolean>): number | null {
  if (merged.length === 0 || merged.some((iid) => !edits.has(iid))) return null;
  return merged.filter((iid) => edits.get(iid) === false).length / merged.length;
}

/** What a record's counts read, selected once. countRecord totals it; ./sources.ts lists it. */
export interface Tally {
  from: number;
  window: number | null;
  /** Every output since `from`, newest first (a tie: the higher iid first). */
  ordered: readonly (readonly [number, Output])[];
  /** The counted ones: the window's last outputs, or all of them. */
  counted: readonly (readonly [number, Output])[];
  inWindow: ReadonlySet<number>;
  /** The counted merged outputs (a reverted merge request is not an accepted output). */
  merged: readonly number[];
  edits: ReadonlyMap<number, boolean>;
  blocks: Blocks;
  /** The MRs belay-apply's gate decided (./gate.ts); null when this poll did not read the ledger. */
  gated: ReadonlySet<number> | null;
  /** The next rung's trial, over every output since `from` (not the window); null when this poll did not read the ledger. */
  trial: TrialTally | null;
}

/** The holder's outputs and the facts about them; null when the record has no since (nothing can be counted). */
export function tallyOf(src: CounterSource, h: Holder): Tally | null {
  if (!h.since) return null;
  const from = h.since.getTime();
  const all = outputsOf(src, h, from);
  const window = h.window ?? null;
  const ordered = [...all].sort(([ia, a], [ib, b]) => b.at - a.at || ib - ia);
  const counted = window === null ? ordered : ordered.slice(0, window);
  const inWindow = new Set(counted.map(([iid]) => iid));
  const merged = counted.filter(([, x]) => x.outcome === 'merged').map(([iid]) => iid);
  // in the window, an output outside it does not count; a merge request that is no output yet might be the next one
  const blocks = blocksOf(src, h, from, all, (iid) => window === null || inWindow.has(iid) || !all.has(iid));
  const edits = editsOf(src, h);
  return { from, window, ordered, counted, inWindow, merged, edits, blocks, gated: gatedSetOf(src, h), trial: trialOf(src, h, from, all, edits) };
}

/** The counters of a tally. */
export function totalsOf(t: Tally, src: CounterSource, now: Date): ClassCounters {
  const n = (o: Outcome) => t.counted.filter(([, x]) => x.outcome === o).length;
  const reverts = src.revertDemotes ? n('reverted') : null;
  const gated = t.gated;
  return {
    accepted: n('merged'),
    needed: null, // not in trust-policy.yml: the screens show the policy's own threshold
    noEdit: noEditOf(t.merged, t.edits),
    reverts,
    cleanDays: reverts === 0 ? Math.max(0, Math.floor((now.getTime() - t.from) / DAY_MS)) : null,
    guardrailBlocks: t.blocks.count,
    window: t.window,
    gated: gated === null ? null : t.merged.filter((iid) => gated.has(iid)).length, // the merged outputs the gate decided
    trial: t.trial ? t.trial.count : null, // the next rung's trial: resolved trial MRs and the catches among them
  };
}

export function countRecord(src: CounterSource, h: Holder, now: Date): ClassCounters {
  const t = tallyOf(src, h);
  return t ? totalsOf(t, src, now) : NONE;
}

/** The policy's demotion triggers name a revert. */
export const demotesOnRevert = (demotion: { one_step_on?: unknown; quarantine_on?: unknown } | undefined): boolean =>
  [demotion?.one_step_on, demotion?.quarantine_on].some((l) => Array.isArray(l) && l.includes('revert'));
