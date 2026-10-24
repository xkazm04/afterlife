// Theater: one change replayed as it climbs the whole loop. Introduces the film, the four answers it is read by, and the
// transport; it does not explain the take list's own buttons beyond the one take worth watching.
import type { Callout, LegendEntry } from '../../../model/types';
import { dataLabelCallout, helpCallout, statusCallout } from '../../shared';

const SLATE = 'span[title^="An illustrative ledger slice"], span[title^="Read from belay-ledger"]';
const ANSWERS = 'section[aria-label="Four answers"], section[aria-label="Doing now"]';

/** The four answers across the top of the stage, named as their cards render them. */
const ANSWER_CARDS: readonly LegendEntry[] = [
  { name: 'Running', means: 'Tracks armed, of the eight, in the demo catalogue.' },
  { name: 'Doing now', means: 'The ledger entry under the playhead: who did what, this beat.' },
  { name: 'Going well', means: 'This week’s proofs passed and failed, and demotions: counts only.' },
  { name: 'Needs me', means: 'Items waiting for a person, and the oldest one’s age. It pulses only when one is added.' },
];

export const THEATER: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Theater',
    body: (r) => {
      const slate = r.text(SLATE);
      return `What does one change look like as it climbs the whole loop, from finding to production, with proofs and a caught fault on the way? A replay, never live${slate ? `: ${slate}` : ''}. The change climbs the pitch hold by hold; the rail on the right keeps the tiers and stages it moves.`;
    },
  },
  {
    id: 'answers',
    kind: 'columns',
    sel: ANSWERS,
    title: 'The four answers',
    body: () => 'Read at the playhead, so they change as the film plays. A film from a real belay-ledger shows only Doing now: the ledger states no armed tracks, weekly counts or waiting items.',
    legend: ANSWER_CARDS,
  },
  {
    id: 'roll',
    kind: 'activity',
    sel: '[role="group"][aria-label="Transport"] button[title^="Roll the take"]',
    title: 'Play a take',
    body: () => 'The film is cut into takes, one per stretch of the loop. Roll cues the take to its in-point and plays it through; space pauses, ← → step one entry.',
    try: '1 then R',
  },
  {
    id: 'climb',
    kind: 'activity',
    sel: 'section[aria-label^="The loop as a pitch"]',
    title: 'Watch the climb',
    body: (r) =>
      r.count('[role="group"][aria-label="Takes"] button[title*="seeded"]') || r.text(SLATE).includes('illustrative')
        ? 'The !41 patch climbs nine holds, finding to production; rope below is proven. Take 6 is seeded, drawn dashed: the !44 bump hides an instruction in an upstream changelog, the guardrail catches it, its proof is BLOCKED and patch-bump drops to Quarantined while !41 climbs on.'
        : 'One MR per take climbs the holds its ledger events reach, finding to production; rope below is proven, rope above not yet climbed.',
    try: '1 to 8 pick a take',
  },
  {
    id: 'inspector',
    kind: 'activity',
    sel: 'aside[data-inspector]',
    title: 'The beat, in full',
    body: () => 'The current beat’s checks, its ledger lines and what it needs. Click a line to seek the film to that entry; the address keeps it as #seq=.',
    try: 'Click a ledger line',
  },
  {
    id: 'present',
    kind: 'activity',
    sel: 'button[title^="Present:"]',
    title: 'Show it to a room',
    body: () => 'Present hides all chrome and fills the screen with the stage; the take keys still work. Esc returns.',
    try: 'F',
  },
  statusCallout('Where the playhead is', 'The film’s seq and clock at the playhead, the take, and its in and out marks.'),
  dataLabelCallout,
  helpCallout,
];
