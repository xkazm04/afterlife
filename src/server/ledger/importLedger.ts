// Imports belay-ledger/events/<project-id>.jsonl into the index, incrementally. The file in GitLab is the source of
// truth and the index only a cache of it, so the whole file must verify before anything is appended: a ledger that was
// edited, shortened or forked is rejected (LedgerChainError) and the index keeps what it had.
import type { PGlite } from '@electric-sql/pglite';
import { verifyChain } from '@/schemas/ledger';
import type { GitLabPort, ProjectRef } from '@/server/gitlab/port';
import { LedgerChainError } from '@/server/index/repositories/ledger/chain';
import { appendLedgerEvents, ledgerTail } from '@/server/index/repositories/ledger/ledger';
import { parseLedgerJsonl } from './parse';

export interface LedgerSource {
  port: GitLabPort;
  /** The belay-ledger project (id or path). */
  project: ProjectRef;
  ref: string;
}

export type LedgerImport =
  | { status: 'absent' }
  | { status: 'unchanged'; tailSeq: number }
  | { status: 'imported'; appended: number; tailSeq: number };

/** Blob ids already imported, by project: lets an unchanged file cost one tree listing and nothing else. */
export type BlobCache = Map<number, string>;

/**
 * Brings one project's chain up to date. `gitlabProjectId` is the numeric id the file is named after and the
 * `subject.project_id` of every event in it. Throws LedgerParseError or LedgerChainError; GitLab errors pass through.
 */
export async function importLedger(src: LedgerSource, db: PGlite, gitlabProjectId: number, cache: BlobCache = new Map()): Promise<LedgerImport> {
  const path = `events/${gitlabProjectId}.jsonl`;
  const tree = await src.port.listTree(src.project, { path: 'events', ref: src.ref });
  const entry = tree.find((e) => e.type === 'blob' && e.path === path);
  if (!entry) return { status: 'absent' };

  const tail = await ledgerTail(db, gitlabProjectId);
  if (tail && cache.get(gitlabProjectId) === entry.id) return { status: 'unchanged', tailSeq: tail.seq };

  const file = await src.port.getFile(src.project, path, src.ref);
  if (!file) return { status: 'absent' };
  const events = parseLedgerJsonl(file.content);

  const broken = verifyChain(events);
  if (broken !== null) throw new LedgerChainError(broken, 'the file does not verify from genesis');
  const first = events[0];
  if (first && first.subject.project_id !== gitlabProjectId) {
    throw new LedgerChainError(first.seq, `${path} holds events of project ${first.subject.project_id}`);
  }
  if (tail && events.length < tail.seq) {
    throw new LedgerChainError(events.length, `the file has ${events.length} events but ${tail.seq} are already stored (rewound)`);
  }

  // From the stored tail onward, the tail itself included: appendLedgerEvents skips an identical event and rejects a different one.
  const fresh = events.filter((e) => e.seq >= (tail?.seq ?? 1));
  const { appended } = await appendLedgerEvents(db, fresh);
  cache.set(gitlabProjectId, entry.id);
  return { status: 'imported', appended, tailSeq: events.at(-1)?.seq ?? 0 };
}
