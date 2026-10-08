// Closed improvement cycles per project, as belay-ledger/cycles/<gitlab-id>.jsonl records them (hash-chained).
// Keyed by the index's project id, since a seeded project has no GitLab id; each record also keeps the GitLab project it
// names. Rebuilt from that file (seeded projects: from the seed).
import { type Migration } from './parts';

export const m0005: Migration = {
  version: 5,
  name: 'cycles',
  sql: `
create table cycle_record (
  project_id text not null,           -- project.id
  seq int not null check (seq >= 1),  -- seq n is cycle Cn
  gitlab_project_id int not null,     -- the record's own project_id (the file it came from)
  theme text not null, engine text not null,
  opened_at timestamptz not null,
  closed_at timestamptz not null check (closed_at >= opened_at),
  changes jsonb not null,             -- the changes as recorded, verdicts included
  prev_hash text not null, hash text not null,
  primary key (project_id, seq)
);
`,
};
