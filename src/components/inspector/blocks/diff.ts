// The lines of a diff: [mark, text]. Pure, so screens can build them from fixtures or from "+ x" strings.

export type DiffMark = ' ' | '+' | '-';
export type DiffLine = readonly [DiffMark, string];

/** Split diff text ("+ x", "- y", "  z": a mark, a space, the text) into lines. Anything else is context. */
export function parseDiff(lines: readonly string[]): DiffLine[] {
  return lines.map((l): DiffLine => {
    const mark: DiffMark = l.startsWith('+') ? '+' : l.startsWith('-') ? '-' : ' ';
    return [mark, l.slice(2)];
  });
}
