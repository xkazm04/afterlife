// Vitals: a real project's measured health, from the files Afterlife collected for it (.belay/vitals/<slug>). On /vitals
// the parts are the list of real projects (or the Onboard call when there is none); on /vitals/<slug> the Delivery
// table, the Refresh button and the inspector. A part that is not drawn on the page shown is skipped.
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { DATA_LABEL, statusCallout } from '../../shared';

const LIST = '[role="treegrid"][aria-label="Real projects"]';
const DELIVERY = '[role="treegrid"][aria-label="Delivery by variant"]';
const ROW = (t: string): string => `${t} [role="row"][aria-level="1"]`;

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The Delivery header as drawn: one row per variant of the project's pipelines. */
const COLUMNS: readonly LegendEntry[] = [
  { name: 'Variant', means: 'How a run is told apart: master full, its hotfix lane, a feature PR, nightly. "unclassified" holds the runs no saved rule matched.' },
  { name: 'Pipeline', means: 'The CI pipeline (or pipelines) the variant’s rule reads.' },
  { name: 'Runs', means: 'Runs counted of runs stored. A run still running, without a finish time, or canceled is listed but not counted.' },
  { name: 'Median', means: 'The middle run duration, finish less start, over the counted runs. A dash is nothing counted, never zero.' },
  { name: 'p90', means: 'The duration nine runs in ten stay under.' },
  { name: 'Fail', means: 'Failed runs as a share of the finished ones (succeeded, failed, partial).' },
  { name: 'Slowest stage', means: 'The stage with the highest median time, and that median.' },
  { name: 'Trend', means: 'The last 30 counted run durations, oldest left; an empty cell is a run not stored.' },
];

const onList = (r: ScreenRead): boolean => r.count(DELIVERY) === 0;

export const VITALS: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Vitals',
    body: (r) =>
      onList(r)
        ? r.count(LIST) === 0
          ? 'How is a real production app doing, measured by Afterlife itself? No real project is onboarded yet: onboard one and its CI times, production signals and adjustments land here.'
          : `How is a real production app doing, measured by Afterlife itself? ${plural(r.count(ROW(LIST)), 'real project')} watched; open one for its delivery, production and adjustments.`
        : `How is this project doing? ${plural(r.count(ROW(DELIVERY)), 'variant')} of CI timed from its own runs, its production signals with the deploys on them, and every adjustment an agent claimed beside Afterlife’s own measurement.`,
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: `${DELIVERY} [data-part="thead"] [role="row"]`,
    title: 'What the columns mean',
    body: () => 'Delivery: one row per variant. Every time is read from the stored runs, finish less start; a dash is not measured.',
    legend: COLUMNS,
  },
  {
    id: 'open',
    kind: 'activity',
    sel: ROW(LIST),
    title: 'Open a project',
    body: () => 'Enter or a double-click opens the project’s three bands: Delivery, Production and Adjustments.',
    try: '↑ ↓ then Enter',
  },
  {
    id: 'onboard',
    kind: 'activity',
    sel: 'main a[href="/start"]',
    title: 'Onboard a project',
    body: () => 'Pick a repo you work in with Claude Code; Afterlife proposes what to watch and saves only what its probes confirm.',
    try: 'Click it',
  },
  {
    id: 'pick',
    kind: 'activity',
    sel: ROW(DELIVERY),
    title: 'Pick a variant',
    body: () => 'Click a variant, a signal or an adjustment: the inspector shows its per-stage median and p90 with the last runs, its 7-day trend, or the claim beside the measurement.',
    try: 'Click a row',
  },
  {
    id: 'refresh',
    kind: 'activity',
    sel: '[data-xray="collected"] ~ button',
    title: 'Collect again',
    body: (r) => `${r.text('[data-xray="collected"]') || 'When it was last collected'}. Refresh reads the CI runs and production points newer than the stored ones, through your own az or glab login. Opening a project more than 15 minutes stale collects once.`,
    try: 'Click Refresh',
  },
  statusCallout('The project in one line', 'Variants, runs stored, when they were collected and the repo they come from.'),
  {
    id: 'data',
    kind: 'shell',
    sel: DATA_LABEL,
    title: 'Where the data comes from',
    body: (r) => `"${r.text(DATA_LABEL)}" speaks for the demo screens. Vitals reads only what Afterlife collected for a real project, in .belay/vitals: no demo number appears here.`,
  },
];
