// The operator's writes. An action is an intent (what the operator asked for), a preview (the exact commands, shown
// before anything runs) and, after a second call that confirms the preview, a result. Types only: safe to import anywhere.
import type { Stage } from '@/schemas/stages';
import type { Tier } from '@/schemas/tier';
import type { Risk } from '@/server/gitlab/plan/types';

/** Every intent names the project by its index id (the slug the screens use) and may name the inbox item it settles. */
interface Base {
  project: string;
  /** The Needs-you item this settles: closed as acted once every command has run. */
  proposal?: string;
}

/** Lower one or more classes. Belay only restricts directly: raising a tier is a promotion MR a person merges. */
export interface RevokeClass extends Base {
  kind: 'revoke-class';
  changes: { class: string; to: Tier }[];
  why?: string;
}

/** Open a policy MR that raises one class. The operator (the human key) merges it; Belay never does. */
export interface PromoteClass extends Base {
  kind: 'promote-class';
  class: string;
  to: Tier;
}

/** Mark a CRA clock work item "ready to sign". Belay never submits a report. */
export interface MarkCraReady extends Base {
  kind: 'mark-cra-ready';
  /** The clock work item's iid. */
  issue: number;
}

export interface GapFile {
  path: string;
  content: string;
}

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

export type ActionIntent = RevokeClass | PromoteClass | MarkCraReady | StageGapMr;
export type ActionKind = ActionIntent['kind'];

export interface PreviewCommand {
  /** The command as the operator would type it. */
  display: string;
  argv: readonly string[];
  risk: Risk;
}

export interface ActionPreview {
  kind: ActionKind;
  title: string;
  summary: string;
  commands: PreviewCommand[];
  /** The highest risk among the commands. */
  risk: Risk;
  /** What changes in the files, as "- old" / "+ new" lines. */
  diff: string[];
  /** Pass this back to confirm. It is a digest of the commands: if the plan changes before confirming, it no longer matches. */
  previewId: string;
  /** demo: confirming only simulates. live: confirming runs the commands as the operator's own glab login. */
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
