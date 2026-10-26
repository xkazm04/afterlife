// The frontier lane and T3 end to end (Ascent P4, cycle personas-web-009) against the fake claude: a repo with a
// fleet `frontier` whose plan under-fills runs ONE frontier lane after the planned ones, through the same review
// and gates; its metrics are measured on the wave base and on the tip in a throwaway worktree with setup run in it;
// wave.tech records the delta, and reflect reads it first. A repo without a frontier never runs one.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FAKE, makeFleet, runOne, sh, type TempFleet } from './repo';

const FRONTIER = `    setup:
      - node -e "require('fs').writeFileSync('setup.ran','1')"
    frontier:
      objective: |
        Shrink size.txt, the stand-in for a bundle (lower is better).
        Past the edge: drop what is duplicated.
      metrics:
        - name: size
          command: node size.mjs
          parse: {kind: regex, pattern: "size=(\\\\d+)", unit: units}
          direction: down
          threshold: 0.1
        - name: stats
          command: null
          parse: {kind: json-sum, file: stats.json, field: bytes, unit: bytes}
          direction: down
          threshold: 0.1
        - name: setup ran
          command: node -e "require('fs').statSync('setup.ran')"
          parse: {kind: wall}
          direction: down
          threshold: 10
`;

let f: TempFleet;
let plain: TempFleet;
beforeAll(() => {
  f = makeFleet('afterlife-frontier-', FRONTIER);
  plain = makeFleet('afterlife-nofrontier-');
  process.env.AFTERLIFE_CLAUDE_BIN = FAKE;
});
afterAll(() => {
  delete process.env.AFTERLIFE_CLAUDE_BIN;
  for (const t of [f, plain]) fs.rmSync(t.tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('the frontier lane and wave.tech', () => {
  it('runs one frontier lane after an under-filled plan, lands it through review and gates, and measures base and tip', async () => {
    const r = await runOne(f, ['ok-a'], { lanes: 3 });
    expect(r.code).toBe(0);
    expect(r.lines.filter((e) => e.kind === 'lane.start').map((e) => (e.kind === 'lane.start' ? [e.lane, e.frontier ?? false] : []))).toEqual([['ok-a', false], ['frontier', true]]);
    expect(r.ends.frontier).toMatchObject({ outcome: 'landed', review: 'clean', done: 'size.txt halved (mechanism: dedupe)' });
    const lane = r.calls.find((c) => c.step === 'lane' && c.lane === 'frontier')!;
    expect(lane.prompt).toContain('# Afterlife - LANE');
    expect(lane.prompt).toContain('# Afterlife - FRONTIER');
    expect(lane.prompt).toContain('Shrink size.txt');
    expect(lane.prompt).toContain('  - size (lower is better, a 10% gain is a breakthrough): node size.mjs');
    expect(r.calls.find((c) => c.step === 'review' && c.lane === 'frontier')?.prompt).toContain('- why: [frontier] Shrink size.txt');
    expect(sh(f.repoDir, 'show', `belay/wave-${r.wave}:size.txt`)).toBe('50');
    // wave.tech sits before wave.end, from the wave base to its tip.
    const kinds = r.lines.map((e) => e.kind);
    expect(kinds.indexOf('wave.tech')).toBe(kinds.indexOf('wave.end') - 1);
    const tech = r.lines.find((e) => e.kind === 'wave.tech');
    if (tech?.kind !== 'wave.tech') throw new Error('no wave.tech');
    expect(tech.from).toBe(sh(f.repoDir, 'rev-parse', 'main'));
    expect(tech.to).toBe(sh(f.repoDir, 'rev-parse', `belay/wave-${r.wave}`));
    expect(tech.metrics[0]).toEqual({ name: 'size', unit: 'units', before: 100, after: 50, gain: 0.5, threshold: 0.1, breakthrough: true, noisy: false });
    expect(tech.metrics[1]).toMatchObject({ name: 'stats', before: 30, after: 30, gain: 0, breakthrough: false });
    // The third metric is red unless setup ran in the measurement worktree: a value means it did.
    expect(tech.metrics[2]).toHaveProperty('before');
    expect(tech.metrics[2]).toHaveProperty('after');
    expect(fs.existsSync(path.join(f.repoDir, '.claude', 'worktrees', 'afterlife-wave-tech'))).toBe(false);
    expect(fs.existsSync(path.join(f.repoDir, 'setup.ran'))).toBe(false);
    expect(sh(f.repoDir, 'worktree', 'list')).not.toContain('afterlife-wave-tech');
    // Reflect reads the T3 line first, and the frontier brief it may sharpen.
    const reflect = r.calls.find((c) => c.step === 'reflect')!;
    expect(reflect.prompt).toMatch(/## Technology metrics \(wave\.tech: read this first\)\n\{.*"kind":"wave\.tech"/);
    expect(reflect.prompt.indexOf('## Technology metrics')).toBeLessThan(reflect.prompt.indexOf("## The wave's events"));
    expect(reflect.prompt).toContain('## frontier.md as run');
  }, 120_000);

  it('runs no frontier lane when the plan filled the wave, and none on a repo without a frontier', async () => {
    const full = await runOne(f, ['ok-b'], { lanes: 1 });
    expect(full.lines.some((e) => e.kind === 'lane.start' && e.lane === 'frontier')).toBe(false);
    const none = await runOne(plain, [], { lanes: 2 });
    expect(none.lines.some((e) => e.kind === 'lane.start')).toBe(false);
    expect(none.lines.some((e) => e.kind === 'wave.tech')).toBe(false);
  }, 120_000);
});
