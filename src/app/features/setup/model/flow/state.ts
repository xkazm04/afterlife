import type { DemoData } from '@/lib/demo/types';
import type { LiveSetupRead } from '@/server/data/setup/types';
import { NEED_LABEL, ARM_META } from '../../data/armMeta';
import { DEMO_NAMES, STEP_DETAIL, stepDetailsFor, type StepNames } from '../../data/stepDetail';
import type { StepDetail } from '../../data/types';
import { armFromRead, doctorRowsOf, stepFromRead } from '../live/live';
import { isStepKey, stepOf } from '../map/graph';
import type { ArmState, ArmStatus, CapStatus, DoctorRow, SetupState, StepState, StepStatus } from '../types';

export type SetupDemo = DemoData['setup'];

const toStepStatus = (s: string): StepStatus => (s === 'done' || s === 'human' ? s : 'todo');
const toArmStatus = (s: string): ArmStatus => (s === 'armed' || s === 'ready' ? s : 'locked');
export const toCapStatus = (s: string): CapStatus => (s === 'available' || s === 'unavailable' ? s : 'unknown');

const doctorRows = (rows: readonly (readonly [string, string])[]): DoctorRow[] => rows.map(([name, st]) => ({ name, st: toCapStatus(st) }));

/**
 * The opening state. Demo: the demo's probed steps, arm order and doctor rows, probed at 14:02; a track's armed state
 * and its MR come from one record, `setup.arm`, which names no MR, so none is shown until a confirm's answer names one.
 * Live (`live`): the step titles and the arm order are the catalogue's, and every state is what the server read.
 */
export function createSetupState(setup: SetupDemo, now: number, live: LiveSetupRead | null = null): SetupState {
  if (live) return liveSetupState(setup, live);
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
    arm[id] = { id, order, st: toArmStatus(raw), mr: null, url: null, revert: false, simulated: false, found: null };
  });
  const home = doctorRows(setup.doctor.rows);
  return {
    live: false, host: DEMO_NAMES.host, projects: DEMO_NAMES.projects,
    group: setup.group, project: setup.project, homeGroup: setup.group, homeDoctor: home,
    steps, arm, attempts: {}, doctor: home, doctorAt: now, doctorProbedAt: '14:02', doctorNever: false, doctorBusy: false, doctorError: null,
  };
}

function liveSetupState(setup: SetupDemo, live: LiveSetupRead): SetupState {
  const steps: Record<number, StepState> = {};
  for (const ph of setup.phases) {
    for (const [n, title] of ph.steps) {
      const r = live.steps.steps[n];
      const read = r ? stepFromRead(r, live.steps.label) : { st: 'unknown' as const, probe: null };
      steps[n] = { n, title, phase: ph.name, who: STEP_DETAIL[n]?.who ?? 'agent', ...read };
    }
  }
  const arm: Record<string, ArmState> = {};
  setup.arm.forEach(([id], order) => {
    const r = live.tracks[id];
    const read = r ? armFromRead(r) : { st: 'unknown' as const, found: 'no read was made for this track' };
    arm[id] = { id, order, mr: null, url: null, revert: false, simulated: false, ...read };
  });
  const doctor = doctorRowsOf(live.doctor);
  return recomputeLocks({
    live: true, host: live.host, projects: live.projects,
    group: live.group, project: live.project, homeGroup: live.group, homeDoctor: doctor,
    steps, arm, attempts: {}, doctor, doctorAt: Date.parse(live.doctor.at), doctorProbedAt: live.doctor.label, doctorNever: false, doctorBusy: false,
    doctorError: live.doctor.error,
  });
}

/** What the step commands name: the group the screen opened on (live: the paired one), its host and the target. */
export const namesOf = (s: SetupState): StepNames => ({ host: s.host, group: s.homeGroup, project: s.project, projects: s.projects });
/** A step's detail, its commands naming this setup's group and project. */
export const stepDetail = (s: SetupState, n: number): StepDetail | undefined => stepDetailsFor(namesOf(s))[n];

export const stepList = (s: SetupState): StepState[] => Object.values(s.steps).sort((a, b) => a.n - b.n);
export const armList = (s: SetupState): ArmState[] => Object.values(s.arm).sort((a, b) => a.order - b.order);
export const capSt = (s: SetupState, name: string): CapStatus => s.doctor.find((r) => r.name === name)?.st ?? 'unknown';

export const doneCount = (s: SetupState) => stepList(s).filter((x) => x.st === 'done').length;
export const armedCount = (s: SetupState) => armList(s).filter((a) => a.st === 'armed').length;
/** A human step not read done: only a person can do it, so it is a gate even unread (it stays unknown, never done). */
export const isHumanGate = (x: StepState): boolean => x.who === 'human' && x.st !== 'done';
/** "Only you can do these": every human step a read has not seen done, the unread ones included. */
export const humanGates = (s: SetupState) => stepList(s).filter(isHumanGate);
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
