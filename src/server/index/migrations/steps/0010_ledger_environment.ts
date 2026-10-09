// The environment a deployed event deployed to (src/schemas/ledger.ts `environment`): { name, tier } as json, null on every
// other event and on one written before it was stated. Null reads back as no key, so such an event hashes as before.
import { type Migration } from '../parts';

export const m0010: Migration = {
  version: 10,
  name: 'ledger_environment',
  sql: `
alter table ledger_event add column environment jsonb;
alter table ledger_event add constraint ledger_event_environment_kind check (environment is null or kind = 'deployed');
alter table ledger_event add constraint ledger_event_environment_tier check (
  environment is null or (jsonb_typeof(environment) = 'object' and environment->>'tier' in ('production', 'staging', 'testing', 'development', 'other') and coalesce(environment->>'name', '') <> '')
);
`,
};
