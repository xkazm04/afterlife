// Chapter three, Govern: one agent action and why it could merge alone, then autonomy lost, then the decision that is
// yours. The demo project ledgerline throughout.
import type { Effect, Step } from '../steps';

const T41 = '/task/01J8Q4';
const CHAIN: Effect = { kind: 'tab', tab: 'chain' };

export const GOVERN: readonly Step[] = [
  {
    key: 'task',
    label: 'Task',
    chapter: 'govern',
    concept: 'Task',
    caption: 'Every agent action is a task. This one found a path traversal, wrote a failing exploit test, patched it and shipped to production with no human click. The receipt chain keeps every link.',
    href: T41,
    target: { sel: 'ol[aria-label="Receipt chain"]' },
    effects: [CHAIN],
  },
  {
    key: 'proof',
    label: 'Proof Block',
    chapter: 'govern',
    concept: 'Proof Block',
    caption: 'Why believe it? The agent’s claims, dashed, carry no weight. The engine re-derives every check on the right, with no AI model in it. Only the checks decide.',
    href: T41,
    target: { sel: 'section[aria-label="Claims tested by checks"]' },
    effects: [{ kind: 'tab', tab: 'court' }, { kind: 'replay' }],
  },
  {
    key: 'gate',
    label: 'Ladder',
    chapter: 'govern',
    concept: 'Earned autonomy',
    caption: 'Why no click? Autonomy is earned per action class. dep-bump.patch is Hands-off because its record cleared the bar: 16 accepted, 94 % merged without edits, 14 clean days.',
    href: '/ladder',
    target: { sel: '#row-dep-bump_2e_patch' },
  },
  {
    key: 'blocked',
    label: 'Guardrail',
    chapter: 'govern',
    tone: 'wrong',
    concept: 'Guardrail',
    caption: 'Not every change gets through. !44 is a dependency bump with an instruction hidden for agents: the guardrail quotes it and blocks it before any gate. Seeded fault.',
    href: '/task/01J8Q9',
    target: { sel: 'aside[aria-label="Inspector"] details', text: 'Exhibits' },
  },
  {
    key: 'tripwire',
    label: 'Tripwire',
    chapter: 'govern',
    tone: 'wrong',
    concept: 'Tripwire',
    caption: 'And autonomy is lost faster than it is earned: the first failure takes the class down, automatically. patch-bump drops to Quarantined, read and comment only.',
    href: '/ladder',
    target: { sel: '#row-patch-bump' },
    effects: [{ kind: 'tripwire' }],
  },
  {
    key: 'needs',
    label: 'Needs you',
    chapter: 'govern',
    tone: 'you',
    concept: 'Needs you',
    caption: 'Only a person brings it back. Needs you is the one place decisions wait: amber means yours to decide, and nothing else in the app is amber.',
    href: '/needs-you',
    target: { sel: '#row-n4' },
    cursor: true,
  },
  {
    key: 'run',
    label: 'Your write',
    chapter: 'govern',
    tone: 'you',
    concept: 'Outbox',
    caption: 'Read the note, then Re-admit: your click stages the exact write in the Outbox. Nothing runs until you press Run, and on the demo Run only simulates it.',
    href: '/needs-you/n4',
    target: { sel: 'button', text: 'Read the incident note', parent: true },
    cursor: true,
    hold: true,
  },
];
