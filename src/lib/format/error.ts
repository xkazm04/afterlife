/**
 * The readable text of a thrown value: an Error's message, anything else stringified. `firstLine` keeps only the first
 * line, for a one-line issue or warning (a YAML parser's message carries a multi-line code frame).
 */
export function messageOf(e: unknown, opts: { firstLine?: boolean } = {}): string {
  const text = e instanceof Error ? e.message : String(e);
  return opts.firstLine ? (text.split('\n')[0] ?? '') : text;
}
