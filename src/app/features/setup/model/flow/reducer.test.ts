import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import type { StepRead } from '@/server/data/setup/types';
import type { SetupState } from '../types';
import { CAP_FLOW_API } from '../../data/capabilities';
import { probeWillPass, setupReducer, type SetupAction } from './reducer';
import { armList, armedCount, capSt, createSetupState, doctorCounts, doneCount, needYouCount, stepList, unmet } from './state';

const fresh = () => createSetupState(getSetup(), 1000);
const run = (s: SetupState, ...actions: SetupAction[]) => actions.reduce(setupReducer, s);
const probe = (s: SetupState, n: number, at = '14:05') => run(s, { t: 'probe-start', n }, { t: 'probe-end', n, at });

describe('the opening state', () => {
  it('matches the demo: 4 of 15 probed (step 4 too: T4, T3 and T6 need it), 1 armed, T3 and T6 ready, the rest locked', () => {
    const s = fresh();
    expect(stepList(s)).toHaveLength(15);
    expect(doneCount(s)).toBe(4);
    expect(armedCount(s)).toBe(1);
    expect(armList(s).map((a) => a.st)).toEqual(['armed', 'ready', 'ready', 'locked', 'locked', 'locked', 'locked', 'locked']);
    // One record: setup.arm says T4 is armed and names no MR, so none is shown (tracks[].armedBy is not read).
    expect(s.arm.T4).toMatchObject({ st: 'armed', mr: null, simulated: false });
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
    expect(s.steps[5]?.probe).toBeNull();
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
  const sent = (id: string, revert = false, mr: string | null = '!22'): SetupAction => ({ t: 'arm-sent', id, revert, mr, url: mr ? `https://gitlab.example/mr/${mr.slice(1)}` : null, simulated: mr === null });
  const seen = { ok: true, simulated: false, text: 'on main' };
  const arm = (s: SetupState, id: string) => run(s, sent(id), { t: 'verify-start', id }, { t: 'verify-end', id, verdict: seen });
  it('arm sends an MR as you, then a person merges, then Afterlife verifies', () => {
    let s = run(fresh(), sent('T3'));
    expect(s.arm.T3).toMatchObject({ st: 'open', mr: '!22', url: 'https://gitlab.example/mr/22', revert: false, simulated: false });
    expect(needYouCount(s)).toBe(6);
    s = run(s, { t: 'verify-start', id: 'T3' });
    expect(s.arm.T3?.st).toBe('probing');
    s = run(s, { t: 'verify-end', id: 'T3', verdict: seen });
    expect(s.arm.T3?.st).toBe('armed');
  });
  it('the MR is the one the confirm named: none, in demo mode, is shown as simulated', () => {
    const s = run(fresh(), sent('T3', false, null));
    expect(s.arm.T3).toMatchObject({ st: 'open', mr: null, url: null, simulated: true });
  });
  it('only a ready track can be sent', () => {
    const s = fresh();
    expect(run(s, sent('T1'))).toBe(s);
    expect(run(s, sent('T3', true))).toBe(s);
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
    s = run(s, sent('T3', true, '!23'));
    expect(s.arm.T3).toMatchObject({ st: 'open', revert: true, mr: '!23' });
    s = run(s, { t: 'verify-start', id: 'T3' }, { t: 'verify-end', id: 'T3', verdict: seen });
    expect(s.arm.T3).toMatchObject({ st: 'ready', mr: null, revert: false });
    expect(s.arm.T1?.st).toBe('locked');
    expect(s.arm.T8?.st).toBe('locked');
  });
  it('only an armed track can be disarmed', () => {
    const s = fresh();
    expect(run(s, sent('T3', true))).toBe(s);
  });
});

describe('a read that takes a step back', () => {
  const at = { at: '2026-10-15T09:00:00.000Z', label: '09:00' };
  const reread = (n: number, read: StepRead): SetupAction => ({ t: 'steps-read', steps: { ...at, steps: { [n]: read } } });
  it('a failed step 4 locks the ready tracks that need it, as a merged revert does; an armed track stays armed', () => {
    const s = run(fresh(), reread(4, { state: 'failed', text: 'the policy projects are gone' }));
    expect(s.steps[4]?.st).toBe('failed');
    expect(armList(s).map((a) => a.st)).toEqual(['armed', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
  });
  it('a refused read of step 4 locks them too, and the next read that sees it done opens them again', () => {
    const lost = run(fresh(), reread(4, { state: 'unknown', reason: 'the server did not answer' }));
    expect([lost.arm.T3?.st, lost.arm.T6?.st]).toEqual(['locked', 'locked']);
    const back = run(lost, reread(4, { state: 'done', text: 'five projects found' }));
    expect([back.arm.T3?.st, back.arm.T6?.st]).toEqual(['ready', 'ready']);
  });
});

describe('a read that lands while another step is probing', () => {
  const at = { at: '2026-10-15T09:00:00.000Z', label: '09:00' };
  it("leaves that step in flight for its own answer: an older read never says 'not yet' over it", () => {
    const s = run(fresh(), { t: 'probe-start', n: 6 }, { t: 'probe-start', n: 5 });
    const one = run(s, { t: 'steps-read', asked: 5, steps: { ...at, steps: { 5: { state: 'done', text: 'pushed' }, 6: { state: 'failed', text: '0 runners' } } } });
    expect([one.steps[5]?.st, one.steps[6]?.st]).toEqual(['done', 'probing']);
    const own = run(one, { t: 'steps-read', asked: 6, steps: { ...at, steps: { 6: { state: 'done', text: '1 runner' } } } });
    expect(own.steps[6]?.st).toBe('done');
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
    const s = run(fresh(), { t: 'pick-group', group: 'acme-sandbox' });
    expect(s.doctorNever).toBe(true);
    expect(doctorCounts(s)).toEqual({ available: 0, unavailable: 0, unknown: 9 });
  });
  it('Re-probe on that group reads its capabilities', () => {
    const s = run(fresh(), { t: 'pick-group', group: 'acme-sandbox' }, { t: 'doctor-start' }, { t: 'doctor-end', now: 9, at: '14:07' });
    expect(s.doctorNever).toBe(false);
    expect(doctorCounts(s)).toEqual({ available: 3, unavailable: 4, unknown: 2 });
  });
  it('switching back restores the probed rows of the home group', () => {
    const s = run(fresh(), { t: 'pick-group', group: 'acme-sandbox' }, { t: 'pick-group', group: 'acme-lab' });
    expect(s.doctorNever).toBe(false);
    expect(doctorCounts(s).available).toBe(6);
  });
  it('a re-probe that fails on a never-probed group keeps the reason, and still says never probed', () => {
    const s = run(fresh(), { t: 'pick-group', group: 'acme-sandbox' }, { t: 'doctor-start' });
    const failed = run(s, { t: 'doctor-read', doctor: null, reason: 'the server did not answer' });
    expect(failed).toMatchObject({ doctorBusy: false, doctorNever: true, doctorError: 'the server did not answer' });
    expect(doctorCounts(failed).unknown).toBe(9);
    // the reason stays with that group: a good probe or a switch back clears it
    expect(run(failed, { t: 'doctor-start' }, { t: 'doctor-end', now: 9, at: '14:07' }).doctorError).toBeNull();
    expect(run(failed, { t: 'pick-group', group: 'acme-lab' }).doctorError).toBeNull();
  });
  it('switching back to the home group restores its own probe time and failure, never stamps it probed now', () => {
    const failedHome = { ...fresh(), doctorAt: 1000, doctorProbedAt: '14:02', doctorError: 'the server did not answer' };
    const back = run(failedHome, { t: 'pick-group', group: 'acme-sandbox' }, { t: 'pick-group', group: 'acme-lab' });
    expect(back).toMatchObject({ doctorAt: 1000, doctorProbedAt: '14:02', doctorError: 'the server did not answer', doctorNever: false });
  });
  it("a finished step 11 settles the home group's Flow API row: it survives a switch away and back, and no other group's", () => {
    const s = fresh();
    expect(capSt(s, CAP_FLOW_API)).not.toBe('available');
    const home = probe(s, 11);
    expect(capSt(home, CAP_FLOW_API)).toBe('available');
    const away = run(home, { t: 'pick-group', group: 'acme-sandbox' }, { t: 'pick-group', group: 'acme-lab' });
    expect(capSt(away, CAP_FLOW_API)).toBe('available');
    const onSandbox = probe(run(s, { t: 'pick-group', group: 'acme-sandbox' }), 11);
    expect(capSt(onSandbox, CAP_FLOW_API)).toBe('unknown');
    expect(capSt(run(onSandbox, { t: 'pick-group', group: 'acme-lab' }), CAP_FLOW_API)).toBe('available');
  });
});
