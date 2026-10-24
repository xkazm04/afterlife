// Monitor: the fleet as live leads, one per GitLab group, every project a beat. Introduces the module, how to read a
// lead (its beat grammar is the screen's one structured element) and what to do; the marks and the Sweep toggle are
// the screen's own switches and are not introduced.
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { DATA_LABEL, dataLabelCallout, helpCallout, statusLine, statusCallout } from '../../shared';

const LEADS = '[role="group"][aria-label="Leads, one per group"]';
const INSPECTOR = 'aside[data-inspector]';

/** "184 projects on 7 leads · 115 decisions wait · polled 12 s ago", read into its figures. */
const figures = (r: ScreenRead) => {
  const line = statusLine(r);
  return {
    projects: /(\d[\d,]*) projects?/.exec(line)?.[1] ?? 'every',
    leads: /on (\d[\d,]*) leads?/.exec(line)?.[1] ?? 'one',
    waiting: /(\d[\d,]*) decisions? waits?/.exec(line)?.[1] ?? null,
  };
};

/** One lead, left to right; the beat shapes are the "?" legend's own words. */
const LEAD: readonly LegendEntry[] = [
  { name: 'Plate', means: 'The GitLab group and how many projects it holds. A click opens the lead into named cells.' },
  { name: 'Beat', means: 'One project, watching. The taller its R wave, the more of its 8 tracks are armed.' },
  { name: 'Amber pips', means: 'Decisions waiting for a person on that project, up to six drawn. Amber means this and only this.' },
  { name: 'Rose dip', means: 'A quarantined action class: held to read and comment only.' },
  { name: 'Dashed, low', means: 'Being set up: not watched yet.' },
  { name: 'Flat and hatched', means: 'A stale feed: a ghost of the last beat, its values last known, not live.' },
  { name: 'Dashed break', means: 'Not watched, or its armed tracks were never read: unknown, never zero.' },
  { name: 'Counts (right)', means: 'The lead’s decisions waiting (amber) and how many of its projects are stale.' },
];

export const MONITOR: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Monitor',
    body: (r) => {
      const f = figures(r);
      const now = f.waiting === null ? '' : ` ${f.waiting === '1' ? '1 decision waits' : `${f.waiting} decisions wait`} for a person now; the big number says it and names who holds the most.`;
      return `What is waiting for a person right now, and on which project? Each of your ${f.leads} GitLab groups is one lead and each of its ${f.projects} projects a beat on it, so a whole fleet reads at a glance.${now}`;
    },
  },
  {
    id: 'lead',
    kind: 'columns',
    sel: `${LEADS} > div`,
    title: 'How to read a lead',
    body: () => 'Every lead reads the same way: a plate, a strip of beats, the counts. A beat’s shape is the project’s state, so the odd one out stands out.',
    legend: LEAD,
  },
  {
    id: 'beat',
    kind: 'activity',
    sel: `${LEADS} rect[role="button"]`,
    title: 'Pick a project',
    body: () => 'Hover a beat and the band above names it; click it to load that project in the inspector. Arrows step beat to beat and lead to lead.',
    try: 'Click a beat, then ← →',
  },
  {
    id: 'open-lead',
    kind: 'activity',
    sel: `${LEADS} button[aria-expanded]`,
    title: 'Open a group',
    body: (r) => {
      const [name = 'A group'] = r.text(`${LEADS} button[aria-expanded]`).split(' ');
      return `${name}: click the plate (or Enter on a beat) to open the lead into named cells; the other leads shrink to thin traces until you close it.`;
    },
    try: 'Click a plate',
  },
  {
    id: 'inspector',
    kind: 'activity',
    sel: INSPECTOR,
    title: 'Act on what waits',
    body: (r) => {
      const name = r.text(`${INSPECTOR} h2`);
      const decide =
        r.text(DATA_LABEL) === 'illustrative demo data'
          ? 'Its decision buttons here change only this screen (demo).'
          : 'Its decisions open in Needs you, where a write reaches GitLab only on your confirmed click.';
      return `${name ? `${name}, picked now: ` : ''}its vitals, signal and what waits on it. ${decide} A stale project offers Re-poll feed, a read.`;
    },
    try: 'Ctrl+I or ⌘I hides it',
  },
  statusCallout('The monitor in one line', 'Projects, leads, decisions waiting, and how long ago the feed was polled.'),
  dataLabelCallout,
  helpCallout,
];
