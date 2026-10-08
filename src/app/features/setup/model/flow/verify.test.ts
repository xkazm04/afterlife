// Verify never arms on its own: only a read of the default branch that saw the arm block (or, for a disarm, its absence)
// settles a track. Anything else leaves the MR open and says what was found. Demo mode is simulated and labelled so.
import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import type { SetupState } from '../types';
import { setupReducer, type SetupAction } from './reducer';
import { createSetupState } from './state';
import { verdictOf } from './verify';

const fresh = () => createSetupState(getSetup(), 1000);
const run = (s: SetupState, ...actions: SetupAction[]) => actions.reduce(setupReducer, s);
const sent = (id: string, revert = false): SetupAction => ({ t: 'arm-sent', id, revert, mr: '!22', url: null, simulated: false });
const verify = (s: SetupState, id: string, check: Parameters<typeof verdictOf>[0]) =>
  run(s, { t: 'verify-start', id }, { t: 'verify-end', id, verdict: verdictOf(check, s.arm[id]?.revert ?? false) });

describe('the verdict of a verify', () => {
  it('is ok for an arm only when the block is on main, and for a disarm only when it is gone', () => {
    expect(verdictOf({ status: 'read', armed: true, text: 'on main' }, false)).toEqual({ ok: true, simulated: false, text: 'on main' });
    expect(verdictOf({ status: 'read', armed: false, text: 'no block' }, false).ok).toBe(false);
    expect(verdictOf({ status: 'read', armed: false, text: 'no block' }, true).ok).toBe(true);
    expect(verdictOf({ status: 'read', armed: true, text: 'on main' }, true).ok).toBe(false);
  });
  it('is never ok on a refusal; a simulated one says so', () => {
    expect(verdictOf({ status: 'refused', reason: 'GitLab said no' }, false)).toEqual({ ok: false, simulated: false, text: 'could not verify: GitLab said no' });
    expect(verdictOf({ status: 'simulated', text: 'Simulated · demo mode' }, false)).toEqual({ ok: true, simulated: true, text: 'Simulated · demo mode' });
  });
});

describe("the reducer's verify path", () => {
  it('arms T3 when the read saw its block on main', () => {
    const s = verify(run(fresh(), sent('T3')), 'T3', { status: 'read', armed: true, text: 'block on main' });
    expect(s.arm.T3).toMatchObject({ st: 'armed', mr: '!22', found: null });
  });
  it('keeps the MR open, with what it found, when the block is not on main yet', () => {
    const s = verify(run(fresh(), sent('T3')), 'T3', { status: 'read', armed: false, text: '.gitlab-ci.yml on main has no T3 arm block' });
    expect(s.arm.T3).toMatchObject({ st: 'open', mr: '!22', found: '.gitlab-ci.yml on main has no T3 arm block' });
    expect(s.arm.T1?.st).toBe('locked');
  });
  it('a refused read arms nothing', () => {
    const s = verify(run(fresh(), sent('T3')), 'T3', { status: 'refused', reason: 'live mode has not finished its first poll' });
    expect(s.arm.T3).toMatchObject({ st: 'open', found: 'could not verify: live mode has not finished its first poll' });
  });
  it('a disarm settles only when the block is gone; until then the track stays as it was asked', () => {
    // The demo opens with T4 armed and step 4 unprobed; a disarmed T4 is ready only once step 4 reads done (T4 needs it).
    let s = run(fresh(), { t: 'probe-start', n: 4 }, { t: 'probe-end', n: 4, at: '14:05' }, sent('T4', true));
    s = verify(s, 'T4', { status: 'read', armed: true, text: 'the block is still on main' });
    expect(s.arm.T4).toMatchObject({ st: 'open', revert: true, found: 'the block is still on main' });
    s = verify(s, 'T4', { status: 'read', armed: false, text: 'no T4 block' });
    expect(s.arm.T4).toMatchObject({ st: 'ready', mr: null, revert: false, found: null });
  });
  it('demo mode keeps the simulated flow, and the track says it was simulated', () => {
    const demo = run(fresh(), { t: 'arm-sent', id: 'T3', revert: false, mr: null, url: null, simulated: true });
    const s = verify(demo, 'T3', { status: 'simulated', text: 'Simulated · demo mode: Belay read nothing from GitLab' });
    expect(s.arm.T3).toMatchObject({ st: 'armed', simulated: true, mr: null });
  });
  it('a verify-end without a verify-start does nothing', () => {
    const s = run(fresh(), sent('T3'));
    expect(run(s, { t: 'verify-end', id: 'T3', verdict: { ok: true, simulated: false, text: 'x' } })).toBe(s);
  });
});
