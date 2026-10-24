// Trace: setting up the first project as one wire, from this machine to the group. Introduces the module, the wire's six
// links (one legend: the wire is the screen) and what to do; the flow itself is as built.
import type { Callout, LegendEntry } from '../../../model/types';
import { STATUS, dataLabelCallout, statusCallout } from '../../shared';

const WIRE = '[aria-label="The wire, this machine to Afterlife"]';
const COMMAND = 'pre[aria-label^="Command for"]';

/** The six links of the wire, named as their cards render them, and the four marks a link can carry. */
const LINKS: readonly LegendEntry[] = [
  { name: 'glab installed', means: 'This machine can start glab, the GitLab CLI every probe reads through.' },
  { name: 'Signed in', means: 'glab is logged in to your GitLab, as you; Afterlife never reads or keeps the token.' },
  { name: 'Group readable', means: 'Your login can read the group BELAY_GROUP_ID names and list its projects.' },
  { name: 'Live, first poll', means: 'Afterlife runs with BELAY_MODE=live and its first poll of the group has finished.' },
  { name: 'belay doctor', means: 'Eleven capability probes of what your GitLab offers the agents (GETs only).' },
  { name: 'Unlock map', means: 'Ready once every link before it passes: the 15 steps for one project, in Setup.' },
  { name: '✓ ✕ … ?', means: '✓ passes, ✕ blocked, … waits behind an earlier link, ? not probed yet (never counted as passing).' },
];

export const TRACE: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Trace',
    body: (r) => {
      const [pass = '', of = ''] = /(\d+) of (\d+) pass/.exec(r.text(STATUS))?.slice(1) ?? [];
      return `Is this machine, my GitLab login and my group ready? Setting up your first project as one wire${of ? `: ${pass} of ${of} links pass now` : ''}. Each link lights when the app’s own probe passes, and every probe only reads.`;
    },
  },
  {
    id: 'wire',
    kind: 'columns',
    sel: WIRE,
    title: 'How to read the wire',
    body: () => 'Left to right, this machine to Afterlife: a link can only pass once the one before it does. Click a link to see what clears it.',
    legend: LINKS,
  },
  {
    id: 'command',
    kind: 'activity',
    sel: COMMAND,
    title: 'Clear a link',
    body: (r) => {
      const node = r.text('main h2');
      return `${node ? `For ${node}: ` : ''}the exact command that clears the selected link. Copy it into your own terminal; Afterlife runs none of these and writes nothing.`;
    },
    try: 'Copy command',
  },
  {
    id: 'recheck',
    kind: 'activity',
    sel: '[data-xray="recheck"]',
    title: 'Check again',
    body: () => 'After you run a command, Re-check all probes every link again, read only, as your own glab login. A changed environment variable needs a server restart first.',
    try: 'Re-check all',
  },
  statusCallout('How far the wire reaches', 'How many links pass, when they were probed, and that this screen writes nothing.'),
  dataLabelCallout,
];
