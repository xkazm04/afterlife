// The Needs-you inbox: open proposals, oldest first. Countdowns are computed from the stored deadline.
import { countOpenInbox, listOpenProposals, type ProposalKind } from '../repositories/work/proposal';
import type { Queryable } from '../repositories/sql';
import { countdown } from './format';
import type { NeedsKind } from '@/lib/demo/types';
import type { NeedsYouItem } from './types';

const KIND: Record<ProposalKind, NeedsKind> = {
  promotion: 'promote',
  cra_signoff: 'signoff',
  gap: 'gaps',
  readmit: 'readmit',
  setup_gate: 'setup',
};

/** The same value as DEMO.needsYou for one project. A 'gaps' item counts its picked children. */
export async function getNeedsYou(db: Queryable, projectId: string, now: Date = new Date()): Promise<NeedsYouItem[]> {
  const [items, picks] = await Promise.all([listOpenProposals(db, projectId), listOpenProposals(db, projectId, true)]);
  return items.map((p) => {
    const item = { id: p.id, kind: KIND[p.kind], title: p.title, ...p.subject } as NeedsYouItem;
    if (p.dueAt) item.dueIn = countdown(p.dueAt.getTime() - now.getTime());
    if (p.kind === 'gap') item.count = picks.filter((c) => c.parentId === p.id && c.subject.picked === true).length;
    return item;
  });
}

/** The number on the sidebar badge. */
export const getNeedsYouCount = (db: Queryable, projectId: string): Promise<number> => countOpenInbox(db, projectId);
