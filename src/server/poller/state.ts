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
}

export const createMemory = (): PollMemory => ({ notes: new Map(), ledger: new Map(), cycles: new Map(), scans: new Map(), states: new Map() });

/** Forget what is held for a GitLab project that is no longer polled (left the group, archived): its notes, its scan and its cycle file. */
export function forgetProjects(mem: PollMemory, polled: ReadonlySet<number>): void {
  for (const key of mem.notes.keys()) if (!polled.has(Number(key.slice(0, key.indexOf('!'))))) mem.notes.delete(key);
  for (const id of mem.scans.keys()) if (!polled.has(id)) mem.scans.delete(id);
  for (const id of mem.cycles.keys()) if (!polled.has(id)) mem.cycles.delete(id);
}
