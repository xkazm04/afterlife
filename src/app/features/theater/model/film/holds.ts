// The real film's holds and the kind-to-hold table (the README carries the same table). A kind moves the climber only
// to the hold that the kind is; a kind that is no hold moves nothing, so a hold the ledger does not reach stays unclimbed.
import type { LedgerKind } from '@/schemas/ledger';
import type { Hold } from '../types';

/** The nine holds of the loop, by name and stage only: a real film tells no story about them. */
export const HOLDS: readonly Hold[] = [
  { n: 1, label: 'Finding', stage: 'secure' },
  { n: 2, label: 'Red test', stage: 'verify' },
  { n: 3, label: 'Patch', stage: 'create' },
  { n: 4, label: 'Proof Block', stage: 'verify' },
  { n: 5, label: 'Guardrail', stage: 'secure' },
  { n: 6, label: 'Tier gate', stage: 'govern' },
  { n: 7, label: 'Staging', stage: 'release' },
  { n: 8, label: 'Production', stage: 'configure' },
  { n: 9, label: 'Summary', stage: 'monitor' },
];

/**
 * The hold each ledger kind is, or null. task_started: work began, no hold yet. deployed: the event does not say to
 * which environment, so neither Staging nor Production. outcome, clock_event: no hold of the climb.
 */
export const KIND_HOLD: Readonly<Record<LedgerKind, number | null>> = {
  task_started: null,
  proof_verdict: 4,
  guardrail_verdict: 5,
  tier_decision: 6,
  merged: 6,
  deployed: null,
  outcome: null,
  clock_event: null,
};
