// Setup: what stands between one project and each armed track, and which of those steps only you can do. Introduces the
// module, the unlock map's three lanes (one legend) and what to do; it does not explain the group menu or the doctor
// lozenge's highlight.
import type { Callout, LegendEntry } from '../../../model/types';
import { dataLabelCallout, helpCallout, statusCallout } from '../../shared';

const GATES = '[aria-label="Only you can do these"]';
const MAP = 'section[aria-label="Unlock map"]';

/** The map's three lanes, named as their headings render, and the marks their nodes carry. */
const LANES: readonly LegendEntry[] = [
  { name: 'Path (steps 0–14)', means: 'Fifteen steps in four phases: Prepare, Connect, Install, Prove. ✓ is read done; a number is still to do.' },
  { name: 'you', means: 'A step only you can do (a licence, a token, a merge), in amber: it waits for a person.' },
  { name: 'Tracks (arm order)', means: 'The eight agents, in the order they arm: locked (a need is missing), ready, merge !N (an arm MR open), ✓ armed.' },
  { name: 'GitLab (belay doctor)', means: 'What your GitLab offers, one capability per row: ✓ available, ✕ unavailable, ? unknown (never counted as available).' },
  { name: 'Lines', means: 'Which steps and capabilities a track hangs on. Hover a node to light what it frees and what it needs.' },
];

export const SETUP: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Setup',
    body: (r) => {
      const need = r.count(`${GATES} button`);
      return `What stands between this one project and each armed track, and which steps only I can do? The strip on top counts where you stand${need ? ` and lists the ${need} gates waiting for you` : ''}; the map below shows what each step frees.`;
    },
  },
  {
    id: 'columns',
    kind: 'columns',
    sel: MAP,
    title: 'How to read the map',
    body: () => 'Three lanes, left to right: the steps you take, the agents they unlock, and what GitLab offers them. A dashed node or line is unknown, never rounded up.',
    legend: LANES,
  },
  {
    id: 'gates',
    kind: 'activity',
    sel: `${GATES} button`,
    title: 'What only you can do',
    body: (r) => {
      const first = r.text(`${GATES} button`);
      return `${first ? `"${first}". ` : ''}Each gate opens its step’s page: the exact command to copy and what clears it. Afterlife does not run it for you.`;
    },
    try: 'Click a gate',
  },
  {
    id: 'step',
    kind: 'activity',
    sel: `${MAP} [data-node^="step:"]`,
    title: 'Open a step',
    body: () => 'A step’s page holds its commands (Copy only), what it frees and how it is checked; ✓ means a read saw it done.',
    try: 'Click a step, or Enter',
  },
  {
    id: 'track',
    kind: 'activity',
    sel: `${MAP} [data-node^="track:"]`,
    title: 'Arm a track',
    body: () => 'A ready track’s page shows its arm MR as the server planned it. It opens in GitLab only on your confirmed click; a person merges it, then "I merged it · verify" reads main.',
    try: 'Click a track',
  },
  {
    id: 'reprobe',
    kind: 'activity',
    sel: 'button[title^="Re-probe the group"]',
    title: 'Read GitLab again',
    body: (r) =>
      r.text('[data-xray="data-label"]') === 'illustrative demo data'
        ? 'Re-probe runs belay doctor against the group again. Here it is simulated on the demo’s acme-lab; it only ever reads.'
        : 'Re-probe runs belay doctor against your group again and re-reads the steps. It only reads; it writes nothing.',
  },
  statusCallout('The project in one line', 'Steps read done, tracks armed, what needs you, and how old the doctor’s probe is.'),
  dataLabelCallout,
  helpCallout,
];
