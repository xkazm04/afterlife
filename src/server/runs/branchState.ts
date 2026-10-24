// Git's word on a wave branch, read in the repo's own checkout: does `belay/wave-<n>` exist, and is it in the base yet?
// Read-only (rev-parse, merge-base). A git that fails or hangs says nothing, and the screens show the wave unchecked.
// Git runs off the event loop (execFile), and an answer is kept a few seconds per (path, branch, base): every page that
// reads the desk asks again on each request, and a slow repo must not stall the other viewers.
import 'server-only';
import { execFile } from 'node:child_process';
import type { BranchState } from '@/lib/runs/desk/types';

/** git's exit code, or null when it did not exit (failed to start, killed by the timeout). */
const git = (path: string, args: string[]) =>
  new Promise<number | null>((done) => {
    execFile('git', ['-C', path, ...args], { timeout: 5000, windowsHide: true }, (e) => {
      if (!e) return done(0);
      done(typeof e.code === 'number' && !e.killed ? e.code : null);
    });
  });

async function ask(path: string, branch: string, base: string): Promise<BranchState | undefined> {
  const has = await git(path, ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  if (has === null) return undefined;
  if (has !== 0) return { exists: false, merged: false };
  const anc = await git(path, ['merge-base', '--is-ancestor', `refs/heads/${branch}`, base]);
  // 0 = ancestor, 1 = not; anything else (a base that does not resolve) is no answer
  if (anc === 0) return { exists: true, merged: true };
  if (anc === 1) return { exists: true, merged: false };
  return undefined;
}

export const BRANCH_TTL_MS = 10_000;
const kept = new Map<string, { at: number; answer: Promise<BranchState | undefined> }>();

/** One git read per (path, branch, base) per BRANCH_TTL_MS; concurrent requests share the read in flight. */
export function branchState(path: string, branch: string, base: string, now: number = Date.now()): Promise<BranchState | undefined> {
  const key = `${path}\0${branch}\0${base}`;
  const hit = kept.get(key);
  if (hit && now - hit.at < BRANCH_TTL_MS) return hit.answer;
  for (const [k, v] of kept) if (now - v.at >= BRANCH_TTL_MS) kept.delete(k);
  const answer = ask(path, branch, base);
  kept.set(key, { at: now, answer });
  return answer;
}
