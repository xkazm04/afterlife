// The recap's six ideas: what each means in one line, the step that replays it, and the real screen it lives on.
import { stepIndex } from './steps';

export interface RecapIdea {
  name: string;
  line: string;
  /** The step "Replay it" goes back to. */
  step: number;
  /** The screen "See it" opens, ending the guide. */
  href: string;
}

const idea = (name: string, line: string, key: string, href: string): RecapIdea => ({ name, line, step: stepIndex(key), href });

export const RECAP: readonly RecapIdea[] = [
  idea('Proof Block', 'The engine’s checks decide. The agent’s words never count.', 'proof', '/task'),
  idea('Earned autonomy', 'Held per action class, five tiers, earned from the record.', 'gate', '/ladder'),
  idea('Guardrail', 'Reads agent MRs for hidden instructions. Blocks before any gate.', 'blocked', '/task'),
  idea('Tripwire', 'The first failure takes a class down. Only a person brings it back.', 'tripwire', '/ladder'),
  idea('Needs you', 'Amber means a person decides. Nothing else is amber.', 'needs', '/needs-you'),
  idea('Outbox', 'A write happens only when you press Run, as you.', 'run', '/needs-you'),
];

/** The recap's headline, the product's claim. */
export const CLAIM = { lead: 'Agents may act alone only where they can ', mark: 'prove it' } as const;
