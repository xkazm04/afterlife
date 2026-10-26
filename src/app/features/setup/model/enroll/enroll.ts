// Whether a track's Enroll write is on screen, and why not when it is not. Enrollment gives an armed track's classes
// their first records (at start_tier, never above a ceiling) through a policy MR a person merges; it follows the arm and
// is the first rung only, so it is offered when the track reads armed and none of its classes holds a record yet. The
// server plans and refuses on its own read of belay-policy (server/actions/plans/enroll); this is only what the screen
// asks for. Pure.
import type { ActionClass } from '@/lib/demo/types';
import { cellOf } from '@/lib/promotion/rungs';
import { enrollProjection } from '@/lib/promotion/enroll/enroll';
import { TIER_META } from '@/lib/tiers';
import type { Tier } from '@/schemas/tier';
import type { ArmStatus } from '../types';

export type EnrollGate =
  | { kind: 'open' }
  /** The track is not armed (or not verified) yet. */
  | { kind: 'unarmed' }
  /** Every class of the track is human only, or the track has none: no record is ever written. */
  | { kind: 'none' }
  /** These classes hold a record already: promotion takes them from here. */
  | { kind: 'enrolled'; held: string[] };

/** A class that holds a record: a tier, or a split between holders. No record yet, human only and unknown do not. */
const holds = (c: ActionClass): boolean => {
  const cell = cellOf(c);
  return cell !== null && cell !== 'no_record' && cell !== 'human_only';
};

export function enrollGate(arm: ArmStatus | undefined, classes: readonly ActionClass[]): EnrollGate {
  const agentOnes = classes.filter((c) => c.ceiling !== 'human_only');
  if (!agentOnes.length) return { kind: 'none' };
  const held = agentOnes.filter(holds).map((c) => c.id);
  if (held.length) return { kind: 'enrolled', held };
  return arm === 'armed' ? { kind: 'open' } : { kind: 'unarmed' };
}

/** Why there is no Enroll write on screen, in the words the section shows. Null when there is one. */
export function enrollWhyNot(g: EnrollGate, track: string): string | null {
  switch (g.kind) {
    case 'open': return null;
    case 'unarmed': return `Arm ${track} and verify it first: enrollment follows the arm.`;
    case 'none': return `No class of ${track} is ever an agent's: nothing to enroll.`;
    case 'enrolled': return `Already enrolled: ${g.held.join(', ')} ${g.held.length > 1 ? 'hold records' : 'holds a record'}. Promotion takes it from here, on the Ladder.`;
  }
}

/** A no-record class's line: what the enrollment MR would write, from start_tier and the ceiling. Never a grant. */
export function wouldWrite(c: ActionClass, start: Tier | null): string | null {
  if (cellOf(c) !== 'no_record') return null;
  const t = enrollProjection(start, c.ceiling);
  if (t === null) return start === null ? 'start_tier was not read: Afterlife cannot say what an enrollment would write' : null;
  return `The enrollment MR would write ${TIER_META[t].name} (start_tier ${TIER_META[start!].name}, ceiling ${TIER_META[c.ceiling].name}): not granted until a person merges it`;
}
