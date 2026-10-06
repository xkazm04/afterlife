// Classes that are named in the Proof Block schema but not built yet. They never pass: a stub answers
// "inconclusive: not implemented", so a tier gate waits instead of trusting a check that does not exist.
import type { ProofClass } from '../../src/schemas/proof';
import type { Draft } from './common';

export const STUB_CLASSES: readonly ProofClass[] = ['repro', 'bench-delta', 'score-delta', 'ledger-record'];

export function stub(cls: ProofClass): Draft {
  return {
    checks: [{ claim_id: null, name: 'implemented', ok: null, detail: `inconclusive: not implemented (${cls} has no checker in this engine version)` }],
    evidence: [],
  };
}
