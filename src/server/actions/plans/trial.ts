// What a promotion MR says of the next rung's trial, so an auditor can recompute it: the seq range of the tier_decisions
// that made each trial MR (src/schemas/trial.ts) and the chain head (seq and hash) of the belay-ledger file it was read
// from. The engine's `ledger trial` recomputes it from that chain alone, by the ledger-record checker's rule. Words only: the write is unchanged.
import type { LedgerEvent } from '@/schemas/ledger';
import { trialDecisions } from '@/schemas/trial';
import { readLedger } from '@/server/index/repositories/ledger/ledger';
import type { Queryable } from '@/server/index/repositories/sql';
import type { PlanContext } from './context';

/** A project's imported belay-ledger: the GitLab project id its file is named by (events/<id>.jsonl), and its events. */
export interface ProjectLedger { projectId: number; events: readonly LedgerEvent[] }

/** The ledger the index holds for an index project; null when the project has no GitLab id yet. */
export const ledgerReader = (db: Queryable, gitlabId: PlanContext['gitlabId']) => async (indexId: string): Promise<ProjectLedger | null> => {
  const id = await gitlabId(indexId);
  return id === null ? null : { projectId: id, events: await readLedger(db, id) };
};

/** The description's trial paragraph for a holder's class since its record; null when the chain holds no trial MR for it. */
export function trialParagraph(ledger: ProjectLedger | null, h: { agent: string; classId: string; since: string }): string | null {
  const from = Date.parse(h.since);
  const head = ledger?.events.at(-1);
  if (!ledger || !head || Number.isNaN(from)) return null;
  const seqs = [...trialDecisions(ledger.events, { agent: h.agent, classId: h.classId, from }).values()].map((d) => d.seq).filter((s): s is number => s !== null);
  if (!seqs.length) return null;
  return [
    `Next-rung trial: ${seqs.length} trial MR(s), tier_decision seq ${Math.min(...seqs)}-${Math.max(...seqs)} in belay-ledger events/${ledger.projectId}.jsonl; chain head seq ${head.seq}, hash ${head.hash}.`,
    'Recompute it from the chain alone (the file cut at that seq, anchored to that hash):',
    `npx tsx engine/cli.ts ledger trial --chain events/${ledger.projectId}.jsonl --through ${head.seq} --head ${head.hash} --agent ${h.agent} --class ${h.classId} --since ${h.since}`,
  ].join('\n');
}
