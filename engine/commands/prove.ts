// belay prove --class <ProofClass> --input <file.json> [--policy policy/trust-policy.yml] [--files-root <dir>]
import type { ProofBlock } from '../../src/schemas/proof';
import { parseArgs } from '../core/args';
import { readInput } from '../core/files';
import { EngineError, type CommandResult, type Ctx, type ExitCode } from '../core/types';
import { loadPolicy } from '../policy/load';
import { isProofClass, PROOF_CLASSES, prove } from '../proofs';

export const DEFAULT_POLICY = 'policy/trust-policy.yml';
export const DEFAULT_STATE = 'policy/tier-state.yml';

const MARK = (c: ProofBlock['checks'][number]): string => (c.decidedBy === 'human' ? 'human' : c.ok === true ? 'ok   ' : c.ok === false ? 'FAIL ' : '??   ');

export function describeProof(b: ProofBlock): string {
  const lines = [`proof ${b.class}: ${b.verdict.toUpperCase()}  (engine ${b.engine.version} ${b.engine.sha256.slice(0, 12)})`];
  for (const c of b.checks) lines.push(`  [${MARK(c)}] ${c.name}${c.claim_id ? ` (${c.claim_id})` : ''}: ${c.detail}`);
  lines.push(`  envelope: ${b.envelope.files} files, ${b.envelope.lines} lines, ${b.envelope.within ? 'within' : 'OUTSIDE'}`);
  return lines.join('\n');
}

const EXIT: Record<ProofBlock['verdict'], ExitCode> = { pass: 0, fail: 1, inconclusive: 2 };

export function proveCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['class', 'input', 'policy', 'files-root'] });
  const cls = args.need('class');
  if (!isProofClass(cls)) throw new EngineError(`unknown proof class "${cls}" (one of ${PROOF_CLASSES.join(', ')})`);
  const policy = loadPolicy(ctx, args.get('policy') ?? DEFAULT_POLICY);
  const block = prove(cls, readInput(ctx, args.need('input'), args.get('files-root')), { policy, now: ctx.now() });
  return { json: block, summary: describeProof(block), code: EXIT[block.verdict] };
}
