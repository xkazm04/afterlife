import type { ArmMeta } from './types';

export const ARM_META: Readonly<Record<string, ArmMeta>> = {
  T4: { title: 'Arm guardrail: block what it can quote', short: 'Guardrail', needs: [] },
  T3: { title: 'Arm governor: tripwire and tier-gate', short: 'Governor', needs: [] },
  T6: { title: 'Arm maturity: scanners and stage grid', short: 'Scanners', needs: [] },
  T1: { title: 'Arm patcher: exploit-test proof class', short: 'Patcher', needs: ['T4', 'T3', 'T6'] },
  T5: { title: 'Arm medic: rerun stats on the gitlab--duo runner', short: 'Medic', needs: ['step:6'] },
  T2: { title: 'Arm CRA autopilot: SBOM-linked drafts', short: 'CRA', needs: ['step:12'] },
  T7: { title: 'Arm exploratory QA: review-app environment', short: 'QA', needs: ['step:7'] },
  T8: { title: 'Arm gardener: patch-bump with bench delta', short: 'Gardener', needs: ['T4', 'T3'] },
};

/** How an unmet step need reads in "locked · needs ...". */
export const NEED_LABEL: Readonly<Record<string, string>> = {
  'step:6': 'a runner (step 6)',
  'step:12': 'the SBOM job (step 12)',
  'step:7': 'a review-app env (step 7)',
};

/** What each only-you gate frees, for the inspector's gate rows. */
export const GATE_FREES: Readonly<Record<number, string>> = {
  3: 'steps 4–14 · features read unknown until active',
  6: 'T5 Medic · every pipeline',
  7: 'T7 Exploratory QA',
  8: "belay-apply's sweep (its four write tokens)",
  10: 'agent config on main',
};
