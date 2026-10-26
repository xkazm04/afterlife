// `afterlife report`: a valid claim is filled (id, at) and appended, and the line is printed; an invalid one exits 2 with
// the reason and appends nothing. The agent's figure is stored as agentValue (the measure step never reads it:
// measure/__tests__/agentValue.test.ts).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ProjectConfig } from '@/schemas/vitals';
import { saveProject } from '@/server/discover';
import { readAdjustments } from '../store';
import { claimId, parseClaim } from './claim';
import { report } from './reportCli';

const CFG: ProjectConfig = {
  slug: 'grinex-portal', name: 'Grinex Portal', root: 'C:/work/refactoring', onboardedAt: '2026-10-25T09:00:00.000Z', engine: { model: 'm', effort: 'low' },
  host: { kind: 'azure-devops', org: 'Grinex', project: 'Grinex Portal' }, components: [],
  ci: { provider: 'azure-pipelines', pipelines: [{ id: '2', name: 'Grinex Portal' }], variants: [{ id: 'master-full', pipelineId: '2', match: { branch: 'master' } }] },
  cloud: { provider: 'none' }, probes: [],
};
const GOOD = { title: 'cache the npm install on package-lock.json', target: { kind: 'ci-stage', variant: 'master-full', stage: 'Run Tests' }, direction: 'down', expectedPct: 20, ref: { branch: 'feature/cache', sha: 'CAFE0906' }, agentValue: 35.5 };

let dir = '';
const prev = process.env.AFTERLIFE_DATA_DIR;
beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'afterlife-report-')); process.env.AFTERLIFE_DATA_DIR = dir; saveProject(CFG); });
afterEach(() => {
  if (prev === undefined) delete process.env.AFTERLIFE_DATA_DIR;
  else process.env.AFTERLIFE_DATA_DIR = prev;
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

const call = (...argv: string[]) => {
  let out = '';
  let err = '';
  const code = report(argv, (s) => (out += s), (s) => (err += s));
  return { code, out, err };
};

describe('afterlife report', () => {
  it('appends a valid claim with id and at filled, and prints the line', () => {
    const r = call('--project', 'grinex-portal', '--claim', JSON.stringify(GOOD));
    expect(r.code, r.err).toBe(0);
    const line = JSON.parse(r.out);
    expect(line).toMatchObject({ type: 'claim', by: 'agent', title: GOOD.title, target: GOOD.target, direction: 'down', ref: { branch: 'feature/cache', sha: 'cafe0906' }, agentValue: 35.5 });
    expect(line.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(readAdjustments('grinex-portal')).toEqual([line]);
  });

  it('reads the claim from a file in the caller directory', () => {
    const at = path.join(dir, 'caller');
    mkdirSync(at);
    writeFileSync(path.join(at, 'claim.json'), JSON.stringify({ ...GOOD, target: { kind: 'local-metric', metric: 'test wall' } }));
    process.env.AFTERLIFE_CALLER_CWD = at;
    try {
      expect(call('--project', 'grinex-portal', '--claim', 'claim.json').code).toBe(0);
    } finally {
      delete process.env.AFTERLIFE_CALLER_CWD;
    }
    expect(readAdjustments('grinex-portal')[0]).toMatchObject({ target: { kind: 'local-metric', metric: 'test wall' } });
  });

  it.each([
    ['an unknown target kind', { ...GOOD, target: { kind: 'bundle', metric: 'x' } }, /target.kind must be one of ci-stage, ci-run, local-metric, prod-signal/],
    ['a missing title', { ...GOOD, title: undefined }, /title is required/],
    ['an unknown key', { ...GOOD, confidence: 0.9 }, /unknown key\(s\) confidence/],
    ['an id of its own', { ...GOOD, id: 'mine' }, /id and at are Afterlife's/],
    ['a ci-stage without its stage', { ...GOOD, target: { kind: 'ci-stage', variant: 'master-full' } }, /names its stage/],
    ['a variant the project does not have', { ...GOOD, target: { ...GOOD.target, variant: 'nightly' } }, /variant nightly is not one of grinex-portal's: master-full/],
    ['no ref', { ...GOOD, ref: {} }, /ref.branch or ref.sha/],
    ['a bad direction', { ...GOOD, direction: 'faster' }, /direction must be down or up/],
  ])('refuses %s with exit 2 and appends nothing', (_what, claim, reason) => {
    const r = call('--project', 'grinex-portal', '--claim', JSON.stringify(claim));
    expect(r.code).toBe(2);
    expect(r.err).toMatch(reason);
    expect(readAdjustments('grinex-portal')).toEqual([]);
  });

  it('exits 2 on bad usage, unreadable JSON and an unknown project', () => {
    expect(call('--project', 'grinex-portal').code).toBe(2);
    expect(call('--project', 'grinex-portal', '--claim', '{not json').err).toMatch(/not readable JSON/);
    expect(call('--project', 'ghost', '--claim', JSON.stringify(GOOD)).err).toMatch(/no onboarded project "ghost"/);
  });

  it('ids sort as they were made', () => {
    const a = claimId(new Date('2026-10-25T09:00:00Z'));
    const b = claimId(new Date('2026-10-25T09:00:01Z'));
    expect(a < b).toBe(true);
    expect(parseClaim({ ...GOOD }, { id: 'x', now: new Date(0) })).toMatchObject({ ok: true, claim: { id: 'x', at: '1970-01-01T00:00:00.000Z' } });
  });
});
