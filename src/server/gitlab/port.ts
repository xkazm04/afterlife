// The GitLab port: everything Belay reads, as typed calls, and every write as a PlannedCommand.
// Implemented by the glab adapter (live) and the fake (tests, live-mode demo).
import type {
  Availability, DeploymentFilter, GlDeployment, GlDiff, GlEnvironment, GlFile, GlGroup, GlInstance, GlJob,
  GlMergeRequest, GlNamespace, GlNote, GlPipeline, GlProject, GlRelease, GlSchedule, GlTestSummary,
  GlTreeEntry, GlUser, GlVulnerability, MrFilter, PageOpts, PipelineFilter, ProjectRef, TreeOpts,
} from './types';
import type { ExecOutcome, PlanBuilders, PlannedCommand } from './plan/types';

export type { ExecOutcome, PlanBuilders, PlannedCommand, Risk } from './plan/types';
export type * from './types';

export interface GitLabPort {
  /** Hostname the commands target; undefined means glab's default (gitlab.com). */
  readonly host: string | undefined;
  /** Builders for every write. They return a PlannedCommand and run nothing. */
  readonly plan: PlanBuilders;

  currentUser(): Promise<GlUser>;
  instance(): Promise<GlInstance>;
  getGroup(group: ProjectRef): Promise<GlGroup>;
  /** The namespace record carries the subscription plan ("free", "premium", "ultimate"...). */
  getNamespace(group: ProjectRef): Promise<GlNamespace>;
  listProjects(group: ProjectRef): Promise<GlProject[]>;

  listPipelines(project: ProjectRef, f?: PipelineFilter): Promise<GlPipeline[]>;
  listJobs(project: ProjectRef, pipelineId: number): Promise<GlJob[]>;
  jobTrace(project: ProjectRef, jobId: number): Promise<string>;
  /** null when the pipeline produced no JUnit report. */
  testReportSummary(project: ProjectRef, pipelineId: number): Promise<GlTestSummary | null>;

  listMergeRequests(project: ProjectRef, f?: MrFilter): Promise<GlMergeRequest[]>;
  listGroupMergeRequests(group: ProjectRef, f?: MrFilter): Promise<GlMergeRequest[]>;
  listNotes(project: ProjectRef, iid: number): Promise<GlNote[]>;
  listDiffs(project: ProjectRef, iid: number): Promise<GlDiff[]>;

  listEnvironments(project: ProjectRef): Promise<GlEnvironment[]>;
  listDeployments(project: ProjectRef, f?: DeploymentFilter): Promise<GlDeployment[]>;
  listReleases(project: ProjectRef, o?: PageOpts): Promise<GlRelease[]>;
  listSchedules(project: ProjectRef): Promise<GlSchedule[]>;

  /** null when the file does not exist at that ref. */
  getFile(project: ProjectRef, path: string, ref: string): Promise<GlFile | null>;
  listTree(project: ProjectRef, o?: TreeOpts): Promise<GlTreeEntry[]>;

  /** Ultimate-only: 'unavailable' (with the reason) when the plan has no vulnerability API. */
  listVulnerabilities(project: ProjectRef, o?: PageOpts): Promise<Availability<GlVulnerability[]>>;

  /** Untyped GET, for capability probes. Throws GitLabError. */
  get(path: string, query?: Record<string, string | number | boolean | undefined>): Promise<unknown>;

  /** Runs a planned write. Only called after the operator clicked. */
  execute(planned: PlannedCommand): Promise<ExecOutcome>;
}
