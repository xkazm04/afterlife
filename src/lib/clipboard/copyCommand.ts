/** The part of the clipboard Copy uses. Undefined where the browser gives none (an insecure origin, a test). */
export type Clip = Pick<Clipboard, 'writeText'>;

/**
 * The one clipboard write of the app: ok when the clipboard took the text; otherwise why not (no clipboard, a refusal,
 * or a writeText that throws before it returns a promise). Never throws.
 */
export async function writeClip(text: string, clip: Clip | undefined): Promise<{ ok: true } | { ok: false; error: unknown }> {
  if (!clip) return { ok: false, error: undefined };
  try {
    await clip.writeText(text);
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * Copy Command: the clipboard took it, or the status line shows the command itself. `navigator.clipboard` is undefined
 * on an insecure origin, so a missing clipboard gets the same fallback a refusing one does.
 */
export function copyCommand(text: string, clip: Clip | undefined, say: (text: string) => void, copied: string): void {
  if (!clip) return say(text);
  void writeClip(text, clip).then((r) => say(r.ok ? copied : text));
}
