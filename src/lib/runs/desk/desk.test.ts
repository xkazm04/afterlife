import { describe, expect, it } from 'vitest';
import { foldRuns, foldWave } from '../fold';
import { WAVE_1, WAVE_2_RUNNING } from '../fixture';
import { parseRunLine } from '../parse';
import type { RunEvent } from '@/schemas/run/run';
import { branchKey, buildDesk, mergeCommands } from './desk';
import type { BranchState, FleetRef } from './types';

const events = (lines: string[]) => lines.map(parseRunLine).filter((e): e is RunEvent => e !== null);
const runs = (withRunning = false) =>
  foldRuns([foldWave(events(WAVE_1), false)!, ...(withRunning ? [foldWave(events(WAVE_2_RUNNING), false)!] : [])], 0);
const ALPHA: FleetRef = { slug: 'alpha', path: 'C:/work/alpha repo', base: 'main' };
const BETA: FleetRef = { slug: 'beta', path: '/w/beta', base: 'dev' };
const git = (s?: BranchState) => new Map(s ? [[branchKey('alpha', 'belay/wave-1'), s]] : []);

describe('buildDesk', () => {
  it('a mergeable wave not in its base is a decision, with the real path quoted in its commands', () => {
    const d = buildDesk({ runs: runs(), fleet: { file: 'ok', refs: [ALPHA, BETA] }, branches: git({ exists: true, merged: false }) });
    const merge = d.needs.find((n) => n.kind === 'merge-wave');
    expect(merge).toMatchObject({ id: 'merge:alpha:1', branch: 'belay/wave-1', base: 'main', path: 'C:/work/alpha repo', landed: 1, costUsd: 0.25, checked: true });
    expect(merge?.commands).toEqual(['git -C "C:/work/alpha repo" switch main', 'git -C "C:/work/alpha repo" merge --ff-only belay/wave-1', 'git -C "C:/work/alpha repo" push']);
  });
  it('a merged or deleted branch is no decision; an unchecked one still is, and says so', () => {
    for (const s of [{ exists: true, merged: true }, { exists: false, merged: false }]) {
      expect(buildDesk({ runs: runs(), fleet: { file: 'ok', refs: [ALPHA] }, branches: git(s) }).needs.map((n) => n.kind)).toEqual(['parked-lane']);
    }
    const unchecked = buildDesk({ runs: runs(), fleet: { file: 'missing', refs: [] }, branches: git() });
    expect(unchecked.needs[0]).toMatchObject({ kind: 'merge-wave', checked: false, commands: ['git -C alpha switch main', 'git -C alpha merge --ff-only belay/wave-1', 'git -C alpha push'] });
    expect('path' in unchecked.needs[0]!).toBe(false);
  });
  it("a parked lane of the repo's newest ended wave is a decision; a running wave does not hide it", () => {
    const d = buildDesk({ runs: runs(true), fleet: { file: 'ok', refs: [ALPHA] }, branches: git({ exists: true, merged: true }) });
    expect(d.needs).toEqual([{ kind: 'parked-lane', id: 'park:alpha:1:b', repo: 'alpha', wave: 1, lane: 'b', title: expect.any(String), parkReason: 'needs a person to pick a version' }]);
  });
  it('rows: every fleet repo in file order, then repos with runs the file no longer lists', () => {
    const d = buildDesk({ runs: runs(true), fleet: { file: 'ok', refs: [BETA] }, branches: git() });
    expect(d.rows.map((r) => [r.slug, r.inFleet, r.waves, r.needs])).toEqual([['beta', true, 0, 0], ['alpha', false, 2, 2]]);
    const beta = d.rows[0]!;
    expect(beta).toEqual({ slug: 'beta', path: '/w/beta', base: 'dev', inFleet: true, waves: 0, needs: 0 });
    expect(d.rows[1]!.last).toMatchObject({ wave: 2, running: true, open: 1 });
    expect('merged' in d.rows[1]!.last!).toBe(false);
  });
  it("carries the fleet file's gitlab key onto the row, for the cost join", () => {
    const d = buildDesk({ runs: runs(), fleet: { file: 'ok', refs: [{ ...BETA, gitlab: 'acme/beta' }] }, branches: git() });
    expect(d.rows[0]).toMatchObject({ slug: 'beta', gitlab: 'acme/beta' });
  });
  it('carries why the fleet file did not read', () => {
    expect(buildDesk({ runs: runs(), fleet: { file: 'invalid', refs: [], error: 'bad yaml' }, branches: git() })).toMatchObject({ fleet: 'invalid', fleetError: 'bad yaml' });
  });
});

describe('mergeCommands', () => {
  it('leaves a plain path bare', () => expect(mergeCommands('/w/beta', 'belay/wave-3', 'dev')[1]).toBe('git -C /w/beta merge --ff-only belay/wave-3'));
});
