// A real project Afterlife watches: what the onboarding wizard proposed and its probes confirmed, saved to
// <data>/projects/<slug>.yml (gitignored, never written into the project's own repo). Every line here is one some
// probe saw green; an absent value is an omitted key, never null and never 0 (unknown is never zero).
import type { TechMetric } from '../run/tech';

export type HostKind = 'azure-devops' | 'gitlab' | 'github' | 'none';
export type CiProviderKind = 'azure-pipelines' | 'gitlab-ci' | 'none';
export type CloudProviderKind = 'azure-app-insights' | 'none';

/** Where the code is hosted: an Azure DevOps org/project/repo, or a GitLab path_with_namespace. */
export interface Host {
  kind: HostKind;
  org?: string;
  project?: string;
  repo?: string;
  /** GitLab path_with_namespace. */
  path?: string;
}

/** A part of the repo with its own tests or build (release-log inside the Grinex Portal monorepo). */
export interface Component {
  id: string;
  /** Relative to the project root, forward slashes; '.' is the root itself. */
  path: string;
  stack: string;
  tests?: string[];
  build?: string[];
}

/** How a CI run is told apart: master full vs its hotfix lane vs feature PR tier vs nightly. First match wins. */
export interface VariantRule {
  /** Kebab case: master-full, master-hotfix, pr-feature, nightly, branch-manual, local. */
  id: string;
  pipelineId: string;
  match: {
    /** A glob over the short branch name (`feature/*`, `master`). */
    branch?: string;
    /** Provider trigger reasons that match (Azure: individualCI, manual, schedule, pullRequest; GitLab: push, schedule, web, merge_request_event). */
    reason?: string[];
    /** A run template parameter or variable that must hold this value (Azure LANE=hotfix). */
    parameter?: { name: string; value: string };
  };
}

export interface Pipeline {
  id: string;
  name: string;
  /** The definition file, relative to the root (azure-pipelines.yml, pipelines/pr-validation.yml). */
  file?: string;
}

export interface CiConfig {
  provider: CiProviderKind;
  pipelines: Pipeline[];
  variants: VariantRule[];
}

export interface CloudResource {
  appId: string;
  name: string;
  resourceGroup: string;
  subscription: string;
}

export interface CloudConfig {
  provider: CloudProviderKind;
  resource?: CloudResource;
}

/** Every probe the wizard may run. Args are validated per kind (providers/probeArgs) - there is no free shell. */
export const PROBE_KINDS = [
  'git-root',
  'git-remote',
  'az-login',
  'az-devops-pipelines',
  'az-devops-runs',
  'az-devops-timeline',
  'az-appinsights-component',
  'az-appinsights-query',
  'glab-auth',
  'glab-pipelines',
  'glab-jobs',
  'local-command',
] as const;
export type ProbeKind = (typeof PROBE_KINDS)[number];

export interface ProbeSpec {
  kind: ProbeKind;
  args: Record<string, string>;
}

export type ProbeStatus = 'ok' | 'fail' | 'skipped';

export interface ProbeResult {
  kind: ProbeKind;
  args: Record<string, string>;
  status: ProbeStatus;
  /** One line a person reads: "6 pipelines", or the stderr's first line and the re-login command on a fail. */
  summary: string;
  /** ISO instant the probe finished. */
  at: string;
  ms: number;
}

/** The model the wizard ran on: claude-sonnet-5-5 at low effort by default, claude-haiku-5-5 as the A/B arm. */
export interface Engine {
  model: string;
  effort: 'low' | 'medium' | 'high';
}

/** What the LLM proposed, validated (discover/proposal.ts). Nothing in it is saved until a probe confirms it. */
export interface Proposal {
  name: string;
  host: Host;
  components: Component[];
  ci: CiConfig;
  cloud: { provider: CloudProviderKind; hint?: { resourceGroup?: string; name?: string } };
  metrics: TechMetric[];
  probes: ProbeSpec[];
}

export interface ProjectConfig {
  slug: string;
  name: string;
  /** Absolute git toplevel. */
  root: string;
  /** ISO instant. */
  onboardedAt: string;
  engine: Engine;
  host: Host;
  components: Component[];
  ci: CiConfig;
  cloud: CloudConfig;
  /** What the cycle runner needs to work the repo locally (runner/fleet/load.ts reads these too). */
  runner?: { gates: string[]; setup?: string[]; frontier?: { objective: string; metrics: TechMetric[] } };
  probes: ProbeResult[];
}

/** A git root the person already works in with Claude Code (discover/repos.ts). */
export interface ClaudeRepo {
  root: string;
  name: string;
  /** ISO instant of the newest Claude Code session there. */
  lastUsed: string;
  branch?: string;
  remote?: string;
  hostKind: HostKind;
  /** Slug of the saved project when this root is already onboarded. */
  onboarded?: string;
}
