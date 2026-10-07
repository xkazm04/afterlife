import type { DemoData } from '@/lib/demo/types';
import { NEED_LABEL, ARM_META } from '../../data/armMeta';
import { STEP_DETAIL } from '../../data/stepDetail';
import { isStepKey, stepOf } from '../map/graph';
import type { ArmState, ArmStatus, CapStatus, DoctorRow, SetupState, StepState, StepStatus } from '../types';

export type SetupDemo = DemoData['setup'];
export interface TrackLite {
  id: string;
  armedBy: string;
}

const toStepStatus = (s: string): StepStatus => (s === 'done' || s === 'human' ? s : 'todo');
const toArmStatus = (s: string): ArmStatus => (s === 'armed' || s === 'ready' ? s : 'locked');
export const toCapStatus = (s: string): CapStatus => (s === 'available' || s === 'unavailable' ? s : 'unknown');

const doctorRows = (rows: readonly (readonly [string, string])[]): DoctorRow[] => rows.map(([name, st]) => ({ name, st: toCapStatus(st) }));

/** The opening state: the demo's probed steps, arm order and doctor rows, probed at 14:02. */
export function createSetupState(setup: SetupDemo, tracks: readonly TrackLite[], now: number): SetupState {
  const steps: Record<number, StepState> = {};
  for (const ph of setup.phases) {
    for (const [n, title, raw] of ph.steps) {
      const d = STEP_DETAIL[n];
      const st = toStepStatus(raw);
      const probe = st === 'done' ? { at: '14:02', ok: true, text: d?.probe ?? '' } : d?.before ? { at: '14:02', ok: false, text: d.before } : null;
      steps[n] = { n, title, phase: ph.name, st, who: d?.who ?? 'agent', probe };
    }
  }
  const arm: Record<string, ArmState> = {};
  setup.arm.forEach(([id, raw], order) => {
    const st = toArmStatus(raw);
    arm[id] = { id, order, st, mr: st === 'armed' ? (tracks.find((t) => t.id === id)?.armedBy ?? null) : null, url: null, revert: false, simulated: false, found: null };
  });
  const home = doctorRows(setup.doctor.rows);
  return {
    group: setup.group, project: setup.project, homeGroup: setup.group, homeDoctor: home,
    steps, arm, armMrs: Object.fromEntries(tracks.map((t) => [t.id, t.armedBy])), attempts: {}, doctor: home, doctorAt: now, doctorProbedAt: '14:02', doctorNever: false, doctorBusy: false,
  };
}

export const stepList = (s: SetupState): StepState[] => Object.values(s.steps).sort((a, b) => a.n - b.n);
export const armList = (s: SetupState): ArmState[] => Object.values(s.arm).sort((a, b) => a.order - b.order);
export const capSt = (s: SetupState, name: string): CapStatus => s.doctor.find((r) => r.name === name)?.st ?? 'unknown';

export const doneCount = (s: SetupState) => stepList(s).filter((x) => x.st === 'done').length;
export const armedCount = (s: SetupState) => armList(s).filter((a) => a.st === 'armed').length;
/** Human steps not yet probed done: "only you can do these". */
export const humanGates = (s: SetupState) => stepList(s).filter((x) => x.who === 'human' && x.st !== 'done');
export const openArms = (s: SetupState) => armList(s).filter((a) => a.st === 'open');
export const needYouCount = (s: SetupState) => humanGates(s).length + openArms(s).length;

export function doctorCounts(s: SetupState): Record<CapStatus, number> {
  const c: Record<CapStatus, number> = { available: 0, unavailable: 0, unknown: 0 };
  for (const r of s.doctor) c[r.st]++;
  return c;
}

/** A need is met when its step probed done or its track is armed. */
export const needMet = (s: SetupState, k: string): boolean => (isStepKey(k) ? s.steps[stepOf(k)]?.st === 'done' : s.arm[k]?.st === 'armed');
export const unmet = (s: SetupState, id: string): string[] => (ARM_META[id]?.needs ?? []).filter((k) => !needMet(s, k));

/** "a runner (step 6)" or "T4 Guardrail". */
export const needLabel = (k: string): string => (isStepKey(k) ? (NEED_LABEL[k] ?? k) : `${k} ${ARM_META[k]?.short ?? ''}`.trim());

/** Locked tracks whose needs are all met become ready. */
export function recomputeLocks(s: SetupState): SetupState {
  let arm = s.arm;
  for (const a of armList(s)) {
    if (a.st === 'locked' && unmet(s, a.id).length === 0) arm = { ...arm, [a.id]: { ...a, st: 'ready' } };
  }
  return arm === s.arm ? s : { ...s, arm };
}
