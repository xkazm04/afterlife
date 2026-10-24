// belay gate --policy P --state S --class <id> --proof proof.json --guardrail verdict.json
//   [--agent <service account>] [--diff <file>] [--env <name>]... [--now <iso>] [--engine-sha <sha>] [--shadow-next-rung]
// --shadow-next-rung adds `would`: {tier, decision}, what the gate would decide with the holder's record one rung up
// (../decide/shadow.ts); absent when there is no next rung. The decision, the reasons and the exit code are the gate's own.
import type { ProofBlock } from '../../src/schemas/proof';
import { parseArgs } from '../core/args';
import { readJson, readText } from '../core/files';
import { EngineError, isoMs, isRecord, optStr, str, type CommandResult, type Ctx, type ExitCode } from '../core/types';
import { gate, type Decision, type GuardrailVerdict } from '../decide/gate';
import { shadowNextRung } from '../decide/shadow';
import { checkEnvelope } from '../policy/envelope';
import { loadPolicy, loadState } from '../policy/load';
import { DEFAULT_POLICY, DEFAULT_STATE } from './prove';

const EXIT: Record<Decision, ExitCode> = { merge: 0, approve: 0, block: 1, wait: 2 };

/** A missing file (ENOENT) means "not produced yet" (wait); one that is there and unreadable (EISDIR, EACCES) or malformed is an error. */
function optionalJson(ctx: Ctx, file: string | undefined): unknown {
  if (file === undefined) return undefined;
  try {
    return readJson(ctx, file);
  } catch (e) {
    if (e instanceof EngineError && e.message.startsWith('cannot read') && e.message.endsWith('(ENOENT)')) return undefined;
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
  const verdict = optStr(raw.verdict, 'guardrail.verdict');
  // fail closed: a verdict and a label that disagree are neither, so the gate waits rather than take the kinder one
  const said = verdict !== undefined && label !== undefined && verdict !== label ? `verdict ${verdict}, label ${label}` : (verdict ?? label ?? 'unknown');
  return { verdict: said, severity: optStr(raw.severity, 'guardrail.severity') };
}

export function gateCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['policy', 'state', 'class', 'proof', 'guardrail', 'agent', 'diff', 'env', 'now', 'engine-sha'], switches: ['shadow-next-rung'], positional: 0 });
  const policy = loadPolicy(ctx, args.get('policy') ?? DEFAULT_POLICY);
  const state = loadState(ctx, args.get('state') ?? DEFAULT_STATE);
  const classId = str(args.need('class'), 'class');
  const now = args.has('now') ? new Date(isoMs(args.need('now'), '--now')) : ctx.now();
  const diff = args.opt('diff');
  const input = {
    policy,
    state,
    classId,
    agent: args.opt('agent'),
    proof: toProof(optionalJson(ctx, args.opt('proof'))),
    guardrail: toGuardrail(optionalJson(ctx, args.opt('guardrail'))),
    envelope: diff !== undefined ? checkEnvelope(policy, classId, readText(ctx, diff), args.all('env')) : undefined,
    engineSha: args.opt('engine-sha'),
    now,
  };
  const result = gate(input);
  // --shadow-next-rung: the same inputs one rung up (../decide/shadow.ts), as `would`. Never the decision or the exit code.
  const would = args.has('shadow-next-rung') ? shadowNextRung(input) : null;
  const head = `gate ${result.class}: ${result.decision.toUpperCase()}${result.tier ? ` at ${result.tier}` : ''}${result.agent ? ` (${result.agent})` : ''}`;
  const shadow = would ? [`  next rung (${would.tier}, never applied): ${would.decision}`] : [];
  return { json: would ? { ...result, would } : result, summary: [head, ...result.reasons.map((r) => `  - ${r}`), ...shadow].join('\n'), code: EXIT[result.decision] };
}
