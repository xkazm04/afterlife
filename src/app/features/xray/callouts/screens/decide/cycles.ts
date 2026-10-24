// Cycles: one project's improvement as a loop of cycles, replayed from day 0. Introduces the default (project) scope:
// the module, how to read the grid and a cycle's changes, and what to do; not the ledgerline | Estate switch.
import type { Callout, LegendEntry } from '../../../model/types';
import { dataLabelCallout, helpCallout, statusCallout } from '../../shared';

const ANSWER = 'section[aria-label="Where the cycles stand"]';
const GRID = 'section[aria-label="Every stage, every cycle"]';
const HEADS = '[aria-label="Rung per stage after every cycle"] button[aria-pressed]';
const CHANGES = 'section[role="table"][aria-label$=" changes"]';
const RAIL = 'ol[aria-label$=" phases"]';

/** The grid: columns are cycles, rows are stages, each cell a rung. */
const GRID_LEGEND: readonly LegendEntry[] = [
  { name: 'Stage', means: 'One row per DevSecOps stage, Plan to Monitor.' },
  { name: 'Day 0 (first scan)', means: 'The first scan: where every stage stood before any cycle.' },
  {
    name: 'A closed cycle (C1, C2 …)',
    means: 'Each stage’s rung after that cycle’s closing rescan, R0 to R4: the brighter, the higher. A glow is a lift the rescan credited; pink is drift, a rung that fell; a ring is a change tried and not earned.',
  },
  {
    name: 'The running cycle (now)',
    means: 'The running cycle. A dashed →4 is the rung a picked change aims for, not yet earned.',
  },
  { name: 'The planned cycle (next)', means: 'The planned cycle: what its proposed changes aim for, dashed.' },
  { name: 'Trajectory', means: 'Rungs held after each cycle; dashed for what the open cycles would add.' },
  {
    name: 'Rungs',
    means: 'The total held after each column and its net (+2, 0, -1). ≤ is the most the open cycles could reach. A "?" cell is unknown, never counted as zero.',
  },
];

/** A cycle's changes, as the table under the grid draws them. */
const CHANGES_LEGEND: readonly LegendEntry[] = [
  { name: 'Change', means: 'The MR or the gap it came from; "probe" or "drift" for a row no MR made.' },
  { name: 'Stage', means: 'The stage it tries to lift. One change per stage, so a rescan can say which one earned it.' },
  { name: 'Move', means: 'From the rung the replay holds to the rung it aims for.' },
  { name: 'What and why', means: 'The change, and the rescan’s reason for its verdict.' },
  { name: 'Diff', means: 'Lines added; — when none.' },
  {
    name: 'Verdict',
    means: 'credited, no lift, rejected, resolved, regressed; picked (amber, waits for you) or planned while the cycle is open. Only credited, resolved and regressed move a rung.',
  },
];

export const CYCLES: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Cycles',
    body: (r) => {
      const answer = r.text(ANSWER);
      if (!answer) {
        return 'What has each round of improvement earned, and does each history add up? Every project in cycles, per group, each replayed from day 0 against its rungs today.';
      }
      const [, held, total] = /(\d+) of (\d+) rungs/.exec(answer) ?? [];
      return `What has each round of improvement earned, does the history add up to the latest scan, and what runs next? ${held ? `${held} of ${total} rungs are held now.` : ''} A cycle scans, picks, sends, merges, proves and credits, and closes only when a same-engine rescan has judged every change; the band’s two proofs say whether the replay matches that scan.`;
    },
  },
  {
    id: 'grid',
    kind: 'columns',
    sel: GRID,
    title: 'Every stage, every cycle',
    body: () => 'Read across: a stage from day 0 through every cycle. Read down: one cycle’s rungs and their total at the foot.',
    legend: GRID_LEGEND,
  },
  {
    id: 'changes',
    kind: 'columns',
    sel: `${CHANGES} [role="row"]:has(> [role="columnheader"])`,
    title: 'The selected cycle’s changes',
    body: () => 'Each change the selected cycle tried, and what its closing rescan made of it. A drift row is not a change anyone made: it is what the rescan found had slipped.',
    legend: CHANGES_LEGEND,
  },
  {
    id: 'pick',
    kind: 'activity',
    sel: HEADS,
    title: 'Pick a cycle',
    body: (r) => `${r.text(`${HEADS}[aria-pressed="true"]`) || 'The selected cycle'} is selected. Click a column head to read that cycle: its phases, its changes and, in the inspector, its closing checks. A closed cycle’s inspector has Report, the hand-back as Markdown to paste under its issue, as you.`,
    try: '← → · Home End',
  },
  {
    id: 'rail',
    kind: 'activity',
    sel: RAIL,
    title: 'Where the cycle stands',
    body: (r) => `"${r.text(RAIL).replace(/\s*↺$/, '')}". Amber phases wait for a person: you pick and send in Maturity, and a person merges in GitLab. Afterlife holds no merge token.`,
  },
  {
    id: 'design',
    kind: 'activity',
    sel: 'header button[title^="Design "]',
    title: 'Design the next cycle',
    body: () => 'Pick the planned cycle’s changes; the grid previews them and the rules are checked as you pick: one change per stage, at most four, an unknown rung probed first. A saved design is kept on this screen only.',
    try: 'Click Design',
  },
  statusCallout('The loop in one line', 'Cycles closed, the one running, the scan and engine every credit is measured against.'),
  dataLabelCallout,
  helpCallout,
];
