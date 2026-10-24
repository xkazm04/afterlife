// The six nodes of the wire, in order, with the exact commands that clear each one (copied from the setup facts; no
// command here is invented) and the probe that re-checks it. Afterlife never runs any of them: it shows them to copy.
// An env command has one line per shell (POSIX, PowerShell), so the line copied works where the server is started.
import type { CommandLine } from '@/components/inspector/CommandBlock';
import type { NodeKey } from './types';

export interface TraceNode {
  key: NodeKey;
  /** Where the node lives on the wire. */
  where: 'this machine' | 'GitLab' | 'Afterlife';
  title: string;
  /** What the re-check reads, in one line. */
  probe: string;
  commands: (f: { host: string; groupId: string }) => readonly CommandLine[];
  /** Changing it means changing the server's environment, so the server must restart. */
  restart?: boolean;
}

export const NODES: readonly TraceNode[] = [
  {
    key: 'glab',
    where: 'this machine',
    title: 'glab installed',
    probe: 'starts glab (BELAY_GLAB, else glab on PATH, else the winget location)',
    commands: () => [{ code: 'winget install GLab.GLab', note: '# Windows' }, { code: 'brew install glab', note: '# macOS' }, { note: '# or point BELAY_GLAB at the glab binary' }],
  },
  {
    key: 'login',
    where: 'GitLab',
    title: 'Signed in',
    probe: 'reads the current user through glab’s own login; Afterlife never reads or stores a token',
    commands: ({ host }) => (host === 'gitlab.com' ? ['glab auth login'] : [`glab auth login --hostname ${host}`, { note: '# BELAY_GITLAB_HOST picks a self-managed host' }]),
  },
  {
    key: 'group',
    where: 'GitLab',
    title: 'Group readable',
    probe: 'reads the group BELAY_GROUP_ID names and lists its projects',
    commands: () => [
      { code: 'export BELAY_GROUP_ID=<group id>', note: '# macOS / Linux' },
      { code: '$env:BELAY_GROUP_ID="<group id>"', note: '# Windows PowerShell' },
      { note: '# the numeric id, on the group’s overview page' },
    ],
    restart: true,
  },
  {
    key: 'live',
    where: 'Afterlife',
    title: 'Live, first poll',
    probe: 'reads BELAY_MODE and whether the live runtime has finished its first poll',
    commands: () => [
      { code: 'BELAY_MODE=live npm run dev', note: '# macOS / Linux' },
      { code: '$env:BELAY_MODE="live"; npm run dev', note: '# Windows PowerShell' },
      { note: '# restart: env is read at start' },
      { note: '# live also wants BELAY_PROJECT and BELAY_PROOF_AUTHORS: a start without them names each one' },
    ],
    restart: true,
  },
  {
    key: 'doctor',
    where: 'GitLab',
    title: 'belay doctor',
    probe: 'the eleven capability probes, each available, unavailable or unknown (GETs only)',
    commands: () => ['npm run doctor'],
  },
  {
    key: 'setup',
    where: 'Afterlife',
    title: 'Unlock map',
    probe: 'ready once every node before it passes: the 15 steps for one project, in /setup',
    commands: () => [{ note: '# open Setup: Prepare 0-3, Connect 4-8, Install 9-11, Prove 12-14' }],
  },
];

export const nodeOf = (key: NodeKey): TraceNode => NODES.find((n) => n.key === key) ?? (NODES[0] as TraceNode);
