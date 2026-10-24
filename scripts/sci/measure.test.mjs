// The CLI on the committed fixture with the real coefficient book: it runs, prints the table, writes the report, and every
// book entry names its source and date. Each case spawns the real script; nothing reaches the network.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(here, 'measure.mjs');
const fixture = path.join(here, '__fixtures__', 'jobs.json');
const made = [];
const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const scratch = () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-sci-'));
  made.push(d);
  return d;
};

afterEach(() => {
  for (const d of made.splice(0)) fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('scripts/sci/measure.mjs', () => {
  it('prints the table and writes a report whose every number has a unit and inputs', () => {
    const out = path.join(scratch(), 'report.json');
    const r = run('--input', fixture, '--out', out);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('sci.pipeline');
    expect(r.stdout).toMatch(/ci\.minutesPerProvenMr\s+11\.83 runner-min per proven MR/);
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(report.region).toBe('us-east1');
    const numbers = ['functionalUnit', 'ci', 'sci', 'proof', 'saved', 'apiReads'].flatMap((s) => Object.values(report[s]).filter((n) => n && 'unit' in n));
    expect(numbers.length).toBeGreaterThan(20);
    for (const n of numbers) expect(n).toMatchObject({ unit: expect.any(String), inputs: expect.any(Object), coefficient: expect.any(Array) });
    expect(report.sci.pipeline.inputs.I_gPerKWh).toBe(560);
  });

  it('every coefficient book entry names its source and the date it was read', () => {
    const book = JSON.parse(fs.readFileSync(path.join(here, 'coefficients.json'), 'utf8'));
    for (const [key, entry] of Object.entries(book).filter(([k]) => !k.startsWith('_'))) {
      expect(entry.date, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Object.keys(entry).some((k) => /source$/i.test(k)), key).toBe(true);
    }
  });

  it('--region and --proven change the figures; an unknown region exits 1', () => {
    const out = path.join(scratch(), 'r.json');
    expect(run('--input', fixture, '--out', out, '--region', 'europe-west1', '--proven', '7').status).toBe(0);
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect([report.region, report.functionalUnit.provenMrs.value]).toEqual(['europe-west1', 1]);
    const bad = run('--input', fixture, '--region', 'mars');
    expect(bad.status).toBe(1);
    expect(bad.stderr).toContain('no grid intensity for region "mars"');
  });

  it('--list-ids prints the ids of a pipelines export, one per line', () => {
    const f = path.join(scratch(), 'pipelines.json');
    fs.writeFileSync(f, '[{"id":101},{"id":102}]\n[{"id":103}]');
    const r = run('--list-ids', '--input', f);
    expect(r.status).toBe(0);
    expect(r.stdout.trim().split(/\r?\n/)).toEqual(['101', '102', '103']);
  });

  it('refuses a missing input, an unknown flag and an export with no finished job', () => {
    expect(run().stderr).toContain('--input <file> is required');
    expect(run('--input', fixture, '--bogus').stderr).toContain('unknown argument --bogus');
    const f = path.join(scratch(), 'empty.json');
    fs.writeFileSync(f, '[{"id":1,"name":"unit","status":"running"}]');
    expect(run('--input', f).status).toBe(1);
  });
});
