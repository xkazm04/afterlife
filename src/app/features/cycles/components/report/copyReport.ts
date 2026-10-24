import { copyCommand } from '@/lib/clipboard/copyCommand';

/**
 * Copy a cycle report as Markdown. The shared Copy Command owns the clipboard-with-fallback, so a missing clipboard
 * (an insecure origin) says so just as a refusing one does. The fallback names the hand copy instead of echoing the
 * whole report into the status line: the sheet already shows the Markdown to select.
 */
export function copyReport(id: string, md: string, clip: Pick<Clipboard, 'writeText'> | undefined, say: (text: string) => void): void {
  const copied = `${id} report copied as Markdown`;
  copyCommand(md, clip, (t) => say(t === copied ? copied : 'Copy failed: select the report and copy it by hand'), copied);
}
