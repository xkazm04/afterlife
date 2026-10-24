// The review and repair turns end to end (Ascent P2, cycles personas-web-006 and -007) against the fake claude:
// an OK review goes straight to the gates; a cited defect gets ONE repair turn (the lane's own session resumed)
// before the gates; an existing test changed beyond a mechanical edit is put back before the review and sent to
// the repair turn; a landed commit carries the AI co-author trailer.
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FAKE, makeFleet, runOne, sh, type TempFleet } from './repo';

let f: TempFleet;
beforeAll(() => {
  f = makeFleet('belay-review-');
  process.env.BELAY_CLAUDE_BIN = FAKE;
});
afterAll(() => {
  delete process.env.BELAY_CLAUDE_BIN;
  fs.rmSync(f.tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

describe('review, then at most one repair turn, then the gates', () => {
  it('an OK review sends the change to the gates as the lane left it, and the commit names its AI co-author', async () => {
    const r = await runOne(f, ['ok-a']);
    expect(r.ends['ok-a']).toMatchObject({ outcome: 'landed', review: 'clean' });
    expect(r.ends['ok-a']).not.toHaveProperty('restored');
    expect(r.calls.filter((c) => c.lane === 'ok-a').map((c) => c.step)).toEqual(['lane', 'review']);
    // The reviewer may only read: Read, Grep and Glob, nothing allowed beyond them.
    const review = r.calls.find((c) => c.step === 'review')!;
    expect(review.argv).toContain('--tools=Read,Grep,Glob');
    expect(review.settings?.permissions.allow).toEqual(['Read', 'Grep', 'Glob']);
    expect(review.prompt).toContain('+ok-a');
    expect(review.prompt).toContain('- title: do ok-a');
    expect(review.prompt).toContain('## Do the work, never the detector');
    // Its usage is the lane's, marked as the review call, and the wave total counts it.
    const usage = r.lines.filter((e) => e.kind === 'lane.usage' && e.lane === 'ok-a');
    expect(usage.map((e) => (e.kind === 'lane.usage' ? e.call ?? 'lane' : ''))).toEqual(['lane', 'review']);
    const body = sh(f.repoDir, 'log', '-1', '--format=%B', `belay/wave-${r.wave}`);
    expect(body.trimEnd().split('\n').pop()).toBe('Co-Authored-By: Claude (fake-model-1) <noreply@anthropic.com>');
    expect(sh(f.repoDir, 'log', '-1', '--format=%(trailers:key=Co-Authored-By,valueonly)', `belay/wave-${r.wave}`)).toBe('Claude (fake-model-1) <noreply@anthropic.com>');
  }, 90_000);

  it('a cited defect gets one repair turn in the resumed lane session, and the repaired tree passes the gates', async () => {
    const r = await runOne(f, ['def-a']);
    expect(r.calls.filter((c) => c.lane === 'def-a').map((c) => c.step)).toEqual(['lane', 'review', 'repair']);
    const repair = r.calls.find((c) => c.step === 'repair')!;
    const at = repair.argv.indexOf('--resume');
    expect(repair.argv[at + 1]).toBe('fake-lane-def-a');
    expect(repair.argv).toContain('--permission-mode');
    expect(repair.settings?.permissions.allow).toEqual(['Edit(./**)', 'Bash(node gate.mjs:*)']);
    expect(repair.prompt).toContain('1. red.flag:1 [test] gate.mjs fails while red.flag exists');
    // Without the repair, red.flag would have failed the gate: it landed, with the repair's own file.
    expect(r.ends['def-a']).toMatchObject({ outcome: 'landed', review: 'defects', done: 'removed red.flag after the review' });
    const files = sh(f.repoDir, 'ls-tree', '-r', '--name-only', `belay/wave-${r.wave}`);
    expect(files).toContain('def-a.repair.txt');
    expect(files).not.toContain('red.flag');
    const calls = r.lines.filter((e) => e.kind === 'lane.usage' && e.lane === 'def-a').map((e) => (e.kind === 'lane.usage' ? [e.call ?? 'lane', e.costUsd] : []));
    expect(calls).toEqual([['lane', 0.5], ['review', 0.05], ['repair', 0.1]]);
  }, 90_000);

  it('puts back an existing test the lane rewrote, tells the repair turn, and lands the rest', async () => {
    const r = await runOne(f, ['tst-a']);
    expect(r.ends['tst-a']).toMatchObject({ outcome: 'landed', review: 'defects', restored: ['existing.test.mjs'] });
    const review = r.calls.find((c) => c.step === 'review')!;
    expect(review.prompt).toContain('### Put back by the runner before this review\n- existing.test.mjs');
    expect(review.prompt).not.toContain('-assert.equal');
    // The review found nothing, yet the repair turn runs: its assertions must move off the file it can no longer change.
    const repair = r.calls.find((c) => c.step === 'repair')!;
    expect(repair.prompt).toContain('existing.test.mjs [integrity]');
    expect(sh(f.repoDir, 'show', `belay/wave-${r.wave}:existing.test.mjs`)).toContain('assert.equal(add(1, 2), 3);');
    expect(sh(f.repoDir, 'ls-tree', '-r', '--name-only', `belay/wave-${r.wave}`)).toContain('tst-a.txt');
  }, 90_000);

  it('puts back an existing test the repair turn rewrote, before the gates', async () => {
    const r = await runOne(f, ['rt-a']);
    expect(r.calls.filter((c) => c.lane === 'rt-a').map((c) => c.step)).toEqual(['lane', 'review', 'repair']);
    expect(r.ends['rt-a']).toMatchObject({ outcome: 'landed', review: 'defects', restored: ['existing.test.mjs'] });
    expect(sh(f.repoDir, 'show', `belay/wave-${r.wave}:existing.test.mjs`)).toContain('assert.equal(add(1, 2), 3);');
    expect(sh(f.repoDir, 'ls-tree', '-r', '--name-only', `belay/wave-${r.wave}`)).toContain('rt-a.repair.txt');
  }, 90_000);

  it('a repair turn that parks parks the lane before any gate, and its work is saved as a patch', async () => {
    const r = await runOne(f, ['pk-a']);
    expect(r.ends['pk-a']).toMatchObject({ outcome: 'parked', parkReason: 'after review: the finding needs a gate edit', review: 'defects' });
    expect(r.ends['pk-a']).not.toHaveProperty('gateLog');
    expect(fs.readFileSync(path.join(f.runsDir, `temp/${r.wave}.pk-a.patch`), 'utf8')).toContain('pk-a.txt');
  }, 90_000);

  it('a lane over its cap after the review is budget, and its repair turn never starts', async () => {
    const r = await runOne(f, ['def-b'], { laneCapUsd: 0.52 });
    expect(r.ends['def-b']).toMatchObject({ outcome: 'budget' });
    expect(r.calls.filter((c) => c.lane === 'def-b').map((c) => c.step)).toEqual(['lane', 'review']);
  }, 90_000);
});
