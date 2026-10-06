// Shared constants of the demo GitLab: a fake group built from the demo dataset (src/lib/demo), so live mode can be
// shown without a real group. Nothing here is recorded from a live GitLab; every shape is [R] from the docs.
export const GROUP_ID = 144060371;
export const GROUP_PATH = 'acme-lab';
export const LEDGERLINE_GID = 90010001;
export const POLICY_GID = 90010002;
export const LEDGER_GID = 90010003;

/** Account names the demo dataset uses; they follow the component defaults (ai-<role>-<group>). */
export const ACCOUNT = {
  patcher: `ai-patcher-${GROUP_PATH}`,
  gardener: `ai-gardener-${GROUP_PATH}`,
  proof: `ai-proof-${GROUP_PATH}`,
  guardrail: `ai-guardrail-${GROUP_PATH}`,
} as const;

/** The head SHAs of the two MRs the demo tells a story about (40 hex characters). */
export const SHA = {
  mr41: 'a41c0ffee00000000000000000000000000000a1',
  mr44: 'a44c0ffee00000000000000000000000000000a4',
} as const;

export const iso = (anchor: Date, offsetMs: number): string => new Date(anchor.getTime() + offsetMs).toISOString();
export const MIN = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
