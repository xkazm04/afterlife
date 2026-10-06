// Shared helpers for the Belay CI glue. Node 20+, no dependencies. These run inside the
// components' jobs (see ../templates). Nothing here ever prints a token.
import { execFileSync } from 'node:child_process';

const env = process.env;
const [GLAB, ...GLAB_PRE] = (env.BELAY_GLAB ?? 'glab').split('|'); // tests: BELAY_GLAB='node|fake-glab.mjs'
export const HOST = env.CI_SERVER_FQDN ?? 'gitlab.com';

export function die(msg, code = 2) {
  console.error(`belay: ${msg}`);
  process.exit(code);
}

export function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}

export function need(name) {
  const v = arg(name);
  if (!v) die(`missing --${name}`);
  return v;
}

export function glab(args, input) {
  return execFileSync(GLAB, [...GLAB_PRE, ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'inherit'], maxBuffer: 64 << 20 });
}

/** REST call through `glab api` (docs.gitlab.com/cli/api: -X, -H, --input, --hostname). */
export function api(path, { method = 'GET', body, raw = false } = {}) {
  const args = ['api', '--hostname', HOST, '-X', method, path];
  if (body !== undefined) args.push('-H', 'Content-Type: application/json', '--input', '-');
  const out = glab(args, body === undefined ? undefined : JSON.stringify(body));
  if (raw) return out;
  return out.trim() ? JSON.parse(out) : null;
}

/** Manual paging: never relies on how --paginate joins arrays. */
export function apiAll(path, maxPages = 5) {
  const rows = [];
  for (let page = 1; page <= maxPages; page++) {
    const got = api(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`);
    if (!Array.isArray(got) || got.length === 0) break;
    rows.push(...got);
    if (got.length < 100) break;
  }
  return rows;
}

export function gql(query) {
  const out = glab(['api', 'graphql', '--hostname', HOST, '-f', `query=${query}`]);
  return JSON.parse(out);
}

export const enc = encodeURIComponent;

/** JSON for a fenced block. A backtick can only sit inside a string, so ` keeps the value and kills any fence. */
export function fence(tag, value) {
  return '```' + tag + '\n' + JSON.stringify(value, null, 2).replaceAll('`', '\\u0060') + '\n```';
}

/** Every parseable fenced block with this tag in a text, in order. */
export function blocks(text, tag) {
  const re = new RegExp('```' + tag + '\\r?\\n([\\s\\S]*?)\\r?\\n```', 'g');
  const out = [];
  for (const m of String(text ?? '').matchAll(re)) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      /* a malformed block is ignored, never repaired */
    }
  }
  return out;
}

/** Last `Key: value` trailer line in a text, or null. The value must match `shape`. */
export function trailer(text, key, shape = /^\S+$/) {
  const re = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'gmi');
  let found = null;
  for (const m of String(text ?? '').matchAll(re)) if (shape.test(m[1])) found = m[1];
  return found;
}

export const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export const CLASS_ID = /^[a-z][a-z0-9.-]*$/;

/** Notes written by one of the allowed accounts, newest first. Anyone else's note is data, not evidence. */
export function trustedNotes(projectId, mr, authors) {
  const allowed = new Set(authors.split(',').map((s) => s.trim()).filter(Boolean));
  return apiAll(`projects/${projectId}/merge_requests/${mr}/notes?sort=desc&order_by=created_at`)
    .filter((n) => !n.system && allowed.has(n.author?.username))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

/** Keeps a reason from pinging people or breaking out of the note. */
export function plain(s) {
  return String(s).replaceAll('`', "'").replaceAll('@', '@​').replace(/\s+/g, ' ').slice(0, 300);
}
