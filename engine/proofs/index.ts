// One entry point: a proof class and its input in, a Proof Block out. The block's verdict is derived by
// verdictOf from the engine's checks alone; the agent's claims ride along but never decide anything.
import type { ProofBlock, ProofClass } from '../../src/schemas/proof';
import { EngineError, rec } from '../core/types';
import { assemble, parseBase, type Env } from './common';
import { citedDiff } from './citedDiff';
import { exploitTest } from './exploitTest';
import { linkedEvidence } from './linkedEvidence';
import { rerunStats } from './rerunStats';
import { stub, STUB_CLASSES } from './stubs';

export const PROOF_CLASSES: readonly ProofClass[] = ['exploit-test', 'cited-diff', 'rerun-stats', 'linked-evidence', ...STUB_CLASSES];

export function isProofClass(v: string): v is ProofClass {
  return (PROOF_CLASSES as readonly string[]).includes(v);
}

export function prove(cls: ProofClass, rawInput: unknown, env: Env): ProofBlock {
  const input = rec(rawInput, 'proof input');
  const base = parseBase(input);
  switch (cls) {
    case 'exploit-test':
      return assemble(cls, base, exploitTest(input, base.diff), env);
    case 'cited-diff':
      return assemble(cls, base, citedDiff(base.claims, base.diff), env);
    case 'rerun-stats':
      return assemble(cls, base, rerunStats(input, env.policy), env);
    case 'linked-evidence':
      return assemble(cls, base, linkedEvidence(input), env);
    case 'repro':
    case 'bench-delta':
    case 'score-delta':
    case 'ledger-record':
      return assemble(cls, base, stub(cls), env);
    default:
      throw new EngineError(`unknown proof class ${String(cls)}`);
  }
}
