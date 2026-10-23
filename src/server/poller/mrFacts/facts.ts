// Two facts per agent MR for the stability view (index/views/stability): its size, lines added + removed over its diffs
// (listDiffs, cached by head sha: a sha's diff never changes), and its head pipeline's status (one GET of that pipeline,
// cached only once final; running is read again next poll). Read before the poll's transaction, like every read, and
// written onto the task's detail, which mergeTask carries. A read that fails or is left for the next poll is null with an
// issue, never 0. At most FACT_READS GitLab calls per project per poll.
import type { GitLabPort } from '@/server/gitlab/port';
import type { GlMergeRequest, GlProject } from '@/server/gitlab/types';
import { isFinal, type PipelineState } from '@/lib/stability/stability';
import type { TaskDerivation } from '../derive/task';
import type { PollMemory } from '../state';

/**
 * Reads per project per poll. A first poll of a busy project (mrLimit is 200, the task window a day by default) would
 * otherwise make two calls per agent MR at once; 20 covers a typical day's agent MRs in one or two polls, and a steady
 * poll re-reads only the running pipelines and the MRs that got a new head.
 */
export const FACT_READS = 20;

const RUNNING = new Set(['created', 'waiting_for_resource', 'preparing', 'pending', 'running', 'scheduled', 'canceling']);

/** GitLab's pipeline status as the stability view counts it: final, running, or unknown (skipped, manual, anything new). */
export function pipelineState(status: unknown): PipelineState | null {
  if (status === 'success' || status === 'failed' || status === 'canceled') return status;
  return typeof status === 'string' && RUNNING.has(status) ? 'running' : null;
}

/** What is left of a poll's reads, and how many reads it had to leave for the next poll. */
interface Budget {
  left: number;
  skipped: number;
}

/** Takes one read from the budget; false (and counted) when none is left. */
function spend(b: Budget): boolean {
  if (b.left <= 0) {
    b.skipped += 1;
    return false;
  }
  b.left -= 1;
  return true;
}

const message = (e: unknown): string => (e instanceof Error ? e.message : String(e));

interface Read {
  port: GitLabPort;
  mem: PollMemory;
  gl: GlProject;
  budget: Budget;
  issues: string[];
}

/** The MR's size at its head: cached by sha, else one listDiffs while the budget lasts. */
async function sizeOf(r: Read, mr: GlMergeRequest, key: string): Promise<number | null> {
  if (mr.sha === null) return null;
  const hit = r.mem.mrSizes.get(key);
  if (hit?.sha === mr.sha) return hit.size;
  if (!spend(r.budget)) return null;
  try {
    const size = (await r.port.listDiffs(r.gl.id, mr.iid)).reduce((n, d) => n + d.added + d.removed, 0);
    r.mem.mrSizes.set(key, { sha: mr.sha, size });
    return size;
  } catch (e) {
    r.issues.push(`!${mr.iid} size: diffs not read (${message(e)}); shown as unknown`);
    return null;
  }
}

/** The MR's head pipeline status: cached once final, else one GET while the budget lasts. */
async function pipelineOf(r: Read, mr: GlMergeRequest, key: string): Promise<PipelineState | null> {
  const id = mr.headPipelineId;
  if (id === null) return null;
  const hit = r.mem.mrPipelines.get(key);
  if (hit?.id === id) return hit.status;
  if (!spend(r.budget)) return null;
  try {
    // The port has no single-pipeline read, and listPipelines filters by ref and status only (an MR pipeline's ref is
    // refs/merge-requests/<iid>/head): it would page the project's pipelines to find one id. One GET is exact.
    const raw = (await r.port.get(`projects/${r.gl.id}/pipelines/${id}`)) as { status?: unknown } | null;
    const status = pipelineState(raw?.status);
    if (isFinal(status)) r.mem.mrPipelines.set(key, { id, status });
    return status;
  } catch (e) {
    r.issues.push(`!${mr.iid} pipeline ${id}: not read (${message(e)}); shown as unknown`);
    return null;
  }
}

/**
 * Sets size and pipeline on each derived task's detail, from the MRs this poll read (`mrs`, the task window's), and
 * forgets the cached facts of this project's MRs that left the window. Never throws: a fact not read is null.
 */
export async function addMrFacts(
  port: GitLabPort, mem: PollMemory, gl: GlProject, mrs: readonly GlMergeRequest[], derived: readonly { d: TaskDerivation }[], issues: string[],
): Promise<void> {
  const live = new Set(mrs.map((m) => `${gl.id}!${m.iid}`));
  for (const map of [mem.mrSizes, mem.mrPipelines]) for (const key of map.keys()) if (key.startsWith(`${gl.id}!`) && !live.has(key)) map.delete(key);
  const r: Read = { port, mem, gl, budget: { left: FACT_READS, skipped: 0 }, issues };
  for (const { d } of derived) {
    const mr = mrs.find((m) => m.iid === d.task.mrIid);
    if (!mr) continue;
    const key = `${gl.id}!${mr.iid}`;
    const size = await sizeOf(r, mr, key);
    const pipeline = await pipelineOf(r, mr, key);
    d.task.detail = { ...d.task.detail, size, pipeline };
  }
  if (r.budget.skipped) issues.push(`${r.budget.skipped} agent-MR reads (size or pipeline) left for the next poll, at most ${FACT_READS} a poll; shown as unknown`);
}
