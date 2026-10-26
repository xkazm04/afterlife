// The demo estate's projects as Vitals sees them: three of acme-lab's fleet (src/lib/demo/data/belay-demo.json), each
// shaped like a config the onboarding wizard saves. ILLUSTRATIVE: no checkout, no login, no probe ran, nothing was
// collected; the figures drawn beside them (model/demo/ci.ts, signals.ts) are placeholders for layout, never measured.
import type { CiConfig, ProjectConfig } from '@/schemas/vitals';

/** The demo estate's GitLab group (belay-demo.json portfolio.group). */
export const DEMO_GROUP = 'acme-lab';

const ONBOARDED = '2026-10-01T09:00:00.000Z';

/** One .gitlab-ci.yml pipeline told apart by trigger: main pushes, merge requests and (when given) the nightly schedule. */
function gitlabCi(id: string, name: string, nightly: boolean): CiConfig {
  const variants: CiConfig['variants'] = [
    { id: 'main-full', pipelineId: id, match: { branch: 'main', reason: ['push'] } },
    { id: 'mr-feature', pipelineId: id, match: { reason: ['merge_request_event'] } },
  ];
  if (nightly) variants.push({ id: 'nightly', pipelineId: id, match: { reason: ['schedule'] } });
  return { provider: 'gitlab-ci', pipelines: [{ id, name, file: '.gitlab-ci.yml' }], variants };
}

function project(slug: string, pipelineId: string, nightly: boolean, cloud: ProjectConfig['cloud']): ProjectConfig {
  return {
    slug,
    name: slug,
    root: 'no checkout (demo)',
    onboardedAt: ONBOARDED,
    engine: { model: 'claude-sonnet-5-5', effort: 'low' },
    host: { kind: 'gitlab', path: `${DEMO_GROUP}/${slug}` },
    components: [{ id: slug, path: '.', stack: 'node' }],
    ci: gitlabCi(pipelineId, slug, nightly),
    cloud,
    probes: [],
  };
}

const sub = { resourceGroup: 'rg-acme-lab', subscription: 'sub-acme-lab' };

/** ledgerline (the deep demo project) with App Insights; ledgerline-web with no cloud; payments-gateway on Log Analytics. */
export const DEMO_PROJECTS: readonly ProjectConfig[] = [
  project('ledgerline', '101', true, { provider: 'azure-app-insights', resource: { appId: '00000000-0000-0000-0000-000000000101', name: 'ledgerline-ai', ...sub } }),
  project('ledgerline-web', '102', false, { provider: 'none' }),
  project('payments-gateway', '103', false, { provider: 'azure-log-analytics', logs: { workspaceId: '00000000-0000-0000-0000-000000000103', name: 'law-acme-lab', ...sub } }),
];
