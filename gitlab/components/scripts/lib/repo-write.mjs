// Reads and writes one file in another project through the API, as a bot with its own token.
// Used for belay-policy (tier-state.yml) and belay-ledger (events JSONL). The API call is
// POST /projects/:id/repository/commits with actions[] (docs.gitlab.com/api/commits). An update action may carry
// last_commit_id, "Last known file commit ID. Only considered in update, move, and delete actions." [R]: GitLab then
// refuses the commit (400, "...has changed since you started editing it") if the file moved since that commit, on the
// branch the commit starts from. Callers also serialise with resource_group.
import { api, enc } from './lib.mjs';

/** Returns the file text, or null when the file does not exist (or the project/branch does not). */
export function readFile(project, path, ref) {
  try {
    return api(`projects/${enc(project)}/repository/files/${enc(path)}/raw?ref=${enc(ref)}`, { raw: true });
  } catch {
    return null;
  }
}

/**
 * The file as GitLab has it now, with the commit that last changed it: `{content, lastCommitId}` (GET repository/files,
 * `last_commit_id`: "SHA of the last commit that modified this file" [R]), or null when it cannot be read.
 */
export function fileHead(project, path, ref) {
  let f;
  try {
    f = api(`projects/${enc(project)}/repository/files/${enc(path)}?ref=${enc(ref)}`);
  } catch {
    return null;
  }
  if (!f || typeof f.content !== 'string' || typeof f.last_commit_id !== 'string') return null;
  return { content: Buffer.from(f.content, f.encoding === 'text' ? 'utf8' : 'base64').toString('utf8'), lastCommitId: f.last_commit_id };
}

/**
 * mode 'commit' pushes to `branch`; mode 'mr' commits to a new branch and opens an MR (fallback for a protected branch,
 * spike S8). `lastCommitId`: the commit the new content was computed from; sent with an update so a stale write is
 * refused rather than landing over a newer file.
 */
export function writeFile({ project, branch, path, content, message, mode = 'commit', exists, lastCommitId }) {
  const action = { action: exists ? 'update' : 'create', file_path: path, content, ...(exists && lastCommitId ? { last_commit_id: lastCommitId } : {}) };
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
