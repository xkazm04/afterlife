// Where the Cycles screen opens, derived from the data until the person picks: the running cycle (or, with ?design=1,
// the planned one) and, with ?design=1, the designer's opening draft. Pure, so the data may land late or be re-read
// without resetting a pick.
import type { CyclesData } from '../build';
import type { Candidate } from '../design';

/** The cycle selected before any pick: the planned one when designing, else the running one, else the last. Null: no data. */
export function openingCycle(data: CyclesData | undefined, design: boolean): string | null {
  if (!data) return null;
  const planned = design ? data.cycles.find((c) => c.state === 'planned') : undefined;
  return (planned ?? data.cycles.find((c) => c.state === 'running') ?? data.cycles[data.cycles.length - 1])?.id ?? null;
}

/** The draft the designer opens with: every proposal that is not blocked. Null when not designing, unread or nothing is planned. */
export function openingDraft(data: CyclesData | undefined, all: readonly Candidate[], design: boolean): string[] | null {
  if (!design || !data || !data.cycles.some((c) => c.state === 'planned')) return null;
  return all.filter((c) => c.source === 'proposal' && !c.blocked).map((c) => c.id);
}

/** A draft with `id` toggled in or out; no draft stays none. */
export const toggleIn = (draft: readonly string[] | null, id: string): string[] | null =>
  draft ? (draft.includes(id) ? draft.filter((x) => x !== id) : [...draft, id]) : null;
