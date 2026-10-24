// The one ledger-event parser. The writer (engine `ledger append`), the importer (server parseLedgerJsonl) and the checker
// (ledger-record) all call it, so a line the writer accepts is a line the importer reads and the checker verifies.
// Parse, don't validate: an event is rebuilt field by field, anything unknown is dropped, and an optional key that is
// absent stays absent (the hash depends on it). It never throws: each caller maps a refusal to its own error.
import type { LedgerEvent } from '../ledger';
import { TIER_ORDER } from '../tier';
import { ENVIRONMENT_TIERS, GUARDRAIL_VERDICTS, LEDGER_KINDS, OBSERVERS, STATE_REV, SUBJECT_TYPES, WITHDRAWN_GRANTS, wouldOf, type WithdrawnGrant } from './kinds';

/** An event as the writer takes it: everything but seq and the hash links, which append() adds. */
export type EventBody = Omit<LedgerEvent, 'seq' | 'prev_hash' | 'hash'>;
export type ParseResult<T> = { ok: true; event: T } | { ok: false; reason: string };
/** A whole chain file: every event, or the first bad line by its number in the file (1-based, blank lines counted). */
export type ChainRead = { ok: true; events: LedgerEvent[] } | { ok: false; line: number; reason: string };

const HASH = /^[0-9a-f]{64}$/;

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

class Refused extends Error {}
const refuse = (reason: string): never => {
  throw new Refused(reason);
};
function oneOf<T extends string>(v: unknown, allowed: readonly T[], what: string): T {
  return allowed.find((a) => a === v) ?? refuse(`${what} must be one of ${allowed.join(', ')}`);
}
const nonEmpty = (v: unknown, what: string): string => (isStr(v) ? v : refuse(`${what} must be a non-empty string`));
const id = (v: unknown, what: string): number => (isId(v) ? v : refuse(`${what} must be an integer >= 0`));

/** A tier_decision's state_rev, withdrew and would: on that kind only. */
function decisionKeys(v: Rec, body: Pick<EventBody, 'kind' | 'tier_at_time'>): Pick<EventBody, 'state_rev' | 'withdrew' | 'would'> {
  const decision = body.kind === 'tier_decision';
  const rev = v.state_rev;
  if ('state_rev' in v && (!decision || typeof rev !== 'string' || !STATE_REV.test(rev))) refuse('state_rev must be a 40-hex commit id, on a tier_decision only');
  const w = v.withdrew;
  const grants = Array.isArray(w) && w.length > 0 && new Set(w).size === w.length && w.every((x) => WITHDRAWN_GRANTS.some((g) => g === x));
  if ('withdrew' in v && (!decision || !grants)) refuse('withdrew must name approval or auto_merge, each once, on a tier_decision only');
  const would = 'would' in v ? wouldOf(v.would, body.tier_at_time) : null;
  if ('would' in v && (!decision || !would)) refuse('would must be exactly {tier, decision}: the rung above tier_at_time and merge, approve, wait or block, on a tier_decision only');
  return {
    ...('state_rev' in v ? { state_rev: rev as string } : {}),
    ...('withdrew' in v ? { withdrew: [...(w as WithdrawnGrant[])] } : {}),
    ...(would ? { would } : {}),
  };
}

function body(v: unknown): EventBody {
  if (!isRec(v)) return refuse('not a JSON object');
  if (!isStr(v.at) || Number.isNaN(Date.parse(v.at))) refuse('at must be an ISO time');
  const head = {
    at: v.at as string,
    agent: nonEmpty(v.agent, 'agent'),
    action_class: nonEmpty(v.action_class, 'action_class'),
    kind: oneOf(v.kind, LEDGER_KINDS, 'kind'),
    tier_at_time: oneOf(v.tier_at_time, TIER_ORDER, 'tier_at_time'),
  };
  const s = isRec(v.subject) ? v.subject : refuse('subject must be an object with project_id, type and iid');
  const subject = { project_id: id(s.project_id, 'subject.project_id'), type: oneOf(s.type, SUBJECT_TYPES, 'subject.type'), iid: id(s.iid, 'subject.iid') };
  const rest = { payload_ref: nonEmpty(v.payload_ref, 'payload_ref'), observed_by: oneOf(v.observed_by, OBSERVERS, 'observed_by') };
  // the guardrail's verdict: on a guardrail_verdict only, pass or block
  const verdict = 'verdict' in v ? GUARDRAIL_VERDICTS.find((x) => x === v.verdict) : undefined;
  if ('verdict' in v && (head.kind !== 'guardrail_verdict' || !verdict)) refuse('verdict must be pass or block, on a guardrail_verdict only');
  // the deployment's environment: on a deployed event only, a name and GitLab's tier
  const env = v.environment;
  const envTier = isRec(env) ? ENVIRONMENT_TIERS.find((x) => x === env.tier) : undefined;
  if ('environment' in v && (head.kind !== 'deployed' || !isRec(env) || !isStr(env.name) || !envTier)) refuse('environment must be a name and a tier, on a deployed event only');
  return {
    ...head, subject, ...rest,
    ...(verdict ? { verdict } : {}),
    ...(isRec(env) && envTier ? { environment: { name: env.name as string, tier: envTier } } : {}),
    ...decisionKeys(v, head),
  };
}

function result<T>(f: () => T): ParseResult<T> {
  try {
    return { ok: true, event: f() };
  } catch (e) {
    if (e instanceof Refused) return { ok: false, reason: e.message };
    throw e;
  }
}

/** The unhashed event the writer accepts. */
export function parseEventBody(raw: unknown): ParseResult<EventBody> {
  return result(() => body(raw));
}

/** A stored chain line: the body, a positive seq, and prev_hash and hash in sha256 hex. Links are verifyChain's to check. */
export function parseStoredLine(raw: unknown): ParseResult<LedgerEvent> {
  return result(() => {
    const event = body(raw);
    const v = raw as Rec;
    if (!isId(v.seq) || v.seq < 1) refuse('seq must be a positive integer');
    if (!isStr(v.prev_hash) || !HASH.test(v.prev_hash) || !isStr(v.hash) || !HASH.test(v.hash)) refuse('prev_hash and hash must be sha256 hex');
    return { ...event, seq: v.seq as number, prev_hash: v.prev_hash as string, hash: v.hash as string };
  });
}

/**
 * A chain file's text (JSONL). Blank lines and a CRLF ending are skipped; the first bad line stops the read. `also` is a
 * caller's own refusal of a line's parsed JSON (a reason, or null), run after the shared rules pass on that line, so a
 * stricter reader judges the same parse instead of parsing every line twice.
 */
export function parseChainText(text: string, also?: (json: unknown) => string | null): ChainRead {
  const events: LedgerEvent[] = [];
  for (const [i, raw] of text.split('\n').entries()) {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '') continue;
    let json: unknown;
    try {
      json = JSON.parse(line);
    } catch {
      return { ok: false, line: i + 1, reason: 'not valid JSON' };
    }
    const r = parseStoredLine(json);
    if (!r.ok) return { ok: false, line: i + 1, reason: r.reason };
    const own = also?.(json) ?? null;
    if (own !== null) return { ok: false, line: i + 1, reason: own };
    events.push(r.event);
  }
  return { ok: true, events };
}
