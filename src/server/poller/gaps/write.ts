// The gap proposals into the index, inside the scan's own write transaction (maturityScan.ts, right after its cells).
import type { ScanCell } from '@/schemas/maturity';
import { closeProposal, listProposalsOfKind, upsertProposals } from '@/server/index/repositories/work/proposal';
import type { Queryable } from '@/server/index/repositories/sql';
import { planGaps } from './derive';

/** Opens, refreshes and expires the project's `gap:` proposals for the scan just stored. */
export async function writeGaps(db: Queryable, projectId: string, cells: readonly ScanCell[], now: Date): Promise<void> {
  const plan = planGaps(projectId, cells, await listProposalsOfKind(db, projectId, 'gap'), now);
  await upsertProposals(db, plan.upsert);
  for (const id of plan.expire) await closeProposal(db, id, 'expired', now, null);
}
