// Types for the setup fixtures. Plain data shapes, no logic.

export type StepWho = 'agent' | 'human';

/** Per-step detail the demo dataset lacks (adopt-belay skill, steps 0-14). Commands are illustrative. */
export interface StepDetail {
  who: StepWho;
  /** Gate title in "Only you can do these" (human steps). */
  short?: string;
  does: string;
  cmd?: readonly string[];
  /** What a successful probe reports. */
  probe: string;
  /** The step writes to GitLab. */
  write?: boolean;
  action?: string;
  where?: string;
  note?: string;
  /** Last-probe text shown before the step is done. */
  before?: string;
  /** The first probe reports this instead (the demo's honest "not yet"). */
  failFirst?: string;
  /** The value is typed by the person: Belay never sees it. */
  secret?: boolean;
  /** Why no read can ever see this step done: the operator may say they did it instead (live). */
  unread?: string;
}

/** One track's place in the arm order: what it waits on. A need is a track id or "step:N". */
export interface ArmMeta {
  title: string;
  short: string;
  needs: readonly string[];
}
