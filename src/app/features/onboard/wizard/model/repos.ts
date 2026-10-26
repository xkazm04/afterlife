// "Your repos" as the wizard receives it from the screen stream's repos slice. Pure: the slice's answer (or why there is
// none) to the rows and the one note the step shows. Absent rows are not read yet, never "no history".
import type { ClaudeRepo } from '@/schemas/vitals';

/** The repos slice's data: the rows, and why they are none or partial. */
export interface ReposRead {
  repos: ClaudeRepo[];
  note?: string;
}

export const reposNote = {
  notLocal: 'Onboarding runs on your own machine: open Afterlife on localhost to list your repos and propose.',
  failed: (why: string) => `Your Claude Code repos could not be listed: ${why}. Paste a path instead.`,
};

/** The slice's state as the step draws it: rows undefined while unread; a refusal or a failed read is a note. */
export function reposOf(s: { state: 'unread' } | { state: 'ok'; data: ReposRead } | { state: 'error'; reason: string }): { repos?: readonly ClaudeRepo[]; note?: string } {
  if (s.state === 'unread') return {};
  if (s.state === 'error') return { repos: [], note: s.reason === 'not-local' ? reposNote.notLocal : reposNote.failed(s.reason) };
  return s.data.note ? { repos: s.data.repos, note: s.data.note } : { repos: s.data.repos };
}
