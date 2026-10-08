// The promotion cooldown a tier record states (tier-state.yml `cooldown_until`, stamped by the tripwire and by a revoke
// from trust-policy.yml's cooldown_days): no promotion before it. Null: the record states none.
import { type Migration } from '../parts';

export const m0009: Migration = {
  version: 9,
  name: 'class_cooldown',
  sql: `
alter table class_tier add column cooldown_until timestamptz;
`,
};
