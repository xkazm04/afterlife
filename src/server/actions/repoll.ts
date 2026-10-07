// Re-poll one project on the live runtime: one poll cycle (`refresh`: the runtime polls the whole group and rebuilds the
// snapshot), then that project's own outcome in the cycle. A poll only reads GitLab; nothing here writes.
// Only a cycle that finished and polled the project without error is a re-poll. Anything else is a failure, with its
// reason: the runtime is not ready, the cycle did not finish, the group could not be read, the project failed or was
// not in the polled group.
import type { LiveRuntime } from '@/server/data/live/runtime';

export type RepollResult =
  /** `ageSec`: the project's feed age in the fresh snapshot (null: the snapshot does not list it). */
  | { ok: true; ageSec: number | null }
  | { ok: false; reason: string };

/** What a re-poll needs of the live runtime. */
export type RepollRuntime = Pick<LiveRuntime, 'refresh' | 'last' | 'snapshot'>;

/** A Fleet project id: a GitLab path slug, or one suffixed with its GitLab id. */
const PROJECT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

const fail = (reason: string): RepollResult => ({ ok: false, reason });

/** `polled` says a cycle ran (finished or not), so the route's data is worth rendering again. */
export async function repollProject(rt: RepollRuntime | null, projectId: unknown): Promise<{ result: RepollResult; polled: boolean }> {
  if (typeof projectId !== 'string' || !PROJECT_ID.test(projectId)) return { result: fail('not a project id'), polled: false };
  if (!rt) return { result: fail('live mode has not finished its first poll'), polled: false };
  const before = rt.last;
  try {
    await rt.refresh();
  } catch (e) {
    return { result: fail(e instanceof Error ? e.message : String(e)), polled: true };
  }
  const cycle = rt.last;
  if (!cycle || cycle === before) return { result: fail('the poll cycle did not finish'), polled: true };
  if (cycle.error) return { result: fail(cycle.error), polled: true };
  const p = cycle.projects.find((x) => x.id === projectId);
  if (!p) return { result: fail('not in the polled group'), polled: true };
  if (!p.ok) return { result: fail(p.error ?? 'no answer'), polled: true };
  const ageSec = rt.snapshot?.data.fleet.projects.find((x) => x.id === projectId)?.feed.ageSec ?? null;
  return { result: { ok: true, ageSec }, polled: true };
}
