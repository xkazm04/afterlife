// Shared helpers for the Belay CI glue. Node 20+, no dependencies. These run inside the
// components' jobs (see ../templates). Nothing here ever prints a token.
import { spawnSync } from 'node:child_process';

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

/** One glab run. A failure is thrown with `.stderr` and `.stdout`, as glab() documents. */
function glabOnce(args, input) {
  const r = spawnSync(GLAB, [...GLAB_PRE, ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 << 20 });
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const e = new Error((r.stderr.trim() || r.stdout.trim() || `glab exited ${r.status}`).split('\n')[0]);
    e.stderr = r.stderr;
    e.stdout = r.stdout;
    throw e;
  }
  return r.stdout;
}

/** Attempts a read gets in all. The last failure is thrown as it came, so every fail-closed caller still fails closed. */
export const ATTEMPTS = 3;
/** Statuses that say "try again later" and nothing about the request itself. 500 is not one: it can be the request's own fault. */
const TRANSIENT = new Set([429, 502, 503, 504]);
/** What Go's net/http says when no HTTP answer came back (glab then names no status). */
const NETWORK = /dial tcp|connection (?:reset|refused)|i\/o timeout|TLS handshake timeout|no such host|unexpected EOF|context deadline exceeded|Client\.Timeout exceeded|network is unreachable|broken pipe|server closed idle connection/i;
const RETRY_AFTER_CAP_MS = 5000;

let sleep = (ms) => {
  if (ms > 0) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};
/** Swaps the backoff sleep (tests record it instead of waiting); returns the one it replaced. */
export function setSleep(fn) {
  const was = sleep;
  sleep = fn;
  return was;
}

/** True for a failure worth another attempt: 429, 502, 503, 504, or no HTTP answer at all (network, timeout). 4xx never. */
export function transient(e) {
  const status = httpStatus(e);
  if (status !== null) return TRANSIENT.has(status);
  return NETWORK.test(`${e?.stderr ?? ''}\n${e?.message ?? ''}`);
}

/** The wait before attempt `next`: Retry-After when glab shows it (capped), else 0.5 s, 1 s ($BELAY_GLAB_BACKOFF_MS scales it). */
function backoff(e, next) {
  const after = /Retry-After:\s*(\d+)/i.exec(`${e?.stderr ?? ''}\n${e?.stdout ?? ''}`);
  if (after) return Math.min(Number(after[1]) * 1000, RETRY_AFTER_CAP_MS);
  return Number(process.env.BELAY_GLAB_BACKOFF_MS ?? 500) * 2 ** (next - 2);
}

/** What a log line names a call by: `api GET <path>`, `api graphql`, `mr note`. Never a body or a token. */
const what = (args) => (args[0] === 'api' && args.includes('-X') ? `api ${args.slice(args.indexOf('-X') + 1, args.indexOf('-X') + 3).join(' ')}` : args.slice(0, 2).join(' '));

/**
 * Runs glab. Its stderr is captured so a caller can read the HTTP status, and still printed. A failure is thrown with
 * `.stderr` and `.stdout` (GitLab's answer: glab prints the body on stdout, "glab: <message> (HTTP <status>)" on stderr).
 * `read`: the call changes nothing (a GET, a GraphQL query), so a transient failure is tried again, ATTEMPTS in all. Anything
 * else is a write and runs once.
 */
export function glab(args, input, { read = false } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return glabOnce(args, input);
    } catch (e) {
      if (!read || attempt >= ATTEMPTS || !transient(e)) throw e;
      const ms = backoff(e, attempt + 1);
      console.error(`belay: glab ${what(args)} failed (${httpStatus(e) ?? 'no HTTP answer'}): attempt ${attempt + 1} of ${ATTEMPTS} in ${ms} ms`);
      sleep(ms);
    }
  }
}

/** The HTTP status glab reported on a failure ("glab: <message> (HTTP 404)"), or null when it named none (network, no login). */
export function httpStatus(e) {
  const m = /\(HTTP (\d{3})\)|\bHTTP (\d{3})\b/.exec(String(e?.stderr ?? ''));
  return m ? Number(m[1] ?? m[2]) : null;
}

/** REST call through `glab api` (docs.gitlab.com/cli/api: -X, -H, --input, --hostname). */
export function api(path, { method = 'GET', body, raw = false } = {}) {
  const args = ['api', '--hostname', HOST, '-X', method, path];
  if (body !== undefined) args.push('-H', 'Content-Type: application/json', '--input', '-');
  const out = glab(args, body === undefined ? undefined : JSON.stringify(body), { read: method === 'GET' });
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

export function gql(query) {
  const out = glab(['api', 'graphql', '--hostname', HOST, '-f', `query=${query}`], undefined, { read: !/^\s*mutation\b/.test(query) });
  return JSON.parse(out);
}

export const enc = encodeURIComponent;

/** JSON for a fenced block. A backtick can only sit inside a string, so ` keeps the value and kills any fence. */
export function fence(tag, value) {
  return '```' + tag + '\n' + JSON.stringify(value, null, 2).replaceAll('`', '\\u0060') + '\n```';
}

/** Every parseable fenced block with this tag in a text, in order. Linear: indexOf only, no lazy regex over hostile text. */
export function blocks(text, tag) {
  const src = String(text ?? '');
  const open = '```' + tag;
  const out = [];
  let at = 0;
  while ((at = src.indexOf(open, at)) !== -1) {
    const nl = src.startsWith('\r\n', at + open.length) ? at + open.length + 2 : src[at + open.length] === '\n' ? at + open.length + 1 : -1;
    if (nl === -1) {
      at += open.length;
      continue;
    }
    const end = src.indexOf('\n```', nl); // a missing closer here is missing for every later opener too
    if (end === -1) break;
    try {
      out.push(JSON.parse(src.slice(nl, src[end - 1] === '\r' && end > nl ? end - 1 : end)));
    } catch {
      /* a malformed block is ignored, never repaired */
    }
    at = end + 4;
  }
  return out;
}

/** Index just past the line break at `at` (LF or CRLF), or -1. */
const breakAfter = (src, at) => (src[at] === '\n' ? at + 1 : src[at] === '\r' && src[at + 1] === '\n' ? at + 2 : -1);

/** Text with every fenced block (any tag) removed: the poller's withoutBlocks (src/server/poller/parse/blocks.ts), same scan. */
export function withoutBlocks(text) {
  const src = String(text ?? '');
  let out = '';
  let kept = 0;
  let at = 0;
  let seen = -1; // the opener's line end is found once per scan position, not once per opener (hostile text stays linear)
  const nl = /[\r\n]/g;
  while ((at = src.indexOf('```', at)) !== -1) {
    if (seen < at + 3) {
      nl.lastIndex = at + 3;
      const m = nl.exec(src);
      seen = m ? m.index : src.length;
    }
    const body = seen < src.length ? breakAfter(src, seen) : -1;
    if (body === -1) {
      at += 1;
      continue;
    }
    const end = src.indexOf('\n```', body);
    if (end === -1) break;
    out += src.slice(kept, at);
    kept = end + 4;
    at = kept;
  }
  return out + src.slice(kept);
}

/** Last `Key: value` trailer line in a text outside any fenced block (as the poller reads it), or null. The value must match `shape`. */
export function trailer(text, key, shape = /^\S+$/) {
  const re = new RegExp(`^${key}:[ \\t]*(.+?)[ \\t]*$`, 'gmi');
  let found = null;
  for (const m of withoutBlocks(text).matchAll(re)) if (shape.test(m[1])) found = m[1];
  return found;
}

export const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
export const CLASS_ID = /^[a-z][a-z0-9.-]*$/;

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

/** Keeps a reason from pinging people or breaking out of the note. */
export function plain(s) {
  return String(s).replaceAll('`', "'").replaceAll('@', '@​').replace(/\s+/g, ' ').slice(0, 300);
}
