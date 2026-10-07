// The Ladder screen: every action class of a project with its tier, ceiling, lease and record.
import { listClassTiers, type ClassTierRow } from '../repositories/fleet/classTier';
import { listTrustClasses } from '../repositories/fleet/taxonomy';
import type { Queryable } from '../repositories/sql';
import { ageText, daysLeft } from './format';
import type { ActionClassView } from './types';

/** "promoted 5 d ago", "no change"... Unknown history is said to be unknown, not "no change". */
function lastMove(row: ClassTierRow, now: Date): string {
  const m = row.move;
  if (!m) return row.record ? 'no change' : 'unknown';
  const ago = m.at ? ageText(now.getTime() - m.at.getTime()) : null;
  switch (m.kind) {
    case 'promoted': return ago ? `promoted ${ago} ago` : 'promoted';
    case 'demoted': return `demoted ${m.note ?? ''}${ago ? ` ${ago} ago` : ''}`.trim();
    case 'tripwire': return ago ? `${ago} ago · tripwire` : 'tripwire';
    case 'ineligible':
      return row.record ? `record ${row.record.accepted} / ${row.record.needed ?? '?'} · not eligible` : 'not eligible';
    case 'note': return m.note ?? 'unknown';
    case 'no_record': return 'no tier record: not trusted';
    case 'refused': return m.note ? `several agents hold it (${m.note}): blocked` : 'several agents hold it: blocked';
  }
}

/** The same value as DEMO.actionClasses for one project, in policy order. */
export async function getActionClasses(db: Queryable, projectId: string, now: Date = new Date()): Promise<ActionClassView[]> {
  const [classes, rows] = await Promise.all([listTrustClasses(db), listClassTiers(db, projectId)]);
  const held = new Map(rows.map((r) => [r.classId, r]));
  const out: ActionClassView[] = [];
  for (const c of classes) {
    const r = held.get(c.id);
    if (!r) continue;
    out.push({
      id: c.id,
      track: c.track === null ? 'unknown' : `T${c.track}`,
      ceiling: c.ceiling,
      tier: r.tier,
      lease_days: r.leaseExpires ? daysLeft(r.leaseExpires.getTime() - now.getTime()) : null,
      record: r.record,
      lastMove: lastMove(r, now),
    });
  }
  return out;
}
