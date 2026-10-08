// What trust-policy.yml's assisted_to_supervised rule reads beyond the counts: the guardrail blocks in the record's counts,
// and the window they were taken over (window_last: the holder's last that many outputs). Both null when nothing states
// them, never 0 (poller/derive/counters.ts).
import { type Migration } from '../parts';

export const m0007: Migration = {
  version: 7,
  name: 'record_rules',
  sql: `
alter table class_tier add column guardrail_blocks int check (guardrail_blocks >= 0);
alter table class_tier add column count_window int check (count_window > 0);
`,
};
