// Onboard: a GitLab estate brought in as a funnel, a batch at a time. Introduces the module, how to read the funnel and
// the batch table, and what to do; the writes-per-batch switch, the funnel's step filter and the group scope are the
// screen's own switches and are not introduced.
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { dataLabelCallout, helpCallout, statusLine, statusCallout } from '../../shared';

const FUNNEL = 'ol[aria-label="Onboarding funnel"]';
const BATCH = '[role="table"][aria-label="Next batch"]';
const PREVIEW = 'button[title="Preview the exact commands, then run as you"]';

/** "184 discovered · 155 watching · 20 wait for you · next batch 9 reads, 5 writes", read into its figures. */
const figures = (r: ScreenRead) => {
  const line = statusLine(r);
  const n = (re: RegExp): string => re.exec(line)?.[1] ?? '?';
  return { discovered: n(/(\d[\d,]*) discovered/), watching: n(/(\d[\d,]*) watching/), yours: n(/(\d[\d,]*) waits? for you/) };
};

/** The five steps as the funnel draws them; counts are cumulative. */
const STEPS: readonly LegendEntry[] = [
  { name: 'Discovered', means: 'Listed by the group API: Afterlife knows the project exists, nothing more.' },
  { name: 'Baselined', means: 'A read-only day-0 scan rated its nine stages.' },
  { name: 'Paired', means: 'Its bootstrap MR is merged. A stale feed stays here until its token is renewed.' },
  { name: 'Watching', means: 'The poller reads it every cycle and its feed is live.' },
  { name: 'In cycles', means: 'An improvement cycle runs on it (see Cycles).' },
  { name: 'Bar and %', means: 'The share of everything discovered that has reached the step. A watched project also counts as baselined and paired.' },
];

/** A batch row, left to right. The table draws no column headers: its header rows are the three parts. */
const ROW: readonly LegendEntry[] = [
  { name: 'Only you · Reads · Writes', means: 'The batch’s three parts, with how many rows each. Only you lists the whole estate whatever the scope.' },
  { name: 'Project', means: 'The project, then its GitLab group. A click shows it in the inspector.' },
  { name: 'Step', means: 'Where it stands in the funnel now.' },
  { name: 'Next action', means: 'The one thing that moves it on: a merge, a token, a scan, a bootstrap MR, a first cycle.' },
  { name: 'Who', means: '“you” or “as you” (amber: waits for a person) or Afterlife, which runs a read on its own.' },
  { name: 'Re-probe · MR · read', means: 'The last cell: Re-probe on your own steps, else how many MRs a write opens, or read.' },
];

export const ONBOARD: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Onboard',
    body: (r) => {
      const f = figures(r);
      return `How far is the estate onboarded, what runs in the next batch, and what can only I do? ${f.discovered} projects come in a step at a time; ${f.watching} are watched so far and ${f.yours} wait on you. Reads run on their own; every write is an MR opened as you and merged by a person.`;
    },
  },
  {
    id: 'funnel',
    kind: 'columns',
    sel: FUNNEL,
    title: 'The funnel',
    body: () => 'Five steps from discovered to in cycles. Only a probe moves a project on; unknown is never counted as done.',
    legend: STEPS,
  },
  {
    id: 'batch',
    kind: 'columns',
    sel: `${BATCH} [role="row"]`,
    title: 'The next batch',
    body: () => 'Every read runs; the writes are capped per batch. A row is one project and the one action that moves it on.',
    legend: ROW,
  },
  {
    id: 'preview',
    kind: 'activity',
    sel: PREVIEW,
    title: 'Preview, then run',
    body: (r) =>
      `${r.text(PREVIEW) || 'Preview batch'}: shows every read’s exact command and the server’s preview of every MR. Run as you sends only those previews, on your confirmed click; nothing reaches GitLab before it.`,
    try: 'Click Preview batch',
  },
  {
    id: 'pick',
    kind: 'activity',
    sel: `${BATCH} [role="cell"] button`,
    title: 'Look at one project',
    body: () => 'Click a project: the inspector shows its step, its baseline stage by stage, and its one next command.',
    try: 'Click a project name',
  },
  {
    id: 'reprobe',
    kind: 'activity',
    sel: `${BATCH} button[title$="re-probe (simulated)"]`,
    title: 'Done your part',
    body: () => 'Only you can merge, renew a token or finish a setup. Once you have, Re-probe checks it and moves the project on (simulated here).',
    try: 'Click Re-probe',
  },
  statusCallout('The estate in one line', 'Discovered, watching, waiting on you, and the size of the next batch.'),
  dataLabelCallout,
  helpCallout,
];
