// What Setup reads from GitLab and the index in live mode, as the screen receives it. Plain data, client-safe: the
// screen imports these types, never the reads. Each part says what its read saw, or why it saw nothing; none of it is
// the demo's catalogue.

/** A track's arm state on the target's default branch (src/server/actions/arm/read.ts). */
export type TrackRead =
  | { state: 'armed'; text: string }
  /** The block is not there (or was edited): the track can be armed. */
  | { state: 'absent'; text: string }
  /** The repo defines no arm content for this track yet: neither armed nor unarmed. */
  | { state: 'undefined'; text: string }
  /** The read was refused or failed. */
  | { state: 'unknown'; reason: string };

/** The reason of a step no read observes. */
export const NOT_PROBED = 'not probed';

/** A step as a read saw it: done, not done (`failed`), or not probed / not readable (`unknown`). */
export type StepRead = { state: 'done' | 'failed'; text: string } | { state: 'unknown'; reason: string };

export type CapState = 'available' | 'unavailable' | 'unknown';

/** One belay doctor row (src/server/gitlab/capabilities.ts), with its reason. */
export interface CapRead {
  id: string;
  label: string;
  status: CapState;
  reason: string;
}

/** When a read ran: the instant (ISO) and the server's local clock label ("14:02"). */
export interface ReadStamp {
  at: string;
  label: string;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** A stamp for a read made at `d`, on this machine's clock. */
export const stampOf = (d: Date): ReadStamp => ({ at: d.toISOString(), label: `${pad2(d.getHours())}:${pad2(d.getMinutes())}` });

export interface DoctorRead extends ReadStamp {
  rows: CapRead[];
  /** Why there are no rows, when the probe itself failed. */
  error: string | null;
}

export interface StepsRead extends ReadStamp {
  steps: Record<number, StepRead>;
}

export interface LiveSetupRead {
  /** The paired group (the pairing row's path), its host, and the target project (BELAY_PROJECT). */
  group: string;
  host: string;
  project: string;
  /** The projects step 4 creates: the target and the five belay projects. */
  projects: readonly string[];
  tracks: Record<string, TrackRead>;
  /** When the tracks were read. */
  tracksAt: ReadStamp;
  doctor: DoctorRead;
  steps: StepsRead;
}

/** What Setup marks "demo" in live mode: the parts it still draws from the demo catalogue. */
export interface SetupIllustrative {
  /** Step titles and phases (setup.phases). */
  steps: boolean;
  /** Track names, verbs and arm order (tracks, setup.arm). */
  tracks: boolean;
}

/** A re-read asked from the screen (Re-probe, a step's verify). */
export type SetupReread =
  | { status: 'doctor'; doctor: DoctorRead }
  | { status: 'steps'; steps: StepsRead }
  | { status: 'refused'; reason: string };
