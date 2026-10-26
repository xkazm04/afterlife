// Chapter one, Start: a text size you can read, then one project in, then the whole group, then the agents armed on it.
import type { Step } from '../steps';

export const START: readonly Step[] = [
  {
    key: 'text-size',
    label: 'Text size',
    chapter: 'start',
    concept: 'Text size',
    caption: 'First, make it comfortable to read. Afterlife starts at Smaller so the dense screens fit; pick Standard or Larger here, or press Ctrl or ⌘ with + and − on any screen.',
    href: '/settings/display',
    target: { sel: '#settings-text-size' },
    cursor: true,
  },
  {
    key: 'set-up',
    label: 'Projects',
    chapter: 'start',
    concept: 'Projects',
    caption: 'Everything starts with a project. Projects connects a repo on this machine to its GitLab group, and each step of its orbit lights only when Afterlife’s own check passes.',
    href: '/start',
    target: { sel: 'main' },
  },
  {
    key: 'estate',
    label: 'The estate',
    chapter: 'start',
    concept: 'Onboarding',
    caption: 'Then the rest of the group, a batch at a time: each project moves from discovered to baselined, paired, watching and into improvement cycles. Only a probe moves it on.',
    href: '/onboard/estate',
    target: { sel: 'ol[aria-label="Onboarding funnel"]' },
  },
  {
    key: 'tracks',
    label: 'Setup',
    chapter: 'start',
    concept: 'Tracks',
    caption: 'Each project gets eight agents, one per job after code: patching, CRA reports, guardrail review, pipeline repair and more. Setup arms them in order and lists what only you can do.',
    href: '/setup',
    target: { sel: 'section[aria-label="Unlock map"]' },
  },
];
