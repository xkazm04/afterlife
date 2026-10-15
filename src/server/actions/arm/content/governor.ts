// T3, the governor: the tier-gate component, report-only (apply-gate --dry). It says in the MR's pipeline what
// belay-apply's gate will decide, from belay-apply's proof note. The real gate runs in belay-apply, which applies it, and
// the tripwire runs there too: neither needs anything more in the target (F4, decided 2026-10-07, ask 6696d24d).
import { enginePin, NO_WRITE_TOKEN, type TrackArm } from './shape';

// The example gives tier-gate no stage: the component's default, .post, which every pipeline has. It waits up to ten
// minutes for the guardrail's verdict, so it runs after every other job.
const T3_STAGES = { 'tier-gate': ['.post'] } as const;

export const T3: TrackArm = {
  track: 'T3',
  key: 'governor',
  title: 'Arm T3 governor: report what the tier-gate will decide',
  stages: ['.post'],
  stageChoices: T3_STAGES,
  includes: (pin) => [
    { component: 'tier-gate', inputs: [...enginePin(pin), ['proof_authors', pin.proofAuthors ?? '']] },
  ],
  refuses: (pin) =>
    pin.proofAuthors
      ? null
      : "set BELAY_PROOF_AUTHORS in Belay's environment (belay-apply's bot account, its \"bot\" in apply.json): T3's tier-gate trusts only the proof notes those accounts post, and Belay will not guess them",
  notes: [
    "This include only reports what the gate will decide. The gate that counts runs in belay-apply, which applies it with BELAY_BOT_TOKEN set there as a protected CI variable, never on this project; the tripwire runs there too.",
    NO_WRITE_TOKEN,
    'proof_authors is BELAY_PROOF_AUTHORS: the gate reads the proof note only from those accounts, and ignores one by anyone else.',
    'tier-gate reads belay-engine and belay-policy with the job token: both must allow this project (step 9).',
    "It runs in .post and waits up to 10 minutes for the guardrail's verdict; after that the MR waits for a person.",
  ],
};
