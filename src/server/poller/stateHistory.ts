// tier-state.yml's history on belay-policy: its commit list (newest first, `GET repository/commits?path=&ref_name=`) and,
// for each record the file holds now, the commit that wrote it: the newest commit whose parent revision held another
// record (or none) for that agent and class. Read once per poll. A file at a commit never changes, so each revision is
// read once per process (PollMemory.states). Where the answer is not in what was read (a record older than the commits
// read, an unreadable revision, a commit that landed between the two reads) the writer is null: never guessed.
import { parse } from 'yaml';
import type { TierRecord, TierState } from '@/schemas/tier';
import type { GitLabPort, ProjectRef } from '@/server/gitlab/port';
import type { GlCommit } from '@/server/gitlab/types';
import { parseState } from '../../../engine/policy/load';
import type { PollMemory, StateRevision } from './state';

export const STATE_FILE = 'tier-state.yml';
/** How many of the file's commits are read: a record unchanged through all of them has no known writer. */
export const HISTORY_DEPTH = 20;

export interface StateHistory {
  /** The file's commits, newest first, as far as read. */
  commits: readonly GlCommit[];
  /** The commit that wrote the record `agent` holds for `cls` now; null when it is not among the commits read. */
  writerOf: (agent: string, cls: string) => GlCommit | null;
}

const key = (agent: string, cls: string): string => `${agent}\u0000${cls}`;

/** A record as text, its keys sorted: two revisions hold the same record when these match ('' for none). */
const canon = (r: TierRecord | undefined): string => {
  if (!r) return '';
  const o = r as unknown as Record<string, unknown>;
  return JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
};

async function revisionAt(port: GitLabPort, project: ProjectRef, commit: string, mem: PollMemory): Promise<StateRevision> {
  const hit = mem.states.get(commit);
  if (hit) return hit;
  const f = await port.getFile(project, STATE_FILE, commit);
  let rev: StateRevision = 'absent';
  if (f) {
    try {
      rev = parseState(parse(f.content));
    } catch {
      rev = 'unreadable';
    }
  }
  mem.states.set(commit, rev);
  return rev;
}

/** `state`: tier-state.yml as this poll read it from `ref`. GitLab errors pass through (the caller decides). */
export async function readStateHistory(port: GitLabPort, project: ProjectRef, ref: string, state: TierState, mem: PollMemory, depth = HISTORY_DEPTH): Promise<StateHistory> {
  const commits = await port.listCommits(project, { path: STATE_FILE, ref, limit: depth });
  // only these commits are read again next poll: a revision that fell out of the list is dropped, not kept for the process's life
  const listed = new Set(commits.map((c) => c.id));
  for (const k of mem.states.keys()) if (!listed.has(k)) mem.states.delete(k);
  const writers = new Map<string, GlCommit | null>();
  const open = new Map<string, TierRecord>();
  for (const [agent, classes] of Object.entries(state.agents)) for (const [cls, r] of Object.entries(classes)) open.set(key(agent, cls), r);
  // The newest commit must hold the record too (else the file moved between the reads): from there, back to the first
  // revision that differs.
  for (let i = 0; i < commits.length && open.size > 0; i++) {
    const rev = await revisionAt(port, project, commits[i]!.id, mem);
    for (const [k, r] of [...open]) {
      const [agent = '', cls = ''] = k.split('\u0000');
      const held = typeof rev === 'string' ? undefined : rev.agents[agent]?.[cls];
      if (rev !== 'unreadable' && canon(held) === canon(r)) continue;
      writers.set(k, rev === 'unreadable' || i === 0 ? null : (commits[i - 1] ?? null));
      open.delete(k);
    }
  }
  // Unchanged through every commit read: the oldest wrote it only when that is the file's whole history (fewer than asked).
  const first = commits.length > 0 && commits.length < depth ? (commits.at(-1) ?? null) : null;
  for (const k of open.keys()) writers.set(k, first);
  return { commits, writerOf: (agent, cls) => writers.get(key(agent, cls)) ?? null };
}
