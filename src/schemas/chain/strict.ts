// The stored chain's rules on top of the shared parser (./parse): what the importer (server parseLedgerJsonl) refuses
// and the engine's `ledger append` (readChain) refuses too, so the CLI never extends a chain the importer would reject.
// The ledger-record checker reads by its own rules (engine/proofs/checkers/ledgerRecord.ts).
import { isoInstantMs } from '../../../engine/core/types';
import type { LedgerEvent } from '../ledger';

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

const unsafeId = (v: unknown): boolean => typeof v === 'number' && !Number.isSafeInteger(v);

/**
 * A stored line's stricter refusal, or null; the shared parser judges the rest. No unknown key, `at` as the engine writes
 * it (isoMs: Date.parse alone takes '10' and reads a zone-less time in this machine's zone), and safe-integer ids.
 */
export function strictChainLine(v: unknown): string | null {
  if (!isRec(v)) return null;
  const unknown = Object.keys(v).find((k) => !KNOWN_KEYS.has(k));
  if (unknown !== undefined) return `unknown key "${unknown}": written by a newer version than this reader, not a tampered chain`;
  if (typeof v.at === 'string' && v.at !== '' && Number.isNaN(isoInstantMs(v.at))) return 'at must be an ISO time with a zone, like 2026-10-21T14:20:05Z';
  const s = isRec(v.subject) ? v.subject : {};
  if (unsafeId(v.seq) || unsafeId(s.project_id) || unsafeId(s.iid)) return 'seq, subject.project_id and subject.iid must be safe integers';
  return null;
}
