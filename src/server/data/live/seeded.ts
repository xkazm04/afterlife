// The ids the demo seeds into an index (the desk's five inbox items and the gap picks). A real group's index never holds
// them, so live mode does not count or list them as the group's own: the predicate belongs to the data source, so every
// Needs-you count and the Needs-you screen agree.
import { DEMO } from '@/lib/demo';

export const SEEDED_ITEMS: ReadonlySet<string> = new Set([...DEMO.needsYou.map((n) => n.id), ...DEMO.maturity.proposals.map((g) => g.id)]);

export const isSeeded = (id: string): boolean => SEEDED_ITEMS.has(id);
