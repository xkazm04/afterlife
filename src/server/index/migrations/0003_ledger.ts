// The append-only hash chain. Source of truth is belay-ledger/events/<project-id>.jsonl; this table is its index.
import { TIERS, type Migration } from './parts';

export const m0003: Migration = {
  version: 3,
  name: 'ledger',
  sql: `
create table ledger_event (
  project_id int not null,            -- GitLab project id; one chain per project
  seq int not null check (seq >= 1),
  at text not null,                   -- exactly the ISO string the hash covers
  at_ts timestamptz not null,         -- the same instant, for ordering and range queries
  agent text not null, action_class text not null, kind text not null,
  tier_at_time text not null check (tier_at_time in ${TIERS}),
  subject jsonb not null, payload_ref text not null, observed_by text not null,
  prev_hash text not null, hash text not null,
  primary key (project_id, seq),
  unique (project_id, hash)
);
create index ledger_event_class_idx on ledger_event (project_id, action_class);

create function ledger_event_append_only() returns trigger language plpgsql as $$
begin raise exception 'ledger_event is append-only'; end $$;
create trigger ledger_event_no_change before update or delete on ledger_event
  for each row execute function ledger_event_append_only();
`,
};
