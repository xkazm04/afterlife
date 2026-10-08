// The operator's side: where Belay is paired, setup progress, feed health, and every confirmed write.
// Sources: pairing + setup_step <- belay doctor probes; poll_state <- the poller; commands_run <- Belay itself
// (the only table with no outside copy: it is the local audit of what the operator clicked).
import { type Migration } from '../parts';

export const m0004: Migration = {
  version: 4,
  name: 'operator',
  sql: `
create table pairing (
  id text primary key, gitlab_host text not null, group_path text not null,
  checkout_path text,                 -- absolute path, verified with git rev-parse
  paired_at timestamptz
);
create table setup_step (
  pairing_id text not null references pairing(id) on delete cascade,
  step int not null check (step between 0 and 14),
  who text not null check (who in ('agent','human')),
  state text not null check (state in ('done','running','needs_you','waiting','unknown','failed')),
  probe jsonb, probed_at timestamptz,  -- what Belay measured, never what an agent said
  primary key (pairing_id, step)
);
create table poll_state (
  source text primary key,            -- 'project:<id>', 'group:<path>', ...
  last_ok timestamptz, last_error text   -- a stale feed looks stale
);
create table commands_run (
  id int generated always as identity primary key,
  at timestamptz not null, operator text not null,
  project_id text, proposal_id text,
  display text not null,              -- the exact command the operator saw before clicking
  argv jsonb not null, risk text,
  outcome text not null default 'confirmed' check (outcome in ('confirmed','ok','failed')),
  exit_code int, finished_at timestamptz
);
create index commands_run_project_idx on commands_run (project_id, at);
`,
};
