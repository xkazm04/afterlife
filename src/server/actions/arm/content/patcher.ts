// T1, the patcher: proof-engine exploit-test, report-only. Patcher MRs carry a belay-claims block; the project's own
// belay-replay jobs run the claimed test at the MR's base and head and keep the evidence this include reads. belay-apply
// re-derives the proof from the same evidence and posts it (F4, decided 2026-10-07, ask 6696d24d).
import { enginePin, NO_WRITE_TOKEN, preferred, type TrackArm } from './shape';

/** The example's build_args: the JUnit and rescan files belay-replay keeps under evidence/. */
export const EXPLOIT_TEST_ARGS = [
  '--base-junit evidence/base/junit.xml --head-junit evidence/head/junit.xml',
  '--base-ref $CI_PIPELINE_URL --head-ref $CI_PIPELINE_URL',
  '--rescan-base evidence/base/scan.json --rescan-head evidence/head/scan.json',
].join(' ');

// exploit-test reads belay-replay's artifacts, passed on by stage order, so it runs after test: in review, as the example
// places it. Unlike cited-diff it cannot fall back to test.
const T1_STAGES = { 'proof-engine': ['review'] } as const;

export const T1: TrackArm = {
  track: 'T1',
  key: 'patcher',
  title: 'Arm T1 patcher: prove the exploit before the fix',
  stages: ['review'],
  stageChoices: T1_STAGES,
  includes: (pin, at = preferred(T1_STAGES)) => [
    { component: 'proof-engine', inputs: [['class', 'exploit-test'], ...enginePin(pin), ['stage', at['proof-engine'] ?? 'review'], ['build_args', EXPLOIT_TEST_ARGS]] },
  ],
  notes: [
    "This include only reports the proof. belay-apply re-derives it from the same evidence and posts it, with BELAY_BOT_TOKEN set there as a protected CI variable, never on this project.",
    NO_WRITE_TOKEN,
    "It reads evidence/ from the project's own belay-replay jobs (the example's belay-replay-vars and belay-replay, with your build image): add them yourself. Belay does not write a project's build jobs.",
    "belay-replay runs only the test id and path from the MR's belay-claims block, after a strict pattern check, never the agent's own command.",
  ],
};
