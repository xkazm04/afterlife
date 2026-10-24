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
    // A finished lane's DONE line, follow-ups included, reaches the next planner.
    fs.writeFileSync(path.join(dir, 'alpha', '3.jsonl'), [line({ wave: 3, kind: 'lane.start', lane: 'd', title: 'Fix D' }), line({ wave: 3, kind: 'lane.end', lane: 'd', outcome: 'landed', commits: ['s'], done: 'one JOIN; follow-up: relay.rs:88', wallSec: 1 })].join('\n'));
    expect(waveHistory(dir, 'alpha')).toContain('wave 3: Fix D -> landed (done: one JOIN; follow-up: relay.rs:88)');
    // A reviewer's verdicts beside the run file reach the planner too.
    fs.writeFileSync(path.join(dir, 'alpha', '2.review.md'), '# wave 2 review\n- rejected b: the premise does not hold\n\n');
    expect(waveHistory(dir, 'alpha')).toContain('wave 2 review: rejected b: the premise does not hold');
    // A landed lane whose commit is not in base was dropped by its reviewer (or is not merged yet), and says so.
    expect(waveHistory(dir, 'alpha', new Set(['belay(wave-9): Fix C'])).at(-1)).toBe('wave 10: Fix C -> landed on its wave branch but NOT taken into base (rejected, or not merged yet)');
    expect(waveHistory(dir, 'alpha', new Set(['belay(wave-10): Fix C'])).at(-1)).toBe('wave 10: Fix C -> landed');
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
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
