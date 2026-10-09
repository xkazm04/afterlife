// The maturity rubric as data: for each stage, which facts and GitLab objects lift it to each rung. scan.ts reads only this
// table. A rung is held only when every rung below it is (presence is not behaviour: R2 and up always rest on a run), and a
// rung this table does not read is never credited: the cell stops below it and says so.
//   R1 present on the default branch
//   R2 ran on the default branch in the last 14 days and produced an artifact
//   R3 failing it blocks a merge or deploy
//   R4 an agent operates it and Belay re-derives its proofs
import type { Stage } from '../../src/schemas/stages';

/** How a stage is present on the default branch (R1). */
export type Presence =
  | { kind: 'jobs'; names: RegExp } // a job in the merged CI config (ci_config.jobs) whose name matches
  | { kind: 'review' } // CODEOWNERS (codeowners) or the default branch protected (protected_branches)
  | { kind: 'templates' }; // issue templates under .gitlab/issue_templates (issue_templates)

export interface StageRule {
  stage: Stage;
  r1: Presence;
  /** R2: one of R1's jobs ran on the latest green default-branch pipeline (latest_pipeline_jobs) within 14 days of the
   * facts' `at`, with one of these artifact types ('any' = any but its log). null: not read by this rubric. */
  r2: { artifacts: readonly string[] | 'any' } | null;
  /** R3: pipelines must succeed before a merge (project.merge_requires_pipeline) and R2's job may not fail
   * (ci_config.jobs[].allow_failure is false). false: not read by this rubric. */
  r3: boolean;
  /** R4: the project holds an agent config (duo_agent_config) and a Belay proof job matching this ran with an artifact on
   * the same pipeline within 14 days. null: not read by this rubric. */
  r4: RegExp | null;
}

/** Days a run counts for R2 and R4. */
export const RAN_WITHIN_DAYS = 14;

/** Artifact types that are a job's own bookkeeping, not something it produced. */
export const NOT_AN_ARTIFACT: ReadonlySet<string> = new Set(['trace', 'metadata']);

const SECURITY_REPORTS = ['sast', 'secret_detection', 'dependency_scanning', 'container_scanning', 'dast', 'cyclonedx'] as const;
const word = (alternatives: string): RegExp => new RegExp(`(^|[-_:/ ])(${alternatives})($|[-_:/ ])`, 'i');

export const RUBRIC: readonly StageRule[] = [
  { stage: 'plan', r1: { kind: 'templates' }, r2: null, r3: false, r4: null },
  { stage: 'create', r1: { kind: 'review' }, r2: null, r3: false, r4: null },
  { stage: 'verify', r1: { kind: 'jobs', names: word('tests?|lint|spec|check') }, r2: { artifacts: ['junit'] }, r3: true, r4: /^belay-proof-rerun-stats$/ },
  { stage: 'package', r1: { kind: 'jobs', names: word('build|image|docker|kaniko|package|publish') }, r2: { artifacts: 'any' }, r3: true, r4: null },
  {
    stage: 'secure',
    r1: { kind: 'jobs', names: /sast|secret[-_]detection|dependency[-_]scanning|gemnasium|container[-_]scanning|dast|sbom/i },
    r2: { artifacts: SECURITY_REPORTS },
    r3: true,
    r4: /^(belay-proof-exploit-test|(belay-)?sbom-rederive)$/,
  },
  { stage: 'release', r1: { kind: 'jobs', names: word('release|openvex') }, r2: { artifacts: 'any' }, r3: true, r4: null },
  { stage: 'configure', r1: { kind: 'jobs', names: word('deploy|terraform|tofu|apply|infra') }, r2: { artifacts: 'any' }, r3: true, r4: null },
  { stage: 'monitor', r1: { kind: 'jobs', names: word('monitor|smoke|synthetic|uptime|alerts?') }, r2: { artifacts: 'any' }, r3: false, r4: null },
  { stage: 'govern', r1: { kind: 'jobs', names: /^belay-tier-gate$/ }, r2: { artifacts: 'any' }, r3: true, r4: /^belay-tier-gate$/ },
];
