import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { planPrompt } from '../wave/plan';
import { waveHistory } from '../wave/history';

const repo = { slug: 'alpha', path: '/x', base: 'main', gates: ['node check.mjs'] };
const line = (o: object) => JSON.stringify({ v: 'belay.run/0', ts: '2026-10-18T00:00:00Z', repo: 'alpha', promptVersion: 'abc', ...o });

describe('earlier waves reach the planner', () => {
  it('reads each lane of each earlier wave, in wave order, with its outcome and park reason', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'belay-hist-'));
    fs.mkdirSync(path.join(dir, 'alpha'));
    fs.writeFileSync(path.join(dir, 'alpha', '2.jsonl'), [line({ wave: 2, kind: 'lane.start', lane: 'b', title: 'Fix B' }), line({ wave: 2, kind: 'lane.end', lane: 'b', outcome: 'parked', commits: [], parkReason: 'needs a gate edit', wallSec: 1 })].join('\n'));
    fs.writeFileSync(path.join(dir, 'alpha', '10.jsonl'), [line({ wave: 10, kind: 'lane.start', lane: 'c', title: 'Fix C' }), 'not json', line({ wave: 10, kind: 'lane.end', lane: 'c', outcome: 'landed', commits: ['s'], wallSec: 1 })].join('\n'));
    fs.writeFileSync(path.join(dir, 'alpha', '2.proposals.md'), 'ignored');
    expect(waveHistory(dir, 'alpha')).toEqual(['wave 2: Fix B -> parked (needs a gate edit)', 'wave 10: Fix C -> landed']);
    expect(waveHistory(dir, 'beta')).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('puts the history and a stacked base into the plan prompt, and leaves both out when there are none', () => {
    const p = planPrompt('BASE', repo, 3, ['wave 1: Fix A -> landed'], 'belay/wave-1');
    expect(p).toContain('- base: belay/wave-1');
    expect(p).toContain('- wave 1: Fix A -> landed');
    const q = planPrompt('BASE', repo, 3);
    expect(q).toContain('- base: main');
    expect(q).not.toContain('Earlier waves');
  });
});
