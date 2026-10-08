// Fleet: the projects Belay watches and what the Fleet screen shows about each.
// Sources: group list and project facts <- GitLab API; class tiers <- belay-policy tier-state.yml;
// the *_7d / needs_you / cra_open columns are roll-ups the poller recomputes from task, proof, proposal and ledger rows.
import { CEILINGS, STAGE_LIST, type Migration } from '../parts';

export const m0001: Migration = {
  version: 1,
  name: 'fleet',
  sql: `
create table fleet_group (path text primary key, ord int not null);

create table trust_class (            -- trust-policy.yml classes; one row per class, global
  id text primary key, ord int not null,
  track smallint check (track between 1 and 8), agent text,
  ceiling text not null check (ceiling in ${CEILINGS})
);

create table project (
  id text primary key,                -- the project path slug the screens use
  gitlab_id int unique,               -- the numeric id the ledger is keyed by (ledger_event.project_id)
  name text not null, what text not null default '',
  group_path text not null references fleet_group(path),
  state text not null check (state in ('watching','setting-up','stale','not-set-up')),
  setup_step text, ord int,           -- ord: listing order from the importer
  armed int not null default 0 check (armed >= 0),
  proofs_pass_7d int, proofs_fail_7d int, proofs_inconclusive_7d int,   -- all NULL = unknown, never zero
  demotions_7d int,
  needs_you int not null default 0, cra_open int not null default 0,
  env_staging text, env_production text,    -- summary lines written at poll time
  last_at timestamptz, last_track text, last_text text,
  check ((proofs_pass_7d is null) = (proofs_fail_7d is null) and (proofs_pass_7d is null) = (proofs_inconclusive_7d is null)),
  check ((last_at is null) = (last_track is null) and (last_at is null) = (last_text is null))
);
create index project_group_idx on project (group_path);

create table project_stage (          -- the nine rungs per project; rung NULL = unknown
  project_id text not null references project(id) on delete cascade,
  stage text not null check (stage in ${STAGE_LIST}),
  rung smallint check (rung between 0 and 4),
  primary key (project_id, stage)
);

create table class_tier (             -- where each class stands now; record columns only for deeply watched projects
  project_id text not null references project(id) on delete cascade,
  class_id text not null references trust_class(id),
  tier text check (tier in ${CEILINGS}),        -- NULL = unknown
  since timestamptz, set_by text, lease_expires timestamptz,
  accepted int, needed int, no_edit float8, clean_days int, reverts int,
  move_kind text check (move_kind in ('promoted','demoted','tripwire','ineligible','note')),
  move_at timestamptz, move_note text,
  primary key (project_id, class_id),
  check ((accepted is null) = (no_edit is null) and (accepted is null) = (clean_days is null) and (accepted is null) = (reverts is null))
);
`,
};
