import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WAVE_1, WAVE_2_RUNNING } from '@/lib/runs/fixture';
import * as parse from '@/lib/runs/parse';
import { readRuns } from './readRuns';

vi.mock('@/lib/runs/parse', async (orig) => {
  const real = await orig<typeof import('@/lib/runs/parse')>();
  return { ...real, parseRunLine: vi.fn(real.parseRunLine) };
});

let root = '';
afterEach(() => root && rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }));

describe('readRuns cache', () => {
  it('an unchanged file is not re-parsed, its skipped lines still count, and an appended line is seen', () => {
    root = mkdtempSync(join(tmpdir(), 'afterlife-runs-'));
    const dir = join(root, 'runs', 'cache-alpha');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '1.jsonl'), `${WAVE_1.join('\n')}\n`);
    writeFileSync(join(dir, '2.jsonl'), `${WAVE_2_RUNNING.join('\n')}\n`);
    const spy = vi.mocked(parse.parseRunLine);
    const first = readRuns(root);
    const parsedOnce = spy.mock.calls.length;
    expect(parsedOnce).toBeGreaterThan(0);

    expect(readRuns(root)).toEqual(first);
    expect(spy.mock.calls.length).toBe(parsedOnce);

    appendFileSync(join(dir, '2.jsonl'), 'not json\n');
    const after = readRuns(root);
    expect(after.skippedLines).toBe(first.skippedLines + 1);
    // only the changed file was parsed again
    expect(spy.mock.calls.length).toBe(parsedOnce + WAVE_2_RUNNING.length + 1);
  });

  it('a deleted file drops out of the next read', () => {
    root = mkdtempSync(join(tmpdir(), 'afterlife-runs-'));
    const dir = join(root, 'runs', 'cache-beta');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '1.jsonl'), `${WAVE_1.join('\n')}\n`);
    expect(readRuns(root).totals.waves).toBe(1);
    rmSync(join(dir, '1.jsonl'));
    expect(readRuns(root).totals.waves).toBe(0);
  });
});
