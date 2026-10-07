import type { StepWho } from '../data/types';

export type { StepWho };
export type StepStatus = 'todo' | 'human' | 'done' | 'probing';
export type ArmStatus = 'locked' | 'ready' | 'open' | 'armed' | 'probing';
export type CapStatus = 'available' | 'unavailable' | 'unknown';

export interface ProbeNote {
  /** Clock label, "14:02". */
  at: string;
  ok: boolean;
  text: string;
}

export interface StepState {
  n: number;
  title: string;
  phase: string;
  st: StepStatus;
  who: StepWho;
  probe: ProbeNote | null;
}

export interface ArmState {
  id: string;
  /** Position in the arm order, 0-based. */
  order: number;
  st: ArmStatus;
  /** The MR that armed it, or the one open now, as GitLab named it in the confirm's answer. Null when nobody named one. */
  mr: string | null;
  /** That MR's web address, from the same answer. */
  url: string | null;
  /** The open MR is a revert (a disarm in flight). */
  revert: boolean;
  /** Demo mode: the MR was only simulated, and so is its verify. */
  simulated: boolean;
  /** What the last verify saw on the default branch, when it did not settle the track. */
  found: string | null;
}

export interface DoctorRow {
  name: string;
  st: CapStatus;
}

export interface SetupState {
  group: string;
  project: string;
  /** The group the screen opened on: switching back restores its probed rows. */
  homeGroup: string;
  homeDoctor: readonly DoctorRow[];
  steps: Readonly<Record<number, StepState>>;
  arm: Readonly<Record<string, ArmState>>;
  /** The MR each track is armed by, from the demo (what Arm opens). */
  armMrs: Readonly<Record<string, string>>;
  /** Probe attempts per step: the demo's first runner probe fails. */
  attempts: Readonly<Record<number, number>>;
  doctor: readonly DoctorRow[];
  /** ms timestamp of the last doctor probe. */
  doctorAt: number;
  doctorProbedAt: string;
  doctorNever: boolean;
  doctorBusy: boolean;
}

/** What the map is lit around: a hover, a pick, or null. */
export type Focus = { k: 'step'; id: number } | { k: 'track'; id: string } | { k: 'cap'; id: string };

export const focusEq = (a: Focus | null, b: Focus | null): boolean => !!a && !!b && a.k === b.k && a.id === b.id;
