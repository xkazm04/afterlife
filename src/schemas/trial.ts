// The next rung, run as a pre-registered trial. belay-apply's gate stamps on each tier_decision what it would have decided
// one rung up (`would`, ./ledger.ts). Where that shadow decision acts alone (merge at hands_off; approve at supervised),
// the merge request is a trial of the next rung, and what people then did with it resolves the trial: merged with no
// edit is an agreement; edited before it merged, closed by a person, or reverted is a catch (the next rung would have
// let it through). Anything not stated stays unresolved and is left out, never guessed. One rule for both sides: the
// poller (src/server/poller/derive/gate.ts) and the engine's ledger-record checker read it here. Pure, client-safe.
import type { LedgerEvent, LedgerWould } from './ledger';

/** The shadow decision acts alone at its tier: hands_off merges, supervised approves. Anything else proves nothing. */
export const actsAlone = (w: LedgerWould | undefined): boolean =>
  !!w && ((w.tier === 'hands_off' && w.decision === 'merge') || (w.tier === 'supervised' && w.decision === 'approve'));

/** The ledger facts a trial reads: a tier_decision with its `would`, and its seq when the chain states one. */
export type TrialEvent = Pick<LedgerEvent, 'agent' | 'action_class' | 'kind' | 'at' | 'subject'> & Partial<Pick<LedgerEvent, 'would' | 'seq'>>;

/** One trial merge request: the first tier_decision whose `would` acts alone for it (its time, its seq when stated). */
export interface TrialDecision { iid: number; at: number; seq: number | null; tier: LedgerWould['tier'] }

/**
 * The trial merge requests of a holder's class since `from` (ms): each MR with a tier_decision of that agent and class, at
 * or after `from`, whose `would` acts alone. Any such decision makes the MR a trial: at that rung the gate would have
 * acted on that head. The first one (chain order) is kept.
 */
export function trialDecisions(events: readonly TrialEvent[], h: { agent: string; classId: string; from: number }): Map<number, TrialDecision> {
  const out = new Map<number, TrialDecision>();
  for (const e of events) {
    if (e.kind !== 'tier_decision' || e.agent !== h.agent || e.action_class !== h.classId || e.subject.type !== 'mr') continue;
    const at = Date.parse(e.at);
    if (Number.isNaN(at) || at < h.from || !actsAlone(e.would) || out.has(e.subject.iid)) continue;
    out.set(e.subject.iid, { iid: e.subject.iid, at, seq: e.seq ?? null, tier: e.would!.tier });
  }
  return out;
}

/**
 * What is stated about a trial merge request. `outcome`: merged, reverted, closed, blocked (still open), or null (no
 * outcome stated: still open, or not read). `edited`: anyone but the agent pushed to it before it merged (null: not
 * stated). `closedBy`: who closed it, an agent account or another (a person); null: not stated.
 */
export interface TrialFacts {
  outcome: 'merged' | 'reverted' | 'closed' | 'blocked' | null;
  edited: boolean | null;
  closedBy: 'agent' | 'person' | null;
}

/**
 * How a trial resolved. `agreed`: merged with no edit. Catches: `edited` (merged with edits), `closed` (closed by a
 * person), `reverted`. Unresolved, left out: `open` (no outcome stated), `no_edit_fact` (merged, no edit fact stated),
 * `closed_by_agent` (an agent account closed it: no person turned it down), `closer_unknown` (closed, by whom not stated).
 */
export type TrialResolution = 'agreed' | 'edited' | 'closed' | 'reverted' | 'open' | 'no_edit_fact' | 'closed_by_agent' | 'closer_unknown';

export const TRIAL_CATCHES: readonly TrialResolution[] = ['edited', 'closed', 'reverted'];
export const isCatch = (r: TrialResolution): boolean => TRIAL_CATCHES.includes(r);
export const isResolved = (r: TrialResolution): boolean => r === 'agreed' || isCatch(r);

export function resolveTrial(f: TrialFacts): TrialResolution {
  switch (f.outcome) {
    case 'merged': return f.edited === null ? 'no_edit_fact' : f.edited ? 'edited' : 'agreed';
    case 'reverted': return 'reverted';
    case 'closed': return f.closedBy === null ? 'closer_unknown' : f.closedBy === 'agent' ? 'closed_by_agent' : 'closed';
    default: return 'open';
  }
}

/** The trial's row: `n` resolved trial merge requests, `catches` of them caught. */
export interface TrialCount { n: number; catches: number }

export function trialCount(resolutions: Iterable<TrialResolution>): TrialCount {
  let n = 0;
  let catches = 0;
  for (const r of resolutions) {
    if (!isResolved(r)) continue;
    n += 1;
    if (isCatch(r)) catches += 1;
  }
  return { n, catches };
}
