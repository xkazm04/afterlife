import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { main } from '../cli';
import { capture, NOW, ROOT } from '../__tests__/helpers';
import { readCi } from './ci';
import { parseMaturityScan } from '../../src/schemas/maturity';
import { parseFacts } from '../commands/facts';
import { scoreFacts } from '../commands/scan';
import { checkoutFacts } from './local';
import { propose, scan } from './scan';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-scan-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

function checkout(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(tmp, 'co-'));
  for (const [p, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
    fs.writeFileSync(path.join(dir, p), text);
  }
  return dir;
}
const rungs = (dir: string) => Object.fromEntries(scan(checkoutFacts(dir), NOW).cells.map((c) => [c.stage, c.rung]));

describe('belay scan of a checkout (files only)', () => {
  it('scores the example target project: scanners and the tier gate configured; nothing above R1', () => {
    const s = scan(checkoutFacts(path.join(ROOT, 'gitlab/examples/target-project')), NOW);
    const r = Object.fromEntries(s.cells.map((c) => [c.stage, c.rung]));
    // verify 0: belay-replay runs in the test stage, but the rubric's R1 is a job named for tests (or a junit report)
    expect(r).toMatchObject({ secure: 1, verify: 0, govern: 1, package: 0, release: 0, plan: null, create: null, monitor: null });
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

  it('never opens a local include outside the checkout, even in a sibling folder whose name starts with it', () => {
    const sibling = checkout({});
    fs.mkdirSync(`${sibling}-evil`);
    fs.writeFileSync(path.join(`${sibling}-evil`, 'ci.yml'), 'unit-tests:\n  stage: test\n  script: [npm test]\n');
    fs.writeFileSync(path.join(sibling, '.gitlab-ci.yml'), `include:\n  - local: ../${path.basename(sibling)}-evil/ci.yml\n`);
    const verify = scan(checkoutFacts(sibling), NOW).cells.find((c) => c.stage === 'verify');
    expect(verify).toMatchObject({ rung: null, evidence: [] });
    expect(verify?.why).toMatch(/1 include\(s\) not opened/);
  });

  it('keeps a stage unknown when an include it could not open might hold the job', () => {
    const dir = checkout({ '.gitlab-ci.yml': 'include:\n  - project: acme/ci\n    file: security.yml\n' });
    const sec = scan(checkoutFacts(dir), NOW).cells.find((c) => c.stage === 'secure');
    expect(sec).toMatchObject({ rung: null });
    expect(sec?.why).toMatch(/1 include\(s\) not opened \(acme\/ci:security.yml\)/);
  });

  it('a local include that is a folder is one include not opened, not the whole CI file read as invalid YAML', () => {
    const dir = checkout({ '.gitlab-ci.yml': 'include:\n  - local: ci\nunit-tests:\n  stage: test\n  script: [npm test]\n', 'ci/x.yml': 'a: 1\n' });
    const s = scan(checkoutFacts(dir), NOW);
    expect(s.cells.find((c) => c.stage === 'verify')).toMatchObject({ rung: 1 });
    expect(s.cells.map((c) => c.why).join('\n')).not.toMatch(/not valid YAML/);
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

describe('a checkout read in part', () => {
  const cell = (dir: string, stage: string, limits?: { files: number; depth: number }) => scan(checkoutFacts(dir, limits), NOW).cells.find((c) => c.stage === stage);

  it('a walk cut off by its entry or depth limit leaves a stage whose file may lie past it unknown, not absent', () => {
    const dir = checkout({ 'a/a.txt': '', 'b/b.txt': '', 'z/deep/er/main.tf': 'resource "x" "y" {}\n' });
    expect(cell(dir, 'configure')).toMatchObject({ rung: 1 });
    for (const limits of [{ files: 2, depth: 8 }, { files: 20_000, depth: 1 }]) {
      const c = cell(dir, 'configure', limits);
      expect(c).toMatchObject({ rung: null, evidence: [] });
      expect(c?.why).toMatch(/part of the checkout was not read: the walk stopped/);
    }
  });

  it('a folder that cannot be read is one gap in the walk, not a crash', () => {
    const dir = checkout({ 'locked/main.tf': 'resource "x" "y" {}\n', 'open/x.txt': '' });
    const real = fs.readdirSync;
    const spy = vi.spyOn(fs, 'readdirSync').mockImplementation(((p: fs.PathLike, o?: unknown) => {
      if (String(p).endsWith('locked')) throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      return (real as (p: fs.PathLike, o?: unknown) => unknown)(p, o);
    }) as typeof fs.readdirSync);
    try {
      const c = cell(dir, 'configure');
      expect(c).toMatchObject({ rung: null });
      expect(c?.why).toMatch(/1 path\(s\) could not be read \(locked\)/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('one rubric for --dir and --facts', () => {
  /** The GitLab facts of the same project: the checkout's job names, CODEOWNERS and issue templates; no run, no protection. */
  const factsOf = (dir: string) => {
    const f = checkoutFacts(dir);
    const files = Object.keys(f.files.ok ? f.files.value : {});
    const jobs = f.ci.ok ? f.ci.value.jobs.map((j) => ({ name: j.name, stage: j.stage ?? 'test', allow_failure: false })) : [];
    return scoreFacts(parseFacts({
      schema: 'belay.facts/0', project_id: 1, at: NOW.toISOString(),
      facts: {
        project: { web_url: 'https://gitlab.example.com/acme/app', default_branch: 'main', merge_requires_pipeline: true },
        ci_config: { jobs }, protected_branches: [], duo_agent_config: false, latest_pipeline_jobs: { pipeline: null, jobs: [] },
        codeowners: files.filter((p) => p.endsWith('CODEOWNERS')), issue_templates: files.filter((p) => p.startsWith('.gitlab/issue_templates/')),
      },
    }));
  };
  const job = (name: string) => `${name}:\n  script: [echo]\n`;

  it.each([
    ['every stage present', ['lint', 'docker-build', 'sast', 'release', 'deploy', 'smoke', 'belay-tier-gate', 'notes'], { CODEOWNERS: '* @team\n', '.gitlab/issue_templates/bug.md': 'x\n' }],
    ['most absent', ['unit-check', 'belay-proof-exploit-test'], {}],
  ])('rates the same project the same at R1 both ways: %s', (_, jobs, files) => {
    const dir = checkout({ ...files, '.gitlab-ci.yml': jobs.map(job).join('') });
    const viaDir = scan(checkoutFacts(dir), NOW).cells;
    const viaFacts = factsOf(dir).cells;
    for (const c of viaDir.filter((x) => x.rung !== null)) {
      const other = viaFacts.find((x) => x.stage === c.stage)?.rung;
      expect([c.stage, c.rung], c.why).toEqual([c.stage, other === null || other === undefined ? other : Math.min(other, 1)]);
    }
    expect(viaDir.filter((x) => x.rung !== null).length).toBeGreaterThan(5);
  });
});

describe('the scan command', () => {
  it('prints the cells as JSON with the pinned engine, and exits 0', () => {
    const c = capture();
    expect(main(['scan', '--dir', 'gitlab/examples/target-project', '--propose'], c.io)).toBe(0);
    const out = c.json() as { schema: string; engine: { sha256: string }; cells: unknown[]; proposals: unknown[] };
    expect([out.schema, out.cells.length, out.engine.sha256.length]).toEqual(['belay.maturity.checkout/0', 9, 64]);
    // not belay.maturity/0: a checkout has no project id nor GitLab URLs, and the server's parser refuses it
    expect(parseMaturityScan(out).ok).toBe(false);
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
