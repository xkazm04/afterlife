// The merge requests behind the next-rung trial row (src/schemas/trial.ts): each MR whose tier_decision said the rung above
// would have acted alone, and how what people did with it resolved the trial. Counted: agreements and catches; not
// counted: the unresolved ones and why. Read from a record's sources (src/lib/demo/sources.ts); ./explain.ts draws it.
import type { RecordSources, TrialSource } from '@/lib/demo/sources';
import { TIER_META } from '@/lib/tiers';
import { isResolved, type TrialResolution } from '@/schemas/trial';

/** What each resolution says of the MR, after "the next rung would have <acted>". */
export const TRIAL_WORDS: Record<TrialResolution, string> = {
  agreed: 'merged without edits: agreed',
  edited: 'edited by another account before it merged: caught',
  closed: 'closed by a person: caught',
  reverted: 'reverted after it merged: caught',
  open: 'no outcome read yet (still open, or not read)',
  no_edit_fact: 'merged, no edit fact read yet',
  closed_by_agent: 'closed by an agent account: not a person turning it down',
  closer_unknown: 'closed, who closed it not read',
};

const acted = (x: TrialSource): string => `${TIER_META[x.tier].name} would have ${x.tier === 'hands_off' ? 'merged' : 'approved'}`;
const line = (x: TrialSource) => ({ iid: x.iid, text: `${acted(x)}; ${TRIAL_WORDS[x.resolution]} · ${x.at.slice(0, 10)}` });

/** The trial's counted (resolved) and excluded (unresolved) lines, and what the list cannot say on its own. */
export function trialLines(s: RecordSources): { counted: { iid: number; text: string }[]; excluded: { iid: number; text: string }[]; note: string | null } {
  const list = s.trial ?? [];
  return {
    counted: list.filter((x) => isResolved(x.resolution)).map(line),
    excluded: list.filter((x) => !isResolved(x.resolution)).map(line),
    note: s.trial ? `The merge requests whose tier_decision since ${s.since.slice(0, 10)} says the rung above would have acted alone. Never applied.` : null,
  };
}
