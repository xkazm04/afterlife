// Task rows with their proof, in the Task shape the detail screen reads.
import { getTaskRow, listTasks, type TaskRow } from '../repositories/work/task';
import { listProofsFor, type ProofRow } from '../repositories/work/proof';
import type { Queryable } from '../repositories/sql';
import { countdown } from './format';
import type { TaskView } from './types';

function toTask(row: TaskRow, proof: ProofRow | undefined, now: Date): TaskView {
  const { clock, ...facts } = row.detail;
  return {
    id: row.id,
    track: row.track === null ? null : `T${row.track}`,
    cls: row.actionClass,
    mr: row.mrIid === null ? null : `!${row.mrIid}`,
    title: row.title,
    tierAtTime: row.tierAtTime,
    state: row.stateLabel ?? row.state ?? 'unknown',
    ...facts,
    ...(clock ? { clock: { kind: clock.kind, dueIn: countdown(Date.parse(clock.dueAt) - now.getTime()), total: clock.total } } : {}),
    ...(proof
      ? {
          proof: {
            cls: proof.class,
            verdict: proof.verdict ? proof.verdict.toUpperCase() : 'UNKNOWN',
            engine: proof.engineVersion ? `proof-engine ${proof.engineVersion}` : 'unknown',
            digest: proof.engineSha256 ? `sha256:${proof.engineSha256}` : '',
            checks: proof.checks,
            claims: proof.claims,
            ...(proof.block ? { claimIds: proof.block.claims.map((c) => c.id) } : {}),
          },
        }
      : {}),
  };
}

/** The same value as DEMO.tasks for one project. */
export async function getTasks(db: Queryable, projectId: string, now: Date = new Date()): Promise<TaskView[]> {
  const rows = await listTasks(db, projectId);
  const proofs = await listProofsFor(db, rows.map((r) => r.id));
  return rows.map((r) => toTask(r, proofs.get(r.id), now));
}

export async function getTask(db: Queryable, id: string, now: Date = new Date()): Promise<TaskView | null> {
  const row = await getTaskRow(db, id);
  if (!row) return null;
  return toTask(row, (await listProofsFor(db, [id])).get(id), now);
}
