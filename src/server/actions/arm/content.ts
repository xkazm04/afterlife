// What arming a track adds to the target's .gitlab-ci.yml: the include lines, with their inputs, of the components the
// track needs, exactly as gitlab/examples/target-project/.gitlab-ci.yml writes them (the test holds the two together and
// checks every input against gitlab/components/templates). A track the repo does not define yet has no entry, and its
// arm is refused: Belay never invents the content of an MR.

/** The values that differ per install: the example's "Replace:" list. Belay reads them, never guesses them. */
export interface ArmPin {
  /** The belay-pack release the includes name ("1.0.0"). */
  packVersion: string;
  /** The Belay engine every job checks out. */
  engineRef: string;
  /** The commit engineRef must resolve to. Optional in the components: left out when not configured. */
  engineCommit?: string;
  /** The flow consumer ids, by flow ("guardrail": 4711). */
  consumers: Readonly<Record<string, number>>;
}

export interface Include {
  /** The component's name in belay-pack (templates/<name>/template.yml). */
  component: string;
  inputs: readonly (readonly [string, string | number])[];
}

export interface TrackArm {
  track: string;
  /** The track's name in branches and markers ("guardrail"). */
  key: string;
  title: string;
  /** Stages the includes run in: the pipeline must declare them. */
  stages: readonly string[];
  /** The flow whose consumer id the includes need, if any. */
  flow?: string;
  includes: (pin: ArmPin) => Include[];
  /** Said plainly in the preview, in this order. */
  notes: readonly string[];
}

const commit = (pin: ArmPin): [string, string][] => (pin.engineCommit ? [['engine_commit', pin.engineCommit]] : []);

const T4: TrackArm = {
  track: 'T4',
  key: 'guardrail',
  title: 'Arm T4 guardrail: block what it can quote',
  stages: ['build', 'review'],
  flow: 'guardrail',
  includes: (pin) => [
    { component: 'proof-engine', inputs: [['class', 'cited-diff'], ['engine_ref', pin.engineRef], ...commit(pin), ['stage', 'review']] },
    { component: 'flow-dispatch', inputs: [['engine_ref', pin.engineRef], ['consumer_id', pin.consumers.guardrail ?? 0], ['stage', 'build']] },
  ],
  notes: [
    "The track's jobs label MRs with BELAY_BOT_TOKEN, which you set yourself as a protected CI variable.",
    'Every job in an agent MR pipeline can read that variable (F4, accepted for M1 only).',
    'Afterlife never sets it.',
    'Without it, the jobs report and fail closed.',
  ],
};

const ARMS: Readonly<Record<string, TrackArm>> = { T4 };

/** The track's arm content, or null when the repo does not define it yet. */
export const armOf = (track: string): TrackArm | null => ARMS[track] ?? null;

export const NOT_DEFINED = (track: string): string =>
  `the repo does not define ${track}'s arm content yet (only ${Object.keys(ARMS).join(', ')} is): Belay will not invent an MR for it`;
