// What arming a track adds to the target's .gitlab-ci.yml: the include lines, with their inputs, of the components the
// track needs, exactly as gitlab/examples/target-project/.gitlab-ci.yml writes them (the test holds the two together and
// checks every input against gitlab/components/templates). A track the repo does not define yet has no entry, and its
// arm is refused: Afterlife never invents the content of an MR. One file per track; every include only reports (F4).
import { T3 } from './governor';
import { T4 } from './guardrail';
import { T6 } from './maturity';
import { T1 } from './patcher';
import type { TrackArm } from './shape';

export { classOf, labelOf, placeIn, type ArmPin, type Include, type Placed, type Placement, type TrackArm } from './shape';

const ARMS: Readonly<Record<string, TrackArm>> = { T4, T3, T6, T1 };

/** The track's arm content, or null when the repo does not define it yet. */
export const armOf = (track: string): TrackArm | null => ARMS[track] ?? null;

export const NOT_DEFINED = (track: string): string =>
  `the repo does not define ${track}'s arm content yet (only ${Object.keys(ARMS).join(', ')} are): Afterlife will not invent an MR for it`;
