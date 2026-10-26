// The facts the proposing model is told, over a fixture repo shaped like Grinex Portal: a root pipeline with a hotfix
// lane, pipelines/ with a schedule and a feature trigger, a component folder with its own tests, infra lines naming the
// resource group and the App Insights component, and a key that must never reach the model.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { collectFacts, factsJson } from './facts';

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

const write = (rel: string, body: string) => {
  mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  writeFileSync(path.join(root, rel), body);
};

const PIPELINE = `trigger:
  branches:
    include:
      - master  # only master

parameters:
  - name: fullSuite
    type: boolean
  - name: dbShards
    type: number

stages:
  - stage: Build
    jobs:
      - job: BuildApp
        steps:
          - bash: |
              # [hotfix] in the commit message picks the fast lane
              LANE=normal
              if grep -q hotfix msg; then LANE=hotfix; fi
              echo "##vso[task.setvariable variable=LANE;isOutput=true]$LANE"
  - stage: Test
`;

function fixture(): void {
  root = mkdtempSync(path.join(tmpdir(), 'afterlife-facts-'));
  execFileSync('git', ['init', '-q', '-b', 'master', root], { stdio: 'ignore' });
  execFileSync('git', ['-C', root, 'remote', 'add', 'origin', 'https://someone@dev.azure.com/acme/Shop/_git/Shop'], { stdio: 'ignore' });
  write('azure-pipelines.yml', PIPELINE);
  write('pipelines/nightly-full.yml', "trigger: none\npr: none\nschedules:\n  - cron: '0 2 * * 1-5'\n    branches:\n      include:\n        - develop\n");
  write('pipelines/pr-validation.yml', 'trigger:\n  branches:\n    include:\n      - feature/*\n');
  write('pipelines/templates/x.yml', 'steps: []\n');
  write('package.json', JSON.stringify({ scripts: { test: 'vitest run', build: 'vite build' } }));
  write('pyproject.toml', '[project]\nname = "x"\n[tool.pytest.ini_options]\ntestpaths = ["tests"]\n[tool.ruff]\nline-length = 100\n');
  write('requirements.txt', 'fastapi\n');
  write('release-log/README.md', '# Release log\n');
  write('release-log/tool/test_build.py', 'def test_x(): pass\n');
  write('docs/notes.txt', 'no readme, no tests\n');
  write('node_modules/pkg/README.md', '# vendored\n');
  write('infra/create-availability-test.sh', 'RG="${RG:-shop-resource-group}"\nAPP_INSIGHTS="${APP_INSIGHTS:-shopinsights}"\nAPPINSIGHTS_CONNECTION_STRING="InstrumentationKey=0000"\n');
  write('infra/bicep/main.bicep', "resource ai 'Microsoft.Insights/components@2020-02-02' = {\n");
}

describe('collectFacts', () => {
  it('reads the CI triggers, parameters, stages and lanes, the manifests, the component folders and the infra hints', async () => {
    fixture();
    const f = await collectFacts(root);
    expect(f.remote).toBe('https://dev.azure.com/acme/Shop/_git/Shop');
    expect(f.ci.map((c) => c.path)).toEqual(['azure-pipelines.yml', 'pipelines/nightly-full.yml', 'pipelines/pr-validation.yml']);
    const main = f.ci[0]!;
    expect(main.blocks.trigger).toBe('trigger:\n  branches:\n    include:\n      - master');
    expect(main.parameters).toEqual(['fullSuite', 'dbShards']);
    expect(main.stages).toEqual(['Build', 'Test']);
    expect(main.variables).toEqual({ LANE: ['normal', 'hotfix'] });
    expect(main.markers).toEqual(['hotfix']);
    expect(f.ci[1]!.blocks.schedules).toContain("cron: '0 2 * * 1-5'");
    expect(f.ci[2]!.blocks.trigger).toContain('feature/*');
    expect(f.manifests).toEqual({ packageScripts: { test: 'vitest run', build: 'vite build' }, pyproject: ['[tool.pytest.ini_options]', 'testpaths = ["tests"]'], requirements: ['requirements.txt'] });
    expect(f.dirs).toEqual([{ path: 'release-log', tests: ['tool/ (1 test files)'], readme: 'Release log' }]);
    expect(f.infra).toEqual([
      'infra/bicep/main.bicep: resource ai \'Microsoft.Insights/components@2020-02-02\' = {',
      'infra/create-availability-test.sh: RG="${RG:-shop-resource-group}"',
      'infra/create-availability-test.sh: APP_INSIGHTS="${APP_INSIGHTS:-shopinsights}"',
    ]);
    expect(JSON.stringify(f)).not.toContain('InstrumentationKey');
    expect(JSON.stringify(f)).not.toContain('someone');
  });

  it('cuts the facts to the cap from the least decisive part first', async () => {
    fixture();
    const f = await collectFacts(root);
    const big = { ...f, infra: Array.from({ length: 40 }, (_, i) => `infra/x.sh: RG=${'r'.repeat(600)}${i}`) };
    const out = factsJson(big, 12 * 1024);
    expect(Buffer.byteLength(out)).toBeLessThanOrEqual(12 * 1024);
    const parsed = JSON.parse(out) as typeof f;
    expect(parsed.infra).toHaveLength(15);
    expect(parsed.ci[0]!.variables).toEqual({ LANE: ['normal', 'hotfix'] });
  });
});
