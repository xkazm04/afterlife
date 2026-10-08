// Apply a hunk (context lines with a leading space, added lines with a leading '+') to a file as the project holds it.
// The context lines are the hunk's old side: they must be in the file exactly, in order, one after the other, and in one
// place only. Anything less exact is refused, because a guess here is a rewritten file.
import { ActionRefused } from './context';

export function applyHunk(path: string, base: string, hunk: readonly string[]): string {
  const context = hunk.filter((l) => l.startsWith(' ')).map((l) => l.slice(1));
  if (!context.length) throw new ActionRefused(`the hunk for ${path} has no context lines, so it cannot find its place`);
  const lines = base.split('\n');
  const end = base.endsWith('\n') ? lines.length - 1 : lines.length; // the '' after a final newline is not a line (F86)
  const at: number[] = [];
  for (let i = 0; i + context.length <= end; i++) if (context.every((c, k) => lines[i + k] === c)) at.push(i);
  if (!at.length) throw new ActionRefused(`the hunk's context lines do not match ${path} exactly and in order: the file is not the one the change was written against`);
  const start = at[0] as number;
  if (at.length > 1) throw new ActionRefused(`the hunk's context lines match ${path} in ${at.length} places, so where the lines go is not certain`);
  const made = hunk.map((l, i) => (l.startsWith('+') ? l.slice(1) : (lines[start + hunk.slice(0, i).filter((x) => x.startsWith(' ')).length] as string)));
  return [...lines.slice(0, start), ...made, ...lines.slice(start + context.length)].join('\n');
}
