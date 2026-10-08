import { describe, expect, it } from 'vitest';
import { getSetup } from '@/lib/demo';
import type { LiveSetupRead, TrackRead } from '@/server/data/setup/types';
import { DEMO_NAMES, STEP_DETAIL } from '../../data/stepDetail';
import { setupReducer } from '../flow/reducer';
import { armList, createSetupState, humanGates, namesOf, needYouCount, stepDetail, stepList } from '../flow/state';

const AT = { at: '2026-10-07T09:30:00.000Z', label: '11:30' };
const notDefined = (id: string): TrackRead => ({ state: 'undefined', text: `the repo does not define ${id}'s arm content yet` });

/** A real group as the server read it: T4's block absent, every other track not defined, three observable steps. */
function read(t4: TrackRead = { state: 'absent', text: '.gitlab-ci.yml on main of kazdanm/afterlife has no T4 arm block' }): LiveSetupRead {
  const steps: LiveSetupRead['steps']['steps'] = {};
  for (let n = 0; n <= 14; n++) steps[n] = { state: 'unknown', reason: 'not probed' };
  steps[0] = { state: 'done', text: 'glab api user → 200 · signed in as @kazdanm' };
  steps[1] = { state: 'failed', text: 'kazdanm on gitlab.com is paired, but no checkout is recorded' };
  steps[4] = { state: 'unknown', reason: "listing the group's projects failed: network: timeout" };
  return {
    group: 'kazdanm', host: 'gitlab.example.com', project: 'afterlife', projects: ['afterlife', 'belay-pack', 'belay-policy', 'belay-ledger', 'belay-engine'],
    tracks: Object.fromEntries(getSetup().arm.map(([id]) => [id, id === 'T4' ? t4 : notDefined(id)])),
    tracksAt: AT,
    doctor: { ...AT, error: null, rows: [
      { id: 'pipelines', label: 'pipelines and jobs', status: 'available', reason: 'GET projects/1/pipelines?per_page=1 answered 200' },
      { id: 'security_reports', label: 'SAST and other security reports in MRs', status: 'unavailable', reason: 'security report views needs ultimate; this namespace is on free' },
      { id: 'custom_flows', label: 'custom flows (Duo Agent Platform)', status: 'unknown', reason: 'no REST read endpoint (GraphQL only)' },
    ] },
    steps: { ...AT, steps },
  };
}

describe('the live opening state is what the server read, never the demo’s', () => {
  it('T4 with no block on main opens ready (Arm), not armed; every other track is not defined yet', () => {
    const s = createSetupState(getSetup(), 0, read());
    expect(s.live).toBe(true);
    expect(s.arm.T4).toMatchObject({ st: 'ready', mr: null, found: expect.stringMatching(/has no T4 arm block/) });
    expect(armList(s).filter((a) => a.id !== 'T4').map((a) => a.st)).toEqual(Array(7).fill('undefined'));
  });

  it('T4 armed on main opens armed; a refused read opens unknown, with its reason', () => {
    expect(createSetupState(getSetup(), 0, read({ state: 'armed', text: "T4's arm block is in .gitlab-ci.yml (line 9)" })).arm.T4).toMatchObject({ st: 'armed', found: expect.stringMatching(/line 9/) });
    const u = createSetupState(getSetup(), 0, read({ state: 'unknown', reason: 'GitLab said no while reading: 403 Forbidden' })).arm.T4;
    expect(u).toMatchObject({ st: 'unknown', found: 'GitLab said no while reading: 403 Forbidden' });
  });

  it('no step shows the demo’s done, human or todo: each is the read’s done, failed or unknown', () => {
    const s = createSetupState(getSetup(), 0, read());
    expect(new Set(stepList(s).map((x) => x.st))).toEqual(new Set(['done', 'failed', 'unknown']));
    expect(s.steps[0]).toMatchObject({ st: 'done', probe: { at: '11:30', ok: true, text: 'glab api user → 200 · signed in as @kazdanm' } });
    expect(s.steps[1]).toMatchObject({ st: 'failed', probe: { ok: false } });
    expect(s.steps[4]).toMatchObject({ st: 'unknown', probe: { ok: false, text: expect.stringMatching(/^unknown · listing the group's projects failed/) } });
    expect(s.steps[3]).toMatchObject({ st: 'unknown', probe: null }); // not probed: no probe line, no 14:02
    // A human step Afterlife could not read is still the operator's: it is a gate, and it stays unknown, never done.
    expect(humanGates(s).map((x) => [x.n, x.st])).toEqual([[3, 'unknown'], [6, 'unknown'], [7, 'unknown'], [8, 'unknown'], [10, 'unknown']]);
    expect(needYouCount(s)).toBe(5);
  });

  it('nothing needs you only when every human step reads done and no arm MR is open', () => {
    const r = read();
    for (const n of [3, 6, 7, 8, 10]) r.steps.steps[n] = { state: 'done', text: 'probed' };
    const s = createSetupState(getSetup(), 0, r);
    expect(needYouCount(s)).toBe(0);
    expect(needYouCount({ ...s, arm: { ...s.arm, T4: { ...s.arm.T4!, st: 'open' } } })).toBe(1);
    r.steps.steps[8] = { state: 'failed', text: 'no such variable' };
    expect(humanGates(createSetupState(getSetup(), 0, r)).map((x) => [x.n, x.st])).toEqual([[8, 'failed']]);
  });

  it("the doctor is the probe's rows with their reasons and its own time; the group is the paired one", () => {
    const s = createSetupState(getSetup(), 0, read());
    expect(s.doctor).toEqual([
      { name: 'pipelines and jobs', st: 'available', reason: expect.stringMatching(/answered 200/) },
      { name: 'SAST and other security reports in MRs', st: 'unavailable', reason: expect.stringMatching(/needs ultimate/) },
      { name: 'custom flows (Duo Agent Platform)', st: 'unknown', reason: expect.stringMatching(/GraphQL only/) },
    ]);
    expect([s.doctorAt, s.doctorProbedAt, s.group, s.homeGroup, s.project]).toEqual([Date.parse(AT.at), '11:30', 'kazdanm', 'kazdanm', 'afterlife']);
    expect(JSON.stringify(s)).not.toMatch(/acme-sandbox|acme-lab|14:02/);
  });

  it('the step commands name the paired group, its host and BELAY_PROJECT, never acme-lab or ledgerline', () => {
    const s = createSetupState(getSetup(), 0, read());
    const all = stepList(s).map((x) => JSON.stringify(stepDetail(s, x.n)));
    for (const d of all) expect(d).not.toMatch(/acme-lab|ledgerline/);
    expect(stepDetail(s, 4)?.cmd).toEqual(['afterlife', 'belay-pack', 'belay-policy', 'belay-ledger', 'belay-engine'].map((p) => `glab repo create ${p} --group kazdanm --public`));
    expect(stepDetail(s, 5)?.cmd?.[0]).toBe('git -C ../afterlife push --mirror https://gitlab.example.com/kazdanm/afterlife.git');
    expect(stepDetail(s, 11)?.does).toContain('kazdanm/afterlife');
    expect(stepDetail(s, 3)?.where).toBe('GitLab → kazdanm → Settings → Billing');
  });

  it('demo mode keeps its own commands, and its own states', () => {
    const s = createSetupState(getSetup(), 0);
    expect(s.live).toBe(false);
    expect(namesOf(s)).toEqual(DEMO_NAMES);
    for (const x of stepList(s)) expect(stepDetail(s, x.n)).toBe(STEP_DETAIL[x.n]);
    expect(STEP_DETAIL[4]?.cmd?.[0]).toBe('glab repo create ledgerline --group acme-lab --public');
  });
});

describe('live re-reads', () => {
  it("Re-probe: the doctor's new rows and time; a re-probe with no answer only stops the spinner", () => {
    const s = setupReducer(createSetupState(getSetup(), 0, read()), { t: 'doctor-start' });
    const later = { ...read().doctor, at: '2026-10-07T09:40:00.000Z', label: '11:40', rows: [{ id: 'x', label: 'pipelines and jobs', status: 'unknown' as const, reason: 'GET failed (network)' }] };
    const n = setupReducer(s, { t: 'doctor-read', doctor: later });
    expect([n.doctorBusy, n.doctorProbedAt, n.doctor, n.homeDoctor]).toEqual([false, '11:40', [{ name: 'pipelines and jobs', st: 'unknown', reason: 'GET failed (network)' }], n.doctor]);
    expect(setupReducer(s, { t: 'doctor-read', doctor: null })).toMatchObject({ doctorBusy: false, doctorProbedAt: '11:30' });
  });

  it("a step's verify shows what the read saw: done, or still unknown", () => {
    const s = setupReducer(createSetupState(getSetup(), 0, read()), { t: 'probe-start', n: 1 });
    expect(s.steps[1]?.st).toBe('probing');
    const done = setupReducer(s, { t: 'steps-read', steps: { ...AT, steps: { 1: { state: 'done', text: 'paired with kazdanm · checkout C:/afterlife' } } } });
    expect(done.steps[1]).toMatchObject({ st: 'done', probe: { ok: true, text: 'paired with kazdanm · checkout C:/afterlife' } });
    const refused = setupReducer(s, { t: 'steps-read', steps: { ...AT, steps: { 1: { state: 'unknown', reason: 'this request names "evil.test", not localhost' } } } });
    expect(refused.steps[1]).toMatchObject({ st: 'unknown', probe: { ok: false, text: expect.stringMatching(/evil\.test/) } });
  });
});
