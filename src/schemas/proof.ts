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
  detail: string;
  ref?: string; // job, artifact, note or commit that the check read
}

export interface ProofBlock {
  schema: 'belay.proof/1';
  id: string; // ULID
  class: ProofClass;
  task: { flow: string; run_id: string; project_id: number; mr_iid?: number; trailer: string }; // "Belay-Task: <id>"
  claims: Claim[];
  checks: Check[];
  evidence: { kind: 'job' | 'artifact' | 'note' | 'commit'; ref: string }[];
  verdict: Verdict;
  envelope: { files: number; lines: number; paths_touched: string[]; within: boolean };
  engine: { version: string; sha256: string }; // pins the checker that produced the verdict
}

/** A verdict is derived from checks only: any false fails, any unknown is inconclusive. */
export function verdictOf(checks: readonly Check[], envelopeWithin: boolean): Verdict {
  if (!envelopeWithin) return 'fail';
  if (checks.length === 0) return 'inconclusive';
  if (checks.some((c) => c.ok === false)) return 'fail';
  if (checks.some((c) => c.ok === null)) return 'inconclusive';
  return 'pass';
}
