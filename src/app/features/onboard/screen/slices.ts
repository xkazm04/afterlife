// Onboard's slices for the screen stream (GET /api/screen/<key>):
//   onboard         repos - "Your repos": the git toplevels behind ~/.claude/projects (listClaudeRepos: fs and a git per
//                   repo on the first call, then 60 s cached in the process, as /api/onboard/repos reads them). The list
//                   names local paths and the hosted replay has no Claude Code history, so the whole screen answers only
//                   a request addressed to this machine (local); a refused one fails the slice 'not-local'.
//                   A listing that fails is no error line: the rows are none and `note` says why, as the page always said.
//   onboard/estate  core - the estate as the fleet sees it (loadOnboardData, in memory).
import { ok, type ModuleLoaders } from '@/app/features/screens/types';
import { messageOf } from '@/lib/format/error';
import { listClaudeRepos } from '@/server/discover';
import { loadOnboardData } from '../data/loadOnboardData';
import { reposNote } from '../wizard/model/repos';

export const loaders: ModuleLoaders = {
  onboard: {
    local: true,
    slices: {
      repos: async () => {
        try {
          return ok({ repos: await listClaudeRepos() });
        } catch (e) {
          return ok({ repos: [], note: reposNote.failed(messageOf(e, { firstLine: true })) });
        }
      },
    },
  },
  'onboard/estate': {
    slices: { core: () => ok(loadOnboardData()) },
  },
};
