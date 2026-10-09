// `scan --facts facts.json`: nine cells, one per stage, scored by the rubric table. Presence is not behaviour (a configured
// job that never ran, ran too long ago, or left no artifact is R1, never R2), and unknown is never absent (a fact that could
// not be read, or was not collected, leaves the cell null and the exit 2).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseMaturityScan, type MaturityScan, type ScanCell } from '../../src/schemas/maturity';
import { STAGES, type Stage } from '../../src/schemas/stages';
import { capture, fx } from '../__tests__/helpers';
import { main } from '../cli';
import { ENGINE_VERSION } from '../core/version';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-scan-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function scan(file: string) {
  const c = capture();
  const code = main(['scan', '--facts', file], c.io);
  const json = c.json() as MaturityScan;
  const cell = (s: Stage): ScanCell => json.cells.find((x) => x.stage === s) as ScanCell;
  return { code, json, cell, err: c.err() };
}
const of = (name: string) => scan(fx('maturity', `${name}.facts.json`));

describe('scan: the document', () => {
  it('is belay.maturity/0 with nine cells in STAGES order, scanned_at the facts\' at, and the server parses it as written', () => {
    const r = of('full');
    expect(r.json).toMatchObject({ schema: 'belay.maturity/0', project_id: 105, engine_version: ENGINE_VERSION, scanned_at: '2026-10-08T06:00:00.000Z' });
    expect(r.json.cells.map((c) => c.stage)).toEqual([...STAGES]);
    const parsed = parseMaturityScan(r.json);
    expect(parsed).toEqual({ ok: true, scan: r.json });
  });

  it('every lit cell cites a GitLab object URL from the facts', () => {
    for (const name of ['full', 'configured', 'stale']) {
      for (const c of of(name).json.cells) {
        if (c.rung !== null && c.rung >= 1) {
          expect(c.evidence.length, `${name}/${c.stage}`).toBeGreaterThan(0);
          for (const e of c.evidence) expect(e.url, `${name}/${c.stage}`).toMatch(/^https:\/\/gitlab\.example\.com\/acme\//);
        }
      }
    }
  });
});

describe('scan: the rubric', () => {
  it('an empty project: nine absent cells, exit 0', () => {
    const r = of('empty');
    expect(r.code).toBe(0);
    expect(r.json.cells.map((c) => c.rung)).toEqual(STAGES.map(() => 0));
    expect(r.json.cells.every((c) => c.evidence.length === 0 && c.next_rung === 1)).toBe(true);
  });

  it('a stage job configured on main but never run is R1, not R2', () => {
    const r = of('configured');
    expect(r.code).toBe(0);
    expect(r.cell('secure')).toMatchObject({ rung: 1, next_rung: 2, note: expect.stringMatching(/sast.*not run/) });
    expect(r.cell('secure').evidence).toEqual([{ label: '.gitlab-ci.yml · job sast', url: 'https://gitlab.example.com/acme/app/-/blob/main/.gitlab-ci.yml' }]);
  });

  it('a job that ran and left its report is R2; failing it blocks a merge only when pipelines must succeed and it may not fail', () => {
    const r = of('configured');
    expect(r.cell('verify')).toMatchObject({ rung: 3, next_rung: 4 });
    expect(r.cell('verify').evidence.map((e) => e.url)).toEqual([
      'https://gitlab.example.com/acme/app/-/blob/main/.gitlab-ci.yml',
      'https://gitlab.example.com/acme/app/-/jobs/502',
      'https://gitlab.example.com/acme/app/-/pipelines/9001',
      'https://gitlab.example.com/acme/app/-/settings/merge_requests',
    ]);
    expect(of('full').cell('package')).toMatchObject({ rung: 2, note: expect.stringMatching(/allow_failure/) });
  });

  it('a job that last ran more than 14 days before the scan is not R2', () => {
    expect(of('stale').cell('verify')).toMatchObject({ rung: 1, next_rung: 2, note: expect.stringMatching(/test last ran 17 d before the scan/) });
  });

  it('a job that ran with no artifact (only its log) is not R2', () => {
    expect(of('stale').cell('secure')).toMatchObject({ rung: 1, note: expect.stringMatching(/no artifact/) });
  });

  it('R4 needs an agent config and the stage\'s Belay proof job to have run; a stage the rubric reads no further stops below', () => {
    const r = of('full');
    expect(r.cell('verify')).toMatchObject({ rung: 4, next_rung: null });
    expect(r.cell('verify').evidence.map((e) => e.label)).toContain('job belay-proof-rerun-stats #805');
    expect(r.cell('govern')).toMatchObject({ rung: 4 });
    expect(r.cell('secure')).toMatchObject({ rung: 3, note: expect.stringMatching(/proof job/) });
    expect(r.cell('create')).toMatchObject({ rung: 1, note: expect.stringMatching(/not read by this rubric/) });
    expect(r.cell('release')).toMatchObject({ rung: 1 });
  });

  it('an unreadable fact leaves the cells it decides null, naming the fact, and the exit is 2', () => {
    const r = of('unreadable');
    expect(r.code).toBe(2);
    for (const s of ['verify', 'package', 'secure', 'release', 'configure', 'monitor', 'govern'] as const) {
      expect(r.cell(s), s).toMatchObject({ rung: null, next_rung: null, note: expect.stringMatching(/ci_config could not be read/) });
    }
    expect(r.cell('create')).toMatchObject({ rung: null, note: expect.stringMatching(/protected_branches could not be read/) });
    expect(r.cell('plan')).toMatchObject({ rung: null, note: expect.stringMatching(/issue_templates was not collected/) });
    expect(r.err).toMatch(/9 unknown/);
  });

  it('a fact collected before the scan kept a job\'s finished_at is not collected, never absent', () => {
    const facts = JSON.parse(fs.readFileSync(fx('maturity', 'configured.facts.json'), 'utf8')) as { facts: { latest_pipeline_jobs: { jobs: Record<string, unknown>[] } } };
    for (const j of facts.facts.latest_pipeline_jobs.jobs) delete j.finished_at;
    const file = path.join(tmp, 'old.facts.json');
    fs.writeFileSync(file, JSON.stringify(facts));
    const r = scan(file);
    expect(r.code).toBe(2);
    expect(r.cell('verify')).toMatchObject({ rung: null, note: expect.stringMatching(/finished_at was not collected/) });
    expect(r.cell('secure')).toMatchObject({ rung: 1 }); // configured, and not in the pipeline at all: decided without the field
  });

  it('an unreadable facts file is exit 2 with a JSON error', () => {
    const bad = path.join(tmp, 'bad.json');
    fs.writeFileSync(bad, '{ nope');
    const wrong = path.join(tmp, 'wrong.json');
    fs.writeFileSync(wrong, JSON.stringify({ schema: 'belay.facts/9', project_id: 1, at: '2026-10-08T06:00:00Z', facts: {} }));
    for (const f of [bad, wrong, path.join(tmp, 'missing.json')]) {
      const c = capture();
      expect(main(['scan', '--facts', f], c.io), f).toBe(2);
      expect(typeof (c.json() as { error?: unknown }).error).toBe('string');
    }
  });
});
