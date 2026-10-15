// The shape of a track's arm content, and the helpers every track's include lines share. Pure.

/** The values that differ per install: the example's "Replace:" list. Belay reads them, never guesses them. */
export interface ArmPin {
  /** The belay-pack release the includes name ("1.0.0"). */
  packVersion: string;
  /** The Belay engine every job checks out. */
  engineRef: string;
  /** The commit engineRef must resolve to. Optional in the components: left out when not configured. */
  engineCommit?: string;
  /** Who may post the proof note tier-gate trusts (belay-apply's bot), comma-separated. Only T3 names it. */
  proofAuthors?: string;
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
  /** Why this pin cannot arm the track (a value it names is not configured), or null. */
  refuses?: (pin: ArmPin) => string | null;
  /** Said plainly in the preview, in this order. */
  notes: readonly string[];
}

/** Component name -> the stage it runs in. */
export type Placement = Readonly<Record<string, string>>;

export const preferred = (choices: TrackArm['stageChoices']): Placement => Object.fromEntries(Object.entries(choices).map(([c, s]) => [c, s[0] ?? '']));

/** GitLab's own first and last stages: every pipeline has them, declared or not (docs.gitlab.com/ci/yaml/#stage-pre). */
const ALWAYS = ['.pre', '.post'];

export type Placed = { ok: true; at: Placement } | { ok: false; missing: [component: string, choices: readonly string[]][] };

/** Each component's stage in a pipeline that declares `declared`, or the components with no stage they may run in. */
export function placeIn(a: TrackArm, declared: readonly string[]): Placed {
  const at: Record<string, string> = {};
  const missing: [string, readonly string[]][] = [];
  for (const [c, choices] of Object.entries(a.stageChoices)) {
    const s = choices.find((x) => declared.includes(x) || ALWAYS.includes(x));
    if (s) at[c] = s;
    else missing.push([c, choices]);
  }
  return missing.length ? { ok: false, missing } : { ok: true, at };
}

/** The engine pin every include carries: engine_ref, and engine_commit when it is configured. */
export const enginePin = (pin: ArmPin): [string, string][] => [['engine_ref', pin.engineRef], ...(pin.engineCommit ? [['engine_commit', pin.engineCommit] as [string, string]] : [])];

/** The proof class an include derives (proof-engine's `class` input), if it names one. */
export const classOf = (i: Include): string | undefined => {
  const v = i.inputs.find(([k]) => k === 'class')?.[1];
  return v === undefined ? undefined : String(v);
};

/** How an include reads in a refusal: `proof-engine (exploit-test)`, `tier-gate`. One proof-engine include per class. */
export const labelOf = (i: Include): string => (classOf(i) ? `${i.component} (${classOf(i)})` : i.component);

/** Said by every track: the target's jobs only report (F4, decided 2026-10-07, ask 6696d24d). */
export const NO_WRITE_TOKEN = 'No job of this project needs a write token, so none can read one (F4).';
