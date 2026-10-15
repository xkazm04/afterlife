// Enrollment: the first record a class gets after its track is armed, at trust-policy.yml's start_tier and never above
// the class's ceiling. One rule for both sides: the server's enroll plan writes it (server/actions/plans/enroll) and the
// Setup track page shows it beside a class with no record, as what the enrollment MR would write (never as a grant).
import { TIER_ORDER, type Ceiling, type Tier } from '@/schemas/tier';

export const isTier = (v: unknown): v is Tier => typeof v === 'string' && (TIER_ORDER as readonly string[]).includes(v);

/** The lower of start_tier and the class's ceiling: the tier an enrollment writes. */
export const enrollTier = (start: Tier, ceiling: Tier): Tier => (TIER_ORDER.indexOf(start) <= TIER_ORDER.indexOf(ceiling) ? start : ceiling);

/** What an enrollment MR would write for a class: null for a human-only class, or when start_tier was not read. */
export const enrollProjection = (start: Tier | null, ceiling: Ceiling): Tier | null =>
  start === null || ceiling === 'human_only' ? null : enrollTier(start, ceiling);

/** The Setup page of a class's track, where its enrollment is sent ("T4" -> /setup/track-T4). Null for an unknown track. */
export const enrollHref = (track: string): string | null => (/^T[1-8]$/.test(track) ? `/setup/track-${track}` : null);
