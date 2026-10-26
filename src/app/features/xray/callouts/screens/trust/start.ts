// Set up my first project (/start): one wizard from this machine through GitLab to Afterlife. Introduces the module,
// the steps (one legend: the rail is the screen), the two ways through a step, and checking again. Replaces the Trace and
// Onboard tours (both screens redirect here).
import type { Callout, LegendEntry } from '../../../model/types';
import { STATUS, dataLabelCallout, statusCallout } from '../../shared';

const RAIL = 'ol[aria-label="Setup steps"]';
const COMMAND = 'pre[aria-label^="Command for"]';

/** The eight steps, named as the rail shows them, and the marks a step carries. */
const STEPS: readonly LegendEntry[] = [
  { name: 'Pick a repo', means: 'A repo you work in with Claude Code; its git remote names the GitLab group.' },
  { name: 'glab installed', means: 'This machine can start glab, the GitLab CLI every probe reads through.' },
  { name: 'Signed in', means: 'glab is logged in to your GitLab, as you; Afterlife never reads or keeps the token.' },
  { name: 'Group readable', means: 'Your login can read the group and list its projects.' },
  { name: 'Live, first poll', means: 'Afterlife runs live and its first poll of the group has finished.' },
  { name: 'What to watch', means: 'A low-effort model proposes the stack; a read-only probe confirms each line.' },
  { name: 'Save the project', means: 'Only the confirmed lines, to Afterlife’s own data folder, never into the repo.' },
  { name: 'Unlock map', means: 'Ready once every step before it is done: the 15 steps for one project, in Setup.' },
  { name: 'Marks', means: '✓ done, ✕ blocked, a breathing ring while its check runs, amber when it waits for you.' },
];

export const START: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Set up my first project',
    body: (r) => {
      const [done = '', of = ''] = /(\d+) of (\d+) done/.exec(r.text(STATUS))?.slice(1) ?? [];
      return `Is this machine, my GitLab login and my group ready, and what in my repo can be watched?${of ? ` ${done} of ${of} steps are done now.` : ''} Each step is read from the app’s own probes as they stream.`;
    },
  },
  {
    id: 'steps',
    kind: 'columns',
    sel: RAIL,
    title: 'How to read the steps',
    body: () => 'Left to right, this machine to Afterlife; the current step glows, and a done one can be revisited.',
    legend: STEPS,
  },
  {
    id: 'command',
    kind: 'activity',
    sel: COMMAND,
    title: 'Do a step',
    body: () => 'By hand: copy the command into your terminal. Or Run it: the server shows the exact command first and runs it only on your confirm.',
    try: 'Copy command',
  },
  {
    id: 'recheck',
    kind: 'activity',
    sel: '[data-xray="recheck"]',
    title: 'Check again',
    body: () => 'Re-check streams every probe again, read only, as your own glab login; each step lights on its own answer.',
    try: 'Re-check',
  },
  statusCallout('How far setup reaches', 'How many steps are done, and when the probes last answered.'),
  dataLabelCallout,
];
