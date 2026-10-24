// What the poller reads and whom it believes. Env only; nothing secret.
import { readDataConfig } from '@/server/data/config';

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
const NAME = /^[A-Za-z0-9_.-]+$/;
const GROUP = /^(\d+|[A-Za-z0-9_.-]+(\/[A-Za-z0-9_.-]+)*)$/;

/**
 * Live mode on a real group (BELAY_MODE=live, BELAY_GITLAB not fake) has no defaults to fall back on: the default group is
 * not the operator's, and with no BELAY_PROOF_AUTHORS no hand-posted proof note (M1) is ever believed. What is missing or
 * malformed, each by its variable's name; [] when nothing is, or in any other mode.
 */
export function liveConfigProblems(env: Record<string, string | undefined>): string[] {
  const data = readDataConfig(env);
  if (data.mode !== 'live' || data.gitlab === 'fake') return [];
  const problems: string[] = [];
  const group = env.BELAY_GROUP_ID?.trim();
  if (!group) problems.push('BELAY_GROUP_ID is not set (the group to watch; there is no default in live mode)');
  else if (!GROUP.test(group)) problems.push(`BELAY_GROUP_ID is not a group id or path: ${JSON.stringify(group)}`);
  const project = env.BELAY_PROJECT?.trim();
  if (!project) problems.push('BELAY_PROJECT is not set (the target project\'s path, its last segment)');
  else if (!NAME.test(project)) problems.push(`BELAY_PROJECT is not a project path (its last segment, no group): ${JSON.stringify(project)}`);
  const authors = list(env.BELAY_PROOF_AUTHORS);
  if (!authors.length) problems.push('BELAY_PROOF_AUTHORS is not set (the usernames whose belay-proof notes count, the operator\'s in M1)');
  else if (!authors.every((a) => NAME.test(a))) problems.push(`BELAY_PROOF_AUTHORS is not a comma-separated list of usernames: ${JSON.stringify(env.BELAY_PROOF_AUTHORS)}`);
  // optional; when set, read by the same rule (a name with a space or an @ is nobody's username, so it would believe no one)
  if (!list(env.BELAY_GUARDRAIL_AUTHORS).every((a) => NAME.test(a))) problems.push(`BELAY_GUARDRAIL_AUTHORS is not a comma-separated list of usernames: ${JSON.stringify(env.BELAY_GUARDRAIL_AUTHORS)}`);
  // optional too: a prefix with a space admits no agent, a name with a slash is never <group>/<name>
  const prefix = env.BELAY_AGENT_PREFIX?.trim();
  if (prefix && !NAME.test(prefix)) problems.push(`BELAY_AGENT_PREFIX is not a username prefix: ${JSON.stringify(env.BELAY_AGENT_PREFIX)}`);
  for (const name of ['BELAY_POLICY_PROJECT', 'BELAY_LEDGER_PROJECT'] as const) {
    const v = env[name]?.trim();
    if (v && !NAME.test(v)) problems.push(`${name} is not a project path (its last segment, no group): ${JSON.stringify(env[name])}`);
  }
  return problems;
}

/** Throws, naming every missing or malformed variable, in live mode on a real group (`liveConfigProblems`). */
export function readPollerConfig(group: string | number, env: Record<string, string | undefined> = process.env): PollerConfig {
  const problems = liveConfigProblems(env);
  if (problems.length) throw new Error(`BELAY_MODE=live: ${problems.join('; ')}`);
  const policyProject = env.BELAY_POLICY_PROJECT?.trim() || 'belay-policy';
  const ledgerProject = env.BELAY_LEDGER_PROJECT?.trim() || 'belay-ledger';
  const hours = Number(env.BELAY_TASK_HOURS);
  return {
    group, policyProject, ledgerProject, infra: [policyProject, ledgerProject, 'belay-pack', 'belay-engine'],
    policyRef: env.BELAY_POLICY_REF || 'main', ledgerRef: env.BELAY_LEDGER_REF || 'main',
    agents: { prefixes: [env.BELAY_AGENT_PREFIX?.trim() || 'ai-'], names: [] },
    proof: { prefixes: ['ai-proof-'], names: list(env.BELAY_PROOF_AUTHORS) },
    guardrail: { prefixes: ['ai-guardrail-'], names: list(env.BELAY_GUARDRAIL_AUTHORS) },
    taskWindowMs: (Number.isFinite(hours) && hours > 0 ? hours : 24) * HOUR,
    rollupWindowMs: 7 * 24 * HOUR,
    mrLimit: 200,
  };
}
