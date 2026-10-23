// ledger-record (T3 governor: "tier decisions recomputed from the ledger"). Reads a belay-ledger chain (events/<id>.jsonl)
// and a holder's record (agent, action class, since), verifies the hash chain from genesis, and recomputes the next rung's
// trial (src/schemas/trial.ts, the rule the poller counts with) from the chain alone. It passes only when the chain
// verifies and, when the input sets trial thresholds `{min, catches}`, the recomputed row is met.
//
// What the chain alone can and cannot recompute. It states every trial MR: a tier_decision's `would` is hash-chained, so
// which MRs the rung above would have acted on, and when (their seq range), is recomputed exactly. It does not state how
// most of them resolved: a `merged` event says an MR merged but not whether anyone else pushed to it first (the edit fact
// lives on the MR's notes, which the poller reads), and no event states a close or its closer, or a revert. So an MR
// the chain shows merged is unresolved (no edit fact), and every other is unresolved (no outcome). The row recomputed
// here is the poller's count over the same chain with no task rows; the poller resolves more from what GitLab states,
// and the two agree wherever the facts are the chain's. With thresholds, a stated catch over the bound fails; a row
// short of `min` is inconclusive (unresolved MRs may yet resolve), never a pass.
//
// Input: `chain` (the JSONL text, inline or `$file`), `record: {agent, class, since}`, optional `trial: {min, catches}`.
import { parseChainText, verifyChain, wouldOf, type LedgerEvent } from '../../../src/schemas/ledger';
import type { Check } from '../../../src/schemas/proof';
import { resolveTrial, trialCount, trialDecisions, type TrialCount, type TrialResolution } from '../../../src/schemas/trial';
import { isoInstantMs, isRecord } from '../../core/types';
import type { Draft } from '../common';
import { checksFor, type At, type Read } from './evidence';

export interface ChainTrial extends TrialCount {
  /** Each trial MR with how the chain alone resolves it, in chain order. */
  mrs: { iid: number; seq: number | null; resolution: TrialResolution }[];
}

/**
 * The chain's lines as events, each parsed as the importer parses it (src/schemas/chain/parse.ts): a line the product
 * would refuse is a reason naming that line, never an exception, and never a chain that verifies.
 */
function readChain(raw: unknown): Read<LedgerEvent[]> {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, reason: 'chain is missing' };
  const r = parseChainText(raw);
  return r.ok ? { ok: true, value: r.events } : { ok: false, reason: `chain line ${r.line}: ${r.reason}` };
}

/** The trial row of a holder, from a chain alone: the outcomes it states are its `merged` events, with no edit fact. */
export function trialFromChain(events: readonly LedgerEvent[], h: { agent: string; classId: string; from: number }): ChainTrial {
  const merged = new Set(events.filter((e) => e.kind === 'merged' && e.agent === h.agent && e.action_class === h.classId && e.subject.type === 'mr' && Date.parse(e.at) >= h.from).map((e) => e.subject.iid));
  // a `would` counts only in the shape the importer accepts (the rung above tier_at_time and a decision), as the poller reads it
  const stated = events.map((e) => ({ ...e, would: wouldOf(e.would, e.tier_at_time) ?? undefined }));
  const mrs = [...trialDecisions(stated, h).values()].map((d) => ({
    iid: d.iid, seq: d.seq, resolution: resolveTrial({ outcome: merged.has(d.iid) ? 'merged' : null, edited: null, closedBy: null }),
  }));
  return { ...trialCount(mrs.map((m) => m.resolution)), mrs };
}

/** Why a chain that does not verify states nothing: the words chain-verifies and `ledger trial` both say. */
export const chainBreaks = (seq: number): string => `the chain breaks at seq ${seq}: that event's hash or its link to the one before does not match`;

const thresholdsOf = (v: unknown): { min: number; catches: number } | null | 'bad' => {
  if (v === undefined || v === null) return null;
  if (!isRecord(v) || !Number.isInteger(v.min) || (v.min as number) < 1 || !Number.isInteger(v.catches) || (v.catches as number) < 0) return 'bad';
  return { min: v.min as number, catches: v.catches as number };
};

/** The trial-recomputed check of a recomputed row: met is ok, a catch over the bound fails, a row short of `min` is unknown. */
export function trialCheck(at: At, t: ChainTrial, limits: { min: number; catches: number } | null): Check {
  const seqs = t.mrs.map((m) => m.seq).filter((s): s is number => s !== null);
  const unresolved = t.mrs.length - t.n;
  const scope = `${t.mrs.length} trial MR(s)${seqs.length ? ` (tier_decision seq ${Math.min(...seqs)}-${Math.max(...seqs)})` : ''}, ${unresolved} unresolved: the chain states no edit fact, close or revert`;
  if (!limits) return at('trial-recomputed', true, `next-rung trial ${t.n} resolved, ${t.catches} caught; ${scope}`);
  const row = `next-rung trial ${t.n} of ${limits.min}, ${t.catches} caught; ${scope}`;
  if (t.catches > limits.catches) return at('trial-recomputed', false, `${row}; more than ${limits.catches} caught`);
  if (t.n < limits.min) return at('trial-recomputed', null, `${row}; short of ${limits.min} resolved`);
  return at('trial-recomputed', true, row);
}

export function ledgerRecord(input: Record<string, unknown>): Draft {
  const at = checksFor(input);
  const chain = readChain(input.chain);
  const broken = chain.ok ? verifyChain(chain.value) : null;
  const verifies = chain.ok && broken === null;
  const checks: Check[] = [
    !chain.ok
      ? at('chain-verifies', input.chain === undefined ? null : false, chain.reason)
      : broken !== null
        ? at('chain-verifies', false, chainBreaks(broken))
        : at('chain-verifies', true, `${chain.value.length} event(s) verify from genesis; head seq ${chain.value.at(-1)?.seq ?? 0} ${chain.value.at(-1)?.hash ?? 'none'}`),
  ];
  const r = isRecord(input.record) ? input.record : {};
  const from = isoInstantMs(r.since); // Date.parse('10') is 2001: a window that takes in the whole chain
  const limits = thresholdsOf(input.trial);
  if (!verifies) checks.push(at('trial-recomputed', null, 'a chain that does not verify states nothing'));
  else if (typeof r.agent !== 'string' || typeof r.class !== 'string' || Number.isNaN(from)) checks.push(at('trial-recomputed', null, 'record needs agent, class and since (an ISO time with its zone)'));
  else if (limits === 'bad') checks.push(at('trial-recomputed', null, 'trial must be {min: a positive integer, catches: 0 or more}'));
  else checks.push(trialCheck(at, trialFromChain(chain.value, { agent: r.agent, classId: r.class, from }), limits));
  return { checks, evidence: [] };
}
