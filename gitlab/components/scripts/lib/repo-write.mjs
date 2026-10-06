// Reads and writes one file in another project through the API, as a bot with its own token.
// Used for belay-policy (tier-state.yml) and belay-ledger (events JSONL). The API call is
// POST /projects/:id/repository/commits with actions[] (docs.gitlab.com/api/commits).
// last_commit_id is not sent: the commits page does not say it is supported [R?]. Callers serialise with resource_group.
import { api, enc } from './lib.mjs';

/** Returns the file text, or null when the file does not exist (or the project/branch does not). */
export function readFile(project, path, ref) {
  try {
    return api(`projects/${enc(project)}/repository/files/${enc(path)}/raw?ref=${enc(ref)}`, { raw: true });
  } catch {
    return null;
  }
}

/** mode 'commit' pushes to `branch`; mode 'mr' commits to a new branch and opens an MR (fallback for a protected branch, spike S8). */
export function writeFile({ project, branch, path, content, message, mode = 'commit', exists }) {
  const action = { action: exists ? 'update' : 'create', file_path: path, content };
  if (mode === 'commit') {
    return api(`projects/${enc(project)}/repository/commits`, {
      method: 'POST',
      body: { branch, commit_message: message, actions: [action] },
    });
  }
  const work = `belay/${path.replace(/[^A-Za-z0-9]+/g, '-')}-${Date.now()}`;
  api(`projects/${enc(project)}/repository/commits`, {
    method: 'POST',
    body: { branch: work, start_branch: branch, commit_message: message, actions: [action] },
  });
  return api(`projects/${enc(project)}/merge_requests`, {
    method: 'POST',
    body: { source_branch: work, target_branch: branch, title: message.split('\n')[0], remove_source_branch: true },
  });
}
