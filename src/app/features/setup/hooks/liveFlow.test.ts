// Live mode's probes run no timer: a step's verify and Re-probe are a server read and nothing else.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getSetup } from '@/lib/demo';
import type { SetupReread } from '@/server/data/setup/types';
import { setupReducer, type SetupAction } from '../model/flow/reducer';
import { createSetupState } from '../model/flow/state';
import type { SetupState } from '../model/types';

const answer: { next: SetupReread } = { next: { status: 'refused', reason: 'unset' } };
const asked: string[] = [];
vi.mock('../read/reread', () => ({ reread: (part: string) => (asked.push(part), Promise.resolve(answer.next)) }));
const { liveProbes } = await import('./liveFlow');

const AT = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };

function rig() {
  const steps: Record<number, { state: 'unknown'; reason: string }> = {};
  for (let n = 0; n <= 14; n++) steps[n] = { state: 'unknown', reason: 'not probed' };
  const live = {
    group: 'kazdanm', host: 'gitlab.com', project: 'afterlife', projects: ['afterlife'], tracks: {}, tracksAt: AT,
    doctor: { ...AT, rows: [], error: null }, steps: { ...AT, steps },
  };
  const ref = { current: createSetupState(getSetup(), 0, live) as SetupState };
  const actions: SetupAction['t'][] = [];
  const dispatch = (a: SetupAction) => {
    actions.push(a.t);
    ref.current = setupReducer(ref.current, a);
  };
  const told: string[] = [];
  return { ref, actions, told, probes: liveProbes(() => ref.current, dispatch, (m) => told.push(m)) };
}

beforeEach(() => {
  vi.useFakeTimers();
  asked.length = 0;
});
afterEach(() => vi.useRealTimers());

describe('live probes', () => {
  it("a step's verify asks the server and settles without any timer", async () => {
    const r = rig();
    answer.next = { status: 'steps', steps: { ...AT, steps: { 1: { state: 'done', text: 'paired with kazdanm · checkout C:/afterlife' } } } };
    await r.probes.probe(1); // fake timers never advance: a timer here would hang the test
    expect([asked, r.actions, vi.getTimerCount()]).toEqual([['steps'], ['probe-start', 'steps-read'], 0]);
    expect(r.ref.current.steps[1]?.st).toBe('done');
    expect(r.told).toEqual(['step 1 · paired with kazdanm · checkout C:/afterlife']);
  });

  it('a step no read observes stays unknown, and says so; a refusal makes it unknown with the reason', async () => {
    const r = rig();
    answer.next = { status: 'steps', steps: { ...AT, steps: { 9: { state: 'unknown', reason: 'not probed' } } } };
    await r.probes.probe(9);
    expect([r.ref.current.steps[9]?.st, r.told[0]]).toEqual(['unknown', 'step 9 · Belay has no probe for this step yet: it stays unknown']);
    answer.next = { status: 'refused', reason: 'demo mode: Belay reads nothing from GitLab' };
    await r.probes.probe(9);
    expect(r.ref.current.steps[9]).toMatchObject({ st: 'unknown', probe: { ok: false, text: 'unknown · demo mode: Belay reads nothing from GitLab' } });
  });

  it('Re-probe reads the doctor again, with no timer; a refusal leaves the rows as they were', async () => {
    const r = rig();
    answer.next = { status: 'doctor', doctor: { at: '2026-10-07T09:41:00.000Z', label: '11:41', error: null, rows: [{ id: 'p', label: 'pipelines and jobs', status: 'available', reason: 'answered 200' }] } };
    await r.probes.reprobe();
    expect([asked, vi.getTimerCount(), r.ref.current.doctorProbedAt, r.ref.current.doctorBusy]).toEqual([['doctor'], 0, '11:41', false]);
    answer.next = { status: 'refused', reason: 'this request names "evil.test", not localhost' };
    await r.probes.reprobe();
    expect([r.ref.current.doctor.length, r.ref.current.doctorBusy, r.told.at(-1)]).toEqual([1, false, 'belay doctor · not probed: this request names "evil.test", not localhost']);
  });
});
