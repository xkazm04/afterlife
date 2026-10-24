// Maturity: how far up the nine DevSecOps stages this project's evidence reaches, and which gap is worth closing next.
// Introduces the module, the crag and the gaps table (one legend each), and the send; it does not explain the crag's
// Day 0 / Now / Target switch.
import type { Callout, LegendEntry } from '../../../model/types';
import { dataLabelCallout, statusCallout } from '../../shared';

const CRAG = '[data-crag]';
const ROUTES = `${CRAG} svg[aria-label^="Nine stage routes"]`;
const GAPS = 'section[aria-label="Gaps worth exploring"]';

/** The crag's marks, as its own legend names them. */
const CRAG_MARKS: readonly LegendEntry[] = [
  { name: 'Route', means: 'One per stage, plan to govern, left to right. Click it for the stage page.' },
  {
    name: 'R0 to R4 (bolts)',
    means: 'The rungs: R0 absent, R1 configured, R2 running, R3 enforced, R4 self-proving.',
  },
  { name: 'Rope', means: 'Climbs as high as there is evidence; it turns green (deep) at R3 enforced or higher.' },
  { name: 'Chalk d0', means: 'The Day 0 high point: where the first scan found the stage.' },
  { name: 'Ring and tag (g1 ...)', means: 'The next bolt; a tag on it is a gap the scan proposes. A ✓ tag is picked and waits for you.' },
  { name: '?', means: 'Unknown: drawn dashed, never counted as R0.' },
];

/** The gaps table's columns, named as the header renders them (✓ is the pick column). */
const GAP_COLUMNS: readonly LegendEntry[] = [
  { name: '✓', means: 'Pick the gap for the next send. Picking writes nothing.' },
  { name: 'Gap', means: 'The gap’s id, the same tag the crag hangs on its stage’s next bolt.' },
  { name: 'Stage', means: 'The DevSecOps stage it would lift.' },
  { name: 'Move', means: 'The rung it would climb, from → to (R2 → R3).' },
  { name: 'Worth exploring', means: 'What the change is, worded as an invitation. A click opens its stage page with the diff.' },
  { name: 'Tier', means: 'Who acts on it: A Assisted means a person sends and merges it; "probe · read only" only reads.' },
  { name: 'Diff', means: 'Lines the change adds; — for a probe, which writes nothing.' },
  { name: 'State', means: '● picked (waits for you), then once sent: opened → merged → ran → credited or no lift, with its next move.' },
];

export const MATURITY: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Maturity',
    body: (r) => {
      const gaps = r.count(`${GAPS} [role="rowgroup"] [role="row"]`);
      return `How far up each of the nine DevSecOps stages does this project’s evidence reach, and which gap is worth closing next? The crag draws one route per stage; ${gaps ? `the ${gaps} gaps under it` : 'the gaps under it'} are the changes the scan found worth exploring, each sent only as you.`;
    },
  },
  {
    id: 'crag',
    kind: 'columns',
    sel: ROUTES,
    title: 'How to read the crag',
    body: () => 'Each route is a stage, each bolt a rung. The higher the rope, the more of the stage the scan saw working; green rope is enforced.',
    legend: CRAG_MARKS,
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: `${GAPS} > [role="row"]`,
    title: 'What the gap columns mean',
    body: () => 'One row per gap the scan proposes, the same gaps the crag tags. A — is nothing yet, never zero.',
    legend: GAP_COLUMNS,
  },
  {
    id: 'stage',
    kind: 'activity',
    sel: `${ROUTES} [data-stage]`,
    title: 'Open a stage',
    body: () => 'A stage page shows the evidence behind each earned rung, what the next one still lacks, the gap’s diff, and its credit history.',
    try: 'Click a route, or ← → then Enter',
  },
  {
    id: 'pick',
    kind: 'activity',
    sel: `${GAPS} button[role="checkbox"]`,
    title: 'Pick a gap',
    body: (r) => {
      const picked = r.count(`${GAPS} button[role="checkbox"][aria-checked="true"]`);
      return `Picking marks a gap for the next send and writes nothing.${picked ? ` ${picked} picked now.` : ''}`;
    },
    try: 'P on a row',
  },
  {
    id: 'send',
    kind: 'activity',
    sel: 'nav[aria-label="Next move"] button[title^="Send as you"]',
    title: 'Send as you',
    body: () => 'Opens the Send sheet with the server’s exact commands for each picked gap. Nothing reaches GitLab until you confirm there, as you; a person merges the MR.',
    try: '3',
  },
  {
    id: 'rescan',
    kind: 'activity',
    sel: 'button[title^="Rescan"]',
    title: 'Credit the merged gaps',
    body: () => 'Rescan decides every merged gap at once: credit, or no lift when the change never ran. With nothing merged it only reads. Simulated here, and marked so.',
    try: 'R',
  },
  statusCallout('The nine stages in one line', 'Deep is R3 or higher; unknown stages are counted apart, never as absent.'),
  dataLabelCallout,
  {
    id: 'help',
    kind: 'shell',
    sel: `${CRAG} button[aria-label="Legend"]`,
    title: 'Legend and credit rules',
    body: () => 'Every crag mark, the four rules a rescan credits by, and the screen’s keys sit behind this ?.',
    try: 'Click ?',
  },
];
