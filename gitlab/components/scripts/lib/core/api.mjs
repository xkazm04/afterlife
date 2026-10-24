// GitLab reads and writes over glab(): REST, paging, GraphQL, and the trusted-notes reader. Re-exported by ../lib.mjs.
import { glab, HOST } from './glab.mjs';

/**
 * REST call through `glab api` (docs.gitlab.com/cli/api: -X, -H, --input, --hostname). A GET is retried on a transient
 * failure; a write only with `unlanded`, a read that returns true when the write is shown not to have landed (see glab()).
 */
export function api(path, { method = 'GET', body, raw = false, unlanded } = {}) {
  const args = ['api', '--hostname', HOST, '-X', method, path];
  if (body !== undefined) args.push('-H', 'Content-Type: application/json', '--input', '-');
  const out = glab(args, body === undefined ? undefined : JSON.stringify(body), { read: method === 'GET', unlanded });
  if (raw) return out;
  return out.trim() ? JSON.parse(out) : null;
}

/**
 * Manual paging over any one-page reader `get`: never relies on how --paginate joins arrays. Stops at a short or empty page
 * or at the cap. The one implementation of the rule; `apiAll` is it over glab, and test doubles call it with a fake `get`.
 * `strict`: reaching the cap with every page full throws, so a caller that must have the whole list never mistakes a prefix
 * for it (a list of exactly maxPages*100 rows also throws: a full last page cannot be told from a longer list).
 */
export function pageAll(get, path, maxPages = 5, { strict = false } = {}) {
  const rows = [];
  for (let page = 1; page <= maxPages; page++) {
    const got = get(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(got) || got.length === 0) break;
    rows.push(...got);
    if (got.length < 100) break;
    if (strict && page === maxPages) throw new Error(`more than ${maxPages * 100} rows at ${path.split('?')[0]}: refusing to guess`);
  }
  return rows;
}

export const apiAll = (path, maxPages = 5, opts) => pageAll(api, path, maxPages, opts);

/** A GraphQL call. An answer with `errors` (GraphQL reports a failure in a 200) throws: unknown, never "no data". */
export function gql(query) {
  const out = glab(['api', 'graphql', '--hostname', HOST, '-f', `query=${query}`], undefined, { read: !/^\s*mutation\b/.test(query) });
  const res = JSON.parse(out);
  if (Array.isArray(res?.errors) && res.errors.length) throw new Error(`GraphQL answered with errors: ${res.errors.map((x) => String(x?.message ?? x)).join('; ').slice(0, 300)}`);
  return res;
}

const NOTE_PAGES = 200; // 20,000 notes; running past it is an error, never a silent "no trusted note"

/**
 * Notes written by one of the allowed accounts, newest first. Anyone else's note is data, not evidence.
 * Lazy: a page is fetched only when the caller has not yet found what it wants, so a bot block beyond the first
 * pages is still reached. Fails closed: an unreadable page throws (glab exits non-zero) and the page cap throws.
 * `get` reads one page (default: `api`, through glab); a caller that injects its reads passes its own.
 */
export function* trustedNotes(projectId, mr, authors, get = api) {
  const allowed = new Set(authors.split(',').map((s) => s.trim()).filter(Boolean));
  const path = `projects/${projectId}/merge_requests/${mr}/notes?sort=desc&order_by=created_at`;
  for (let page = 1; page <= NOTE_PAGES; page++) {
    const got = get(`${path}&per_page=100&page=${page}`);
    if (!Array.isArray(got) || got.length === 0) return;
    for (const n of got) if (!n.system && allowed.has(n.author?.username)) yield n;
    if (got.length < 100) return;
  }
  throw new Error(`more than ${NOTE_PAGES * 100} notes on !${mr}: refusing to guess`);
}
