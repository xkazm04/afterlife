// belay ledger append --event event.json --chain events.jsonl [--write]
// Prints the new hash-chained line. The chain is verified first: a broken chain is never extended.
import fs from 'node:fs';
import path from 'node:path';
import { append, ENVIRONMENT_TIERS, GUARDRAIL_VERDICTS, verifyChain, type LedgerEvent, type LedgerKind } from '../../src/schemas/ledger';
import { parseArgs } from '../core/args';
import { parseJson, readJson } from '../core/files';
import { EngineError, rec, str, num, type CommandResult, type Ctx } from '../core/types';
import { TIER_ORDER, type Tier } from '../../src/schemas/tier';

const KINDS: readonly LedgerKind[] = ['task_started', 'proof_verdict', 'guardrail_verdict', 'tier_decision', 'merged', 'deployed', 'outcome', 'clock_event'];
const OBSERVED: readonly LedgerEvent['observed_by'][] = ['poll', 'flows_api', 'govern_hook', 'webhook', 'ci_job'];
const SUBJECTS: readonly LedgerEvent['subject']['type'][] = ['mr', 'issue', 'pipeline', 'vulnerability', 'deployment'];

function oneOf<T extends string>(v: unknown, allowed: readonly T[], what: string): T {
  if (typeof v !== 'string' || !allowed.includes(v as T)) throw new EngineError(`${what} must be one of ${allowed.join(', ')}`);
  return v as T;
}

/** Rebuilt field by field: anything else is dropped. A verdict is kept on a guardrail_verdict only, and only pass or block. */
export function parseLedgerEvent(raw: unknown): Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'> {
  const e = rec(raw, 'event');
  const s = rec(e.subject, 'event.subject');
  const at = str(e.at, 'event.at');
  if (Number.isNaN(+new Date(at))) throw new EngineError('event.at must be an ISO time');
  const kind = oneOf(e.kind, KINDS, 'event.kind');
  const stated = 'verdict' in e;
  if (stated && kind !== 'guardrail_verdict') throw new EngineError(`event.verdict is for a guardrail_verdict only, not ${kind}`);
  const where = 'environment' in e;
  if (where && kind !== 'deployed') throw new EngineError(`event.environment is for a deployed event only, not ${kind}`);
  const env = where ? rec(e.environment, 'event.environment') : null;
  return {
    at,
    agent: str(e.agent, 'event.agent'),
    action_class: str(e.action_class, 'event.action_class'),
    kind,
    tier_at_time: oneOf<Tier>(e.tier_at_time, TIER_ORDER, 'event.tier_at_time'),
    subject: { project_id: num(s.project_id, 'subject.project_id'), type: oneOf(s.type, SUBJECTS, 'subject.type'), iid: num(s.iid, 'subject.iid') },
    payload_ref: str(e.payload_ref, 'event.payload_ref'),
    observed_by: oneOf(e.observed_by, OBSERVED, 'event.observed_by'),
    // absent, never undefined: an event without a verdict hashes as it always did
    ...(stated ? { verdict: oneOf(e.verdict, GUARDRAIL_VERDICTS, 'event.verdict') } : {}),
    ...(env ? { environment: { name: str(env.name, 'event.environment.name'), tier: oneOf(env.tier, ENVIRONMENT_TIERS, 'event.environment.tier') } } : {}),
  };
}

export function readChain(text: string): LedgerEvent[] {
  return text.split('\n').filter((l) => l.trim() !== '').map((l, i) => parseJson(l, `chain line ${i + 1}`) as LedgerEvent);
}

export function ledgerCommand(argv: readonly string[], ctx: Ctx): CommandResult {
  const args = parseArgs(argv, { values: ['event', 'chain'], switches: ['write'] });
  if (args.positional[0] !== 'append') throw new EngineError('usage: ledger append --event <file> --chain <events.jsonl> [--write]');
  const chainFile = path.resolve(ctx.cwd, args.need('chain'));
  const chain = fs.existsSync(chainFile) ? readChain(fs.readFileSync(chainFile, 'utf8')) : [];
  const broken = verifyChain(chain);
  if (broken !== null) throw new EngineError(`the chain is broken at seq ${broken}; it is not extended`);
  const line = append(chain, parseLedgerEvent(readJson(ctx, args.need('event'))));
  if (args.has('write')) fs.appendFileSync(chainFile, `${JSON.stringify(line)}\n`);
  return { json: line, summary: `ledger: appended seq ${line.seq} ${line.kind} ${line.hash.slice(0, 12)} (chain of ${chain.length + 1} verifies)`, code: 0, compact: true };
}
