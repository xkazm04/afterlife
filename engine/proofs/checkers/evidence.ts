// What the checkers share: reading a JSON evidence file that may arrive inlined (an object) or as the text a
// `{"$file": ...}` reference became (repro, bench-delta, score-delta), and the one check builder that maps a check to its
// claim, which every class reading `claim_ids` uses (exploit-test and rerun-stats too).
// Evidence that is missing or does not parse is a reason, never an exception: the checker turns it into an ok:null
// check, so the Proof Block still says what was absent and the verdict stays short of pass.
import type { Check } from '../../../src/schemas/proof';
import { claimFor } from '../common';

export type Read<T> = { ok: true; value: T } | { ok: false; reason: string };

/** A JSON evidence value: undefined is missing, a string is parsed as JSON text, anything else is taken as it is. */
export function jsonEvidence(raw: unknown, what: string): Read<unknown> {
  if (raw === undefined || raw === null) return { ok: false, reason: `${what} is missing` };
  if (typeof raw !== 'string') return { ok: true, value: raw };
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (e) {
    return { ok: false, reason: `${what} is not valid JSON: ${(e as Error).message}` };
  }
}

export type At = (name: string, ok: boolean | null, detail: string, ref?: string) => Check;

/** The check builder of one input: each check answers the claim `claim_ids` maps its name to, if any. */
export function checksFor(input: Record<string, unknown>): At {
  return (name, ok, detail, ref) => ({ claim_id: claimFor(input, name), name, ok, detail, ...(ref ? { ref } : {}) });
}

/** A job URL or id recorded as evidence, when the input names one. */
export const jobEvidence = (...refs: (string | undefined)[]): { kind: 'job'; ref: string }[] => refs.flatMap((ref) => (ref ? [{ kind: 'job' as const, ref }] : []));
