import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { NOW } from '../../__tests__/helpers';
import { checkoutFacts } from '../local';
import { scan } from '../scan';
import { runsScanner } from './signals';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'afterlife-pipelines-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

function checkout(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(tmp, 'co-'));
  for (const [p, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), text);
  }
  return dir;
}
const cells = (dir: string) => Object.fromEntries(scan(checkoutFacts(dir), NOW).cells.map((c) => [c.stage, c]));

const AZURE = `trigger: [main]
stages:
  - stage: Build
    jobs:
      - job: BuildApp
        steps:
          - script: npm ci && npm run build
          - task: ArchiveFiles@2
            inputs: { rootFolderOrFile: dist, archiveFile: app.zip }
          - task: PublishBuildArtifacts@1
            inputs: { PathtoPublish: app.zip, ArtifactName: app }
  - stage: Test
    jobs:
      - job: Backend
        displayName: 'Backend (pytest)'
        steps:
          - template: ci/steps/pytest.yml
      - job: Scan
        steps:
          - script: |
              pip install bandit
              bandit -q -r app/ -ll
  - stage: Deploy
    jobs:
      - deployment: Ship
        environment: production
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureWebApp@1
                  inputs: { appName: web, package: app.zip }
`;
const STEPS = 'parameters: []\nsteps:\n  - script: pytest --junitxml=r.xml\n  - task: PublishTestResults@2\n    inputs: { testResultsFiles: r.xml }\n';

describe('Azure Pipelines in a checkout', () => {
  it('credits a pytest job, a bandit step, a build artifact publish and an AzureWebApp deploy, naming file and job', () => {
    const c = cells(checkout({ 'azure-pipelines.yml': AZURE, 'ci/steps/pytest.yml': STEPS }));
    expect(c.verify).toMatchObject({ rung: 1, evidence: ['azure-pipelines.yml: job Backend'] });
    expect(c.secure).toMatchObject({ rung: 1, evidence: ['azure-pipelines.yml: job Scan'] });
    expect(c.package).toMatchObject({ rung: 1, evidence: ['azure-pipelines.yml: job BuildApp'] });
    expect(c.release).toMatchObject({ rung: 1, evidence: ['azure-pipelines.yml: job Ship'] });
    expect(c.govern).toMatchObject({ rung: 0 });
  });

  it('reads pipelines/ files by shape, a template once (not as a pipeline of its own), and a CamelCase job id as words', () => {
    const dir = checkout({
      'pipelines/nightly.yml': 'jobs:\n  - job: NightlyTests\n    steps: [{ script: echo }]\n  - template: templates/lint.yml\n',
      'pipelines/templates/lint.yml': 'jobs:\n  - job: Lint\n    steps: [{ script: echo }]\n',
      'pipelines/vars.yml': 'variables:\n  a: 1\n',
    });
    expect(cells(dir).verify?.evidence).toEqual(['pipelines/nightly.yml: job NightlyTests', 'pipelines/templates/lint.yml: job Lint']);
  });

  it('keeps a stage unknown when a template lives in another repository, and counts a Bicep file as IaC', () => {
    const c = cells(checkout({ 'azure-pipelines.yml': 'jobs:\n  - template: jobs/sec.yml@tools\n', 'infra/main.bicep': 'param x string\n' }));
    expect(c.secure).toMatchObject({ rung: null });
    expect(c.secure?.why).toMatch(/1 include\(s\) not opened \(azure-pipelines\.yml: template jobs\/sec\.yml@tools\)/);
    expect(c.configure).toMatchObject({ rung: 1, evidence: ['infra/main.bicep'] });
  });

  it('a pipeline file that does not parse is one reference not opened, not the GitLab config voided', () => {
    const c = cells(checkout({ '.gitlab-ci.yml': 'unit-tests:\n  script: [npm test]\n', 'azure-pipelines.yml': 'jobs: [\n' }));
    expect(c.verify).toMatchObject({ rung: 1, evidence: ['.gitlab-ci.yml: job unit-tests'] });
    expect(c.secure?.why).toMatch(/azure-pipelines\.yml \(not valid YAML/);
  });
});

describe('GitHub Actions in a checkout', () => {
  it('credits test, scanner and release jobs from a workflow', () => {
    const c = cells(checkout({
      '.github/workflows/ci.yml': [
        'on: push',
        'jobs:',
        '  unit:',
        '    name: Unit tests',
        '    steps: [{ uses: actions/checkout@v4 }, { run: npm test }]',
        '  codeql:',
        '    steps: [{ uses: github/codeql-action/analyze@v3 }]',
        '  ship:',
        '    steps: [{ uses: softprops/action-gh-release@v2 }]',
        '  shared:',
        '    uses: acme/ci/.github/workflows/x.yml@main',
        '',
      ].join('\n'),
    }));
    expect(c.verify).toMatchObject({ rung: 1, evidence: ['.github/workflows/ci.yml: job unit'] });
    expect(c.secure).toMatchObject({ rung: 1, evidence: ['.github/workflows/ci.yml: job codeql'] });
    expect(c.release).toMatchObject({ rung: 1, evidence: ['.github/workflows/ci.yml: job ship'] });
    expect(c.package).toMatchObject({ rung: null });
    expect(c.package?.why).toMatch(/acme\/ci\/\.github\/workflows\/x\.yml@main/);
  });
});

describe('a scanner counts only as a command', () => {
  const job = (script: string) => ({ name: 'x', stage: null, script, junit: false, release: false, sbom: false });
  it.each([
    ['bandit -r app/', true],
    ['source .venv/bin/activate && bandit -q -r app/', true],
    ['/tmp/gitleaks detect --source .', true],
    ['npx --yes @cyclonedx/cyclonedx-npm --omit dev', true],
    ['npm audit --omit=dev', true],
    ['pip install pip-audit bandit', false],
    ['# bandit -r app/ is run elsewhere', false],
    ['echo run trivy image later', false],
  ])('%s -> %s', (script, hit) => expect(runsScanner(job(script))).toBe(hit));
});
