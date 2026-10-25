// Onboard: a real project in one click, confirmed line by line. Introduces the module, how to read the repo list and
// the checklist, and what to do; the Engine switch is the screen's own and is not introduced. The demo estate funnel
// moved to /onboard/estate and is not on the tour.
import type { Callout, LegendEntry, ScreenRead } from '../../../model/types';
import { dataLabelCallout, helpCallout, statusLine, statusCallout } from '../../shared';

const REPOS = 'ul[aria-label="Repos with Claude Code history"]';
const FOUND = 'section[aria-label="Step 2: what Afterlife found"]';
const SAVE = 'section[aria-label="Step 3: save and collect"]';

/** "12 repos · 1 onboarded · ...", read into its figures. */
const figures = (r: ScreenRead) => {
  const line = statusLine(r);
  const n = (re: RegExp): string => re.exec(line)?.[1] ?? '?';
  return { repos: n(/(\d[\d,]*) repos?/), onboarded: n(/(\d[\d,]*) onboarded/) };
};

/** A repo row, left to right. */
const REPO_ROW: readonly LegendEntry[] = [
  { name: 'Name and path', means: 'The repo’s name (its remote’s, else its folder’s) over its git toplevel.' },
  { name: 'Branch', means: 'The branch checked out there now.' },
  { name: 'Host', means: 'Where its origin remote lives: Azure DevOps, GitLab, GitHub, or no remote.' },
  { name: 'Last used', means: 'When you last ran Claude Code in it; the list is newest first.' },
  { name: 'Onboarded', means: 'Already saved: open its Vitals, or Re-run to propose again.' },
  { name: 'Pick', means: 'Propose what to watch in this repo.' },
];

/** A checklist line, left to right; the groups are Host, Components, Pipelines & variants, Cloud. */
const LINE: readonly LegendEntry[] = [
  { name: 'State', means: 'proposed, then probing, then ok or failed. Only ok lines are saved; a local command is skipped (it runs on your click).' },
  { name: 'What', means: 'The host, a component, a pipeline and its variants (↳), the cloud resource; or a check such as a login.' },
  { name: 'Detail', means: 'Its path, file, match rule or the args its probe was given.' },
  { name: 'Probe line', means: 'What the probe found, or why it failed; a lapsed login shows its re-login command with Copy.' },
];

export const ONBOARD: readonly Callout[] = [
  {
    id: 'module',
    kind: 'module',
    sel: 'main',
    title: 'Onboard',
    body: (r) => {
      const f = figures(r);
      return `Which real project should Afterlife watch, and what in it can be measured? ${f.repos} repos you work in with Claude Code are listed, ${f.onboarded} already onboarded. A low-effort model proposes; a read-only probe confirms each line; only confirmed lines are saved.`;
    },
  },
  {
    id: 'repos',
    kind: 'columns',
    sel: `${REPOS} li`,
    title: 'Your repos',
    body: () => 'The git toplevels behind your Claude Code sessions, temp and worktree paths left out. A pasted path below works for any other checkout.',
    legend: REPO_ROW,
  },
  {
    id: 'checklist',
    kind: 'columns',
    sel: FOUND,
    title: 'What Afterlife found',
    body: () => 'The proposal as a checklist, each line tied to the typed probe that confirms it. The footer names the engine and how long the proposal took.',
    legend: LINE,
  },
  {
    id: 'pick',
    kind: 'activity',
    sel: `${REPOS} button`,
    title: 'Pick a repo',
    body: () => 'Pick: the facts are collected, one claude call proposes, then each probe runs in turn and its line turns ok or failed as you watch.',
    try: 'Click Pick',
  },
  {
    id: 'save',
    kind: 'activity',
    sel: `${SAVE} button`,
    title: 'Save and collect',
    body: () => 'Save writes only the confirmed lines to Afterlife’s own data folder, never into the repo, then opens the project’s Vitals.',
    try: 'Click Save and collect',
  },
  statusCallout('Repos in one line', 'How many repos, how many onboarded, and for the picked one how many lines a probe confirmed, on which engine.'),
  dataLabelCallout,
  helpCallout,
];
