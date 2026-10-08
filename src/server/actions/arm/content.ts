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
  /** Stages the includes run in where the pipeline declares them all (the example's placement). */
  stages: readonly string[];
  /** Per component, the stages it may run in, in order of preference: it takes the first one the pipeline declares. */
  stageChoices: Readonly<Record<string, readonly string[]>>;
  /** The include lines; `at` is each component's stage (placeIn), the example's placement when left out. */
  includes: (pin: ArmPin, at?: Placement) => Include[];
  /** Said plainly in the preview, in this order. */
  notes: readonly string[];
}

/** Component name -> the stage it runs in. */
export type Placement = Readonly<Record<string, string>>;

const preferred = (choices: TrackArm['stageChoices']): Placement => Object.fromEntries(Object.entries(choices).map(([c, s]) => [c, s[0] ?? '']));

export type Placed = { ok: true; at: Placement } | { ok: false; missing: [component: string, choices: readonly string[]][] };

/** Each component's stage in a pipeline that declares `declared`, or the components with no stage they may run in. */
export function placeIn(a: TrackArm, declared: readonly string[]): Placed {
  const at: Record<string, string> = {};
  const missing: [string, readonly string[]][] = [];
  for (const [c, choices] of Object.entries(a.stageChoices)) {
    const s = choices.find((x) => declared.includes(x));
    if (s) at[c] = s;
    else missing.push([c, choices]);
  }
  return missing.length ? { ok: false, missing } : { ok: true, at };
}

const commit = (pin: ArmPin): [string, string][] => (pin.engineCommit ? [['engine_commit', pin.engineCommit]] : []);

// cited-diff reads only the MR's notes and diff, never an earlier stage's artifacts, so it runs in test as well as in
// review: a target that declares no review stage (GitLab's defaults have none) is not refused for that.
// T4 adds no flow-dispatch include: starting the guardrail needs a write token, so belay-apply starts it (F4, decided
// 2026-10-07, ask 6696d24d). The target's include only reports; belay-apply re-derives the proof and writes.
const T4_STAGES = { 'proof-engine': ['review', 'test'] } as const;

const T4: TrackArm = {
  track: 'T4',
  key: 'guardrail',
  title: 'Arm T4 guardrail: block what it can quote',
  stages: ['review'],
  stageChoices: T4_STAGES,
  includes: (pin, at = preferred(T4_STAGES)) => [
    { component: 'proof-engine', inputs: [['class', 'cited-diff'], ['engine_ref', pin.engineRef], ...commit(pin), ['stage', at['proof-engine'] ?? 'review']] },
  ],
  notes: [
    "The track's writes (the proof note, the labels, the approve or merge) are made by belay-apply, with BELAY_BOT_TOKEN set there as a protected CI variable, never on this project.",
    'No job of this project needs a write token, so none can read one (F4).',
    'Afterlife never sets it.',
    'Without it, belay-apply only reports and fails closed; this include only ever reports.',
    "belay-apply starts the guardrail: put this project's guardrail consumer id in its apply.json.",
  ],
};

const ARMS: Readonly<Record<string, TrackArm>> = { T4 };

/** The track's arm content, or null when the repo does not define it yet. */
export const armOf = (track: string): TrackArm | null => ARMS[track] ?? null;

export const NOT_DEFINED = (track: string): string =>
  `the repo does not define ${track}'s arm content yet (only ${Object.keys(ARMS).join(', ')} is): Belay will not invent an MR for it`;
