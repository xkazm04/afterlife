// The real film's holds and the kind-to-hold table (the README carries the same table). A kind moves the climber only
// to the hold that the kind is; a kind that is no hold moves nothing, so a hold the ledger does not reach stays unclimbed.
import type { EnvironmentTier, LedgerEvent, LedgerKind } from '@/schemas/ledger';
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

/** A deployed event's hold by its environment's tier: staging is hold 7, production hold 8; any other tier reaches none. */
const DEPLOY_HOLD: Readonly<Partial<Record<EnvironmentTier, number>>> = { staging: 7, production: 8 };

/**
 * The hold each ledger kind is, or null. task_started: work began, no hold yet. deployed: by the environment's tier (see
 * `holdOf`), so the table says null. outcome, clock_event: no hold of the climb.
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

/** The hold an event reaches, or null: the kind's hold, and for a deployed event the hold of its environment's tier (none stated, or any other tier: none). */
export function holdOf(e: Pick<LedgerEvent, 'kind' | 'environment'>): number | null {
  if (e.kind === 'deployed') return (e.environment && DEPLOY_HOLD[e.environment.tier]) ?? null;
  return KIND_HOLD[e.kind];
}
