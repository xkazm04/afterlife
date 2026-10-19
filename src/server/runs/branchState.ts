// Git's word on a wave branch, read in the repo's own checkout: does `belay/wave-<n>` exist, and is it in the base yet?
// Read-only (rev-parse, merge-base). A git that fails or hangs says nothing, and the screens show the wave unchecked.
import 'server-only';
import { spawnSync } from 'node:child_process';
import type { BranchState } from '@/lib/runs/desk/types';

const git = (path: string, args: string[]) => spawnSync('git', ['-C', path, ...args], { timeout: 5000, windowsHide: true, stdio: 'ignore' });

export function branchState(path: string, branch: string, base: string): BranchState | undefined {
  const has = git(path, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  if (has.error || has.status === null) return undefined;
  if (has.status !== 0) return { exists: false, merged: false };
  const anc = git(path, ['merge-base', '--is-ancestor', `refs/heads/${branch}`, base]);
  // 0 = ancestor, 1 = not; anything else (a base that does not resolve) is no answer
  if (anc.status === 0) return { exists: true, merged: true };
  if (anc.status === 1) return { exists: true, merged: false };
  return undefined;
}
