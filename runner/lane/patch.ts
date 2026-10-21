// A lane that did not land still did work: before its worktree is removed, everything it changed against base
// (tracked and untracked) is saved as <runsDir>/<repo>/<wave>.<lane>.patch, so a person can `git apply` it
// instead of paying for the lane again. Best effort: a patch that cannot be made is simply not there.
import fs from 'node:fs';
import path from 'node:path';
import { runProc } from '../proc/proc';

export interface PatchTarget {
  runsDir: string;
  repo: string;
  wave: number;
  lane: string;
}

/** The patch's path relative to runsDir (`<repo>/<wave>.<lane>.patch`), what lane.end records. */
export const patchName = (t: Omit<PatchTarget, 'runsDir'>): string => `${t.repo}/${t.wave}.${t.lane}.patch`;

/** Saves the worktree's diff against baseSha; returns its name relative to runsDir, or undefined when nothing changed. */
export async function savePatch(dir: string, baseSha: string, t: PatchTarget): Promise<string | undefined> {
  try {
    if (!fs.existsSync(dir)) return undefined;
    if ((await runProc('git', ['-C', dir, 'add', '-A'])).code !== 0) return undefined;
    // No external diff driver or textconv: the lane wrote .gitattributes, and the patch must be git's own bytes.
    const r = await runProc('git', ['-C', dir, 'diff', '--cached', '--binary', '--no-ext-diff', '--no-textconv', baseSha]);
    if (r.code !== 0 || r.truncated || !r.stdout.trim()) return undefined;
    const name = patchName(t);
    const file = path.join(t.runsDir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, r.stdout);
    return name;
  } catch {
    return undefined;
  }
}

/** Writes a red gate's whole output beside the run file (`<repo>/<wave>.<what>.gate.log`); returns that name, or undefined. */
export function saveGateLog(runsDir: string, t: { repo: string; wave: number; what: string }, output: string | undefined): string | undefined {
  if (!output) return undefined;
  try {
    const name = `${t.repo}/${t.wave}.${t.what}.gate.log`;
    const file = path.join(runsDir, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, output);
    return name;
  } catch {
    return undefined;
  }
}
