// The operator's writes. An action is an intent (what the operator asked for), a preview (the exact commands, shown
// before anything runs) and, after a second call that confirms the preview, a result. Types only: safe to import anywhere.
import type { Stage } from '@/schemas/stages';
import type { Tier } from '@/schemas/tier';
import type { Risk } from '@/server/gitlab/plan/types';
import type { SetupIntent } from '@/server/start/wire';

/** Every intent names the project by its index id (the slug the screens use) and may name the inbox item it settles. */
interface Base {
  project: string;
  /** The Needs-you item this settles: closed as acted once every command has run. */
  proposal?: string;
}

/** Lower one or more classes. Afterlife only restricts directly: raising a tier is a promotion MR a person merges. */
export interface RevokeClass extends Base {
  kind: 'revoke-class';
  changes: { class: string; to: Tier }[];
  why?: string;
}

/** Open a policy MR that raises one class. The operator (the human key) merges it; Afterlife never does. */
export interface PromoteClass extends Base {
  kind: 'promote-class';
  class: string;
  to: Tier;
}

/** Mark a CRA clock work item "ready to sign". Afterlife never submits a report. */
export interface MarkCraReady extends Base {
  kind: 'mark-cra-ready';
  /** The clock work item's iid. */
  issue: number;
}

/**
 * One file of a gap MR: the whole new content, or a hunk of a file the project already has. A hunk is context lines (a
 * leading space) and added lines (a leading '+'); the door applies it to the file as the project holds it.
 */
export type GapFile = { path: string; content: string } | { path: string; hunk: string[] };

/** Open the draft MR for one maturity gap: one new branch, its files, one MR. */
export interface StageGapMr extends Base {
  kind: 'stage-gap-mr';
  gap: string;
  stage: Stage;
  from: number;
  to: number;
  title: string;
  branch: string;
  files: GapFile[];
  workItem?: number;
}

/** The fixed change a live maturity gap can send: the scan's next change, where it is mechanical. */
export type GapTemplateId = 'secure-includes' | 'package-build' | 'plan-issue-templates';
export const GAP_TEMPLATES: readonly GapTemplateId[] = ['secure-includes', 'package-build', 'plan-issue-templates'];

/** Open the draft MR for one live maturity gap from a fixed template: the server writes the files, never the client. */
export interface ApplyGapTemplate extends Base {
  kind: 'apply-gap-template';
  stage: Stage;
  from: number | null;
  to: number;
  template: GapTemplateId;
}

/** Arm a Setup track: one MR, as the operator, that adds the track's include lines to the target's .gitlab-ci.yml. */
export interface ArmTrack extends Base {
  kind: 'arm-track';
  /** "T1" to "T8". Only a track whose arm content the repo defines is planned. */
  track: string;
}

/** Disarm a Setup track: one MR that removes exactly the lines its arm MR added. */
export interface DisarmTrack extends Base {
  kind: 'disarm-track';
  track: string;
}

/**
 * Enroll an armed track's classes at trust-policy.yml's start_tier (never above a class's ceiling): one branch with the
 * first records, then a policy MR a person merges. First rung only: a class that holds a record is promotion's.
 */
export interface EnrollTrack extends Base {
  kind: 'enroll-track';
  track: string;
}

/**
 * Queue N runs of a real project's pipeline on the change's branch, as the person's own az login, to re-measure a claim
 * (actions/vitals/queue.ts). The queued run ids are kept beside the claim; the next collect measures exactly them.
 */
export interface QueueRuns extends Base {
  kind: 'queue-runs';
  claimId: string;
  pipelineId: string;
  branch: string;
  /** 1 to 5. */
  n: number;
}

/** Write the afterlife-report skill into the project's own repo (.claude/skills/afterlife-report/SKILL.md). Never commits. */
export interface InstallSkill extends Base {
  kind: 'install-skill';
}

/**
 * Turn App Insights on for an app whose cloud is Log Analytics only: create a workspace-based component, then point the
 * App Service at it (which restarts the app), then probe it and switch the project's cloud (actions/vitals/insights.ts).
 */
export interface EnableAppInsights extends Base {
  kind: 'enable-app-insights';
  /** The new component's name. */
  name: string;
  resourceGroup: string;
  /** The App Service's own region; read from the site at preview time, and when given it must be that one. */
  location?: string;
  /** The Log Analytics workspace's ARM resource id. */
  workspaceId: string;
  site: string;
  slot?: string;
}

/** The writes on a real project Afterlife watches (<data>/projects/<slug>.yml), not on the GitLab group. */
export type ProjectIntent = QueueRuns | InstallSkill | EnableAppInsights;
export const PROJECT_KINDS: readonly ProjectIntent['kind'][] = ['queue-runs', 'install-skill', 'enable-app-insights'];

export type ActionIntent = RevokeClass | PromoteClass | MarkCraReady | StageGapMr | ApplyGapTemplate | ArmTrack | DisarmTrack | EnrollTrack | ProjectIntent;
export type ActionKind = ActionIntent['kind'];

export interface PreviewCommand {
  /** The command as the operator would type it. */
  display: string;
  argv: readonly string[];
  risk: Risk;
}

export interface ActionPreview {
  /**
   * `start-run` is runs/start's (startRunAction), not an ActionIntent: it starts a cycle run, not a GitLab or project write.
   * The setup kinds are /start's writes on this machine (actions/setup, server/start/wire.ts): they name no project.
   */
  kind: ActionKind | SetupIntent['kind'] | 'start-run';
  title: string;
  summary: string;
  commands: PreviewCommand[];
  /** The highest risk among the commands. */
  risk: Risk;
  /** What changes in the files, as "- old" / "+ new" lines. */
  diff: string[];
  /** The branch the commands create, when they create one. */
  branch?: string;
  /** What the operator must know before the click, in order. */
  notes?: string[];
  /** Pass this back to confirm. It is a digest of the commands: if the plan changes before confirming, it no longer matches. */
  previewId: string;
  /** demo: confirming only simulates. live: confirming runs the commands as the operator's own glab (or, for a project write, az) login. */
  mode: 'demo' | 'live';
}

export interface CommandOutcome {
  display: string;
  exit: number;
  ok: boolean;
  /** True in demo mode: nothing was executed. */
  simulated: boolean;
  error?: string;
  /**
   * What the command made, from GitLab's own answer: an MR ("!22"), or for a file write the commit the file now has on
   * that branch ("commit 1a2b3c4d", read back right after the write). Absent when simulated, failed, or GitLab did not say.
   */
  made?: string;
  /** The web address of what was made, when GitLab gave one (an MR). */
  url?: string;
}

export type ActionResponse =
  | { status: 'preview'; preview: ActionPreview }
  | { status: 'done'; preview: ActionPreview; results: CommandOutcome[] }
  | { status: 'failed'; preview: ActionPreview; results: CommandOutcome[] }
  /** The commands are no longer the ones that were previewed (the files moved on): nothing ran; show this preview again. */
  | { status: 'changed'; preview: ActionPreview }
  | { status: 'refused'; reason: string };
