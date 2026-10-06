// What the poller reads and whom it believes. Env only; nothing secret.
export interface AuthorRule {
  /** An account whose username starts with one of these counts. */
  prefixes: readonly string[];
  /** Or is exactly one of these. */
  names: readonly string[];
}

export const allows = (r: AuthorRule, username: string): boolean => r.names.includes(username) || r.prefixes.some((p) => username.startsWith(p));

export interface PollerConfig {
  /** The group (id or path) whose projects are watched. */
  group: string | number;
  /** Project names that hold Belay's own files; they are never targets. */
  policyProject: string;
  ledgerProject: string;
  infra: readonly string[];
  policyRef: string;
  ledgerRef: string;
  /** MR descriptions by these accounts carry the Belay-Task trailer. */
  agents: AuthorRule;
  /** Notes by these accounts may carry a belay-proof block. The patcher itself is not one of them. */
  proof: AuthorRule;
  /** Notes by these accounts may carry a belay-guardrail block. */
  guardrail: AuthorRule;
  /** MRs updated within this window are read as tasks (their notes are fetched). */
  taskWindowMs: number;
  /** MRs updated within this window are counted into the 7-day proof roll-up. */
  rollupWindowMs: number;
  mrLimit: number;
}

const list = (v: string | undefined): string[] => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const HOUR = 3_600_000;

export function readPollerConfig(group: string | number, env: Record<string, string | undefined> = process.env): PollerConfig {
  const policyProject = env.BELAY_POLICY_PROJECT || 'belay-policy';
  const ledgerProject = env.BELAY_LEDGER_PROJECT || 'belay-ledger';
  const hours = Number(env.BELAY_TASK_HOURS);
  return {
    group, policyProject, ledgerProject, infra: [policyProject, ledgerProject, 'belay-pack', 'belay-engine'],
    policyRef: env.BELAY_POLICY_REF || 'main', ledgerRef: env.BELAY_LEDGER_REF || 'main',
    agents: { prefixes: [env.BELAY_AGENT_PREFIX || 'ai-'], names: [] },
    proof: { prefixes: ['ai-proof-'], names: list(env.BELAY_PROOF_AUTHORS) },
    guardrail: { prefixes: ['ai-guardrail-'], names: list(env.BELAY_GUARDRAIL_AUTHORS) },
    taskWindowMs: (Number.isFinite(hours) && hours > 0 ? hours : 24) * HOUR,
    rollupWindowMs: 7 * 24 * HOUR,
    mrLimit: 200,
  };
}
