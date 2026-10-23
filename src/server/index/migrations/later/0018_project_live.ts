// What a poll now reads for a project from GitLab itself: the armed tracks (counted from the default branch's
// .gitlab-ci.yml markers, poller/ci/armed.ts) and the project's address. `armed` loses its 0 default: null is "not read
// yet", never zero armed; a seeded project keeps its seeded count.
import { type Migration } from '../parts';

export const m0018: Migration = {
  version: 18,
  name: 'project_live',
  sql: `
alter table project alter column armed drop not null;
alter table project alter column armed drop default;
alter table project add column web_url text null;  -- the project's GitLab page, as the projects API states it
`,
};
