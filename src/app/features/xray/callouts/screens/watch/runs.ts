// Runs: what the runner did, from its own files in .afterlife/runs. Introduces the module, the table's columns and what to
// do; with no run files yet the table is not drawn and the empty state's command is the one thing to do. The screen
// has no "?" legend, so no help part.
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { DATA_LABEL, statusCallout } from '../../shared';

const TABLE = '[role="treegrid"][aria-label="Runs by repo and wave"]';
/** A wave row: its DOM id is rowDomId('w:<repo>:<wave>'), the colon escaped as _3a_. */
const WAVE = `${TABLE} [role="row"][id^="row-w_3a_"]`;
const REPO = `${TABLE} [role="row"][aria-expanded]`;

const plural = (n: number, one: string): string => `${n} ${one}${n === 1 ? '' : 's'}`;

/** The header as drawn; a wave row fills it, and an opened lane row reuses it after the slash. */
const COLUMNS: readonly LegendEntry[] = [
  { name: 'Wave / lane', means: 'Repos are the group rows; under each, its waves; an opened wave lists its lanes. A proposals chip means a <wave>.proposals.md sits beside the events.' },
  { name: 'State', means: 'A wave: running, mergeable, not mergeable, or unfinished (no wave.end in the file). A lane: landed, parked, failed, budget or timeout.' },
  { name: 'Branch / model', means: 'The wave’s branch (belay/wave-<n>); a lane’s model.' },
  { name: 'Outcomes / detail', means: 'A wave’s lanes by outcome, then the ones still open; a lane’s commits or why it parked. The group row gives the share landed.' },
  { name: 'Tokens', means: 'Input, output and cache tokens the lanes reported. A dash is not reported, never zero.' },
  { name: 'Cost', means: 'Dollars: the wave’s own figure, else the sum of its lanes that reported one. A dash is not reported.' },
  { name: 'Wall', means: 'Wall-clock time from wave.start to wave.end, or the lane’s own; a dash while one is missing.' },
  { name: 'Prompt', means: 'The prompt version the run used, so two waves can be compared like for like.' },
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
        ? 'What did the runner do on each repo, and how did each wave end? No run files yet: once the runner works a repo, every wave and its lanes land here with what they cost.'
        : `What did the runner do on each repo, and how did each wave end? ${plural(r.count(WAVE), 'wave')} across ${plural(r.count(REPO), 'repo')}, with their lanes, cost and time. Read only: nothing here merges, pushes or writes.`,
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: `${TABLE} [data-part="thead"] [role="row"]`,
    title: 'What the columns mean',
    body: () => 'A wave is one branch the runner worked; its lanes are the separate changes in it. The repo row totals its waves in the same columns.',
    legend: COLUMNS,
  },
  {
    id: 'open',
    kind: 'activity',
    sel: WAVE,
    title: 'Open a wave',
    body: () => 'Enter or a double-click opens a wave into its lanes: each lane’s outcome, model, commits or park reason, and what it cost.',
    try: '↑ ↓ then Enter',
  },
  {
    id: 'merge',
    kind: 'activity',
    sel: `${WAVE} [role="gridcell"]:nth-child(2)`,
    title: 'Take a mergeable wave',
    body: () => 'Select a mergeable wave and the exact git commands to take it show above the table, in the repo’s own checkout. You run them yourself: Runs merges and pushes nothing.',
    try: 'Click a mergeable wave',
  },
  {
    id: 'start',
    kind: 'activity',
    sel: 'pre[aria-label="Start a run"]',
    title: 'Start a run',
    body: () => 'No runs yet. This command starts the runner on a repo; its events land in .afterlife/runs/<repo>/<wave>.jsonl and show up here.',
    try: 'Run it in a terminal',
  },
  statusCallout('The runs in one line', 'How to open a wave, or where the run files are looked for.'),
  {
    id: 'data',
    kind: 'shell',
    sel: DATA_LABEL,
    title: 'Where the data comes from',
    body: (r) => `"${r.text(DATA_LABEL)}" speaks for the rest of the app. This screen reads the runner’s own files in .afterlife/runs, real local data in demo and live alike.`,
  },
];
