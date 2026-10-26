// "Your repos" for the repo step, read on the server at request time and only for a request addressed to this machine:
// the list names local paths, and the hosted replay has no Claude Code history to show (moved from (app)/onboard/page).
import 'server-only';
import type { ClaudeRepo } from '@/schemas/vitals';
import { notLocal } from '@/server/actions/local';
import { listClaudeRepos } from '@/server/discover';
import { messageOf } from '@/lib/format/error';
import { reposNote } from '../model/stack/repos';

export interface StartRepos {
  repos: ClaudeRepo[];
  note?: string;
  /** The request is this machine's: the wizard's routes answer it. */
  local: boolean;
}

export async function loadRepos(h: Pick<Headers, 'get'>): Promise<StartRepos> {
  if (notLocal(h)) return { repos: [], local: false, note: reposNote.notLocal };
  try {
    return { repos: await listClaudeRepos(), local: true };
  } catch (e) {
    return { repos: [], local: true, note: reposNote.failed(messageOf(e, { firstLine: true })) };
  }
}
