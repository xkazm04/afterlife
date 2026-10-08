import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { main } from '../cli';
import { capture, NOW, ROOT } from '../__tests__/helpers';
import { readCi } from './ci';
import { gitlabFacts } from './gitlabFacts';
import { checkoutFacts } from './local';
import { propose, scan } from './scan';

function checkout(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-scan-'));
  for (const [p, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), text);
  }
  return dir;
}
const rungs = (dir: string) => Object.fromEntries(scan(checkoutFacts(dir), NOW).cells.map((c) => [c.stage, c.rung]));

describe('belay scan of a checkout (files only)', () => {
  it('scores the example target project: scanners, tests and the Belay jobs configured; nothing above R1', () => {
    const s = scan(checkoutFacts(path.join(ROOT, 'gitlab/examples/target-project')), NOW);
    const r = Object.fromEntries(s.cells.map((c) => [c.stage, c.rung]));
    expect(r).toMatchObject({ secure: 1, verify: 1, govern: 1, package: 0, release: 0, plan: null, create: null, monitor: null });
    expect(s.cells.find((c) => c.stage === 'secure')?.evidence).toContain('.gitlab-ci.yml: include Jobs/SAST.gitlab-ci.yml');
    expect(s.cells.find((c) => c.stage === 'secure')?.why).toMatch(/whether it runs needs the default branch's last pipeline/);
    expect(Math.max(...s.cells.map((c) => c.rung ?? 0))).toBe(1);
  });

  it('follows local includes, counts IaC and CODEOWNERS, and does not credit an empty alerting file', () => {
    const dir = checkout({
      '.gitlab-ci.yml': 'include:\n  - local: ci/build.yml\nunit-tests:\n  stage: test\n  script: [npm test]\n',
      'ci/build.yml': 'image-build:\n  script:\n    - /kaniko/executor --destination $IMAGE\n',
      'infra/main.tf': 'resource "x" "y" {}\n',
      CODEOWNERS: '* @team\n',
      '.gitlab/alerting.yml': '# todo\n',
    });
    expect(rungs(dir)).toMatchObject({ verify: 1, package: 1, configure: 1, create: 1, monitor: null });
    const mon = scan(checkoutFacts(dir), NOW).cells.find((c) => c.stage === 'monitor');
    expect(mon?.why).toMatch(/\.gitlab\/alerting\.yml is empty: a detector surface, not monitoring/);
  });

  it('keeps a stage unknown when an include it could not open might hold the job', () => {
    const dir = checkout({ '.gitlab-ci.yml': 'include:\n  - project: acme/ci\n    file: security.yml\n' });
    const sec = scan(checkoutFacts(dir), NOW).cells.find((c) => c.stage === 'secure');
    expect(sec).toMatchObject({ rung: null });
    expect(sec?.why).toMatch(/1 include\(s\) not opened \(acme\/ci:security.yml\)/);
  });

  it('a CI file that does not parse leaves every CI stage unknown, not absent', () => {
    const dir = checkout({ '.gitlab-ci.yml': 'a: [\n' });
    const s = scan(checkoutFacts(dir), NOW);
    expect(s.cells.find((c) => c.stage === 'verify')).toMatchObject({ rung: null });
    expect(s.cells.find((c) => c.stage === 'verify')?.why).toMatch(/not valid YAML/);
  });

  it('proposes the next change per stage, and writes nothing', () => {
    const dir = checkout({ CODEOWNERS: '* @team\n' });
    const before = fs.readdirSync(dir);
    const p = propose(scan(checkoutFacts(dir), NOW));
    expect(p.find((x) => x.stage === 'secure')).toMatchObject({ from: 0, to: 1 });
    expect(p.find((x) => x.stage === 'create')).toMatchObject({ from: 1, to: 2 });
    expect(fs.readdirSync(dir)).toEqual(before);
  });
});

describe('belay scan of GitLab facts (the maturity-scan job)', () => {
  const doc = (over: Record<string, unknown> = {}) => ({
    schema: 'belay.facts/0', project_id: 1, at: NOW.toISOString(),
    facts: {
      project: { path: 'acme/ledgerline', default_branch: 'main' },
      ci_config: { merged_yaml: 'semgrep-sast:\n  stage: test\n  script: [scan]\nunit:\n  stage: test\n  script: [gradle test]\n' },
      protected_branches: [{ name: 'main' }],
      approval_rules: [{ approvals_required: 1 }],
      codeowners: ['CODEOWNERS'],
      duo_agent_config: false,
      latest_pipeline_jobs: { pipeline: 9812, jobs: [{ name: 'semgrep-sast', status: 'success' }, { name: 'unit', status: 'failed' }] },
      ...over,
    },
  });
  it('credits running from the last pipeline and enforced from protection plus approvals', () => {
    const r = Object.fromEntries(scan(gitlabFacts(doc()), NOW).cells.map((c) => [c.stage, c.rung]));
    expect(r).toMatchObject({ secure: 2, verify: 1, create: 3 });
  });
  it('an unreadable fact keeps what it could have lifted unknown, never absent', () => {
    const s = scan(gitlabFacts(doc({ ci_config: { error: '403 Forbidden' }, protected_branches: { error: 'timeout' } })), NOW);
    expect(s.cells.find((c) => c.stage === 'secure')).toMatchObject({ rung: null });
    expect(s.cells.find((c) => c.stage === 'secure')?.why).toMatch(/ci_config could not be read: 403 Forbidden/);
    expect(s.cells.find((c) => c.stage === 'create')).toMatchObject({ rung: 1 });
  });
});

describe('the scan command', () => {
  it('prints the cells as JSON with the pinned engine, and exits 0', () => {
    const c = capture();
    expect(main(['scan', '--dir', 'gitlab/examples/target-project', '--propose'], c.io)).toBe(0);
    const out = c.json() as { schema: string; engine: { sha256: string }; cells: unknown[]; proposals: unknown[] };
    expect([out.schema, out.cells.length, out.engine.sha256.length]).toEqual(['belay.maturity/0', 9, 64]);
    expect(out.proposals.length).toBeGreaterThan(0);
    expect(c.err()).toMatch(/nothing was written/);
  });
  it('refuses both or neither source, and a missing directory', () => {
    for (const argv of [['scan'], ['scan', '--dir', '.', '--facts', 'x.json'], ['scan', '--dir', 'no/such/dir']]) expect(main(argv, capture().io)).toBe(2);
  });
  it('reads a CI document with template and component includes by name', () => {
    const ci = readCi({ include: [{ template: 'Jobs/SAST.gitlab-ci.yml' }, { component: '$CI_SERVER_FQDN/acme/belay-pack/tier-gate@1.0.0' }], '.hidden': { script: ['x'] } }, 'f');
    expect(ci).toEqual({ origin: 'f', jobs: [], includes: ['Jobs/SAST.gitlab-ci.yml', 'acme/belay-pack/tier-gate@1.0.0'], unresolved: [] });
  });
});
