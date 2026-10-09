// Whether belay-ledger already carries an MR's head, by the key belay-apply appends under (../../../apply/sweep.mjs:120-133):
// `Belay-Head: <project id>!<iid>@<head>` in the message of a commit of events/<project id>.jsonl since the MR was opened.
// The id is the numeric one GitLab answered for the project, never the CI_PROJECT_ID string as given. Reads only.
import { apiAll, enc } from '../lib/lib.mjs';

const LEDGER_PAGES = 5; // sweep.mjs's cap

export const ledgerKey = (project, iid, head) => `${project.id}!${iid}@${head}`;

/** True when a commit message of the project's ledger file has the key's line. Throws on a failed read or past the page cap. */
export function ledgered({ ledgerProject, branch, project, mr, key }) {
  const file = `events/${project.id}.jsonl`;
  const since = typeof mr?.created_at === 'string' ? `&since=${enc(mr.created_at)}` : '';
  const log = apiAll(`projects/${enc(ledgerProject)}/repository/commits?ref_name=${enc(branch)}&path=${enc(file)}${since}`, LEDGER_PAGES);
  if (log.length >= LEDGER_PAGES * 100) throw new Error(`more than ${LEDGER_PAGES * 100} commits of ${file} since this MR was opened: whether its events were appended is not known`);
  return log.some((c) => String(c.message ?? '').split('\n').includes(`Belay-Head: ${key}`));
}
