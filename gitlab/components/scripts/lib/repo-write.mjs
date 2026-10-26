// Reads and writes one file in another project through the API, as a bot with its own token.
// Used for belay-policy (tier-state.yml) and belay-ledger (events JSONL), the projects' wire names. The API call is
// POST /projects/:id/repository/commits with actions[] (docs.gitlab.com/api/commits). An update action may carry
// last_commit_id, "Last known file commit ID. Only considered in update, move, and delete actions." [R]: GitLab then
// refuses the commit (400, "...has changed since you started editing it") if the file moved since that commit, on the
// branch the commit starts from. Callers also serialise with resource_group.
import { envOf } from './env.mjs';
import { api, die, enc, httpStatus } from './lib.mjs';

/**
 * The token a script writes with (F88): the variable `--write-token-var` names. A variable named and not set dies before any
 * read, so the read token never writes in its place. Without the flag: AFTERLIFE_BOT_TOKEN when set, else undefined (the
 * caller's own glab login, a person running it by hand). The caller sets GITLAB_TOKEN to it just before its write, not earlier.
 * A named AFTERLIFE_X is read through envOf, so a project whose CI/CD variable still has the pre-rename name keeps writing.
 */
export function writeToken(named) {
  const value = !named ? envOf(process.env, 'BOT_TOKEN')
    : named.startsWith('AFTERLIFE_') ? envOf(process.env, named.slice('AFTERLIFE_'.length)) : process.env[named] || undefined;
  if (named && !value) die(`${named} is not set (named by --write-token-var): nothing committed`);
  return value;
}

/**
 * Returns the file text, or null when GitLab answers 404 (the file, or the ref, is not there). Any other failure (401, 403,
 * 5xx, no network) throws with GitLab's message: an unreadable file is unknown, never absent. glab ends a failed call with
 * "(HTTP <status>)" on stderr, the form the harness's fake-glab mimics and src/server/gitlab/errors.ts parses.
 */
export function readFile(project, path, ref) {
  try {
    return api(`projects/${enc(project)}/repository/files/${enc(path)}/raw?ref=${enc(ref)}`, { raw: true });
  } catch (e) {
    if (httpStatus(e) === 404) return null;
    throw e;
  }
}

/**
 * The file as GitLab has it now, with the commit that last changed it: `{content, lastCommitId}` (GET repository/files,
 * `last_commit_id`: "SHA of the last commit that modified this file" [R]), or null when GitLab answers 404. Any other failure,
 * or an answer without content and last_commit_id, throws.
 */
export function fileHead(project, path, ref) {
  let f;
  try {
    f = api(`projects/${enc(project)}/repository/files/${enc(path)}?ref=${enc(ref)}`);
  } catch (e) {
    if (httpStatus(e) === 404) return null;
    throw e;
  }
  if (!f || typeof f.content !== 'string' || typeof f.last_commit_id !== 'string') throw new Error(`GitLab's answer for ${path} has no content and last_commit_id`);
  return { content: Buffer.from(f.content, f.encoding === 'text' ? 'utf8' : 'base64').toString('utf8'), lastCommitId: f.last_commit_id };
}

/**
 * mode 'commit' pushes to `branch`; mode 'mr' commits to a new branch and opens an MR (fallback for a protected branch,
 * spike S8). `lastCommitId`: the commit the new content was computed from; sent with an update so a stale write is
 * refused rather than landing over a newer file.
 * A commit that failed with no clear answer (5xx, no HTTP answer) is made again only once a read shows it did not land: the
 * file's last commit is still `lastCommitId` (an update), or the file is not there (a create, or the new branch of mode
 * 'mr'). A retry that races a late landing is refused by GitLab too (stale last_commit_id, file or branch already there).
 * An update without lastCommitId has no such proof and is never made again. Opening the MR is never retried.
 */
export function writeFile({ project, branch, path, content, message, mode = 'commit', exists, lastCommitId }) {
  const action = { action: exists ? 'update' : 'create', file_path: path, content, ...(exists && lastCommitId ? { last_commit_id: lastCommitId } : {}) };
  const unlandedOn = (ref, created) => (created || action.last_commit_id
    ? () => {
      const now = fileHead(project, path, ref);
      return created ? now === null : now?.lastCommitId === action.last_commit_id;
    }
    : undefined);
  if (mode === 'commit') {
    return api(`projects/${enc(project)}/repository/commits`, {
      method: 'POST',
      body: { branch, commit_message: message, actions: [action] },
      unlanded: unlandedOn(branch, !exists),
    });
  }
  // wire name: Afterlife branches keep the belay/ prefix, the one projects already armed protect and read back.
  const work = `belay/${path.replace(/[^A-Za-z0-9]+/g, '-')}-${Date.now()}`;
  api(`projects/${enc(project)}/repository/commits`, {
    method: 'POST',
    body: { branch: work, start_branch: branch, commit_message: message, actions: [action] },
    unlanded: unlandedOn(work, true), // the branch is new: no file there means no commit
  });
  return api(`projects/${enc(project)}/merge_requests`, {
    method: 'POST',
    body: { source_branch: work, target_branch: branch, title: message.split('\n')[0], remove_source_branch: true },
  });
}
