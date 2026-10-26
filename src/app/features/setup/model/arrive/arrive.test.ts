import { describe, expect, it } from 'vitest';
import { getActionClasses, getSetup, getTracks } from '@/lib/demo';
import type { LiveSetupRead, StepRead, TrackRead } from '@/server/data/setup/types';
import { LIVE_CAP_LABELS } from '../../data/live/liveCapabilities';
import { createSetupState, humanGates, isUnread, needYouCount } from '../flow/state';
import type { SetupState } from '../types';
import { arrivalOf, flowReducer, type ArriveAction, type SetupCatalogue } from './arrive';
import type { SetupAction } from '../flow/reducer';

const at = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };
const meta = { group: 'kazdanm', host: 'gitlab.com', project: 'afterlife', projects: ['afterlife', 'belay-pack'] };
const demoCat: SetupCatalogue = { setup: getSetup(), tracks: getTracks(), classes: getActionClasses(), illustrative: { steps: false, tracks: false }, mode: 'demo' };
const liveCat: SetupCatalogue = { ...demoCat, illustrative: { steps: true, tracks: true }, mode: 'live', live: meta };

const steps: Record<number, StepRead> = {};
for (let n = 0; n <= 14; n++) steps[n] = { state: 'unknown', reason: 'not probed' };
steps[0] = { state: 'done', text: 'signed in' };
steps[4] = { state: 'done', text: '6 of 6 projects exist' };
const tracks: Record<string, TrackRead> = Object.fromEntries(getSetup().arm.map(([id]) => [id, id === 'T4' ? { state: 'absent', text: 'no block' } : { state: 'undefined', text: 'not defined' }]));
const doctor = { ...at, error: null, rows: [{ id: 'p', label: 'pipelines and jobs', status: 'available' as const, reason: '200' }] };
const live: LiveSetupRead = { ...meta, tracks, tracksAt: at, doctor, steps: { ...at, steps, targetPath: 'kazdanm/afterlife' } };

const fold = (...as: (SetupAction | ArriveAction)[]) => as.reduce<SetupState | null>(flowReducer, null);
const reads = { tracks: { t: 'tracks-read', tracks } as const, doctor: { t: 'doctor-read', doctor } as const, steps: { t: 'steps-read', steps: live.steps } as const };

describe('Setup arriving on the screen host', () => {
  it('is nothing until the catalogue lands, and a read before it changes nothing', () => {
    expect(fold(reads.tracks)).toBeNull();
  });

  it('demo: the catalogue alone is the whole opening state, and a second catalogue keeps what the flow did', () => {
    const s = fold({ t: 'catalogue-read', cat: demoCat, now: 5 });
    expect(s).toEqual(createSetupState(getSetup(), 5));
    const probed = flowReducer(s, { t: 'probe-start', n: 5 });
    expect(flowReducer(probed, { t: 'catalogue-read', cat: demoCat, now: 9 })).toBe(probed);
    expect(flowReducer(s, reads.tracks)).toBe(s); // the demo has no live read to apply
  });

  it('live, catalogue only: every part unread, no gate counted, the doctor rows are its labels with no status', () => {
    const s = fold({ t: 'catalogue-read', cat: liveCat, now: 5 }) as SetupState;
    expect(s.unread).toEqual({ tracks: true, doctor: true, steps: true });
    expect(s.doctor.map((r) => r.name)).toEqual(LIVE_CAP_LABELS);
    expect(s.group).toBe('kazdanm');
    expect(Object.values(s.arm).every((a) => a.st === 'unknown')).toBe(true);
    expect(isUnread(s, 'steps')).toBe(true);
  });

  it.each([
    ['tracks, doctor, steps', ['tracks', 'doctor', 'steps']],
    ['steps, tracks, doctor', ['steps', 'tracks', 'doctor']],
    ['doctor, steps, tracks', ['doctor', 'steps', 'tracks']],
  ] as const)('live, the reads in any order (%s) land on the state one whole read gives', (_n, order) => {
    const s = fold({ t: 'catalogue-read', cat: liveCat, now: 5 }, ...order.map((k) => reads[k]));
    expect(s).toEqual(createSetupState(getSetup(), 0, live));
    expect(s?.unread).toBeUndefined();
    expect(needYouCount(s as SetupState)).toBe(needYouCount(createSetupState(getSetup(), 0, live)));
  });

  it('a read clears only its own part', () => {
    const s = fold({ t: 'catalogue-read', cat: liveCat, now: 5 }, reads.doctor) as SetupState;
    expect(s.unread).toEqual({ tracks: true, steps: true });
  });

  it('a re-read of the tracks keeps an arm whose MR is in flight', () => {
    const s = fold({ t: 'catalogue-read', cat: liveCat, now: 5 }, reads.steps, reads.tracks) as SetupState;
    const open: SetupState = { ...s, arm: { ...s.arm, T4: { ...s.arm.T4!, st: 'open', mr: '!7' } } };
    const again = flowReducer(open, { t: 'tracks-read', tracks: { ...tracks, T4: { state: 'armed', text: 'block on main' } } }) as SetupState;
    expect(again.arm.T4).toMatchObject({ st: 'open', mr: '!7' });
    expect(flowReducer(s, { t: 'tracks-read', tracks: { ...tracks, T4: { state: 'armed', text: 'on main' } } })?.arm.T4?.st).toBe('armed');
  });

  it('a failed read lands as what it is: tracks and steps unknown with why, a doctor probe failed', () => {
    const base = fold({ t: 'catalogue-read', cat: liveCat, now: 5 });
    const s = (['tracks', 'steps', 'doctor'] as const).reduce((x, part) => flowReducer(x, { t: 'part-failed', part, reason: 'unreadable', at }), base) as SetupState;
    expect(s.unread).toBeUndefined();
    expect(s.arm.T1).toMatchObject({ st: 'unknown', found: 'the read failed: unreadable' });
    expect(s.steps[3]).toMatchObject({ st: 'unknown', probe: { ok: false, text: 'unknown · the read failed: unreadable' } });
    expect(s.doctorError).toBe('belay doctor could not be read: unreadable');
    expect(humanGates(s).every((x) => x.st === 'unknown')).toBe(true);
  });
});

describe('a slice landing, as the session reads it', () => {
  const now = new Date('2026-10-07T09:30:00.000Z');
  it('the catalogue makes the state; a failed catalogue does nothing (the screen says why)', () => {
    expect(arrivalOf('catalogue', { state: 'ok', data: liveCat }, now)).toEqual({ t: 'catalogue-read', cat: liveCat, now: now.getTime() });
    expect(arrivalOf('catalogue', { state: 'error', reason: 'unreadable' }, now)).toBeNull();
  });
  it('a live read lands through its own action; the demo empty object is no read', () => {
    expect(arrivalOf('tracks', { state: 'ok', data: { tracks, at } }, now)).toEqual({ t: 'tracks-read', tracks });
    expect(arrivalOf('doctor', { state: 'ok', data: doctor }, now)).toEqual({ t: 'doctor-read', doctor });
    expect(arrivalOf('steps', { state: 'ok', data: live.steps }, now)).toEqual({ t: 'steps-read', steps: live.steps });
    for (const part of ['tracks', 'doctor', 'steps'] as const) expect(arrivalOf(part, { state: 'ok', data: {} }, now)).toBeNull();
  });
  it('a failed read lands as failed, stamped now', () => {
    expect(arrivalOf('doctor', { state: 'error', reason: 'not served' }, now)).toMatchObject({ t: 'part-failed', part: 'doctor', reason: 'not served', at: { at: now.toISOString() } });
  });
});
