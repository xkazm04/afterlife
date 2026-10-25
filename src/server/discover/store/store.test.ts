// <data>/projects/<slug>.yml: a round trip keeps every field, slugs stay unique, a re-onboarded root keeps its own slug,
// and a file that is not a project is skipped and counted.
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import { kebab, loadProjects, loadProjectsReport, saveProject, uniqueSlug } from './store';

let data = '';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  if (data) rmSync(data, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const CFG: ProjectConfig = {
  slug: 'grinex-portal',
  name: 'Grinex Portal',
  root: 'C:/Users/x/refactoring',
  onboardedAt: '2026-10-25T09:00:00.000Z',
  engine: { model: 'claude-sonnet-5-5', effort: 'low' },
  host: { kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal' },
  components: [{ id: 'release-log', path: 'release-log', stack: 'python', tests: ['pytest release-log'] }],
  ci: { provider: 'azure-pipelines', pipelines: [{ id: '2', name: 'Grinex Portal', file: 'azure-pipelines.yml' }], variants: [{ id: 'master-hotfix', pipelineId: '2', match: { branch: 'master', parameter: { name: 'LANE', value: 'hotfix' } } }] },
  cloud: { provider: 'azure-app-insights', resource: { appId: 'a', name: 'n', resourceGroup: 'r', subscription: 's' } },
  runner: { gates: ['pytest release-log'] },
  probes: [{ kind: 'git-remote', args: {}, status: 'ok', summary: 'azure-devops', data: { hostKind: 'azure-devops' }, at: '2026-10-25T09:00:00.000Z', ms: 12 }],
};

const use = () => {
  data = mkdtempSync(path.join(tmpdir(), 'belay-store-'));
  vi.stubEnv('BELAY_DATA_DIR', data);
};

describe('project store', () => {
  it('saves YAML and reads back every field', () => {
    use();
    expect(saveProject(CFG)).toBe('grinex-portal');
    expect(readdirSync(path.join(data, 'projects'))).toEqual(['grinex-portal.yml']);
    expect(loadProjects()).toEqual([CFG]);
  });

  it('a second project of the same name gets the next slug; the same root keeps its own', () => {
    use();
    saveProject(CFG);
    expect(saveProject({ ...CFG, root: 'D:/other' })).toBe('grinex-portal-2');
    expect(saveProject({ ...CFG, root: 'C:\\Users\\x\\refactoring\\', name: 'Renamed', onboardedAt: '2026-10-26T09:00:00.000Z' })).toBe('grinex-portal');
    const all = loadProjects();
    expect(all.map((p) => [p.slug, p.name])).toEqual([['grinex-portal-2', 'Grinex Portal'], ['grinex-portal', 'Renamed']]);
  });

  it('skips and counts a file that is not a project, and an absent dir is no projects', () => {
    use();
    expect(loadProjects()).toEqual([]);
    saveProject(CFG);
    const dir = path.join(data, 'projects');
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'broken.yml'), 'name: [unclosed');
    writeFileSync(path.join(dir, 'partial.yml'), 'slug: partial\nname: x\n');
    writeFileSync(path.join(dir, 'renamed.yml'), 'slug: other\n');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadProjects().map((p) => p.slug)).toEqual(['grinex-portal']);
    expect(loadProjectsReport(dir).skipped).toEqual(['broken.yml', 'partial.yml', 'renamed.yml']);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('3 project file(s) skipped'));
  });

  it('kebab-cases names and picks the first free slug', () => {
    expect(kebab('Grinex Portal')).toBe('grinex-portal');
    expect(kebab('Účetnictví / API v2')).toBe('ucetnictvi-api-v2');
    expect(kebab('***')).toBe('project');
    expect(uniqueSlug('a', new Set(['a', 'a-2']))).toBe('a-3');
  });
});
