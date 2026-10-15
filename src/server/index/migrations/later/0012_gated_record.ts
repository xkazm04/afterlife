// Earned on gated work: the record's gated outputs (the counted merged outputs belay-apply's gate decided, a tier_decision
// event in the imported ledger; null when the poll did not read the ledger, never 0), and the gate last seen deciding for
// the class's holder since its since: the MR, the tier it decided at and when (all three null when none was seen).
import { type Migration } from '../parts';

export const m0012: Migration = {
  version: 12,
  name: 'gated_record',
  sql: `
alter table class_tier add column gated int check (gated >= 0);
alter table class_tier add column gate_iid int;
alter table class_tier add column gate_tier text check (gate_tier in ('quarantined', 'assisted', 'supervised', 'hands_off'));
alter table class_tier add column gate_at timestamptz;
alter table class_tier add constraint class_tier_gate_seen check ((gate_iid is null) = (gate_tier is null) and (gate_iid is null) = (gate_at is null));
`,
};
