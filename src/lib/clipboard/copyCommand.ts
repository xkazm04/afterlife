/**
 * Copy Command: the clipboard took it, or the status line shows the command itself. `navigator.clipboard` is undefined
 * on an insecure origin, so a missing clipboard gets the same fallback a refusing one does.
 */
export function copyCommand(text: string, clip: Pick<Clipboard, 'writeText'> | undefined, say: (text: string) => void, copied: string): void {
  if (!clip) return say(text);
  clip.writeText(text).then(() => say(copied), () => say(text));
}
