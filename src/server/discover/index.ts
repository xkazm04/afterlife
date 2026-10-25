// Onboarding a real project (WP1): find the repos the person already works in with Claude Code, let a low-effort
// model propose what to watch, confirm each line with a typed probe, save only what probed green.
// Stubs with the final signatures; WP1 builds them.
import type { ClaudeRepo, Engine, ProbeResult, ProbeSpec, ProjectConfig, Proposal } from '@/schemas/vitals';

export const DEFAULT_ENGINE: Engine = { model: 'claude-sonnet-5-5', effort: 'low' };
export const AB_ENGINE: Engine = { model: 'claude-haiku-5-5', effort: 'low' };

/** Git toplevels behind ~/.claude/projects, newest first; temp, build-session and worktree paths dropped. */
export async function listClaudeRepos(): Promise<ClaudeRepo[]> {
  throw new Error('discover: listClaudeRepos not built (WP1)');
}

/** One headless claude call that reads the repo (read-only tools) and returns a validated Proposal. */
export async function proposeProject(root: string, engine: Engine = DEFAULT_ENGINE): Promise<{ proposal: Proposal; ms: number; engine: Engine }> {
  void root; void engine;
  throw new Error('discover: proposeProject not built (WP1)');
}

/** Runs each spec through its provider's probe (providers/registry), in order, never throwing for a failed one. */
export async function runProbes(specs: ProbeSpec[], root: string): Promise<ProbeResult[]> {
  void specs; void root;
  throw new Error('discover: runProbes not built (WP1)');
}

export function saveProject(cfg: ProjectConfig): string {
  void cfg;
  throw new Error('discover: saveProject not built (WP1)');
}

export function loadProjects(): ProjectConfig[] {
  return [];
}
