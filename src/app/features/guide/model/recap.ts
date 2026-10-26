// The recap: the four chapters as the sidebar groups them, each with its screens to open, and the moments of the story
// a person can replay. Screens and their labels come from the nav, never copied.
import { NAV_GROUPS, type NavEntry } from '@/components/shell/sidebar/navItems';
import { stepIndex } from './steps';

export interface RecapChapter {
  key: string;
  label: string;
  line: string;
  screens: readonly NavEntry[];
}

export const RECAP_CHAPTERS: readonly RecapChapter[] = NAV_GROUPS.map((g) => ({ key: g.key, label: g.label, line: g.line, screens: g.entries }));

/** The moments worth seeing again: the ideas the story introduces in a situation, each with the step that shows it. */
export const MOMENTS: readonly { name: string; step: number }[] = [
  ['Proof Block', 'proof'],
  ['Earned autonomy', 'gate'],
  ['Guardrail', 'blocked'],
  ['Tripwire', 'tripwire'],
  ['Your write', 'run'],
].map(([name, key]) => ({ name: name ?? '', step: stepIndex(key ?? '') }));

/** The recap's headline, the product's claim. */
export const CLAIM = { lead: 'Agents may act alone only where they can ', mark: 'prove it' } as const;
