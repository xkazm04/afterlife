import { CAP_FLOW_API, CAP_VULN, OTHER_GROUP } from '../../data/capabilities';
import { STEP_DETAIL } from '../../data/stepDetail';
import type { ArmState, DoctorRow, SetupState, StepState } from '../types';
import { toCapStatus, recomputeLocks, unmet, armList } from './state';
import type { Verdict } from './verify';

/** Every change to the setup. Probes are the only thing that moves a step to done; Belay writes only on a click. */
export type SetupAction =
  | { t: 'probe-start'; n: number }
  | { t: 'probe-end'; n: number; at: string }
  /** A confirmed arm (or, `revert`, disarm) MR: what the server's answer named, nothing else. */
  | { t: 'arm-sent'; id: string; revert: boolean; mr: string | null; url: string | null; simulated: boolean }
  | { t: 'verify-start'; id: string }
  /** What the read of the default branch settled (verify.ts). Only an ok verdict arms or disarms. */
  | { t: 'verify-end'; id: string; verdict: Verdict }
  | { t: 'doctor-start' }
  | { t: 'doctor-end'; now: number; at: string }
  | { t: 'pick-group'; group: string; now: number; at: string };

/** The demo's honest "not yet": a step with a failFirst text fails its first probe. */
export const probeWillPass = (s: SetupState, n: number): boolean => !(STEP_DETAIL[n]?.failFirst && (s.attempts[n] ?? 0) === 0);

const setStep = (s: SetupState, n: number, patch: Partial<StepState>): SetupState => {
  const cur = s.steps[n];
  return cur ? { ...s, steps: { ...s.steps, [n]: { ...cur, ...patch } } } : s;
};
const setArm = (s: SetupState, id: string, patch: Partial<ArmState>): SetupState => {
  const cur = s.arm[id];
  return cur ? { ...s, arm: { ...s.arm, [id]: { ...cur, ...patch } } } : s;
};
const setDoctor = (rows: readonly DoctorRow[], name: string, st: DoctorRow['st']): DoctorRow[] => rows.map((r) => (r.name === name ? { ...r, st } : r));

function probeEnd(s: SetupState, n: number, at: string): SetupState {
  const d = STEP_DETAIL[n];
  const step = s.steps[n];
  if (!d || !step || step.st !== 'probing') return s;
  const attempted = { ...s, attempts: { ...s.attempts, [n]: (s.attempts[n] ?? 0) + 1 } };
  if (!probeWillPass(s, n)) {
    return setStep(attempted, n, { st: step.who === 'human' ? 'human' : 'todo', probe: { at, ok: false, text: d.failFirst ?? '' } });
  }
  let next = setStep(attempted, n, { st: 'done', probe: { at, ok: true, text: d.probe } });
  // A finished step settles two doctor rows, as the scan and the flows exist from then on.
  if (n === 11) next = { ...next, doctor: setDoctor(next.doctor, CAP_FLOW_API, 'available') };
  if (n === 12) next = { ...next, doctor: setDoctor(next.doctor, CAP_VULN, 'available') };
  return recomputeLocks(next);
}

/** Verify settles a track only on what it read: otherwise the MR stays open, with what was found. */
function verifyEnd(s: SetupState, id: string, v: Verdict): SetupState {
  const a = s.arm[id];
  if (!a || a.st !== 'probing') return s;
  if (!v.ok) return setArm(s, id, { st: 'open', found: v.text });
  if (!a.revert) return recomputeLocks(setArm(s, id, { st: 'armed', found: null }));
  // A merged revert disarms it; anything ready that leaned on it locks again.
  const disarmed = setArm(s, id, { st: 'ready', mr: null, url: null, revert: false, simulated: false, found: null });
  let arm = disarmed.arm;
  for (const b of armList(disarmed)) if (b.st === 'ready' && unmet(disarmed, b.id).length) arm = { ...arm, [b.id]: { ...b, st: 'locked' } };
  return recomputeLocks({ ...disarmed, arm });
}

function pickGroup(s: SetupState, group: string, now: number, at: string): SetupState {
  if (group === s.group) return s;
  if (group === s.homeGroup) return { ...s, group, doctor: s.homeDoctor, doctorNever: false, doctorAt: now, doctorProbedAt: at };
  return { ...s, group, doctor: s.homeDoctor.map((r) => ({ name: r.name, st: 'unknown' })), doctorNever: true };
}

export function setupReducer(s: SetupState, a: SetupAction): SetupState {
  switch (a.t) {
    case 'probe-start': {
      const step = s.steps[a.n];
      return step && step.st !== 'probing' && step.st !== 'done' ? setStep(s, a.n, { st: 'probing' }) : s;
    }
    case 'probe-end':
      return probeEnd(s, a.n, a.at);
    case 'arm-sent': {
      const from = s.arm[a.id]?.st;
      if (from !== (a.revert ? 'armed' : 'ready')) return s;
      return setArm(s, a.id, { st: 'open', mr: a.mr, url: a.url, revert: a.revert, simulated: a.simulated, found: null });
    }
    case 'verify-start':
      return s.arm[a.id]?.st === 'open' ? setArm(s, a.id, { st: 'probing' }) : s;
    case 'verify-end':
      return verifyEnd(s, a.id, a.verdict);
    case 'doctor-start':
      return s.doctorBusy ? s : { ...s, doctorBusy: true };
    case 'doctor-end': {
      const rows = s.group === s.homeGroup ? s.doctor : s.homeDoctor.map((r, i) => ({ name: r.name, st: toCapStatus(OTHER_GROUP.rows[i] ?? 'unknown') }));
      return { ...s, doctor: rows, doctorBusy: false, doctorAt: a.now, doctorProbedAt: a.at, doctorNever: false };
    }
    case 'pick-group':
      return pickGroup(s, a.group, a.now, a.at);
  }
}

