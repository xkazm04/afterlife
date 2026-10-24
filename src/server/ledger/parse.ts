// belay-ledger/events/<project-id>.jsonl: one LedgerEvent per line. The file is read from a GitLab repository, so every
// line is checked field by field before it is trusted; a bad line fails the whole import (the chain is all or nothing).
// The rules are the one parser the engine's writer and ledger-record checker share (src/schemas/chain/parse.ts), and this
// reader's stricter ones on top: no unknown key, `at` as the engine writes it (isoMs), and safe-integer ids.
import { parseChainText, type LedgerEvent } from '@/schemas/ledger';
import { isoMs } from '../../../engine/core/types';

export class LedgerParseError extends Error {
  constructor(readonly line: number, reason: string) {
    super(`ledger line ${line}: ${reason}`);
    this.name = 'LedgerParseError';
  }
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Every key a line may carry: LedgerEvent's own, so a key added to the type and not here (or here and not on the type) is
 * a typecheck error, not every new line refused as "newer than this reader". The hash covers the line as written.
 */
const KEYS: { readonly [K in keyof LedgerEvent]-?: true } = {
  seq: true, at: true, agent: true, action_class: true, kind: true, tier_at_time: true, subject: true, payload_ref: true,
  observed_by: true, prev_hash: true, hash: true, verdict: true, environment: true, state_rev: true, withdrew: true, would: true,
};
const KNOWN_KEYS: ReadonlySet<string> = new Set(Object.keys(KEYS));

/** The rule the engine's `ledger append` writes by (isoMs): Date.parse alone takes '10' and reads a zone-less time in this machine's zone. */
function isIsoInstant(v: unknown): boolean {
  try {
    isoMs(v, 'at');
    return true;
  } catch {
    return false;
  }
}
const unsafeId = (v: unknown): boolean => typeof v === 'number' && !Number.isSafeInteger(v);

/** This reader's own refusal of a parsed JSON line, or null; the shared parser judges the rest. */
function stricter(v: unknown): string | null {
  if (!isRec(v)) return null;
  const unknown = Object.keys(v).find((k) => !KNOWN_KEYS.has(k));
  if (unknown !== undefined) return `unknown key "${unknown}": written by a newer version than this reader, not a tampered chain`;
  if (typeof v.at === 'string' && v.at !== '' && !isIsoInstant(v.at)) return 'at must be an ISO time with a zone, like 2026-10-21T14:20:05Z';
  const s = isRec(v.subject) ? v.subject : {};
  if (unsafeId(v.seq) || unsafeId(s.project_id) || unsafeId(s.iid)) return 'seq, subject.project_id and subject.iid must be safe integers';
  return null;
}

/**
 * Parses a whole file. Blank lines are skipped; any other bad line throws LedgerParseError with its number. The stricter
 * rules judge each line's one parse, after the shared ones pass on it: the first bad line wins, and on one line the shared
 * reason does.
 */
export function parseLedgerJsonl(text: string): LedgerEvent[] {
  const r = parseChainText(text, stricter);
  if (!r.ok) throw new LedgerParseError(r.line, r.reason);
  return r.events;
}
