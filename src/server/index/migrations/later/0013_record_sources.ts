// The outputs behind a record's counts (src/lib/demo/sources.ts, poller/derive/sources.ts): which merge requests the poll
// counted, which it left out and why, and the facts it could not read. Json, null when none is listed (no single holder,
// no since, or a row written before this migration).
import { type Migration } from '../parts';

export const m0013: Migration = {
  version: 13,
  name: 'record_sources',
  sql: `
alter table class_tier add column sources jsonb check (sources is null or jsonb_typeof(sources) = 'object');
`,
};
