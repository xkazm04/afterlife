/** The part of the clipboard Copy uses. Undefined where the browser gives none (an insecure context, a test). */
export interface Clip {
  writeText(text: string): Promise<void>;
}

/**
 * Copy, and say what happened: "Copied" only when the clipboard took the text. Nothing is ever sent. No text (a step
 * with no command) copies nothing: the clipboard keeps what the person had there.
 */
export async function copyText(text: string, clip: Clip | undefined): Promise<{ ok: boolean; text: string }> {
  if (!text.trim()) return { ok: false, text: 'Nothing to copy · this has no command · nothing sent' };
  if (!clip) return { ok: false, text: 'Copy failed · this browser gives no clipboard here · nothing sent' };
  try {
    await clip.writeText(text);
    return { ok: true, text: 'Copied · nothing sent' };
  } catch (e) {
    return { ok: false, text: `Copy failed · ${e instanceof Error && e.message ? e.message : 'the clipboard refused it'} · nothing sent` };
  }
}
