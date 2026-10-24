// Whether belay-ledger already carries an MR's head, by the key belay-apply appends under:
// `Belay-Head: <project id>!<iid>@<head>` in the message of a commit of events/<project id>.jsonl since the MR was opened.
// The id is the numeric one GitLab answered for the project, never the CI_PROJECT_ID string as given. Reads only.
// The one copy of the rule: belay-apply's sweep (../../../apply/sweep.mjs) and derive-gate both read through it.
import { apiAll, enc } from '../lib/lib.mjs';

const LEDGER_PAGES = 5;

export const ledgerKey = (project, iid, head) => `${project.id}!${iid}@${head}`;

/**
 * Reads the ledger file's commits once and returns `(key) => boolean`: whether one carries the key's line. Only commits since
 * the MR was opened can carry its key; past the page cap the answer is unknown, so it throws rather than say no (F76).
 */
export function ledgerHeads({ ledgerProject, branch, projectId, mr }) {
  const file = `events/${projectId}.jsonl`;
  const since = typeof mr?.created_at === 'string' ? `&since=${enc(mr.created_at)}` : '';
  const log = apiAll(`projects/${enc(ledgerProject)}/repository/commits?ref_name=${enc(branch)}&path=${enc(file)}${since}`, LEDGER_PAGES);
  if (log.length >= LEDGER_PAGES * 100) throw new Error(`more than ${LEDGER_PAGES * 100} commits of ${file} since this MR was opened: whether its events were appended is not known`);
  return (key) => log.some((c) => String(c.message ?? '').split('\n').includes(`Belay-Head: ${key}`));
}

/** True when a commit message of the project's ledger file has the key's line. Throws on a failed read or past the page cap. */
export function ledgered({ ledgerProject, branch, project, mr, key }) {
  return ledgerHeads({ ledgerProject, branch, projectId: project.id, mr })(key);
}
