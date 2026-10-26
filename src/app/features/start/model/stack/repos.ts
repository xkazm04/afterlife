// "Your repos" as /start receives it from the screen stream's repos slice (start/screen/slices.ts). Pure: the slice's
// answer (or why there is none) to the rows, the one note the picker shows, and whether the request was this machine's.
// Absent rows are not read yet (a dash), never "no history".
import type { ClaudeRepo } from '@/schemas/vitals';

/** The repos slice's data: the rows, and why they are none or partial. */
export interface ReposRead {
  repos: ClaudeRepo[];
  note?: string;
}

/** The same words as the request-time read (gate/repos.ts loadRepos), so the gate and the host say one thing. */
export const reposNote = {
  notLocal: 'Setup runs on your own machine: open Afterlife on localhost to pick a repo.',
  failed: (why: string) => `Your Claude Code repos could not be listed (${why}): paste a path instead.`,
};

/** The picker's input: rows undefined while unread; `local` false only when the server refused a request from afar. */
export interface ReposOf {
  repos?: readonly ClaudeRepo[];
  note?: string;
  local: boolean;
}

/** The slice's state as the repo step draws it: a refusal or a failed read is a note. */
export function reposOf(s: { state: 'unread' } | { state: 'ok'; data: ReposRead } | { state: 'error'; reason: string }): ReposOf {
  if (s.state === 'unread') return { local: true };
  if (s.state === 'error') return s.reason === 'not-local' ? { repos: [], note: reposNote.notLocal, local: false } : { repos: [], note: reposNote.failed(s.reason), local: true };
  return s.data.note ? { repos: s.data.repos, note: s.data.note, local: true } : { repos: s.data.repos, local: true };
}
