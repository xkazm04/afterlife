// A saved project as <data>/projects/<slug>.yml holds it (GitLab-hosted, one component, one pipeline, no cloud), for
// the projects model, the screen host and the render tests. Plain data.
import type { ProjectConfig } from '@/schemas/vitals';
import { savedOf } from '../projects/saved';

export const SAVED_CFG: ProjectConfig = {
  slug: 'acme-api',
  name: 'Acme API',
  root: 'C:/Users/x/acme-api',
  onboardedAt: '2026-10-21T09:00:00.000Z',
  engine: { model: 'claude-sonnet-5-5', effort: 'low' },
  host: { kind: 'gitlab', path: 'acme/api' },
  components: [{ id: 'api', path: '.', stack: 'node', tests: ['npm test'] }],
  ci: { provider: 'gitlab-ci', pipelines: [{ id: '7', name: 'api', file: '.gitlab-ci.yml' }], variants: [] },
  cloud: { provider: 'none' },
  probes: [
    { kind: 'git-remote', args: {}, status: 'ok', summary: 'gitlab acme/api', at: '2026-10-21T09:00:00.000Z', ms: 12 },
    { kind: 'git-root', args: { path: '.' }, status: 'ok', summary: 'package.json', at: '2026-10-21T09:00:01.000Z', ms: 4 },
    { kind: 'glab-pipelines', args: { project: 'acme/api' }, status: 'ok', summary: '1 pipeline', data: { pipelineIds: '7' }, at: '2026-10-21T09:00:02.000Z', ms: 300 },
  ],
};

export const SAVED = savedOf(SAVED_CFG);
