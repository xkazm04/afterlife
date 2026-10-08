// Closed improvement cycles per project, as belay-ledger/cycles/<project-id>.jsonl records them (hash-chained).
// Keyed by the GitLab project id the file is named after, like ledger_event. Rebuilt from that file.
import { type Migration } from './parts';

export const m0005: Migration = {
  version: 5,
  name: 'cycles',
  sql: `
create table cycle_record (
  project_id int not null,
  seq int not null check (seq >= 1),  -- seq n is cycle Cn
  theme text not null, engine text not null,
  opened_at timestamptz not null,
  closed_at timestamptz not null check (closed_at >= opened_at),
  changes jsonb not null,             -- the changes as recorded, verdicts included
  prev_hash text not null, hash text not null,
  primary key (project_id, seq)
);
`,
};
