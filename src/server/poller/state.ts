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
 * How each map is keyed: by GitLab project id, by `<project id>!<iid>`, or by tier-state.yml commit (stateHistory.ts keeps
 * those to the commits last read). Keyed by PollMemory itself, so a map added there fails the typecheck here until
 * forgetProjects is told how to forget it.
 */
const KEYED: Readonly<Record<keyof PollMemory, 'project' | 'mr' | 'commit'>> = {
  notes: 'mr', ledger: 'project', cycles: 'project', scans: 'project', states: 'commit', ciFiles: 'project', mrSizes: 'mr', mrPipelines: 'mr',
};

/**
 * Forget what is held for a GitLab project that is no longer polled (left the group, archived): every map keyed by its
 * project id or by one of its MRs.
 */
export function forgetProjects(mem: PollMemory, polled: ReadonlySet<number>): void {
  for (const name of Object.keys(KEYED) as (keyof PollMemory)[]) {
    const kind = KEYED[name];
    if (kind === 'commit') continue;
    const map = mem[name] as Map<number | string, unknown>;
    for (const key of map.keys()) if (!polled.has(kind === 'mr' ? projectOf(String(key)) : Number(key))) map.delete(key);
  }
}
