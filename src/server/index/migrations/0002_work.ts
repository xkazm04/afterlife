// Work: tasks and their proofs, the Needs-you inbox, and the maturity scan.
// Sources: task + proof <- MR notes (belay-proof blocks) and the ledger; proposal <- GitLab state plus Belay's own
// asks (promotion MRs, CRA clocks, gap picks); stage_cell <- the maturity scan of the repository.
import { CEILINGS, STAGE_LIST, type Migration } from './parts';

export const m0002: Migration = {
  version: 2,
  name: 'work',
  sql: `
create table task (
  id text primary key,                -- the Belay-Task ULID
  project_id text not null references project(id) on delete cascade,
  track smallint check (track between 1 and 8), agent text, action_class text, mr_iid int,
  title text not null,
  tier_at_time text check (tier_at_time in ${CEILINGS}),   -- the tier it ran under, not today's
  state text check (state in ('started','proved','blocked','merged','reverted','closed')),
  state_label text,                   -- the sentence the screen shows
  started_at timestamptz, finished_at timestamptz,
  detail jsonb not null default '{}'::jsonb,   -- chain, quote, stats, clock... display facts derived at import
  ord int generated always as identity
);
create index task_project_idx on task (project_id);

create table proof (
  task_id text not null references task(id) on delete cascade,
  class text not null,
  verdict text check (verdict in ('pass','fail','inconclusive')),
  engine_version text, engine_sha256 text,
  checks jsonb not null default '[]'::jsonb, claims jsonb not null default '[]'::jsonb,
  block jsonb,                        -- the full ProofBlock when it was read from an MR note
  primary key (task_id, class)
);

create table proposal (               -- what waits for a human; gap picks are children of one 'gap' inbox item
  id text primary key,
  project_id text not null references project(id) on delete cascade,
  kind text not null check (kind in ('promotion','cra_signoff','gap','readmit','setup_gate')),
  state text not null default 'open' check (state in ('open','acted','dismissed','expired')),
  parent_id text references proposal(id),
  title text not null, subject jsonb not null default '{}'::jsonb,
  due_at timestamptz, opened_at timestamptz not null, acted_at timestamptz,
  acted_as text,                      -- the operator's GitLab user
  ord int generated always as identity
);
create index proposal_open_idx on proposal (project_id, state);

create table stage_cell (
  project_id text not null references project(id) on delete cascade,
  stage text not null check (stage in ${STAGE_LIST}),
  rung smallint check (rung between 0 and 4),            -- index into RUNGS; NULL = unknown
  base_rung smallint check (base_rung between 0 and 4),  -- day 0
  next_rung smallint check (next_rung between 0 and 4),
  evidence jsonb not null default '[]'::jsonb,           -- [{label, url}] GitLab objects
  evidence_note text,
  engine_version text, scanned_at timestamptz not null,
  primary key (project_id, stage, scanned_at)
);
`,
};
