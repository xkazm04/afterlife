// How Setup's state arrives on the screen host (screen/slices.ts): the catalogue first (sync), then each live read on
// its own (the tracks' arm blocks, the doctor, the steps), in whatever order they resolve. Pure. The catalogue
// alone makes the state: the demo's whole opening state, or live's frame state with every read part marked unread (a dash
// on screen, never a state). Each read then lands through the flow's own actions (tracks-read, doctor-read, steps-read);
// a read that failed lands as what it is: unknown for every track or step, or a doctor probe that failed, with why.
import type { ActionClass, Track } from '@/lib/demo/types';
import type { Tier } from '@/schemas/tier';
import { stampOf, type DoctorRead, type ReadStamp, type SetupIllustrative, type StepRead, type StepsRead, type TrackRead } from '@/server/data/setup/types';
import { STEP_DETAIL } from '../../data/stepDetail';
import { LIVE_CAP_LABELS } from '../../data/live/liveCapabilities';
import { setupReducer, type SetupAction } from '../flow/reducer';
import { createSetupState, type SetupDemo } from '../flow/state';
import type { ArmState, DoctorRow, SetupState, StepState, UnreadPart } from '../types';

/** What the screen host's catalogue slice carries: everything the server has without a network read. */
export interface SetupCatalogue {
  setup: SetupDemo;
  tracks: Track[];
  classes: ActionClass[];
  illustrative: SetupIllustrative;
  /** trust-policy.yml's start_tier; absent when it was not read. */
  startTier?: Tier;
  /** The data source's mode: which capability names a /setup/<node> may name (nodeKey.ts). */
  mode: 'demo' | 'live';
  /** Live: who the reads are for (the pairing row, the target). Absent: the demo's catalogue is the whole state. */
  live?: { group: string; host: string; project: string; projects: string[] };
}

/** The project the arm and enroll writes name: the live target, or the demo's. */
export const projectOf = (c: SetupCatalogue): string => c.live?.project ?? c.setup.project;

/** Live, before any read: the catalogue's steps and tracks with no state yet, the doctor's own labels with no status. */
function liveFrame(setup: SetupDemo, live: NonNullable<SetupCatalogue['live']>, now: number): SetupState {
  const steps: Record<number, StepState> = {};
  for (const ph of setup.phases) {
    for (const [n, title] of ph.steps) steps[n] = { n, title, phase: ph.name, who: STEP_DETAIL[n]?.who ?? 'agent', st: 'unknown', probe: null };
  }
  const arm: Record<string, ArmState> = {};
  setup.arm.forEach(([id], order) => {
    arm[id] = { id, order, st: 'unknown', mr: null, url: null, revert: false, simulated: false, found: null };
  });
  const doctor: DoctorRow[] = LIVE_CAP_LABELS.map((name) => ({ name, st: 'unknown' }));
  return {
    live: true, host: live.host, projects: live.projects, group: live.group, project: live.project, homeGroup: live.group, homeDoctor: doctor,
    steps, arm, attempts: {}, doctor, doctorAt: now, doctorProbedAt: '', doctorNever: false, doctorBusy: false, doctorError: null,
    unread: { tracks: true, doctor: true, steps: true },
  };
}

/** The state the catalogue alone gives: demo, the whole opening state (as createSetupState); live, the frame state. */
export const catalogueState = (c: SetupCatalogue, now: number): SetupState => (c.live ? liveFrame(c.setup, c.live, now) : createSetupState(c.setup, now));

/** What arrives that the flow's own actions do not cover: the catalogue, and a live read that failed as a whole. */
export type ArriveAction =
  | { t: 'catalogue-read'; cat: SetupCatalogue; now: number }
  | { t: 'part-failed'; part: UnreadPart; reason: string; at: ReadStamp };

/** A failed read as what the flow's read actions would have said: every track or step unknown, a doctor probe failed. */
function failed(s: SetupState, part: UnreadPart, reason: string, at: ReadStamp): SetupAction {
  const why = `the read failed: ${reason}`;
  if (part === 'tracks') return { t: 'tracks-read', tracks: Object.fromEntries(Object.keys(s.arm).map((id): [string, TrackRead] => [id, { state: 'unknown', reason: why }])) };
  if (part === 'steps') return { t: 'steps-read', steps: { ...at, steps: Object.fromEntries(Object.keys(s.steps).map((n): [string, StepRead] => [n, { state: 'unknown', reason: why }])) } };
  return { t: 'doctor-read', doctor: { ...at, rows: [], error: `afterlife doctor could not be read: ${reason}` } };
}

const LIVE_READS: ReadonlySet<string> = new Set(['tracks-read', 'doctor-read', 'steps-read', 'part-failed']);

/**
 * The Setup session's reducer: null until the catalogue lands; a second catalogue (a re-read) keeps the state as it is
 * (probes, arms in flight, the group picked). A live read is the flow's own action; the demo has none to apply.
 */
export function flowReducer(s: SetupState | null, a: SetupAction | ArriveAction): SetupState | null {
  if (a.t === 'catalogue-read') return s ?? catalogueState(a.cat, a.now);
  if (!s) return s;
  if (LIVE_READS.has(a.t) && !s.live) return s;
  if (a.t === 'part-failed') return setupReducer(s, failed(s, a.part, a.reason, a.at));
  return setupReducer(s, a);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** A slice as the stream left it: read (ok, with its data) or failed (with the reason); unread is no arrival. */
export type Landed = { state: 'ok'; data: unknown } | { state: 'error'; reason: string };

/**
 * What one slice's arrival does to the flow: the catalogue makes the state, a live read lands through its own action,
 * a failed read lands as failed. Null for nothing to do: a failed catalogue (the screen says why), or a read slice
 * holding no read (the demo answers an empty object).
 */
export function arrivalOf(part: 'catalogue' | UnreadPart, s: Landed, now: Date): SetupAction | ArriveAction | null {
  if (part === 'catalogue') return s.state === 'ok' ? { t: 'catalogue-read', cat: s.data as SetupCatalogue, now: now.getTime() } : null;
  if (s.state === 'error') return { t: 'part-failed', part, reason: s.reason, at: stampOf(now) };
  const d = s.data;
  if (!isObj(d)) return null;
  if (part === 'tracks') return isObj(d.tracks) ? { t: 'tracks-read', tracks: d.tracks as Record<string, TrackRead> } : null;
  if (part === 'doctor') return Array.isArray(d.rows) ? { t: 'doctor-read', doctor: d as unknown as DoctorRead } : null;
  return isObj(d.steps) ? { t: 'steps-read', steps: d as unknown as StepsRead } : null;
}
