// A project-write rig: a Grinex-shaped saved project in memory, a temp AFTERLIFE_DATA_DIR, and a fake az that records
// every argv and answers from a script. Nothing here can reach a real CLI.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import type { Exec } from '@/server/providers/types';
import type { ProjectDeps } from '../context';
import { clearProjectWrites } from '../run';

export const AFTERLIFE = path.resolve(import.meta.dirname, '../../../../..');
export const WORKSPACE = '/subscriptions/00000000-0000-0000-0000-000000000001/resourceGroups/grinex-rg/providers/Microsoft.OperationalInsights/workspaces/grinexportal-logs';

export const grinex = (root: string): ProjectConfig => ({
  slug: 'grinex-portal', name: 'Grinex Portal', root, onboardedAt: '2026-10-25T09:00:00.000Z', engine: { model: 'm', effort: 'low' },
  host: { kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal', repo: 'Grinex Portal' }, components: [],
  ci: { provider: 'azure-pipelines', pipelines: [{ id: '2', name: 'Grinex Portal' }], variants: [{ id: 'master-full', pipelineId: '2', match: { branch: 'master' } }] },
  cloud: { provider: 'azure-log-analytics', logs: { workspaceId: 'ws-guid', name: 'grinexportal-logs', resourceGroup: 'grinex-rg', subscription: 'sub-1', site: 'grinexportal' } },
  probes: [],
});

export type Answer = { code?: number; stdout?: string; stderr?: string };

export interface Rig {
  dir: string;
  calls: string[][];
  saved: ProjectConfig[];
  /** Answers by the first matching argv prefix (joined with spaces). */
  answers: [string, Answer][];
  deps: ProjectDeps;
  cfg: ProjectConfig;
  now: { t: number };
}

export function projectRig(): Rig {
  const rig = { calls: [], saved: [], answers: [], now: { t: Date.parse('2026-10-25T10:00:00Z') } } as unknown as Rig;
  const prev = process.env.AFTERLIFE_DATA_DIR;
  beforeEach(() => {
    clearProjectWrites();
    rig.dir = mkdtempSync(path.join(tmpdir(), 'afterlife-pw-'));
    process.env.AFTERLIFE_DATA_DIR = path.join(rig.dir, 'data');
    rig.calls.length = 0;
    rig.saved.length = 0;
    rig.answers.length = 0;
    rig.now.t = Date.parse('2026-10-25T10:00:00Z');
    rig.cfg = grinex(path.join(rig.dir, 'repo'));
    const exec: Exec = async (bin, args) => {
      rig.calls.push([bin, ...args]);
      const line = args.join(' ');
      const a = rig.answers.find(([p]) => line.startsWith(p))?.[1] ?? { code: 0, stdout: '{}' };
      return { code: a.code ?? 0, stdout: a.stdout ?? '', stderr: a.stderr ?? '', ms: 1 };
    };
    rig.deps = { exec, now: () => new Date(rig.now.t), project: (s) => (s === rig.cfg.slug ? rig.cfg : undefined), save: (c) => (rig.saved.push(c), c.slug), afterlife: AFTERLIFE };
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.AFTERLIFE_DATA_DIR;
    else process.env.AFTERLIFE_DATA_DIR = prev;
    rmSync(rig.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  return rig;
}
