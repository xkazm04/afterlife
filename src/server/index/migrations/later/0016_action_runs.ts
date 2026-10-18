// action_runs: one row per previewId a live confirm claimed (server/actions/runs/journal.ts). Claimed 'running' before the
// first command, finished 'done' or 'failed' with the response the operator was sent, or 'cut' when the confirm ended with
// no answer. `boot` names the process that claimed it: a row still 'running' under another boot was left by a process that
// died mid-send. Additive: older Belay refuses an index that ran it (migrate.ts), so keep this file in any rollback.
import { type Migration } from '../parts';

export const m0016: Migration = {
  version: 16,
  name: 'action_runs',
  sql: `
create table action_runs (
  preview_id text primary key check (preview_id ~ '^[0-9a-f]{64}$'),
  state text not null check (state in ('running', 'done', 'failed', 'cut')),
  boot text not null,
  since timestamptz not null,
  finished_at timestamptz,
  response jsonb,
  check ((state in ('done', 'failed')) = (response is not null)),
  check ((state = 'running') = (finished_at is null))
);
`,
};
