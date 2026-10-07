import type { StepWho } from '../data/types';

export type { StepWho };
/**
 * A step: `todo`, `human` (only a person can) and `done` are the demo's; a live read says `done`, `failed` (it looked
 * and the step is not done) or `unknown` (not probed, or the read could not be made). `probing` is a probe in flight.
 */
export type StepStatus = 'todo' | 'human' | 'done' | 'probing' | 'failed' | 'unknown';
/**
 * A track: `undefined` when the repo defines no arm content for it yet (neither armed nor unarmed), `unknown` when the
 * read of the default branch was refused or failed. Both carry their reason in `found`.
 */
export type ArmStatus = 'locked' | 'ready' | 'open' | 'armed' | 'probing' | 'undefined' | 'unknown';
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
  /** What the last read of the default branch saw (the opening read, or a verify that did not settle the track). */
  found: string | null;
}

export interface DoctorRow {
  name: string;
  st: CapStatus;
  /** Why the probe said so (live: the doctor's own reason). */
  reason?: string;
}

export interface SetupState {
  /** Live mode: every state on screen is a read; nothing is simulated, and no timer probes. */
  live: boolean;
  /** The GitLab host and the projects step 4 creates, for the step commands. */
  host: string;
  projects: readonly string[];
  group: string;
  project: string;
  /** The group the screen opened on: switching back restores its probed rows. */
  homeGroup: string;
  homeDoctor: readonly DoctorRow[];
  steps: Readonly<Record<number, StepState>>;
  arm: Readonly<Record<string, ArmState>>;
  /** The doctor probe failed as a whole (live): why there are no rows. */
  doctorError: string | null;
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
