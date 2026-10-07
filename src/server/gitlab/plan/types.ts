// A write is never run where it is built. It is described as a PlannedCommand, shown to the
// operator verbatim, and only `GitLabPort.execute` runs it, after a click.
import type { ProjectRef } from '../types';

/** low: reversible bookkeeping. policy: changes who may do what. merge: ships code or a release. */
export type Risk = 'low' | 'policy' | 'merge';

export interface PlannedCommand {
  /** Arguments after the glab binary, exactly as they will be executed (no shell). */
  argv: readonly string[];
  /** The same command as the operator would type it, for the preview. */
  display: string;
  risk: Risk;
  /** A file write names its file, so the commit it made can be read back afterwards (GitLab's answer does not name it). */
  file?: { project: ProjectRef; path: string; branch: string };
}

export interface CreateMrInput { project: ProjectRef; sourceBranch: string; targetBranch: string; title: string; description?: string; labels?: string[] }
export interface AddNoteInput { project: ProjectRef; iid: number; body: string }
export interface SetLabelsInput { project: ProjectRef; iid: number; add?: string[]; remove?: string[] }
/**
 * startBranch: create `branch` from it in the same call (GitLab's `start_branch`); without it the branch must exist.
 * lastCommitId: the file's `last_commit_id` as it was read (an update): GitLab refuses the write (400) if the file changed
 * since on the branch it starts from, so a write planned from a stale read never lands over a newer one.
 */
export interface CommitFileInput { project: ProjectRef; path: string; branch: string; content: string; message: string; action: 'create' | 'update'; startBranch?: string; lastCommitId?: string }
export interface SetIssueLabelsInput { project: ProjectRef; iid: number; add?: string[]; remove?: string[] }
export interface PauseScheduleInput { project: ProjectRef; scheduleId: number }
export interface ApproveDeploymentInput { project: ProjectRef; deploymentId: number; status: 'approved' | 'rejected'; comment?: string }

export interface PlanBuilders {
  createMr(i: CreateMrInput): PlannedCommand;
  addNote(i: AddNoteInput): PlannedCommand;
  setLabels(i: SetLabelsInput): PlannedCommand;
  /** Labels on an issue or work item (the CRA clock). */
  setIssueLabels(i: SetIssueLabelsInput): PlannedCommand;
  commitFile(i: CommitFileInput): PlannedCommand;
  pauseSchedule(i: PauseScheduleInput): PlannedCommand;
  approveDeployment(i: ApproveDeploymentInput): PlannedCommand;
}

export interface ExecOutcome { ok: true; stdout: string; body: unknown }
