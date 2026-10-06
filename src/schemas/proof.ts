// The Proof Block: the spine of all eight tracks. An agent writes claims (untrusted); the
// model-free proof engine writes checks (trusted). Only checks decide the verdict.

export type ProofClass =
  | 'exploit-test' // T1 patcher: red at base, green at head, same test id, finding closed on rescan
  | 'cited-diff' // T4 guardrail: every finding quotes a hunk that exists in the diff
  | 'rerun-stats' // T5 medic: N reruns of one SHA, counts recomputed from the jobs API
  | 'repro' // T7 QA: steps replayed by a scripted browser, screenshot hash
  | 'bench-delta' // T8 gardener: tests green, benchmark inside budget, changelog claims linked
  | 'linked-evidence' // T2 CRA: every statement links to a GitLab object that resolves
  | 'score-delta' // T6 maturity: same engine version before/after, lift outside the noise band
  | 'ledger-record'; // T3 governor: tier decisions recomputed from the ledger

export type Verdict = 'pass' | 'fail' | 'inconclusive';

export interface Claim {
  id: string;
  text: string;
  quote?: { file: string; text: string };
}

export interface Check {
  claim_id: string | null; // null for checks that do not answer one claim (envelope, rescan)
  name: string;
  ok: boolean | null; // null = could not be determined; never treated as pass
  /**
   * Who settles this check. 'engine' (default): the model-free engine decides it, so it counts toward the verdict.
   * 'human': a person decides it (legal wording, a re-check not yet run): it is a struck term, not a pass and not a
   * fail, and verdictOf ignores it.
   */
  decidedBy?: 'engine' | 'human';
  detail: string;
  ref?: string; // job, artifact, note or commit that the check read
}

export interface ProofBlock {
  schema: 'belay.proof/1';
  id: string; // ULID
  class: ProofClass;
  /**
   * head_sha: the MR head the engine read (optional for blocks written before B6). Belay compares it with the MR's head;
   * a proof for an older head is stale and is not shown as the MR's proof.
   */
  task: { flow: string; run_id: string; project_id: number; mr_iid?: number; head_sha?: string; trailer: string }; // "Belay-Task: <id>"
  claims: Claim[];
  checks: Check[];
  evidence: { kind: 'job' | 'artifact' | 'note' | 'commit'; ref: string }[];
  verdict: Verdict;
  envelope: { files: number; lines: number; paths_touched: string[]; within: boolean };
  engine: { version: string; sha256: string }; // pins the checker that produced the verdict
}

/**
 * A verdict is derived from the engine's checks only. A check a human decides (`decidedBy: 'human'`) is ignored.
 * Of the rest: an envelope breach or any false fails, any null is inconclusive, and none at all is inconclusive.
 */
export function verdictOf(checks: readonly Check[], envelopeWithin: boolean): Verdict {
  if (!envelopeWithin) return 'fail';
  const engine = checks.filter((c) => (c.decidedBy ?? 'engine') === 'engine');
  if (engine.length === 0) return 'inconclusive';
  if (engine.some((c) => c.ok === false)) return 'fail';
  if (engine.some((c) => c.ok === null)) return 'inconclusive';
  return 'pass';
}
