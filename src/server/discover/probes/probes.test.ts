// runProbes: git answered here, local commands skipped, the rest through the provider registry - whose stubs throw
// until WP2 and WP4, which must be a `fail` line, never a crash. And the seals the save step checks.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { CiProvider, CloudProvider } from '@/server/providers/types';
import type { ProbeSpec } from '@/schemas/vitals';
import { runProbesWith, type ProbeDeps } from './run';
import { sealOf, verifySeal } from './seal';

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const NOW = new Date('2026-10-25T09:00:00.000Z');
const thrower: ProbeDeps = {
  ci: () => { throw new Error('providers: ciProvider not built (WP2)'); },
  cloud: () => { throw new Error('providers: cloudProvider not built (WP4)'); },
  now: () => NOW,
};

function repo(): string {
  root = mkdtempSync(path.join(tmpdir(), 'belay-probes-'));
  execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
  execFileSync('git', ['-C', root, 'remote', 'add', 'origin', 'https://someone@dev.azure.com/acme/Shop/_git/Shop%20Web'], { stdio: 'ignore' });
  mkdirSync(path.join(root, 'release-log'));
  return root;
}

const specs: ProbeSpec[] = [
  { kind: 'git-root', args: {} },
  { kind: 'git-remote', args: {} },
  { kind: 'git-root', args: { path: 'release-log' } },
  { kind: 'git-root', args: { path: 'missing' } },
  { kind: 'local-command', args: { command: 'npm test' } },
  { kind: 'az-devops-pipelines', args: { org: 'acme', project: 'Shop' } },
  { kind: 'az-appinsights-component', args: { resourceGroup: 'rg' } },
  { kind: 'git-root', args: { path: '../outside' } },
];

describe('runProbesWith', () => {
  it('answers git itself, skips local commands, and turns a throwing provider into a fail line, in order', async () => {
    const r = await runProbesWith(specs, repo(), thrower);
    expect(r.map((x) => `${x.kind} ${x.status}`)).toEqual([
      'git-root ok', 'git-remote ok', 'git-root ok', 'git-root fail', 'local-command skipped', 'az-devops-pipelines fail', 'az-appinsights-component fail', 'git-root fail',
    ]);
    expect(r[1]).toMatchObject({ summary: 'azure-devops · acme / Shop / Shop Web', data: { hostKind: 'azure-devops', org: 'acme', project: 'Shop', repo: 'Shop Web', remote: 'https://dev.azure.com/acme/Shop/_git/Shop%20Web' } });
    expect(r[3]!.summary).toBe('missing is not a folder in this repo');
    expect(r[4]!.summary).toBe('runs on your click');
    expect(r[5]!.summary).toBe('providers: ciProvider not built (WP2)');
    expect(r[6]!.summary).toBe('providers: cloudProvider not built (WP4)');
    expect(r[7]!.summary).toMatch(/^refused:/);
    expect(r.every((x) => x.at === NOW.toISOString() && x.ms >= 0)).toBe(true);
  });

  it('keeps the spec as asked, whatever the provider echoes, and its data', async () => {
    const ci = { kind: 'azure-pipelines', probe: async () => ({ kind: 'az-login', args: { x: 'y' }, status: 'ok', summary: '6 pipelines', data: { pipelineIds: '2,4' }, at: 'then', ms: 9 }) } as unknown as CiProvider;
    const deps: ProbeDeps = { ...thrower, ci: () => ci, cloud: () => ({}) as CloudProvider };
    const [r] = await runProbesWith([{ kind: 'az-devops-pipelines', args: { org: 'acme', project: 'Shop' } }], repo(), deps);
    expect(r).toMatchObject({ kind: 'az-devops-pipelines', args: { org: 'https://dev.azure.com/acme', project: 'Shop' }, status: 'ok', summary: '6 pipelines', data: { pipelineIds: '2,4' }, at: NOW.toISOString() });
  });
});

describe('seals', () => {
  it('holds for the result it sealed under its root, and for nothing changed', () => {
    const result = { kind: 'git-remote' as const, args: {}, status: 'ok' as const, summary: 's', data: { a: '1', b: '2' }, at: 'x', ms: 1 };
    const seal = sealOf(result, 'C:/r');
    expect(verifySeal({ result: { ...result, data: { b: '2', a: '1' } }, seal }, 'C:/r')).toBe(true);
    expect(verifySeal({ result: { ...result, status: 'fail' }, seal }, 'C:/r')).toBe(false);
    expect(verifySeal({ result, seal }, 'C:/other')).toBe(false);
    expect(verifySeal({ result, seal: 'nope' }, 'C:/r')).toBe(false);
    expect(verifySeal(null, 'C:/r')).toBe(false);
  });
});
