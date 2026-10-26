// The one thing that stops every probe: glab cannot start, GitLab cannot be reached, glab is not logged in, or the group
// cannot be read. Read from the preflight outcomes in that order, from what is already in hand (the error kind, the host,
// the group id). Any other failure is not a blocker: the rows say unknown on their own and nothing is guessed.
import { GitLabError } from '../errors';
import type { ProjectRef } from '../types';

export type BlockerKind = 'binary' | 'network' | 'auth' | 'group';
export interface Blocker { kind: BlockerKind; text: string; fix: string }

/** One preflight read: its error, or null when it answered. */
export interface Preflight { user: unknown | null; group: unknown | null; instance: unknown | null }

const kindOf = (e: unknown): string | null => (e instanceof GitLabError ? e.kind : null);
const first = (errors: unknown[], kind: string): GitLabError | undefined =>
  errors.find((e): e is GitLabError => kindOf(e) === kind);

/** The first blocker among the preflight errors (binary > network > auth > group), or null. */
export function findBlocker(pre: Preflight, host: string | undefined, group: ProjectRef): Blocker | null {
  const all = [pre.user, pre.group, pre.instance];
  const where = host ?? 'gitlab.com';
  const binary = first(all, 'binary');
  if (binary) {
    return {
      kind: 'binary', text: `glab cannot be started (${binary.message})`,
      fix: 'install glab (winget install GLab.GLab, or brew install glab), or set AFTERLIFE_GLAB to the glab binary',
    };
  }
  const network = first(all, 'network');
  if (network) {
    return {
      kind: 'network', text: `GitLab at ${where} cannot be reached (${network.message})`,
      fix: `check the network, or set AFTERLIFE_GITLAB_HOST (now ${host ?? 'unset: gitlab.com'})`,
    };
  }
  if (first(all, 'auth')) {
    return { kind: 'auth', text: `glab is not logged in to ${where}`, fix: host ? `glab auth login --hostname ${host}` : 'glab auth login' };
  }
  const g = pre.group;
  if (pre.user === null && g instanceof GitLabError && (g.kind === 'not-found' || g.kind === 'forbidden')) {
    return {
      kind: 'group', text: `group ${group} cannot be read on ${where} (${g.status ?? g.kind}: ${g.message})`,
      fix: 'set AFTERLIFE_GROUP_ID to the id of a group this login can read',
    };
  }
  return null;
}

/** Setup's one-line diagnosis: what blocks, then what fixes it (a command to run, for a login). */
export const blockerLine = (b: Blocker): string => `${b.text}: ${b.kind === 'auth' ? `run ${b.fix}` : b.fix}`;
