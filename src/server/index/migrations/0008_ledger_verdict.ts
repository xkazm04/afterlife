// The guardrail's verdict on a guardrail_verdict event (src/schemas/ledger.ts `verdict`): pass or block, null on every
// other event and on one written before the gate stated it. Null reads back as no key, so such an event hashes as before.
import { type Migration } from './parts';

export const m0008: Migration = {
  version: 8,
  name: 'ledger_verdict',
  sql: `
alter table ledger_event add column verdict text check (verdict in ('pass', 'block'));
alter table ledger_event add constraint ledger_event_verdict_kind check (verdict is null or kind = 'guardrail_verdict');
`,
};
