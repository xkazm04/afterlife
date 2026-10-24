// Fleet, the reference screen and the one the X-ray opens on: every project in one table. Introduces the module, the
// columns (one legend on the header row) and what to do; it does not explain the toolbar's own switches.
import type { Callout, LegendEntry } from '../../../model/types';
import { dataLabelCallout, helpCallout, navCallout, projectsIn, statusCallout } from '../../shared';

const TABLE = '[role="treegrid"][aria-label="Projects"]';
const ROWS = `${TABLE} [role="row"]:not([aria-expanded])`;

/** The Tiers column set as drawn (the default). Names are the headers' own; the two icon columns use their tooltips. */
const COLUMNS: readonly LegendEntry[] = [
  {
    name: 'Project',
    means: 'The GitLab project. Rows sit under their GitLab group; a click opens the project page.',
  },
  {
    name: 'State (ring)',
    means: 'Watching, Setting up, Stale or Not watched.',
  },
  {
    name: 'Needs you (◆)',
    means: 'Decisions waiting on you for this project. Amber means this and only this.',
  },
  {
    name: 'Hands-off',
    means: 'Action classes that act alone inside their envelope, revocable.',
  },
  {
    name: 'Supervised',
    means: 'Classes where the agent acts and a human approves the outcome.',
  },
  { name: 'Assisted', means: 'Classes where a human triggers every step.' },
  { name: 'Quarantined', means: 'Classes held to read and comment only.' },
  { name: 'Human only', means: 'Classes no agent may do.' },
  {
    name: 'Proofs',
    means: 'Proof Blocks of the last 7 days: pass, fail, inconclusive.',
  },
  {
    name: 'Stages',
    means: 'One tick per DevSecOps stage, its rung 0 to 4; dashed is unknown.',
  },
  {
    name: 'Feed',
    means: 'How long ago the project’s data was last read from GitLab.',
  },
];

export const FLEET: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Fleet',
    body: (r) =>
      `Across all ${projectsIn(r)} projects: who may act alone, what is stale, what needs me. One row per project, grouped as your GitLab groups are; every row reads the same way, so the odd one out stands out.`,
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: `${TABLE} [data-part="thead"] [role="row"]`,
    title: 'What the columns mean',
    body: () => 'Tiers are how far an agent may act alone, counted per project. A hatched row is stale: its numbers are the last known, not live. A dashed mark is unknown, never counted as zero.',
    legend: COLUMNS,
  },
  {
    id: 'open',
    kind: 'activity',
    sel: `${ROWS} a[title^="Open "]`,
    title: 'Open a project',
    body: () => 'A row is one project. Its name opens the project page: what waits on it, autonomy by class, proofs, stages, cost and its feed.',
    try: '↑ ↓ then Enter',
  },
  {
    id: 'needs',
    kind: 'activity',
    sel: `${ROWS} [role="img"][aria-label$="waiting for you"]`,
    title: 'Decisions waiting on you',
    body: () => 'The amber ◆ number is the decisions waiting on that project, and the only amber on the screen. Go to Needs you to read each one and answer it.',
    try: 'Click Needs you in the sidebar',
  },
  {
    id: 'stale',
    kind: 'activity',
    sel: `${TABLE} [role="row"][data-stale="true"]`,
    title: 'A stale row',
    body: () => 'A hatched row is a stale project: its numbers are the last known values, not live, and its amber is outlined. Right-click it and Re-poll to read it again.',
    try: 'Right-click the row, Re-poll',
  },
  {
    id: 'group',
    kind: 'activity',
    sel: `${TABLE} [role="row"][aria-expanded]`,
    title: 'A group row',
    body: (r) => {
      const [name = 'A group'] = r.text(`${TABLE} [role="row"][aria-expanded]`).split(' ');
      return `${name}: the group’s own totals in the same columns as its projects, so a group reads like a project. The chevron folds it.`;
    },
    try: '← → fold and open',
  },
  navCallout('Fleet'),
  statusCallout('The whole table in one line', 'The left of the status bar always says how much is shown and how fresh it is.'),
  dataLabelCallout,
  helpCallout,
];
