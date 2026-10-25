// The pre-run panel's form, pure: its state, the defaults a repo gives it, the branch choices, and the one intent it
// sends. The command line itself is never spelled here: it is the server's preview (startRunAction).
import { RUN_START_DEFAULTS, type RunBranch, type RunIdea, type StartData, type StartRepo, type StartRun } from '@/server/actions/runs/start/types';

export type BranchKind = 'new' | 'existing';

export interface StartForm {
  repo: string;
  mode: StartRun['mode'];
  branch: BranchKind;
  /** New branch: the ref the first wave branch starts from (the fleet base by default). */
  base: string;
  /** Existing branch: the local branch lanes land on; '' until one is picked. */
  onto: string;
  waves: number;
  lanes: number;
  laneCapUsd: number;
  waveCapUsd: number;
  model: string;
  ideas: RunIdea[];
}

export const MODELS = ['sonnet', 'opus', 'haiku'] as const;

/** A repo's own fresh form: propose (it changes nothing) and the runner's defaults, the fleet base, no branch picked. */
export function formFor(repo: StartRepo | undefined, keep?: StartForm): StartForm {
  const d = RUN_START_DEFAULTS;
  return {
    repo: repo?.slug ?? '', mode: keep?.mode ?? 'propose', branch: keep?.branch ?? 'new', base: repo?.base ?? '', onto: '',
    waves: keep?.waves ?? d.waves, lanes: keep?.lanes ?? d.lanes,
    laneCapUsd: Math.min(keep?.laneCapUsd ?? d.laneCapUsd, repo?.laneCapUsd ?? Infinity),
    waveCapUsd: Math.min(keep?.waveCapUsd ?? d.waveCapUsd, repo?.waveCapUsd ?? Infinity),
    model: keep?.model ?? d.model, ideas: keep?.ideas ?? [],
  };
}

export const repoOf = (data: StartData, slug: string): StartRepo | undefined => data.repos.find((r) => r.slug === slug);

/** The refs a new branch may start from: the fleet base first (even when it is no local branch, `origin/main`), then the local branches. */
export function baseChoices(repo: StartRepo | undefined, branches: readonly RunBranch[]): string[] {
  if (!repo) return [];
  return [repo.base, ...branches.map((b) => b.name).filter((n) => n !== repo.base)];
}

/** The branches the repo's read gave, or none (the read failed: its reason is shown instead). */
export const branchesOf = (data: StartData, slug: string): RunBranch[] => {
  const b = data.branches[slug];
  return b?.ok ? b.branches : [];
};

/** Why the form cannot be previewed yet, or null. */
export function notReady(f: StartForm): string | null {
  if (!f.repo) return 'pick a repo';
  if (f.mode === 'execute' && f.branch === 'existing' && !f.onto) return 'pick the existing branch the lanes land on';
  if (f.mode === 'execute' && f.branch === 'new' && !f.base.trim()) return 'name the ref the new branch starts from';
  return null;
}

/** The intent the form sends, or null while it is not ready. A base equal to the fleet's is the default, so not sent. */
export function intentOf(f: StartForm, repo: StartRepo | undefined): StartRun | null {
  if (!repo || notReady(f)) return null;
  const execute = f.mode === 'execute';
  const base = execute && f.branch === 'new' && f.base.trim() !== repo.base ? f.base.trim() : undefined;
  const onto = execute && f.branch === 'existing' ? f.onto : undefined;
  return {
    kind: 'start-run', repo: repo.slug, mode: f.mode, ...(base ? { base } : {}), ...(onto ? { onto } : {}),
    waves: f.waves, lanes: f.lanes, laneCapUsd: f.laneCapUsd, waveCapUsd: f.waveCapUsd, model: f.model, ideas: f.ideas,
  };
}
