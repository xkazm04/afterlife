// Only what an ok probe confirmed is saved: each drop below is a line the model proposed that no probe backed.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ProbeResult, Proposal } from '@/schemas/vitals';
import { confirmProject } from './confirm';

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const ENGINE = { model: 'claude-sonnet-5-5', effort: 'low' } as const;
const NOW = new Date('2026-10-25T09:00:00.000Z');

const PROPOSAL: Proposal = {
  name: 'Grinex Portal',
  host: { kind: 'azure-devops', org: 'Guessed', project: 'Guessed' },
  components: [
    { id: 'app', path: '.', stack: 'python', tests: ['pytest -q'] },
    { id: 'release-log', path: 'release-log', stack: 'python', tests: ['pytest release-log', 'pytest -q'] },
    { id: 'ghost', path: 'ghost', stack: 'node', tests: ['npm test'] },
  ],
  ci: {
    provider: 'azure-pipelines',
    pipelines: [{ id: '2', name: 'Grinex Portal', file: 'azure-pipelines.yml' }, { id: 'nightly-full', name: 'nightly', file: 'pipelines/nightly-full.yml' }],
    variants: [
      { id: 'master-hotfix', pipelineId: '2', match: { branch: 'master', parameter: { name: 'LANE', value: 'hotfix' } } },
      { id: 'master-full', pipelineId: '2', match: { branch: 'master' } },
      { id: 'nightly', pipelineId: 'nightly-full', match: { reason: ['schedule'] } },
    ],
  },
  cloud: { provider: 'azure-app-insights', hint: { resourceGroup: 'rg', name: 'ai' } },
  metrics: [{ name: 'tests', command: 'pytest', parse: { kind: 'wall' }, direction: 'down', threshold: 0.1 }],
  probes: [],
};

const res = (kind: ProbeResult['kind'], status: ProbeResult['status'], data?: Record<string, string>, args: Record<string, string> = {}): ProbeResult => ({ kind, args, status, summary: '', at: NOW.toISOString(), ms: 1, ...(data ? { data } : {}) });

function fixture(): string {
  root = mkdtempSync(path.join(tmpdir(), 'belay-confirm-'));
  mkdirSync(path.join(root, 'release-log'));
  return root;
}

describe('confirmProject', () => {
  it('saves the host from the remote probe, listed pipelines and their variants, existing components and the found resource', () => {
    const results = [
      res('git-remote', 'ok', { hostKind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal', remote: 'https://dev.azure.com/x' }),
      res('az-devops-pipelines', 'ok', { pipelineIds: '2,4,7' }),
      res('az-appinsights-component', 'ok', { appId: 'app-1', name: 'grinexportal', resourceGroup: 'grinex-portal-resource-group', subscription: 'sub-1' }),
    ];
    const cfg = confirmProject(PROPOSAL, results, fixture(), ENGINE, NOW);
    expect(cfg).toMatchObject({ slug: 'grinex-portal', name: 'Grinex Portal', onboardedAt: NOW.toISOString(), engine: ENGINE, probes: results });
    expect(cfg.host).toEqual({ kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal' });
    expect(cfg.ci.pipelines.map((p) => p.id)).toEqual(['2']);
    expect(cfg.ci.variants.map((v) => v.id)).toEqual(['master-hotfix', 'master-full']);
    expect(cfg.ci.provider).toBe('azure-pipelines');
    expect(cfg.components.map((c) => c.id)).toEqual(['app', 'release-log']);
    expect(cfg.runner).toEqual({ gates: ['pytest -q', 'pytest release-log'] });
    expect(cfg.cloud).toEqual({ provider: 'azure-app-insights', resource: { appId: 'app-1', name: 'grinexportal', resourceGroup: 'grinex-portal-resource-group', subscription: 'sub-1' } });
    expect(cfg).not.toHaveProperty('metrics');
  });

  it('drops every line whose probe failed or found nothing, and keeps no host without the remote probe', () => {
    const results = [
      res('git-remote', 'fail'),
      res('az-devops-pipelines', 'fail', { pipelineIds: '2' }),
      res('glab-pipelines', 'ok'),
      res('az-appinsights-component', 'ok', { resourceGroup: 'rg', name: 'ai' }),
      res('az-appinsights-component', 'fail', { appId: 'a', name: 'n', resourceGroup: 'r', subscription: 's' }),
    ];
    const cfg = confirmProject(PROPOSAL, results, fixture(), ENGINE, NOW);
    expect(cfg.host).toEqual({ kind: 'none' });
    expect(cfg.ci).toEqual({ provider: 'none', pipelines: [], variants: [] });
    expect(cfg.cloud).toEqual({ provider: 'none' });
  });

  it('a remote probe run on a sub-path is not the host, and no component tests is no runner block', () => {
    const results = [res('git-remote', 'ok', { hostKind: 'gitlab', path: 'a/b' }, { path: 'release-log' })];
    const cfg = confirmProject({ ...PROPOSAL, components: [{ id: 'app', path: '.', stack: 'x' }] }, results, fixture(), ENGINE, NOW);
    expect(cfg.host).toEqual({ kind: 'none' });
    expect(cfg.runner).toBeUndefined();
  });
  it('without App Insights the cloud is the workspace whose HTTP logs answered, narrowed to the queried site', () => {
    const ws = { workspaceId: 'w-1', name: 'app-logs', resourceGroup: 'rg', subscription: 's-1', httpLogs: 'yes' };
    const results = [res('az-appinsights-component', 'fail'), res('az-loganalytics-workspace', 'ok', ws), res('az-loganalytics-query', 'ok', undefined, { workspaceId: 'w-1', site: 'shop' })];
    const cfg = confirmProject(PROPOSAL, results, fixture(), ENGINE, NOW);
    expect(cfg.cloud).toEqual({ provider: 'azure-log-analytics', logs: { workspaceId: 'w-1', name: 'app-logs', resourceGroup: 'rg', subscription: 's-1', site: 'shop' } });
  });

  it('a workspace without HTTP logs is not a cloud, and App Insights wins over the logs, keeping them as metadata', () => {
    const ws = { workspaceId: 'w-1', name: 'app-logs', resourceGroup: 'rg', subscription: 's-1' };
    expect(confirmProject(PROPOSAL, [res('az-loganalytics-workspace', 'ok', { ...ws, httpLogs: 'no' })], fixture(), ENGINE, NOW).cloud).toEqual({ provider: 'none' });
    const ai = res('az-appinsights-component', 'ok', { appId: 'a-1', name: 'ai', resourceGroup: 'rg', subscription: 's-1' });
    const cfg = confirmProject(PROPOSAL, [ai, res('az-loganalytics-workspace', 'ok', { ...ws, httpLogs: 'yes' })], fixture(), ENGINE, NOW);
    expect(cfg.cloud.provider).toBe('azure-app-insights');
    expect(cfg.cloud.logs?.workspaceId).toBe('w-1');
  });
});
