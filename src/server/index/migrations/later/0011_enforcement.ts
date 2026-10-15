// Where a revoke was enforced. On ledger_event, a tier_decision's state_rev (the tier-state.yml commit its gate read) and
// withdrew (what belay-apply's sweep took back: a json list of 'approval' / 'auto_merge'), null on every other event and
// on one written before they were stated; null reads back as no key, so such an event hashes as before
// (src/schemas/ledger.ts). On class_tier, the receipt the poll derives for the record (poller/derive/receipt.ts): json,
// null when there is none (no single holder, or no commit list read).
import { type Migration } from '../parts';

export const m0011: Migration = {
  version: 11,
  name: 'enforcement_receipt',
  sql: `
alter table ledger_event add column state_rev text check (state_rev ~ '^[0-9a-f]{40}$');
alter table ledger_event add column withdrew jsonb;
alter table ledger_event add constraint ledger_event_state_rev_kind check (state_rev is null or kind = 'tier_decision');
alter table ledger_event add constraint ledger_event_withdrew_kind check (withdrew is null or kind = 'tier_decision');
alter table ledger_event add constraint ledger_event_withdrew_list check (
  withdrew is null or (jsonb_typeof(withdrew) = 'array' and jsonb_array_length(withdrew) > 0 and withdrew <@ '["approval", "auto_merge"]'::jsonb)
);
alter table class_tier add column receipt jsonb;
`,
};
