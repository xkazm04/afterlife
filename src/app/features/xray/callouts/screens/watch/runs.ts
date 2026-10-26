// Runs: what the runner did, from its own files in .afterlife/runs. Introduces the module, the lane ledger's columns and
// what to do; with no run files yet the table is not drawn and the empty state's command is the one thing to do. The
// screen has no "?" legend, so no help part. The outcome filter is a switch, so no part points at it.
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { DATA_LABEL, statusCallout } from '../../shared';

const TABLE = '[role="treegrid"][aria-label="Every lane of every wave"]';
/** A lane row: its DOM id is rowDomId('l:<repo>:<wave>:<lane>'), the colon escaped as _3a_. */
const LANE = `${TABLE} [role="row"][id^="row-l_3a_"]`;

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The header as drawn, left to right. */
const COLUMNS: readonly LegendEntry[] = [
  { name: 'Wave', means: 'The repo and the wave the lane ran in. A wave is one branch the runner worked (belay/wave-<n>).' },
  { name: 'Lane', means: 'The lane’s title, the change it was after; its id when it has none.' },
  { name: 'Outcome', means: 'How the lane ended: landed, parked, failed, budget or timeout; running while it has not.' },
  { name: 'Wave state', means: 'Its wave: mergeable only when git says the branch is not in its base yet; git not asked yet; in its base already or the branch gone; not mergeable; running; or unfinished (no wave.end in the file).' },
  { name: 'Why / commits', means: 'Why the lane parked or failed, in its own words, else how many commits it made.' },
  { name: 'Tokens', means: 'Input, output and cache tokens the lane reported. A dash is not reported, never zero.' },
  { name: 'Cost', means: 'Dollars the lane reported. A dash is not reported, and sinks to the bottom whichever way the column sorts.' },
  { name: 'Wall', means: 'The lane’s own wall-clock time; a dash while it is missing.' },
];

const empty = (r: ScreenRead): boolean => r.count(TABLE) === 0;

export const RUNS: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Runs',
    body: (r) =>
      empty(r)
        ? 'What did the runner do, and what did it cost? No run files yet: once the runner works a repo, every lane of every wave lands here with how it ended and what it cost.'
        : `What did the runner do, and what did it cost? ${plural(r.count(LANE), 'lane')} shown, one row each with its wave, costliest first, so the failures and the dear ones are one scan away. Read only: nothing here merges, pushes or writes.`,
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: `${TABLE} [data-part="thead"] [role="row"]`,
    title: 'What the columns mean',
    body: () => 'A wave is one branch the runner worked; its lanes are the separate changes in it. Click a header to sort by it; the outcome filter above keeps one kind of lane.',
    legend: COLUMNS,
  },
  {
    id: 'narrow',
    kind: 'activity',
    sel: LANE,
    title: 'Narrow to one wave',
    body: () => 'Enter or a double-click on a lane keeps only its wave’s lanes, with the wave’s outcomes and cost above the table. Enter again, Esc or "All lanes" shows every lane.',
    try: '↑ ↓ then Enter',
  },
  {
    id: 'merge',
    kind: 'activity',
    sel: `${LANE} [role="gridcell"]:nth-child(4)`,
    title: 'Is there a wave to take?',
    body: () =>
      'A wave says mergeable only once git says its branch is not in its base yet; select one of its lanes and the git commands to take it show above the table, in the repo’s own checkout. You run them yourself: Runs merges and pushes nothing.',
    try: 'Click a lane of a mergeable wave',
  },
  {
    id: 'start',
    kind: 'activity',
    sel: 'pre[aria-label="Start a run"]',
    title: 'Start a run',
    body: () => 'No runs yet. This command starts the runner on a repo; its events land in .afterlife/runs/<repo>/<wave>.jsonl and show up here.',
    try: 'Run it in a terminal',
  },
  statusCallout('The runs in one line', 'How to narrow to a wave and sort, or where the run files are looked for.'),
  {
    id: 'data',
    kind: 'shell',
    sel: DATA_LABEL,
    title: 'Where the data comes from',
    body: (r) => `"${r.text(DATA_LABEL)}" speaks for the rest of the app. This screen reads the runner’s own files in .afterlife/runs, real local data in demo and live alike.`,
  },
];
