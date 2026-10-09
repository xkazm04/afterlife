// What a poller remembers between cycles, to avoid asking GitLab again for what has not changed. Losing it (a restart)
// only costs one slower cycle: every row is rebuilt from GitLab.
import type { GlNote } from '@/server/gitlab/types';
import type { BlobCache } from '@/server/ledger/importLedger';

export interface PollMemory {
  /** Notes of an MR as they were when it was last updated: key `<project id>!<iid>`. */
  notes: Map<string, { updatedAt: string; notes: GlNote[] }>;
  /** Ledger blob ids already imported. */
  ledger: BlobCache;
  /** GitLab project id -> the maturity scan job last settled (stored, or refused for good with this issue). */
  scans: Map<number, { jobId: number; issue: string | null }>;
}

export const createMemory = (): PollMemory => ({ notes: new Map(), ledger: new Map(), scans: new Map() });
