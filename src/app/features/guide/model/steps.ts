// The guide's story, one change on the demo project ledgerline, told over the real screens: it works, it goes wrong, your
// turn. Each step names the screen it plays on, the real element it lights, and what the layer does there. Pure data.

/** The three acts the rail groups the steps into, each with its own light. */
export type Act = 'travel' | 'wrong' | 'you';

/** A real element on the screen, found in the live DOM: the first drawn match of `sel`, narrowed by its text. */
export interface Target {
  sel: string;
  /** Only a match whose text contains this. */
  text?: string;
  /** Light the match's parent instead (a pair of buttons lit as one). */
  parent?: boolean;
}

/** What the layer does once the step's screen is drawn: open a tab, start the screen's own replay, or play the tripwire. */
export type Effect = { kind: 'tab'; tab: 'court' | 'chain' } | { kind: 'replay' } | { kind: 'tripwire' };

export interface Step {
  key: string;
  /** The rail's label. */
  label: string;
  act: Act;
  /** The idea this step introduces, shown as the caption's chip; null for a step that only moves the story on. */
  concept: string | null;
  caption: string;
  /** The real screen the step plays on. */
  href: string;
  target: Target | null;
  effects?: readonly Effect[];
  /** The ghost cursor points at the target: here the person acts. */
  cursor?: boolean;
  /** Autoplay stops here: the step waits for the person. */
  hold?: boolean;
}

const T41 = '/task/01J8Q4';
const T44 = '/task/01J8Q9';
const CHAIN: Effect = { kind: 'tab', tab: 'chain' };
const link = (n: number): Target => ({ sel: `ol[aria-label="Receipt chain"] > li:nth-child(${n})` });
const inspector = (text: string): Target => ({ sel: 'aside[aria-label="Inspector"] details', text });

export const STEPS: readonly Step[] = [
  {
    key: 'finding',
    label: 'Finding',
    act: 'travel',
    concept: null,
    caption: 'Agents may act alone only where they can prove it. Watch one do it: a scanner has just found a path traversal. No one is at the keyboard.',
    href: T41,
    target: link(1),
    effects: [CHAIN],
  },
  {
    key: 'red',
    label: 'Red test',
    act: 'travel',
    concept: null,
    caption: 'The patcher first proves the hole. Its exploit test fails: expected 403, got 200.',
    href: T41,
    target: link(3),
    effects: [CHAIN],
  },
  {
    key: 'patch',
    label: 'Patch',
    act: 'travel',
    concept: null,
    caption: 'Then the fix: 2 files, 14 lines, all inside the envelope the policy allows.',
    href: T41,
    target: inspector('Exhibits'),
    effects: [CHAIN],
  },
  {
    key: 'proof',
    label: 'Proof Block',
    act: 'travel',
    concept: 'Proof Block',
    caption: 'The agent’s claims, dashed, carry no weight. The engine re-derives every check on the right, with no AI model in it. Only the checks decide.',
    href: T41,
    target: { sel: 'section[aria-label="Claims tested by checks"]' },
    effects: [{ kind: 'tab', tab: 'court' }, { kind: 'replay' }],
  },
  {
    key: 'guard',
    label: 'Guardrail',
    act: 'travel',
    concept: 'Guardrail',
    caption: 'Another agent, the guardrail, reads the change for hidden instructions before any gate. No objection. 0 quoted hunks.',
    href: T41,
    target: link(5),
    effects: [CHAIN],
  },
  {
    key: 'gate',
    label: 'Tier gate',
    act: 'travel',
    concept: 'Earned autonomy',
    caption: 'dep-bump.patch is Hands-off, earned from its record: 16 accepted, 94 % merged without edits, 14 clean days. So the gate merges with no human click.',
    href: '/ladder',
    target: { sel: '#row-dep-bump_2e_patch' },
  },
  {
    key: 'deploy',
    label: 'Deploy',
    act: 'travel',
    concept: null,
    caption: 'Staging: QA explores 12 paths and finds 0 regressions. Then production, behind the protected environment’s rule.',
    href: T41,
    target: link(6),
    effects: [CHAIN],
  },
  {
    key: 'summary',
    label: 'Summary',
    act: 'travel',
    concept: null,
    caption: 'The summary lands on issue #128. No CRA clock was needed: not actively exploited. The record grows by one.',
    href: T41,
    target: link(7),
    effects: [CHAIN],
  },
  {
    key: 'blocked',
    label: 'Blocked',
    act: 'wrong',
    concept: 'Guardrail',
    caption: 'A different change, !44: a dependency bump with an instruction hidden for agents. The guardrail quotes it and blocks it before any gate. Seeded fault.',
    href: T44,
    target: inspector('Exhibits'),
  },
  {
    key: 'tripwire',
    label: 'Tripwire',
    act: 'wrong',
    concept: 'Tripwire',
    caption: 'The first failure takes the class down, automatically: patch-bump drops to Quarantined, read and comment only. No person had to notice.',
    href: '/ladder',
    target: { sel: '#row-patch-bump' },
    effects: [{ kind: 'tripwire' }],
  },
  {
    key: 'needs',
    label: 'Needs you',
    act: 'you',
    concept: 'Needs you',
    caption: 'Only a person can bring it back. The decision waits here. Amber means: yours to decide, and nothing else is amber.',
    href: '/needs-you',
    target: { sel: '#row-n4' },
    cursor: true,
  },
  {
    key: 'run',
    label: 'Your Run',
    act: 'you',
    concept: 'Outbox',
    caption: 'Read the note, then Re-admit: your click stages the exact write in the Outbox. Nothing runs until you press Run, and on the demo Run only simulates it.',
    href: '/needs-you/n4',
    target: { sel: 'button', text: 'Read the incident note', parent: true },
    cursor: true,
    hold: true,
  },
  {
    key: 'recap',
    label: 'Recap',
    act: 'you',
    concept: null,
    caption: 'You have seen the ideas. Now meet them on the real screens.',
    href: '/needs-you/n4',
    target: null,
    hold: true,
  },
];

/** The rail's act labels, in order, with how many steps each spans. */
export const ACTS: readonly { act: Act; label: string; steps: number }[] = (
  [
    ['travel', 'A change travels'],
    ['wrong', 'It goes wrong'],
    ['you', 'Your turn'],
  ] as const
).map(([act, label]) => ({ act, label, steps: STEPS.filter((s) => s.act === act).length }));

/** The step index of a key; -1 when the story has no such step. */
export const stepIndex = (key: string): number => STEPS.findIndex((s) => s.key === key);
