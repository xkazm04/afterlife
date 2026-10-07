import type { Gap } from '../ctx';

/** The sheet title and the primary button: "Open 2 MRs as you". The commands themselves are the server's preview. */
export const sendLabel = (mrs: number): string => `Open ${mrs} MR${mrs === 1 ? '' : 's'} as you`;

/** The "+N" additions in a gap's diff, across its files. */
export function addedLines(g: Gap): number {
  return g.x.files.reduce((a, f) => a + f.lines.filter((l) => l.startsWith('+')).length, 0);
}
