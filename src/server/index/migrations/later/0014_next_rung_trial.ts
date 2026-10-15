// The next rung, run as a trial. On ledger_event, a tier_decision's would (what the gate would have decided at the rung
// above tier_at_time: json {tier, decision}, never applied), null on every other event and on one written before it was
// stated; null reads back as no key, so such an event hashes as before (src/schemas/ledger.ts). On class_tier, the
// record's trial counter (poller/derive/gate.ts trialOf): json {n, catches}, null when the poll did not read the ledger.
import { type Migration } from '../parts';

export const m0014: Migration = {
  version: 14,
  name: 'next_rung_trial',
  sql: `
alter table ledger_event add column would jsonb;
alter table ledger_event add constraint ledger_event_would_kind check (would is null or kind = 'tier_decision');
alter table ledger_event add constraint ledger_event_would_shape check (
  would is null or (
    jsonb_typeof(would) = 'object'
    and would->>'tier' in ('assisted', 'supervised', 'hands_off')
    and would->>'decision' in ('merge', 'approve', 'wait', 'block')
    and would - 'tier' - 'decision' = '{}'::jsonb
  )
);
alter table class_tier add column trial jsonb check (
  trial is null or (
    jsonb_typeof(trial) = 'object' and jsonb_typeof(trial->'n') = 'number' and jsonb_typeof(trial->'catches') = 'number'
    and (trial->>'n')::int >= 0 and (trial->>'catches')::int >= 0 and (trial->>'catches')::int <= (trial->>'n')::int
  )
);
`,
};
