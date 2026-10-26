// /start's slices for the screen stream (GET /api/screen/start), in the order the screen fills:
//   facts - what the server knows without probing (gate/facts.ts loadTraceFacts: the running server's environment with
//           the runtime settings laid under it, the live runtime, which name set each value, the platform). Sync, fast.
//           `?rehearse=not-ready` shows the live not-ready state on purpose, as the page always did.
//   projects - the projects saved on this machine (<data>/projects/<slug>.yml, discover's loadProjects, what Vitals
//           reads), each with its saved lines (model/projects/saved.ts savedOf). Read whatever the mode: a saved project
//           is the person's own, the demo estate never is. It names local roots, so it is loopback only like repos.
//   repos - "Your repos": the git toplevels behind ~/.claude/projects (listClaudeRepos: a git per repo on the first call,
//           then 60 s cached in the process). It names local paths and the hosted replay has no Claude Code history, so
//           it answers only a request addressed to this machine (local); a refused one fails the slice 'not-local'.
//           A listing that fails is no error line: the rows are none and `note` says why, as gate/repos.ts says it.
// The probes are not slices: they stream from the client over GET /api/start/probe once the facts are read (useProbe).
import { ok, type ModuleLoaders } from '@/app/features/screens/types';
import { messageOf } from '@/lib/format/error';
import { listClaudeRepos, loadProjects } from '@/server/discover';
import { loadTraceFacts } from '../gate/facts';
import { projectsNote, savedOf } from '../model/projects/saved';
import { reposNote } from '../model/stack/repos';

export const loaders: ModuleLoaders = {
  start: {
    local: ['projects', 'repos'],
    slices: {
      facts: ({ search }) => ok(loadTraceFacts(search.get('rehearse') === 'not-ready')),
      projects: () => {
        try {
          return ok({ projects: loadProjects().map(savedOf) });
        } catch (e) {
          return ok({ projects: [], note: projectsNote.failed(messageOf(e, { firstLine: true })) });
        }
      },
      repos: async () => {
        try {
          return ok({ repos: await listClaudeRepos() });
        } catch (e) {
          return ok({ repos: [], note: reposNote.failed(messageOf(e, { firstLine: true })) });
        }
      },
    },
  },
};
