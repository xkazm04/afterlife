// T4, the guardrail: proof-engine cited-diff, report-only.
import { enginePin, NO_WRITE_TOKEN, preferred, type TrackArm } from './shape';

// cited-diff reads only the MR's notes and diff, never an earlier stage's artifacts, so it runs in test as well as in
// review: a target that declares no review stage (GitLab's defaults have none) is not refused for that.
// T4 adds no flow-dispatch include: starting the guardrail needs a write token, so belay-apply starts it (F4, decided
// 2026-10-07, ask 6696d24d). The target's include only reports; belay-apply re-derives the proof and writes.
const T4_STAGES = { 'proof-engine': ['review', 'test'] } as const;

export const T4: TrackArm = {
  track: 'T4',
  key: 'guardrail',
  title: 'Arm T4 guardrail: block what it can quote',
  stages: ['review'],
  stageChoices: T4_STAGES,
  includes: (pin, at = preferred(T4_STAGES)) => [
    { component: 'proof-engine', inputs: [['class', 'cited-diff'], ...enginePin(pin), ['stage', at['proof-engine'] ?? 'review']] },
  ],
  notes: [
    "The track's writes (the proof note, the labels, the approve or merge) are made by belay-apply, with AFTERLIFE_BOT_TOKEN set there as a protected CI variable, never on this project.",
    NO_WRITE_TOKEN,
    'Afterlife never sets it.',
    'Without it, belay-apply only reports and fails closed; this include only ever reports.',
    "belay-apply starts the guardrail: put this project's guardrail consumer id in its apply.json.",
  ],
};
