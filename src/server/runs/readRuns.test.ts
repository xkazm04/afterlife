import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { WAVE_1, WAVE_2_RUNNING } from '@/lib/runs/fixture';
import { readRuns } from './readRuns';

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

describe('readRuns', () => {
  it('no runs directory is no runs', () => {
    root = mkdtempSync(join(tmpdir(), 'afterlife-runs-'));
    expect(readRuns(root)).toMatchObject({ repos: [], skippedLines: 0, totals: { waves: 0 } });
  });

  it('reads <repo>/<wave>.jsonl, counts the lines it skips and sees the proposals file', () => {
    root = mkdtempSync(join(tmpdir(), 'afterlife-runs-'));
    const dir = join(root, 'runs', 'alpha');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '1.jsonl'), `${WAVE_1.join('\n')}\n`);
    writeFileSync(join(dir, '1.proposals.md'), '# proposals\n');
    writeFileSync(join(dir, '2.jsonl'), WAVE_2_RUNNING.join('\r\n'));
    const d = readRuns(root);
    expect(d.skippedLines).toBe(3);
    expect(d.repos[0]!.waves.map((w) => [w.wave, w.running, w.hasProposals])).toEqual([[2, true, false], [1, false, true]]);
  });
});
