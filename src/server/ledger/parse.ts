// belay-ledger/events/<project-id>.jsonl: one LedgerEvent per line. The file is read from a GitLab repository, so every
// line is checked field by field before it is trusted; a bad line fails the whole import (the chain is all or nothing).
import type { LedgerEvent, LedgerKind } from '@/schemas/ledger';
import { TIER_ORDER } from '@/schemas/tier';

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
  if (!str(v.at) || Number.isNaN(Date.parse(v.at))) bad('at must be an ISO time');
  if (!str(v.agent) || !str(v.action_class) || !str(v.payload_ref)) bad('agent, action_class and payload_ref must be strings');
  if (!kind) bad('unknown kind');
  if (!tier) bad('unknown tier_at_time');
  if (!observed) bad('unknown observed_by');
  if (!str(v.prev_hash) || !HASH.test(v.prev_hash) || !str(v.hash) || !HASH.test(v.hash)) bad('prev_hash and hash must be sha256 hex');
  const subject = isRec(s) ? SUBJECTS.find((x) => x === s.type) : undefined;
  if (!isRec(s) || !subject || !isInt(s.project_id) || !isInt(s.iid)) return bad('subject needs project_id, type and iid');
  return {
    seq: v.seq as number, at: v.at as string, agent: v.agent as string, action_class: v.action_class as string, kind: kind as LedgerKind,
    tier_at_time: tier as LedgerEvent['tier_at_time'], subject: { project_id: s.project_id, type: subject, iid: s.iid },
    payload_ref: v.payload_ref as string, observed_by: observed as LedgerEvent['observed_by'],
    prev_hash: v.prev_hash as string, hash: v.hash as string,
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
