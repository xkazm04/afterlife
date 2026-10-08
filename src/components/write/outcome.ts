// What a server write came to, in one line for a toast or a status bar. Pure, so it is tested without a server.
import type { ActionResponse } from '@/server/actions/types';

export function outcomeText(r: ActionResponse): string {
  switch (r.status) {
    case 'refused':
      return `Not sent: ${r.reason}`;
    case 'changed':
      return 'Not sent: the plan changed since you saw it. Check the new commands and try again.';
    case 'preview':
      return `${r.preview.title}: ${r.preview.commands.length} command${r.preview.commands.length === 1 ? '' : 's'} planned`;
    case 'done': {
      const n = r.results.length;
      const sim = r.results.every((x) => x.simulated);
      return sim ? `${r.preview.title}: ${n} command${n === 1 ? '' : 's'} planned, simulated in demo mode (nothing was executed)` : `${r.preview.title}: done, ${n} command${n === 1 ? '' : 's'} ran as you`;
    }
    case 'failed': {
      const bad = r.results.find((x) => !x.ok);
      return `${r.preview.title}: failed at "${bad?.display ?? 'a command'}"${bad?.error ? `: ${bad.error}` : ''}. The rest did not run.`;
    }
  }
}

/** Did the write go through (or, in demo mode, would it have)? */
export const wentThrough = (r: ActionResponse): boolean => r.status === 'done';

/** A field value longer than this is shown cut, with its length; the diff under the command shows the content. */
const LONG = 96;

/**
 * A planned command for reading: each `-f key=value` field longer than LONG characters is cut, with the number of
 * characters left out. `elided` says whether anything was cut (the screen then shows the diff, and the full command in
 * a tooltip): nothing is hidden, it is only folded.
 */
export function elide(display: string): { text: string; elided: boolean } {
  let elided = false;
  const text = display
    .split(' -f ')
    .map((part, i) => {
      if (i === 0 || part.length <= LONG) return part;
      elided = true;
      return `${part.slice(0, LONG - 24)}… (${part.length - (LONG - 24)} more characters)`;
    })
    .join(' -f ');
  return { text, elided };
}
