import type { ProofCheck } from '@/lib/demo/types';
import type { ProofBlock, Verdict } from '@/schemas/proof';
import { upsertRows, type Queryable, type TableSpec } from '../sql';

export interface ProofRow {
  taskId: string;
  class: string;
  verdict: Verdict | null;
  engineVersion: string | null;
  /** Without the "sha256:" prefix. */
  engineSha256: string | null;
  checks: ProofCheck[];
  claims: string[];
  /** The full Proof Block when it was read from an MR note. */
  block: ProofBlock | null;
}

const SPEC: TableSpec = {
  table: 'proof',
  key: ['task_id', 'class'],
  cols: { task_id: 'text', class: 'text', verdict: 'text', engine_version: 'text', engine_sha256: 'text', checks: 'jsonb', claims: 'jsonb', block: 'jsonb' },
};

interface Db {
  task_id: string; class: string; verdict: Verdict | null; engine_version: string | null; engine_sha256: string | null;
  checks: ProofCheck[]; claims: string[]; block: ProofBlock | null;
}

/**
 * Index row for a Proof Block. The block's checks are kept whole in `block`; the display list carries what the
 * screens need (the engine's own wording and result, never anything an agent claimed). A check that could not be
 * determined (ok null) shows as not passing here; the block keeps the real value.
 */
export function proofRowFromBlock(taskId: string, block: ProofBlock): ProofRow {
  return {
    taskId,
    class: block.class,
    verdict: block.verdict,
    engineVersion: block.engine.version,
    engineSha256: block.engine.sha256,
    checks: block.checks.map((c) => ({
      id: c.claim_id ?? c.name,
      text: c.name,
      ok: c.ok === true,
      ...(c.decidedBy ? { decidedBy: c.decidedBy } : {}),
      ref: c.ref ?? '',
    })),
    claims: block.claims.map((c) => c.text),
    block,
  };
}

export const upsertProofs = (db: Queryable, rows: readonly ProofRow[]): Promise<void> =>
  upsertRows(db, SPEC, rows.map((p) => ({
    task_id: p.taskId, class: p.class, verdict: p.verdict, engine_version: p.engineVersion, engine_sha256: p.engineSha256,
    checks: p.checks, claims: p.claims, block: p.block,
  })));

/** Proofs for these tasks, keyed by task id. */
export async function listProofsFor(db: Queryable, taskIds: readonly string[]): Promise<Map<string, ProofRow>> {
  if (taskIds.length === 0) return new Map();
  const { rows } = await db.query<Db>('select * from proof where task_id = any($1::text[]) order by class', [taskIds]);
  return new Map(
    rows.map((r) => [r.task_id, {
      taskId: r.task_id, class: r.class, verdict: r.verdict, engineVersion: r.engine_version,
      engineSha256: r.engine_sha256, checks: r.checks, claims: r.claims, block: r.block,
    }]),
  );
}
