// The one line a class page opens with: where the class stands and what stands between it and the next tier.
import { enrollHref, whyNot, type Promotion } from '@/lib/promotion';
import { TIER_META } from '@/lib/tiers';
import { shownName } from './tiers';
import type { ClassRow } from '../types';

export function classLede(c: ClassRow, p: Promotion): string {
  const now = `${shownName(c)} · ceiling ${TIER_META[c.ceiling].name}`;
  if (p.kind === 'eligible') return `${now} · eligible for ${TIER_META[p.next].name}`;
  return `${now} · ${whyNot(p).replace(/ \(↵[^)]*\)/, '')}`;
}

/** A class no agent holds yet: its track's Setup page, where the enrollment MR is sent. Null for any other class. */
export const enrollLink = (c: ClassRow, p: Promotion): string | null => (p.kind === 'norecord' ? enrollHref(c.track) : null);
