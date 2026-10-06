// Which key does what on the Task screen. Pure: the hook asks, the model answers.
import type { ArrowKey } from '../court/selection';

export type TaskAction =
  | { type: 'step'; delta: 1 | -1 }
  | { type: 'replay' }
  | { type: 'words' }
  | { type: 'failOnly' }
  | { type: 'escape' }
  | { type: 'arrow'; key: ArrowKey };

const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export interface KeyContext {
  /** The key press happened inside the sidebar docket. */
  inDocket: boolean;
  /** ... inside the toolbar or the inspector, where arrows keep their own meaning. */
  inChrome: boolean;
  /** A replay is running: the court is not interactive. */
  replaying: boolean;
}

/** Map a key to an action, or null to leave it alone. Escape clears the selection (a popover has already consumed its own). */
export function actionFor(key: string, ctx: KeyContext): TaskAction | null {
  if (key === '[' || key === ']') return { type: 'step', delta: key === ']' ? 1 : -1 };
  if (key === 'r') return { type: 'replay' };
  if (key === 'w') return { type: 'words' };
  if (key === 'f') return { type: 'failOnly' };
  if (key === 'Escape') return { type: 'escape' };
  if (!ARROWS.includes(key)) return null;
  if ((key === 'ArrowUp' || key === 'ArrowDown') && ctx.inDocket) return { type: 'step', delta: key === 'ArrowDown' ? 1 : -1 };
  if (ctx.replaying || ctx.inChrome) return null;
  return { type: 'arrow', key: key as ArrowKey };
}
