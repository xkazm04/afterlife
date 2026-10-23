// The Needs-you inbox: open proposals, oldest first. Countdowns are computed from the stored deadline. And "Decided this
// week": what the operator acted on in the last 7 days, newest first.
import { countOpenInbox, listActedProposals, listOpenProposals, type ProposalKind } from '../repositories/work/proposal';
import type { Queryable } from '../repositories/sql';
import { countdown } from './format';
import type { NeedsKind } from '@/lib/demo/types';
import type { DecidedItem } from '@/server/data/types';
import type { NeedsYouItem } from './types';

const WEEK_MS = 7 * 24 * 3_600_000;

const KIND: Record<ProposalKind, NeedsKind> = {
  promotion: 'promote',
  cra_signoff: 'signoff',
  gap: 'gaps',
  readmit: 'readmit',
  setup_gate: 'setup',
};

/** The same value as DEMO.needsYou for one project. The seed's 'gaps' parent counts its picked children; a live gap (one stage, `subject.stage`) has none. */
export async function getNeedsYou(db: Queryable, projectId: string, now: Date = new Date()): Promise<NeedsYouItem[]> {
  const [items, picks] = await Promise.all([listOpenProposals(db, projectId), listOpenProposals(db, projectId, true)]);
  return items.map((p) => {
    const item = { id: p.id, kind: KIND[p.kind], title: p.title, ...p.subject, openedAt: p.openedAt.toISOString() } as NeedsYouItem;
    if (p.dueAt) item.dueIn = countdown(p.dueAt.getTime() - now.getTime());
    if (p.kind === 'gap' && p.subject.stage === undefined) item.count = picks.filter((c) => c.parentId === p.id && c.subject.picked === true).length;
    return item;
  });
}

/** The number on the sidebar badge. */
export const getNeedsYouCount = (db: Queryable, projectId: string): Promise<number> => countOpenInbox(db, projectId);

/** One project's proposals acted on in the 7 days before `now`, newest first. */
export async function getDecided(db: Queryable, projectId: string, now: Date = new Date()): Promise<DecidedItem[]> {
  const rows = await listActedProposals(db, projectId, new Date(now.getTime() - WEEK_MS));
  return rows.map((p) => ({ id: p.id, kind: KIND[p.kind], project: p.projectId, title: p.title, actedAt: (p.actedAt as Date).toISOString(), actedAs: p.actedAs }));
}
