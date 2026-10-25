// Onboarding a real project (WP1): find the repos the person already works in with Claude Code, let a low-effort
// model propose what to watch, confirm each line with a typed probe, save only what probed green.
//   repos/    listClaudeRepos: ~/.claude/projects -> git toplevels, newest first
//   facts/    what the model is told about a repo, collected deterministically
//   propose/  the one claude call, parseProposal, the probe args per kind
//   probes/   runProbes (git here, the rest through providers/registry) and the seals the save step checks
//   store/    <data>/projects/<slug>.yml
//   confirm   a proposal plus its probe results -> the ProjectConfig that is saved
import type { ClaudeRepo, Engine, ProbeResult, ProbeSpec, ProjectConfig, Proposal } from '@/schemas/vitals';
import { proposeWith } from './propose/propose';
import { runProbesWith } from './probes/run';
import { cachedClaudeRepos } from './repos/repos';
import { loadProjects as loadSaved, saveProject as save } from './store/store';

export { confirmProject } from './confirm';
export { ClaudeMissingError } from './propose/propose';
export { ProposalError, parseProposal } from './propose/proposal';
export { cleanSpec } from './propose/probeArgs';
export { sealOf, verifySeal, type Sealed } from './probes/seal';
export { runProbe } from './probes/run';
export { followUpOf } from './probes/followUp';
export { toplevelOf } from './repos/repos';
export { ciFiles } from './facts/ci';

export const DEFAULT_ENGINE: Engine = { model: 'claude-sonnet-5-5', effort: 'low' };
export const AB_ENGINE: Engine = { model: 'claude-haiku-5-5', effort: 'low' };

/** Git toplevels behind ~/.claude/projects, newest first; temp, build-session and worktree paths dropped. */
export async function listClaudeRepos(): Promise<ClaudeRepo[]> {
  return cachedClaudeRepos(loadSaved());
}

/**
 * One headless claude call over the repo's collected facts (no tools) that returns a validated Proposal, its probes
 * completed so every line has one; `dropped` counts the model's probe specs that did not validate.
 */
export async function proposeProject(root: string, engine: Engine = DEFAULT_ENGINE): Promise<{ proposal: Proposal; ms: number; engine: Engine; dropped: number }> {
  return proposeWith(root, engine);
}

/** Runs each spec through its provider's probe (providers/registry), in order, never throwing for a failed one. */
export async function runProbes(specs: ProbeSpec[], root: string): Promise<ProbeResult[]> {
  return runProbesWith(specs, root);
}

/** Writes <data>/projects/<slug>.yml and returns the slug (the root's own when it was onboarded before). */
export function saveProject(cfg: ProjectConfig): string {
  return save(cfg);
}

export function loadProjects(): ProjectConfig[] {
  return loadSaved();
}
