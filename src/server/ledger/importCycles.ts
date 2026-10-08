// Imports belay-ledger/cycles/<project-id>.jsonl into the index. Like the event ledger, the file in GitLab is the truth
// and the whole file must verify first; it may only extend what is stored. An edited, shortened or forked history is
// rejected (LedgerChainError) and the index keeps the cycles it had.
import type { PGlite } from '@electric-sql/pglite';
import { verifyCycles } from '@/schemas/cycle';
import { LedgerChainError } from '@/server/index/repositories/ledger/chain';
import { listCycleRecords, replaceCycleRecords } from '@/server/index/repositories/ledger/cycles';
import type { BlobCache, LedgerSource } from './importLedger';
import { parseCyclesJsonl } from './parseCycles';

export type CyclesImport = { status: 'absent' } | { status: 'unchanged'; cycles: number } | { status: 'imported'; cycles: number };

export async function importCycles(src: LedgerSource, db: PGlite, gitlabProjectId: number, cache: BlobCache = new Map()): Promise<CyclesImport> {
  const path = `cycles/${gitlabProjectId}.jsonl`;
  const tree = await src.port.listTree(src.project, { path: 'cycles', ref: src.ref });
  const entry = tree.find((e) => e.type === 'blob' && e.path === path);
  if (!entry) return { status: 'absent' };

  const stored = await listCycleRecords(db, gitlabProjectId);
  if (stored.length > 0 && cache.get(gitlabProjectId) === entry.id) return { status: 'unchanged', cycles: stored.length };

  const file = await src.port.getFile(src.project, path, src.ref);
  if (!file) return { status: 'absent' };
  const records = parseCyclesJsonl(file.content);
  const broken = verifyCycles(records);
  if (broken !== null) throw new LedgerChainError(broken, `${path} does not verify from the first cycle`);
  const foreign = records.find((r) => r.project_id !== gitlabProjectId);
  if (foreign) throw new LedgerChainError(foreign.seq, `${path} holds cycles of project ${foreign.project_id}`);
  if (records.length < stored.length) {
    throw new LedgerChainError(records.length, `the file has ${records.length} cycles but ${stored.length} are already stored (rewound)`);
  }
  const fork = stored.find((s, i) => records[i]?.hash !== s.hash);
  if (fork) throw new LedgerChainError(fork.seq, `cycle ${fork.seq} differs from the one stored (a rewritten history)`);

  await db.transaction((tx) => replaceCycleRecords(tx, gitlabProjectId, records));
  cache.set(gitlabProjectId, entry.id);
  return { status: 'imported', cycles: records.length };
}
