// The rows a revoke moves and the ledger line it leaves. The write itself (the exact commands and the tier-state.yml diff)
// is planned on the server from belay-policy as it is (previewAction, see ../../write/revoke.ts): nothing here spells a
// command or a path inside tier-state.yml.
import { TIER_META } from '@/lib/tiers';
import type { Ceiling, Change, ClassRow, Tier } from '../types';
import { actsFrom, shownName } from './tiers';

export interface PlanRow {
  cls: ClassRow;
  /** Null: the class has no tier to lower from (no record yet, unknown). */
  from: Ceiling | null;
  to: Tier;
}

/** The classes a set of changes moves, from what to what. Unknown ids are skipped. */
export function planRows(byId: Readonly<Record<string, ClassRow>>, changes: readonly Change[]): PlanRow[] {
  return changes.flatMap(({ id, to }) => {
    const cls = byId[id];
    return cls ? [{ cls, from: actsFrom(cls), to }] : [];
  });
}

/**
 * The ledger text of a commit: "commit e7f1 in belay-policy: a Supervised → Assisted". `commit` null: the write ran but
 * no commit id came back, and the line says so instead of inventing one.
 */
export function commitText(commit: string | null, rows: readonly PlanRow[]): string {
  const moves = rows.map((r) => `${r.cls.id} ${r.from ? TIER_META[r.from].name : shownName(r.cls)} → ${TIER_META[r.to].name}`).join(' · ');
  return `${commit ? `commit ${commit}` : 'tier-state.yml written (no commit id read back)'} in belay-policy: ${moves}`;
}
