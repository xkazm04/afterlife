// Chapter four, Improve: beyond guarding each change, the agents raise each project's maturity, round by round.
import type { Step } from '../steps';

export const IMPROVE: readonly Step[] = [
  {
    key: 'maturity',
    label: 'Maturity',
    chapter: 'improve',
    concept: 'Maturity',
    caption: 'Agents also make projects better. Maturity rates each DevSecOps stage as a rung, from absent to self-proving, and proposes the gaps worth closing. You pick which.',
    href: '/maturity',
    target: { sel: '[data-crag] svg[aria-label^="Nine stage routes"]' },
  },
  {
    key: 'cycles',
    label: 'Cycles',
    chapter: 'improve',
    concept: 'Cycles',
    caption: 'Each improvement round is a cycle: the gaps you picked, the MRs sent as you, and the rungs a rescan actually credited. Nothing is credited on a claim.',
    href: '/cycles',
    target: { sel: 'section[aria-label="Every stage, every cycle"]' },
  },
  {
    key: 'runs',
    label: 'Runs',
    chapter: 'improve',
    concept: 'Runs',
    caption: 'Runs is the cycle runner’s ledger: every lane it ran, one row each with its wave, how it ended and what it cost, the dearest first. A failed or parked lane says why in words.',
    href: '/runs',
    target: { sel: '[role="treegrid"][aria-label="Every lane of every wave"]' },
  },
];
