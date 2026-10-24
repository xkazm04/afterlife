// A project's maturity gaps from its newest scan: one top-level 'gap' proposal per stage the engine's own `propose()`
// names, `gap:<project>:<stage>:<to>`. Pure. As with the promotion asks, an id a person acted on or dismissed (or one
// that expired) is never opened again, an open one keeps its openedAt, and an open one whose stage reached its rung expires.
// Only `gap:` ids are this module's: the seed's 'gaps' parent and its picks are left as they are.
import { propose, type Proposal } from '../../../../engine/scan/scan';
import type { ScanCell } from '@/schemas/maturity';
import type { Stage } from '@/schemas/stages';
import type { ProposalRow } from '@/server/index/repositories/work/proposal';
import { templateFor } from './templates';

export interface GapPlan {
  /** New gap proposals, and this module's open ones refreshed (openedAt kept). */
  upsert: ProposalRow[];
  /** Ids of this module's open gaps whose stage now stands at or above the rung they asked for. */
  expire: string[];
}

/** The id of one stage's gap to rung `to`. */
export const gapId = (projectId: string, stage: Stage, to: number): string => `gap:${projectId}:${stage}:${to}`;

/** The change's first clause, so the title stays one line; the subject keeps it whole. */
const short = (change: string): string => {
  const first = change.split(/,| \(/)[0]?.trim() ?? change;
  return first.length > 60 ? `${first.slice(0, 59)}…` : first;
};

const rungText = (r: number | null): string => (r === null ? 'R?' : `R${r}`);

function gapProposal(projectId: string, g: Proposal, openedAt: Date): ProposalRow {
  const template = templateFor(g.stage, g.from, g.to);
  return {
    id: gapId(projectId, g.stage, g.to), projectId, kind: 'gap', state: 'open', parentId: null,
    title: `${g.stage} ${rungText(g.from)} → ${rungText(g.to)}: ${short(g.change)}`,
    subject: {
      stage: g.stage, rungFrom: g.from, rungTo: g.to, change: g.change, template,
      does: template ? `Opens a draft MR from the ${template} template; nothing merges without you.` : 'Names the change; making it is yours.',
    },
    dueAt: null, openedAt, actedAt: null, actedAs: null,
  };
}

/** `existing`: every 'gap' proposal of the project, in any state. `cells`: the newest scan's nine. */
export function planGaps(projectId: string, cells: readonly ScanCell[], existing: readonly ProposalRow[], now: Date): GapPlan {
  const own = existing.filter((p) => p.kind === 'gap' && p.parentId === null && p.id.startsWith(`gap:${projectId}:`));
  const byId = new Map(own.map((p) => [p.id, p]));
  const wanted = new Set<string>();
  const upsert: ProposalRow[] = [];
  for (const g of propose({ source: 'gitlab', cells })) {
    const id = gapId(projectId, g.stage, g.to);
    wanted.add(id);
    const have = byId.get(id);
    if (have && have.state !== 'open') continue; // settled: the upsert would rewrite its state
    upsert.push(gapProposal(projectId, g, have?.openedAt ?? now));
  }
  const rung = new Map(cells.map((c) => [c.stage as string, c.rung]));
  const reached = (p: ProposalRow): boolean => {
    const at = rung.get(String(p.subject.stage));
    const to = p.subject.rungTo;
    return typeof at === 'number' && typeof to === 'number' && at >= to;
  };
  return { upsert, expire: own.filter((p) => p.state === 'open' && !wanted.has(p.id) && reached(p)).map((p) => p.id) };
}
