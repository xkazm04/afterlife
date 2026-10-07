import type { TaskView } from './types';

/** Parse "19 h 12 m" (or "45 m") into minutes. Unreadable text is 0. */
export function minutesOf(text: string): number {
  const h = /(\d+)\s*h/.exec(text);
  const m = /(\d+)\s*m/.exec(text);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}

/** How much of a clock has run: dueIn "19 h 12 m" of a total "24 h" is 0.2. Clamped to 0..1. */
export function clockElapsed(dueIn: string, total: string): number {
  const tot = minutesOf(total);
  if (tot <= 0) return 0;
  return Math.min(1, Math.max(0, (tot - minutesOf(dueIn)) / tot));
}

/** A path inside the envelope is fine, except a CI file on a class that may not touch CI config. */
export function isDenyPath(task: Pick<TaskView, 'cls'>, path: string): boolean {
  return /\.gitlab-ci\.yml$/.test(path) && task.cls !== 'ci-config.change';
}

/** Which exhibits the proof class has to show. The inspector draws these in order. */
export function exhibitKinds(task: TaskView): ('hunk' | 'reruns' | 'clock' | 'envelope')[] {
  const kinds: ('hunk' | 'reruns' | 'clock' | 'envelope')[] = [];
  if (task.hunk) kinds.push('hunk');
  if (task.stats) kinds.push('reruns');
  if (task.clock) kinds.push('clock');
  if (task.envelope && task.envelope.files > 0) kinds.push('envelope');
  return kinds;
}

/** Tags in agent text are shown as typed, never obeyed: say so when there are any. */
export const hasMarkup = (text: string): boolean => /[<>]/.test(text);
