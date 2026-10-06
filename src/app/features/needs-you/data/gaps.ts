import type { ClickCopy } from './types';

/** n3, "pick the gaps to close": the per-gap voice, branch and MR number. Gaps are things to explore, not directives. */
export const GAP_DETAIL: ClickCopy & {
  openedAt: string;
  voice: Record<string, string>;
  branch: Record<string, string | null>;
  mrNo: Record<string, string>;
} = {
  openedAt: '14:02',
  voice: {
    g1: 'Secure is enforced today. If you want it to prove itself, every finding could be re-derived against what you actually shipped.',
    g2: 'Agents already open MRs here. You could ask the guardrail to read each one before a person does.',
    g3: 'Releases already carry an SBOM. A VEX statement would say which findings do not affect you, and why.',
    g4: 'Monitor was unknown on day 0. A probe could find out what the alert integration really does before anything is proposed.',
  },
  branch: { g1: 'belay/gap-secure-r4', g2: 'belay/gap-create-r3', g3: 'belay/gap-release-r3', g4: null },
  mrNo: { g1: '!45', g2: '!46', g3: '!47', g4: '#132' },
  does: ['Opens one draft MR per picked gap, as you (a probe opens an issue)', 'Each MR waits for your review: ci-config.change is Assisted'],
  doesNot: ['merge anything', 'open anything for a gap you leave unticked', 'move a rung before the next scan proves it'],
};
