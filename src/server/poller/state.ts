// What a poller remembers between cycles, to avoid asking GitLab again for what has not changed. Losing it (a restart)
// only costs one slower cycle: every row is rebuilt from GitLab.
import type { TierState } from '@/schemas/tier';
import type { GlNote } from '@/server/gitlab/types';
import type { BlobCache } from '@/server/ledger/importLedger';

/** tier-state.yml at one commit: parsed, not in that commit, or not a tier-state the engine accepts. */
export type StateRevision = TierState | 'absent' | 'unreadable';

export interface PollMemory {
  /** Notes of an MR as they were when it was last updated: key `<project id>!<iid>`. */
  notes: Map<string, { updatedAt: string; notes: GlNote[] }>;
  /** Ledger blob ids already imported. */
  ledger: BlobCache;
  /** Cycle-file blob ids already imported. */
  cycles: BlobCache;
  /** GitLab project id -> the maturity scan job last settled (stored, or refused for good with this issue). */
  scans: Map<number, { jobId: number; issue: string | null }>;
  /** tier-state.yml by commit id (a commit never changes): stateHistory.ts reads each revision once. */
  states: Map<string, StateRevision>;
  /** GitLab project id -> the default branch's .gitlab-ci.yml as last read: the newest commit touching it, and its armed tracks. */
  ciFiles: Map<number, { key: string; armed: number }>;
  /** An agent MR's size at a head sha (a sha's diff never changes): key `<project id>!<iid>` (mrFacts/facts.ts). */
  mrSizes: Map<string, { sha: string; size: number }>;
  /** An agent MR's head pipeline once final (success, failed, canceled): key `<project id>!<iid>`. Running is re-read. */
  mrPipelines: Map<string, { id: number; status: 'success' | 'failed' | 'canceled' }>;
}

export const createMemory = (): PollMemory => ({
  notes: new Map(), ledger: new Map(), cycles: new Map(), scans: new Map(), states: new Map(), ciFiles: new Map(), mrSizes: new Map(), mrPipelines: new Map(),
});

const projectOf = (key: string): number => Number(key.slice(0, key.indexOf('!')));

/**
 * Forget what is held for a GitLab project that is no longer polled (left the group, archived): its notes, its scan, its
 * ledger, its cycle file, its CI file and its MRs' sizes and pipelines.
 */
export function forgetProjects(mem: PollMemory, polled: ReadonlySet<number>): void {
  for (const map of [mem.notes, mem.mrSizes, mem.mrPipelines]) for (const key of map.keys()) if (!polled.has(projectOf(key))) map.delete(key);
  for (const id of mem.scans.keys()) if (!polled.has(id)) mem.scans.delete(id);
  for (const id of mem.ledger.keys()) if (!polled.has(id)) mem.ledger.delete(id);
  for (const id of mem.cycles.keys()) if (!polled.has(id)) mem.cycles.delete(id);
  for (const id of mem.ciFiles.keys()) if (!polled.has(id)) mem.ciFiles.delete(id);
}
