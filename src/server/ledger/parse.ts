// belay-ledger/events/<project-id>.jsonl: one LedgerEvent per line. The file is read from a GitLab repository, so every
// line is checked field by field before it is trusted; a bad line fails the whole import (the chain is all or nothing).
import { ENVIRONMENT_TIERS, GUARDRAIL_VERDICTS, STATE_REV, WITHDRAWN_GRANTS, wouldOf, type LedgerEvent, type LedgerKind, type WithdrawnGrant } from '@/schemas/ledger';
import { TIER_ORDER, type Tier } from '@/schemas/tier';
import { isoMs } from '../../../engine/core/types';

export class LedgerParseError extends Error {
  constructor(readonly line: number, reason: string) {
    super(`ledger line ${line}: ${reason}`);
    this.name = 'LedgerParseError';
  }
}

const KINDS: readonly LedgerKind[] = ['task_started', 'proof_verdict', 'guardrail_verdict', 'tier_decision', 'merged', 'deployed', 'outcome', 'clock_event'];
const SUBJECTS = ['mr', 'issue', 'pipeline', 'vulnerability', 'deployment'] as const;
const OBSERVERS = ['poll', 'flows_api', 'govern_hook', 'webhook', 'ci_job'] as const;
const HASH = /^[0-9a-f]{64}$/;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
const str = (v: unknown): v is string => typeof v === 'string' && v !== '';
/** The rule the engine's `ledger append` writes by (isoMs): Date.parse alone takes '10' and reads a zone-less time in this machine's zone. */
function isIsoInstant(v: string): boolean {
  try {
    isoMs(v, 'at');
    return true;
  } catch {
    return false;
  }
}
/** A non-empty list of withdrawn grants, each named once. */
const grants = (v: unknown): v is WithdrawnGrant[] =>
  Array.isArray(v) && v.length > 0 && new Set(v).size === v.length && v.every((x) => WITHDRAWN_GRANTS.some((g) => g === x));

/** A tier_decision's state_rev, withdrew and would: on that kind only; absent stays absent (the hash depends on it). */
function decisionKeys(v: Rec, kind: LedgerKind | undefined, tier: Tier | undefined, bad: (what: string) => never): Pick<LedgerEvent, 'state_rev' | 'withdrew' | 'would'> {
  if ('state_rev' in v && (kind !== 'tier_decision' || !str(v.state_rev) || !STATE_REV.test(v.state_rev))) bad('state_rev must be a 40-hex commit id, on a tier_decision only');
  if ('withdrew' in v && (kind !== 'tier_decision' || !grants(v.withdrew))) bad('withdrew must name approval or auto_merge, each once, on a tier_decision only');
  const would = 'would' in v && tier ? wouldOf(v.would, tier) : null;
  if ('would' in v && (kind !== 'tier_decision' || !would)) bad('would must be the rung above tier_at_time and a decision, on a tier_decision only');
  return {
    ...('state_rev' in v ? { state_rev: v.state_rev as string } : {}), ...('withdrew' in v ? { withdrew: [...(v.withdrew as WithdrawnGrant[])] } : {}),
    ...(would ? { would } : {}),
  };
}

function toEvent(v: unknown, line: number): LedgerEvent {
  const bad = (what: string): never => {
    throw new LedgerParseError(line, what);
  };
  if (!isRec(v)) return bad('not a JSON object');
  const s = v.subject;
  const kind = KINDS.find((k) => k === v.kind);
  const tier = TIER_ORDER.find((t) => t === v.tier_at_time);
  const observed = OBSERVERS.find((o) => o === v.observed_by);
  if (!isInt(v.seq) || v.seq < 1) bad('seq must be a positive integer');
  if (!str(v.at) || !isIsoInstant(v.at)) bad('at must be an ISO time with a zone, like 2026-10-21T14:20:05Z');
  if (!str(v.agent) || !str(v.action_class) || !str(v.payload_ref)) bad('agent, action_class and payload_ref must be strings');
  if (!kind) bad('unknown kind');
  if (!tier) bad('unknown tier_at_time');
  if (!observed) bad('unknown observed_by');
  if (!str(v.prev_hash) || !HASH.test(v.prev_hash) || !str(v.hash) || !HASH.test(v.hash)) bad('prev_hash and hash must be sha256 hex');
  const subject = isRec(s) ? SUBJECTS.find((x) => x === s.type) : undefined;
  if (!isRec(s) || !subject || !isInt(s.project_id) || !isInt(s.iid)) return bad('subject needs project_id, type and iid');
  // the guardrail's verdict: on a guardrail_verdict only, pass or block; absent stays absent (the hash depends on it)
  const verdict = 'verdict' in v ? GUARDRAIL_VERDICTS.find((x) => x === v.verdict) : undefined;
  if ('verdict' in v && (kind !== 'guardrail_verdict' || !verdict)) bad('verdict must be pass or block, on a guardrail_verdict only');
  // the deployment's environment: on a deployed event only, a name and GitLab's tier; absent stays absent
  const env = v.environment;
  const tierOf = isRec(env) ? ENVIRONMENT_TIERS.find((x) => x === env.tier) : undefined;
  if ('environment' in v && (kind !== 'deployed' || !isRec(env) || !str(env.name) || !tierOf)) bad('environment must be a name and a tier, on a deployed event only');
  const decided = decisionKeys(v, kind, tier, bad);
  return {
    seq: v.seq as number, at: v.at as string, agent: v.agent as string, action_class: v.action_class as string, kind: kind as LedgerKind,
    tier_at_time: tier as LedgerEvent['tier_at_time'], subject: { project_id: s.project_id, type: subject, iid: s.iid },
    payload_ref: v.payload_ref as string, observed_by: observed as LedgerEvent['observed_by'],
    prev_hash: v.prev_hash as string, hash: v.hash as string, ...(verdict ? { verdict } : {}),
    ...(isRec(env) && tierOf ? { environment: { name: env.name as string, tier: tierOf } } : {}),
    ...decided,
  };
}

/** Parses a whole file. Blank lines are skipped; any other bad line throws LedgerParseError with its number. */
export function parseLedgerJsonl(text: string): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '') return;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      throw new LedgerParseError(i + 1, 'not valid JSON');
    }
    events.push(toEvent(json, i + 1));
  });
  return events;
}
