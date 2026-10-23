// The ids the demo seeds into an index (the desk's five inbox items and the gap picks). A real group's index never holds
// them, so live mode does not count or list them as the group's own: the predicate belongs to the data source, so every
// Needs-you count and the Needs-you screen agree.
import { DEMO } from '@/lib/demo';

export const SEEDED_ITEMS: ReadonlySet<string> = new Set([...DEMO.needsYou.map((n) => n.id), ...DEMO.maturity.proposals.map((g) => g.id)]);

/** The poller's own gap proposals (`gap:<project>:<stage>:<to>`, poller/gaps) are the group's, whatever the seed holds. */
export const isSeeded = (id: string): boolean => !id.startsWith('gap:') && SEEDED_ITEMS.has(id);

/** The decisions a screen lists: live lists the group's own only (as /needs-you does); demo keeps them all, as given. */
export const ownDecisions = <T extends { id: string }>(mode: 'demo' | 'live', items: readonly T[]): T[] =>
  mode === 'live' ? items.filter((n) => !isSeeded(n.id)) : (items as T[]);
