// Live mode: the screen's states from what the server read (src/server/data/setup). Pure. A read says done, failed or
// unknown for a step, and armed, absent, not defined or unknown for a track; nothing here falls back to a demo state.
import { NOT_PROBED, type DoctorRead, type StepRead, type TrackRead } from '@/server/data/setup/types';
import type { ArmState, DoctorRow, StepState } from '../types';

/** A step's state and last probe, from a read made at `label`. A step no read observes has no probe: "not probed". */
export function stepFromRead(r: StepRead, label: string): Pick<StepState, 'st' | 'probe'> {
  if (r.state === 'unknown') return { st: 'unknown', probe: r.reason === NOT_PROBED ? null : { at: label, ok: false, text: `unknown · ${r.reason}` } };
  return { st: r.state, probe: { at: label, ok: r.state === 'done', text: r.text } };
}

/** A track's state from the read of the target's default branch. Absent is locked until its needs are met (then ready). */
export function armFromRead(r: TrackRead): Pick<ArmState, 'st' | 'found'> {
  switch (r.state) {
    case 'armed':
      return { st: 'armed', found: r.text };
    case 'absent':
      return { st: 'locked', found: r.text };
    case 'undefined':
      return { st: 'undefined', found: r.text };
    case 'unknown':
      return { st: 'unknown', found: r.reason };
  }
}

/** The doctor's rows, each with its reason, under the probe's own labels. */
export const doctorRowsOf = (d: DoctorRead): DoctorRow[] => d.rows.map((c) => ({ name: c.label, st: c.status, reason: c.reason }));
