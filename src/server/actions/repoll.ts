// Re-poll on the live runtime: one poll cycle (`refresh`: the runtime polls the whole group and rebuilds the snapshot),
// then the group's outcome (repollGroup, the status bar's Re-poll) or one project's own (repollProject, Fleet and Monitor).
// A poll only reads GitLab; nothing here writes.
// Only a cycle that finished and polled the project without error is a re-poll. Anything else is a failure, with its
// reason: the runtime is not ready, the cycle did not finish, the group could not be read, the project failed or was
// not in the polled group. A cycle reads the whole group as the operator, so re-polls are at least REPOLL_GAP_MS apart:
// a page or a script calling in a loop cannot flood GitLab (and the operator's rate limit) or the index.
import type { LiveRuntime } from '@/server/data/live/runtime';
import { notReadyReason } from './deps';

export type RepollResult =
  /** `ageSec`: the project's feed age in the fresh snapshot (null: the snapshot does not list it). */
  | { ok: true; ageSec: number | null }
  | { ok: false; reason: string };

/** A group re-poll: the cycle read the group (its projects' own outcomes are on the status bar's poll line), or why not. */
export type GroupRepollResult = { ok: true } | { ok: false; reason: string };

/** What a re-poll needs of the live runtime. */
export type RepollRuntime = Pick<LiveRuntime, 'refresh' | 'last' | 'snapshot'>;

/** A Fleet project id: a GitLab path slug, or one suffixed with its GitLab id. */
const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

/** The shortest time between two re-polls a screen asks for (the scheduler polls on its own every BELAY_POLL_SECONDS). */
export const REPOLL_GAP_MS = 10_000;
const lastAsked = new WeakMap<RepollRuntime, number>();

const fail = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

/** One cycle, unless the last re-poll (of any project or of the group: one gap) was too recent. `polled`: a cycle ran. */
async function cycleOnce(rt: RepollRuntime | null, now: () => number): Promise<{ failed: { ok: false; reason: string } | null; polled: boolean }> {
  if (!rt) return { failed: fail(notReadyReason()), polled: false };
  const at = now();
  const since = at - (lastAsked.get(rt) ?? -Infinity);
  if (since < REPOLL_GAP_MS) {
    const wait = `re-poll again in ${Math.ceil((REPOLL_GAP_MS - since) / 1000)}s`;
    return { failed: fail(`the last re-poll was ${Math.floor(since / 1000)}s ago: ${wait}`), polled: false };
  }
  lastAsked.set(rt, at); // before the cycle: a call while it runs is within the gap too
  const before = rt.last;
  try {
    await rt.refresh();
  } catch (e) {
    return { failed: fail(e instanceof Error ? e.message : String(e)), polled: true };
  }
  const cycle = rt.last;
  if (!cycle || cycle === before) return { failed: fail('the poll cycle did not finish'), polled: true };
  if (cycle.error) return { failed: fail(cycle.error), polled: true };
  return { failed: null, polled: true };
}

/** `polled` says a cycle ran (finished or not), so the route's data is worth rendering again. */
export async function repollProject(rt: RepollRuntime | null, projectId: unknown, now: () => number = Date.now): Promise<{ result: RepollResult; polled: boolean }> {
  if (typeof projectId !== 'string' || !PROJECT_ID.test(projectId)) return { result: fail('not a project id'), polled: false };
  const { failed, polled } = await cycleOnce(rt, now);
  if (failed) return { result: failed, polled };
  const p = rt?.last?.projects.find((x) => x.id === projectId);
  if (!p) return { result: fail('not in the polled group'), polled: true };
  if (!p.ok) return { result: fail(p.error ?? 'no answer'), polled: true };
  const ageSec = rt?.snapshot?.data.fleet.projects.find((x) => x.id === projectId)?.feed.ageSec ?? null;
  return { result: { ok: true, ageSec }, polled: true };
}

/** Re-poll the whole group: one cycle under the same gap as a project re-poll, so no screen can flood GitLab. */
export async function repollGroup(rt: RepollRuntime | null, now: () => number = Date.now): Promise<{ result: GroupRepollResult; polled: boolean }> {
  const { failed, polled } = await cycleOnce(rt, now);
  return { result: failed ?? { ok: true }, polled };
}
