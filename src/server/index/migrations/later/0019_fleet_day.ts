// fleet_day: one row per project per UTC day, written after the day's first poll cycle (data/live/day.ts) from the
// numbers the Fleet showed: the history the week-over-week trend reads. Append-only like ledger_event: a day once
// written is never rewritten, so update and delete raise. Additive: older Afterlife refuses an index that ran it (migrate.ts).
import { type Migration } from '../parts';

export const m0019: Migration = {
  version: 19,
  name: 'fleet_day',
  sql: `
create table fleet_day (
  day date not null,                  -- UTC
  project_id text not null,
  group_path text,
  needs int not null,
  stale boolean not null,
  hands_off int null,                 -- null: the project's tiers were unknown
  proofs_7d int null,
  red_rate real null,
  cost_usd real null,                 -- null: not metered
  primary key (day, project_id)
);

create function fleet_day_append_only() returns trigger language plpgsql as $$
begin raise exception 'fleet_day is append-only'; end $$;
create trigger fleet_day_no_change before update or delete on fleet_day
  for each row execute function fleet_day_append_only();
`,
};
