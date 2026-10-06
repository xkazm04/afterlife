import { describe, expect, it } from 'vitest';
import { getSetup, getTracks } from '@/lib/demo';
import type { SetupState } from '../types';
import { probeWillPass, setupReducer, type SetupAction } from './reducer';
import { armList, armedCount, createSetupState, doctorCounts, doneCount, needYouCount, stepList, unmet } from './state';

const fresh = () => createSetupState(getSetup(), getTracks(), 1000);
const run = (s: SetupState, ...actions: SetupAction[]) => actions.reduce(setupReducer, s);
const probe = (s: SetupState, n: number, at = '14:05') => run(s, { t: 'probe-start', n }, { t: 'probe-end', n, at });

describe('the opening state', () => {
  it('matches the demo: 3 of 15 probed, 1 armed, T3 and T6 ready, the rest locked', () => {
    const s = fresh();
    expect(stepList(s)).toHaveLength(15);
    expect(doneCount(s)).toBe(3);
    expect(armedCount(s)).toBe(1);
    expect(armList(s).map((a) => a.st)).toEqual(['armed', 'ready', 'ready', 'locked', 'locked', 'locked', 'locked', 'locked']);
    expect(s.arm.T4?.mr).toBe('!3');
  });
  it('counts gates and doctor rows', () => {
    const s = fresh();
    expect(needYouCount(s)).toBe(5);
    expect(doctorCounts(s)).toEqual({ available: 6, unavailable: 1, unknown: 2 });
  });
  it('a done step carries its probe; an undone human step carries what it saw before', () => {
    const s = fresh();
    expect(s.steps[0]?.probe).toMatchObject({ ok: true, at: '14:02' });
    expect(s.steps[6]?.probe).toMatchObject({ ok: false, text: '0 runners with tag gitlab--duo online' });
    expect(s.steps[4]?.probe).toBeNull();
  });
});

describe('probing a step', () => {
  it('step 6 fails its first probe and nothing changes in the map', () => {
    let s = fresh();
    expect(probeWillPass(s, 6)).toBe(false);
    s = run(s, { t: 'probe-start', n: 6 });
    expect(s.steps[6]?.st).toBe('probing');
    s = run(s, { t: 'probe-end', n: 6, at: '14:03' });
    expect(s.steps[6]).toMatchObject({ st: 'human', probe: { ok: false, text: 'still 0 runners with tag gitlab--duo online' } });
    expect(s.arm.T5?.st).toBe('locked');
    expect(probeWillPass(s, 6)).toBe(true);
  });
  it('the second probe passes and unlocks T5', () => {
    const s = probe(probe(fresh(), 6), 6);
    expect(s.steps[6]?.st).toBe('done');
    expect(s.arm.T5?.st).toBe('ready');
  });
  it('an agent step is done only on a probe, and ignores a second start while probing', () => {
    let s = run(fresh(), { t: 'probe-start', n: 4 });
    expect(run(s, { t: 'probe-start', n: 4 })).toBe(s);
    s = run(s, { t: 'probe-end', n: 4, at: '14:04' });
    expect(s.steps[4]?.st).toBe('done');
  });
  it('probe-end without probe-start does nothing', () => {
    const s = fresh();
    expect(run(s, { t: 'probe-end', n: 4, at: '14:04' })).toBe(s);
  });
  it('step 12 unlocks T2 and settles the vulnerability report; step 11 settles flow-by-API', () => {
    const s = probe(probe(fresh(), 12), 11);
    expect(s.arm.T2?.st).toBe('ready');
    expect(s.doctor.find((r) => r.name.startsWith('Vulnerability'))?.st).toBe('available');
    expect(s.doctor.find((r) => r.name.startsWith('Flow created'))?.st).toBe('available');
    expect(doctorCounts(s).unknown).toBe(0);
  });
});

describe('arm, merge, verify, disarm', () => {
  const arm = (s: SetupState, id: string) => run(s, { t: 'arm-send', id }, { t: 'verify-start', id }, { t: 'verify-end', id });
  it('arm sends an MR as you, then a person merges, then Belay verifies', () => {
    let s = run(fresh(), { t: 'arm-send', id: 'T3' });
    expect(s.arm.T3).toMatchObject({ st: 'open', mr: '!4' });
    expect(needYouCount(s)).toBe(6);
    s = run(s, { t: 'verify-start', id: 'T3' });
    expect(s.arm.T3?.st).toBe('probing');
    s = run(s, { t: 'verify-end', id: 'T3' });
    expect(s.arm.T3?.st).toBe('armed');
  });
  it('only a ready track can be sent', () => {
    const s = fresh();
    expect(run(s, { t: 'arm-send', id: 'T1' })).toBe(s);
    expect(run(s, { t: 'verify-start', id: 'T3' })).toBe(s);
  });
  it('arming T3 and T6 unlocks T1 and T8 once T4 is armed', () => {
    const s = arm(arm(fresh(), 'T3'), 'T6');
    expect(s.arm.T1?.st).toBe('ready');
    expect(s.arm.T8?.st).toBe('ready');
    expect(unmet(s, 'T1')).toEqual([]);
  });
  it('disarm opens a revert; merging it returns the track to ready and re-locks what leaned on it', () => {
    let s = arm(arm(fresh(), 'T3'), 'T6');
    s = run(s, { t: 'disarm', id: 'T3' });
    expect(s.arm.T3).toMatchObject({ st: 'open', revert: true, mr: '!4' });
    s = run(s, { t: 'verify-start', id: 'T3' }, { t: 'verify-end', id: 'T3' });
    expect(s.arm.T3).toMatchObject({ st: 'ready', mr: null, revert: false });
    expect(s.arm.T1?.st).toBe('locked');
    expect(s.arm.T8?.st).toBe('locked');
  });
  it('only an armed track can be disarmed', () => {
    const s = fresh();
    expect(run(s, { t: 'disarm', id: 'T3' })).toBe(s);
  });
});

describe('the doctor and groups', () => {
  it('Re-probe on the home group keeps the rows and refreshes the age', () => {
    const s = run(fresh(), { t: 'doctor-start' }, { t: 'doctor-end', now: 99_000, at: '14:09' });
    expect(s.doctorBusy).toBe(false);
    expect(s).toMatchObject({ doctorAt: 99_000, doctorProbedAt: '14:09' });
    expect(doctorCounts(s)).toEqual({ available: 6, unavailable: 1, unknown: 2 });
  });
  it('switching to a never-probed group shows every capability unknown, never rounded up', () => {
    const s = run(fresh(), { t: 'pick-group', group: 'acme-sandbox', now: 5, at: '14:06' });
    expect(s.doctorNever).toBe(true);
    expect(doctorCounts(s)).toEqual({ available: 0, unavailable: 0, unknown: 9 });
  });
  it('Re-probe on that group reads its capabilities', () => {
    const s = run(fresh(), { t: 'pick-group', group: 'acme-sandbox', now: 5, at: '14:06' }, { t: 'doctor-start' }, { t: 'doctor-end', now: 9, at: '14:07' });
    expect(s.doctorNever).toBe(false);
    expect(doctorCounts(s)).toEqual({ available: 3, unavailable: 4, unknown: 2 });
  });
  it('switching back restores the probed rows of the home group', () => {
    const s = run(fresh(), { t: 'pick-group', group: 'acme-sandbox', now: 5, at: '14:06' }, { t: 'pick-group', group: 'acme-lab', now: 7, at: '14:08' });
    expect(s.doctorNever).toBe(false);
    expect(doctorCounts(s).available).toBe(6);
  });
});
