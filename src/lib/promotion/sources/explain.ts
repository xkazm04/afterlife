// The outputs behind one count of the promotion rule, read from a record's sources (src/lib/demo/sources.ts): the merge
// requests it counted, the ones it left out and why, and the facts it could not read. Ladder's Promotion rule draws it
// under a count row; the demo agreement test totals it against the fixture's counters. Pure: no clock, no I/O.
import type { CountedOutput, MissingFact, RecordSources } from '@/lib/demo/sources';
import { TRIAL_ROW } from '../rules';
import { trialLines } from './trial';

/** The record counter a promotion rule row reads. */
export type CountKey = 'accepted' | 'noEdit' | 'reverts' | 'cleanDays' | 'guardrailBlocks' | 'gated' | 'window' | 'trial';

/** The counter behind a rule row, by the row's name (./rules.ts); null for a row no count backs (proof class, cooldown). */
export function countKeyOf(name: string): CountKey | null {
  if (name === 'accepted outputs') return 'accepted';
  if (name.startsWith('merged without edits')) return 'noEdit';
  if (name === 'reverts') return 'reverts';
  if (name === 'clean days') return 'cleanDays';
  if (name === 'guardrail blocks') return 'guardrailBlocks';
  if (name === 'gated outputs') return 'gated';
  if (name.startsWith('counted over the last')) return 'window';
  if (name === TRIAL_ROW) return 'trial';
  return null;
}

/** One line of the list: an MR (`iid`) or the record as a whole (null), and what is said of it. */
export interface SourceLine {
  iid: number | null;
  text: string;
}

export interface Explained {
  counted: SourceLine[];
  excluded: SourceLine[];
  missing: SourceLine[];
  /** What the lists cannot say on their own: where a count starts, or that the list is capped. */
  note: string | null;
}

/** Each counter's facts that can be missing: why it is null, or short. */
const FACTS: Record<CountKey, readonly MissingFact[]> = {
  accepted: [], noEdit: ['edit'], reverts: ['revert_policy'], cleanDays: ['revert_policy'],
  guardrailBlocks: ['ledger', 'verdict'], gated: ['ledger', 'tier_decision'], window: [], trial: ['ledger'],
};

const MISSING: Record<MissingFact, string> = {
  edit: 'no edit fact read yet',
  tier_decision: "no tier_decision in belay-ledger: belay-apply's gate did not decide it",
  verdict: 'its guardrail verdict states neither pass nor block',
  ledger: 'belay-ledger was not read this poll, so this is not stated',
  revert_policy: 'trust-policy.yml does not demote on a revert, so reverts are not counted',
};

const day = (iso: string): string => iso.slice(0, 10);
const line = (o: CountedOutput, text: string): SourceLine => ({ iid: o.iid, text: `${text} · ${day(o.at)}` });
const outside = (s: RecordSources) => (o: CountedOutput): SourceLine => ({ iid: o.iid, text: `${o.outcome}, outside the window (last ${s.window})` });

/** A listed MR's GitLab URL, when the sources know the project's web URL; null: a plain !iid. */
export const mrHref = (s: RecordSources, iid: number): string | null => (s.web ? `${s.web}/-/merge_requests/${iid}` : null);

/** The counted, excluded and missing lines behind `key`, all from `s`. */
export function explain(key: CountKey, s: RecordSources): Explained {
  const inW = s.outputs.filter((o) => o.inWindow);
  const out = s.outputs.filter((o) => !o.inWindow);
  const merged = inW.filter((o) => o.outcome === 'merged');
  const reverted = inW.filter((o) => o.outcome === 'reverted');
  const missing = s.missing.filter((m) => FACTS[key].includes(m.fact)).map((m) => ({ iid: m.iid, text: MISSING[m.fact] }));
  const capped = s.total > s.outputs.length ? `Lists the newest ${s.outputs.length} of ${s.total} outputs since ${day(s.since)}.` : null;
  const from = `Counted since ${day(s.since)}${s.window === null ? '' : `, over the last ${s.window} outputs`}.`;
  const e = (counted: SourceLine[], excluded: SourceLine[], note: string | null = capped): Explained => ({ counted, excluded, missing, note });
  switch (key) {
    case 'accepted':
      return e(merged.map((o) => line(o, 'merged')), [...inW.filter((o) => o.outcome !== 'merged').map((o) => line(o, `${o.outcome}, not an accepted output`)), ...out.map(outside(s))]);
    case 'noEdit':
      return e(merged.filter((o) => o.edited === false).map((o) => line(o, 'merged without edits')), merged.filter((o) => o.edited === true).map((o) => line(o, 'edited by another account before it merged')));
    case 'reverts':
      return e(reverted.map((o) => line(o, 'reverted')), out.filter((o) => o.outcome === 'reverted').map(outside(s)));
    case 'cleanDays':
      return e([], reverted.map((o) => line(o, 'reverted: no clean days while a revert is counted')), [from, capped].filter(Boolean).join(' '));
    case 'guardrailBlocks':
      return e(s.blocks.map((iid) => ({ iid, text: 'blocked by the guardrail' })), []);
    case 'gated':
      return e(merged.filter((o) => o.gated === true).map((o) => line(o, "decided by belay-apply's gate, merged")), []);
    case 'window':
      return e(inW.map((o) => line(o, o.outcome)), out.map(outside(s)), [from, capped].filter(Boolean).join(' '));
    case 'trial': {
      const t = trialLines(s);
      return e(t.counted, t.excluded, t.note);
    }
  }
}
