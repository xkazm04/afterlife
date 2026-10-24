// Needs you: the desk of decisions that wait for a person, and what each click will write. Introduces the module, the
// table's columns and the few things a person does here; not the grouping switch or the search box.
import { numberIn } from '../../../model/dom';
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { STATUS, helpCallout, navCallout, statusCallout } from '../../shared';

const DECISIONS = '[role="treegrid"][aria-label="Decisions"]';
const ROWS = `${DECISIONS} [role="row"]:not([aria-expanded]):not([data-part])`;
const OUTBOX = 'section[aria-label="Outbox"]';

/** A count from the status line ("8 decisions · 6 waiting · 1 on a clock · 0 in outbox"), or null when it is not said. */
const said = (r: ScreenRead, words: string): string | null => new RegExp(`(\\d+) ${words}`).exec(r.text(STATUS))?.[1] ?? null;

/** The desk's columns as drawn. Demo and live share all but Writes, Trk and State (demo) and Project (live). */
const COLUMNS: readonly LegendEntry[] = [
  {
    name: 'Decision',
    means: 'What is asked of you, by project and class. "Decided this week" is always the last group; a "seeded" chip marks demo input.',
  },
  { name: 'Project', means: 'Live desk only: the GitLab project it is for.' },
  {
    name: 'Move',
    means: 'What changes: a tier (S → H is Supervised to Hands-off), a rung (R3 → R4) or the CRA packet grade.',
  },
  { name: 'Writes', means: 'What the click writes in GitLab: a policy MR, a draft MR and its lines, a label and note, or none.' },
  { name: 'Trk', means: 'The agent track it comes from (T1 to T8); — for none.' },
  { name: 'When', means: 'Time left on a legal clock, counting down, or when it was opened.' },
  {
    name: 'State',
    means: 'waiting (amber: it waits for you), picked or you pick (a gap), in outbox (staged, not sent), decided. Dashed is unknown, never zero.',
  },
  { name: 'Action', means: 'The row’s one button: read, pick or stage. It never sends.' },
];

export const NEEDS_YOU: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Needs you',
    body: (r) => {
      if (!r.count(DECISIONS)) {
        return 'What waits for a person, and what will each click write? Nothing waits that Belay knows of yet: the desk fills as the poller finds quarantined classes, gaps to pick and setup steps in your group.';
      }
      const waiting = said(r, 'waiting');
      const clock = said(r, 'on a clock');
      return `What waits for a person, and what will each click write? ${waiting ?? 'Every'} decision${waiting === '1' ? '' : 's'} wait${waiting === '1' ? 's' : ''} for you here${clock && clock !== '0' ? `, ${clock} on a legal clock` : ''}, and nothing else. Every write is staged first with its exact command, and reaches GitLab only when you press Run.`;
    },
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: `${DECISIONS} [data-part="thead"] [role="row"]`,
    title: 'What the columns mean',
    body: () => 'One row per decision, grouped; a group row carries its own count and its amber waiting badge. Amber means only that a person must act.',
    legend: COLUMNS,
  },
  {
    id: 'clock',
    kind: 'activity',
    sel: 'section[aria-label="CRA legal clock"]',
    title: 'The decision on a clock',
    body: (r) => {
      const left = r.text('section[aria-label="CRA legal clock"] [role="timer"]');
      return `The CRA early warning, the loudest thing here${left ? `: ${left} left` : ''}, and the clock never pauses. Read the draft first; only then does Ready to sign stage the mark. A person submits on ENISA, never Belay. In the demo it is a seeded drill.`;
    },
    try: 'Click Read the draft',
  },
  {
    id: 'open',
    kind: 'activity',
    sel: `${ROWS} a[title]`,
    title: 'Open a decision',
    body: () => 'A row’s title opens the decision’s own page: what it is, its evidence, and "The click", which says what the button writes and what it will not do.',
    try: '↑ ↓ then Enter',
  },
  {
    id: 'act',
    kind: 'activity',
    sel: `${ROWS} button:not([role])`,
    title: 'Stage the write',
    body: () => 'The row’s button reads, picks or stages. Staging puts the exact write in the Outbox for you to read; nothing reaches GitLab yet. Right-click a row for Not yet, Retire and Copy Command.',
    try: 'Space on a row',
  },
  {
    id: 'outbox',
    kind: 'activity',
    sel: OUTBOX,
    title: 'Run, as you',
    body: (r) => {
      const n = numberIn(r.text(OUTBOX), '0');
      return `${n === '0' ? 'Empty now. ' : `${n} staged. `}Each staged write shows its command and diff. Run is the only send and runs as you; Remove says nothing was sent.`;
    },
  },
  navCallout('Needs you'),
  statusCallout('The desk in one line', 'Waiting, on a clock and in the outbox: the counts the sidebar filters by.'),
  helpCallout,
];
