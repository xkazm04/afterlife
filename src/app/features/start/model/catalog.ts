// The eight steps of /start, in order, with the exact commands that clear each one by hand (copied from the setup facts;
// no command here is invented) and what its check reads. Run it is the same step as a catalogue action (server/start/wire)
// that the server previews first; these lines are the copy path. An env command has one line per shell (POSIX,
// PowerShell), so the line copied works where the server is started. Moved from trace/model/nodes.ts.
import type { CommandLine } from '@/components/inspector/CommandBlock';
import type { Place } from './view';
import type { StartFacts, StepKey } from './types';

export interface StepFacts {
  host: string;
  /** The group the step works on: the repo's derived id, the typed one, or the server's own. */
  groupId: string;
  platform: StartFacts['platform'];
}

export interface StepEntry {
  key: StepKey;
  place: Place;
  title: string;
  /** What the check reads, in one line (behind "what this checks"). */
  probe: string;
  commands: (f: StepFacts) => readonly CommandLine[];
}

const install = (p: StepFacts['platform']): CommandLine[] =>
  p === 'windows' ? ['winget install GLab.GLab'] : p === 'macos' ? ['brew install glab'] : [{ note: '# see gitlab.com/gitlab-org/cli#installation for your distribution' }];

export const STEPS: readonly StepEntry[] = [
  {
    key: 'repo',
    place: 'this machine',
    title: 'Pick a repo',
    probe: 'reads the repo’s git remote: its host and namespace name the GitLab group',
    commands: () => [],
  },
  {
    key: 'glab',
    place: 'this machine',
    title: 'glab installed',
    probe: 'starts glab (AFTERLIFE_GLAB, else glab on PATH, else the winget location)',
    commands: ({ platform }) => install(platform),
  },
  {
    key: 'login',
    place: 'GitLab',
    title: 'Signed in',
    probe: 'reads the current user through glab’s own login; Afterlife never reads or stores a token',
    commands: ({ host }) => [host === 'gitlab.com' ? 'glab auth login' : `glab auth login --hostname ${host}`],
  },
  {
    key: 'group',
    place: 'GitLab',
    title: 'Group readable',
    probe: 'reads the group and lists its projects',
    commands: ({ groupId }) => [
      { code: `export AFTERLIFE_GROUP_ID=${groupId || '<group id>'}`, note: '# macOS / Linux, then restart' },
      { code: `$env:AFTERLIFE_GROUP_ID="${groupId || '<group id>'}"`, note: '# Windows PowerShell, then restart' },
    ],
  },
  {
    key: 'live',
    place: 'Afterlife',
    title: 'Live, first poll',
    probe: 'reads the mode and whether the live runtime has finished its first poll',
    commands: () => [
      { code: 'AFTERLIFE_MODE=live npm run dev', note: '# macOS / Linux' },
      { code: '$env:AFTERLIFE_MODE="live"; npm run dev', note: '# Windows PowerShell' },
    ],
  },
  {
    key: 'stack',
    place: 'Afterlife',
    title: 'What to watch',
    probe: 'a low-effort model proposes the host, components, pipelines and cloud; a read-only probe checks each line',
    commands: () => [],
  },
  {
    key: 'save',
    place: 'Afterlife',
    title: 'Save the project',
    probe: 'writes only the lines a probe confirmed, to Afterlife’s own data folder, never into the repo',
    commands: () => [],
  },
  {
    key: 'unlock',
    place: 'Afterlife',
    title: 'Unlock map',
    probe: 'ready once every step before it is done: the 15 steps for one project, in /setup',
    commands: () => [],
  },
];

export const STEP_ORDER: readonly StepKey[] = STEPS.map((s) => s.key);

export const stepOf = (key: StepKey): StepEntry => STEPS.find((s) => s.key === key) ?? (STEPS[0] as StepEntry);
