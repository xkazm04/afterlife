// belay gate --policy P --state S --class <id> --proof proof.json --guardrail verdict.json
//   [--agent <service account>] [--diff <file>] [--env <name>]... [--now <iso>] [--engine-sha <sha>]
import type { ProofBlock } from '../../src/schemas/proof';
import { parseArgs } from '../core/args';
import { readJson, readText } from '../core/files';
import { EngineError, isRecord, optStr, str, type CommandResult, type Ctx, type ExitCode } from '../core/types';
import { gate, type Decision, type GuardrailVerdict } from '../decide/gate';
import { checkEnvelope } from '../policy/envelope';
import { loadPolicy, loadState } from '../policy/load';
import { DEFAULT_POLICY, DEFAULT_STATE } from './prove';

const EXIT: Record<Decision, ExitCode> = { merge: 0, approve: 0, block: 1, wait: 2 };

/** A missing file means "not produced yet" (wait), a file that exists but is malformed is an error. */
function optionalJson(ctx: Ctx, file: string | undefined): unknown {
  if (!file) return undefined;
  try {
    return readJson(ctx, file);
  } catch (e) {
    if (e instanceof EngineError && e.message.startsWith('cannot read')) return undefined;
    throw e;
  }
}

function toProof(raw: unknown): ProofBlock | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw) || raw.schema !== 'belay.proof/1' || !Array.isArray(raw.checks) || !isRecord(raw.envelope) || !isRecord(raw.engine)) {
    throw new EngineError('--proof is not a belay.proof/1 block');
  }
  return raw as unknown as ProofBlock;
}

function toGuardrail(raw: unknown): GuardrailVerdict | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) throw new EngineError('--guardrail must be a JSON object');
  const label = optStr(raw.label, 'guardrail.label')?.replace(/^guardrail::/, '');
  return { verdict: optStr(raw.verdict, 'guardrail.verdict') ?? label ?? 'unknown', severity: optStr(raw.severity, 'guardrail.severity') };
}

export function gateCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['policy', 'state', 'class', 'proof', 'guardrail', 'agent', 'diff', 'env', 'now', 'engine-sha'] });
  const policy = loadPolicy(ctx, args.get('policy') ?? DEFAULT_POLICY);
  const state = loadState(ctx, args.get('state') ?? DEFAULT_STATE);
  const classId = str(args.need('class'), 'class');
  const now = args.has('now') ? new Date(args.need('now')) : ctx.now();
  if (Number.isNaN(+now)) throw new EngineError('--now is not a valid time');
  const diff = args.get('diff');
  const result = gate({
    policy,
    state,
    classId,
    agent: args.get('agent'),
    proof: toProof(optionalJson(ctx, args.get('proof'))),
    guardrail: toGuardrail(optionalJson(ctx, args.get('guardrail'))),
    envelope: diff ? checkEnvelope(policy, classId, readText(ctx, diff), args.all('env')) : undefined,
    engineSha: args.get('engine-sha'),
    now,
  });
  const head = `gate ${result.class}: ${result.decision.toUpperCase()}${result.tier ? ` at ${result.tier}` : ''}${result.agent ? ` (${result.agent})` : ''}`;
  return { json: result, summary: [head, ...result.reasons.map((r) => `  - ${r}`)].join('\n'), code: EXIT[result.decision] };
}
