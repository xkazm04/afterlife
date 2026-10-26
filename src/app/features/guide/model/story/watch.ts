// Chapter two, Watch: the screens that show the estate, from the table to production signals and replay.
import type { Step } from '../steps';

export const WATCH: readonly Step[] = [
  {
    key: 'fleet',
    label: 'Fleet',
    chapter: 'watch',
    concept: 'Fleet',
    caption: 'Once projects are in, Fleet is home: one row per project, saying who may act alone, what has gone stale and what waits for you. From here the tour plays on the demo estate.',
    href: '/fleet',
    target: { sel: '[role="treegrid"][aria-label="Projects"]' },
  },
  {
    key: 'monitor',
    label: 'Monitor',
    chapter: 'watch',
    concept: 'Monitor',
    caption: 'Monitor shows the same estate as live leads, one per group. Every amber pip is a decision waiting for a person.',
    href: '/monitor',
    target: { sel: '[role="group"][aria-label="Leads, one per group"]' },
  },
  {
    key: 'vitals',
    label: 'Vitals',
    chapter: 'watch',
    concept: 'Vitals',
    caption: 'Vitals measures a project in production: CI time per variant, production signals with the deploys on them, and which improvements an agent claimed actually earned their credit.',
    href: '/vitals',
    target: { sel: '[role="treegrid"]:is([aria-label="Projects"], [aria-label="Real projects"])' }, // demo rows beside real ones: "Projects"
  },
  {
    key: 'theater',
    label: 'Theater',
    chapter: 'watch',
    concept: 'Theater',
    caption: 'Theater replays an agent’s run beat by beat, to record it or show it to a room. Next: the same run, on the screens where it happened.',
    href: '/theater',
    target: { sel: 'section[aria-label^="The loop as a pitch"]' },
  },
];
