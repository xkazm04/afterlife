// Which key does what on the Task screen. Pure: the hook asks, the model answers. TASK_KEYMAP is the same keys as
// Settings > Keyboard lists them (a test holds it to actionFor).
import { defineKeymap } from '@/lib/keyboard/keymap';
import type { ArrowKey } from '../court/selection';

export type TaskAction =
  | { type: 'step'; delta: 1 | -1 }
  | { type: 'replay' }
  | { type: 'words' }
  | { type: 'failOnly' }
  | { type: 'escape' }
  | { type: 'reason' }
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
  const letter = key.length === 1 ? key.toLowerCase() : key;
  if (letter === 'r') return { type: 'replay' };
  if (letter === 'w') return { type: 'words' };
  if (letter === 'f') return { type: 'failOnly' };
  if (key === 'Escape') return { type: 'escape' };
  if (letter === 'n') return ctx.replaying ? null : { type: 'reason' };
  if (!ARROWS.includes(key)) return null;
  if ((key === 'ArrowUp' || key === 'ArrowDown') && ctx.inDocket) return { type: 'step', delta: key === 'ArrowDown' ? 1 : -1 };
  if (ctx.replaying || ctx.inChrome) return null;
  return { type: 'arrow', key: key as ArrowKey };
}

export const TASK_KEYMAP = defineKeymap('Task', [
  { id: 'step', keys: [{ key: '[' }, { key: ']' }], does: 'Previous / next task' },
  { id: 'court', keys: ARROWS.map((key) => ({ key })), does: 'Walk the court; in the docket, ↑ ↓ step tasks' },
  { id: 'replay', keys: [{ key: 'r' }], does: 'Replay' },
  { id: 'words', keys: [{ key: 'w' }], does: "Show / hide the agent's words" },
  { id: 'failOnly', keys: [{ key: 'f' }], does: 'Failing only, on / off' },
  { id: 'escape', keys: [{ key: 'Escape' }], does: 'Clear the selection' },
  { id: 'reason', keys: [{ key: 'n' }], does: 'Next reason for a FAIL or INCONCLUSIVE verdict' },
]);
