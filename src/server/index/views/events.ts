// The deep project's recent events, read from the index: what the live source serves as `getEvents`, in place of the
// demo's catalogue. Only a fact the index holds with a time is dated:
//   a task's MR opened (started_at) and merged (finished_at), with the task's track;
//   the project's last good poll, and a failed poll after it (newest by definition: its own time is not kept).
// The index keeps no time for a proof or a state change, so a task's newest row carries its standing now: the state
// label and, when a proof is indexed, its verdict. Nothing is invented: a task with no time has no row (the Fleet lists
// it under Tasks). An unclassified task is not a Belay task yet and is left out, as `getTasks` leaves it out.
import type { DemoData } from '@/lib/demo/types';
import { getPollState, projectSource } from '../repositories/pollState';
import type { Queryable } from '../repositories/sql';
import { listProofsFor } from '../repositories/work/proof';
import { listTasks } from '../repositories/work/task';
import { clock } from './format';

/** [time, track, text], the shape of DEMO.events. */
export type EventView = DemoData['events'][number];

/** As many as the demo's feed shows. */
export const MAX_EVENTS = 10;

export async function getEvents(db: Queryable, projectId: string): Promise<EventView[]> {
  const [tasks, poll] = await Promise.all([listTasks(db, projectId), getPollState(db, projectSource(projectId))]);
  const proofs = await listProofsFor(db, tasks.map((t) => t.id));
  const dated: { at: Date; row: EventView }[] = [];
  for (const t of tasks) {
    if (t.actionClass === null) continue;
    const track = t.track === null ? 'T?' : `T${t.track}`;
    const mr = t.mrIid === null ? t.id : `!${t.mrIid}`;
    const verdict = proofs.get(t.id)?.verdict;
    const standing = `${t.stateLabel ?? t.state ?? 'state unknown'}${verdict !== undefined ? ` · proof ${verdict ? verdict.toUpperCase() : 'UNKNOWN'}` : ''}`;
    if (t.startedAt) dated.push({ at: t.startedAt, row: [clock(t.startedAt), track, `${mr} opened · ${t.title}${t.finishedAt ? '' : ` · ${standing}`}`] });
    if (t.finishedAt) dated.push({ at: t.finishedAt, row: [clock(t.finishedAt), track, `${mr} ${standing}`] });
  }
  if (poll?.lastOk) dated.push({ at: poll.lastOk, row: [clock(poll.lastOk), '—', 'polled · ok'] });
  dated.sort((a, b) => b.at.getTime() - a.at.getTime());
  const failed: EventView[] = poll?.lastError != null ? [['—', '—', `poll failed · ${poll.lastError}`]] : [];
  return [...failed, ...dated.map((d) => d.row)].slice(0, MAX_EVENTS);
}
