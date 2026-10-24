import { writeClip, type Clip } from '@/lib/clipboard/copyCommand';

export type { Clip };

/**
 * Copy, and say what happened: "Copied" only when the clipboard took the text. Nothing is ever sent. No text (a step
 * with no command) copies nothing: the clipboard keeps what the person had there. The write is the shared one (writeClip).
 */
export async function copyText(text: string, clip: Clip | undefined): Promise<{ ok: boolean; text: string }> {
  if (!text.trim()) return { ok: false, text: 'Nothing to copy · this has no command · nothing sent' };
  if (!clip) return { ok: false, text: 'Copy failed · this browser gives no clipboard here · nothing sent' };
  const r = await writeClip(text, clip);
  if (r.ok) return { ok: true, text: 'Copied · nothing sent' };
  return { ok: false, text: `Copy failed · ${r.error instanceof Error && r.error.message ? r.error.message : 'the clipboard refused it'} · nothing sent` };
}
