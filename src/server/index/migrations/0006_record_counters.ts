// A class record's counters, each on its own. 0001 held them all set or all null; the poll counts a record from tasks and
// the ledger (poller/derive/counters.ts), and some counters have no source (no-edit) or only one under a policy condition
// (reverts, clean days). Null means nothing states the counter; it is never 0.
import { type Migration } from './parts';

export const m0006: Migration = {
  version: 6,
  name: 'record_counters',
  sql: `
alter table class_tier drop constraint class_tier_check;
`,
};
