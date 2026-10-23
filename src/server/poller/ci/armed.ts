// How many tracks are armed on a project: the arm markers in its default branch's .gitlab-ci.yml (actions/arm/block.ts
// writes them), counted once per track. A block whose lines were edited since its arm is not counted: its begin marker's
// digest no longer matches, so it is not the block the arm added. A track whose arm content the repo defines is checked
// with findBlock; any other marker (T2, T5, T7, T8, or a key the repo no longer names) counts when its end marker follows.
// The file is read only when the newest commit touching it changed since the last poll (PollMemory.ciFiles).
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlProject } from '@/server/gitlab/types';
import { findBlock } from '@/server/actions/arm/block';
import { armOf } from '@/server/actions/arm/content';
import type { PollMemory } from '../state';

export const CI_FILE = '.gitlab-ci.yml';

const BEGIN = /^\s*# belay:arm (T[1-8]) (\S+) begin [0-9a-f]{12}\s*$/;

/** The distinct tracks armed in one .gitlab-ci.yml text. Pure. */
export function countArmed(text: string): number {
  const lines = text.split('\n');
  const tracks = new Set<string>();
  lines.forEach((line, i) => {
    const m = BEGIN.exec(line);
    if (!m) return;
    const [, track = '', key = ''] = m;
    const arm = armOf(track);
    if (arm && arm.key === key) {
      if (findBlock(text, arm).state === 'armed') tracks.add(track);
      return;
    }
    const end = `# belay:arm ${track} ${key} end`;
    if (lines.some((l, j) => j > i && l.trim() === end)) tracks.add(track);
  });
  return tracks.size;
}

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * The project's armed tracks: 0 when it has no default branch or no CI file (read: none armed), null when the read failed
 * (with an issue saying so; never 0). One listCommits per poll; getFile only when that commit changed.
 */
export async function readArmed(port: GitLabPort, mem: PollMemory, gl: GlProject, issues: string[]): Promise<number | null> {
  const ref = gl.defaultBranch;
  if (ref === null) return 0; // an empty repository: no CI file to arm
  try {
    const key = (await port.listCommits(gl.id, { ref, path: CI_FILE, limit: 1 }))[0]?.id ?? 'no commit';
    const hit = mem.ciFiles.get(gl.id);
    if (hit && hit.key === key) return hit.armed;
    const file = await port.getFile(gl.id, CI_FILE, ref);
    const armed = file ? countArmed(file.content) : 0;
    mem.ciFiles.set(gl.id, { key, armed });
    return armed;
  } catch (e) {
    issues.push(`armed tracks: ${CI_FILE} on ${ref} not read (${message(e)}); shown as unknown`);
    return null;
  }
}
