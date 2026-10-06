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
}

export interface CreateMrInput { project: ProjectRef; sourceBranch: string; targetBranch: string; title: string; description?: string; labels?: string[] }
export interface AddNoteInput { project: ProjectRef; iid: number; body: string }
export interface SetLabelsInput { project: ProjectRef; iid: number; add?: string[]; remove?: string[] }
export interface CommitFileInput { project: ProjectRef; path: string; branch: string; content: string; message: string; action: 'create' | 'update' }
export interface PauseScheduleInput { project: ProjectRef; scheduleId: number }
export interface ApproveDeploymentInput { project: ProjectRef; deploymentId: number; status: 'approved' | 'rejected'; comment?: string }

export interface PlanBuilders {
  createMr(i: CreateMrInput): PlannedCommand;
  addNote(i: AddNoteInput): PlannedCommand;
  setLabels(i: SetLabelsInput): PlannedCommand;
  commitFile(i: CommitFileInput): PlannedCommand;
  pauseSchedule(i: PauseScheduleInput): PlannedCommand;
  approveDeployment(i: ApproveDeploymentInput): PlannedCommand;
}

export interface ExecOutcome { ok: true; stdout: string; body: unknown }
