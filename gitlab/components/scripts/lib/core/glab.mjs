// glab itself: one run, and the retry rule around it (a read is tried again on a transient failure, a write only when
// the caller proves it did not land). Re-exported by ../lib.mjs, which every script imports. Nothing here prints a token.
import { spawnSync } from 'node:child_process';

const env = process.env;
const [GLAB, ...GLAB_PRE] = (env.BELAY_GLAB ?? 'glab').split('|'); // tests: BELAY_GLAB='node|fake-glab.mjs'
export const HOST = env.CI_SERVER_FQDN ?? 'gitlab.com';

/**
 * One glab run. A failure is thrown with `.stderr` and `.stdout`, as glab() documents. A run that gives no answer within
 * $BELAY_GLAB_TIMEOUT_MS (default 120 s) is killed and thrown with code ETIMEDOUT: a hung connection no longer holds the
 * job until GitLab's own job timeout.
 */
function glabOnce(args, input) {
  const timeout = Number(process.env.BELAY_GLAB_TIMEOUT_MS ?? 120_000);
  const r = spawnSync(GLAB, [...GLAB_PRE, ...args], { encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 64 << 20, timeout, killSignal: 'SIGKILL' });
  if (r.stderr) process.stderr.write(r.stderr);
  if (r.error?.code === 'ETIMEDOUT') {
    const e = new Error(`glab ${what(args)} gave no answer in ${timeout} ms`);
    e.code = 'ETIMEDOUT';
    e.stderr = r.stderr ?? '';
    e.stdout = r.stdout ?? '';
    throw e;
  }
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
  return e?.code === 'ETIMEDOUT' || NETWORK.test(`${e?.stderr ?? ''}\n${e?.message ?? ''}`);
}

/** The wait before attempt `next`: Retry-After when glab shows it (capped), else 0.5 s, 1 s ($BELAY_GLAB_BACKOFF_MS scales it). */
function backoff(e, next) {
  const after = /Retry-After:\s*(\d+)/i.exec(`${e?.stderr ?? ''}\n${e?.stdout ?? ''}`);
  if (after) return Math.min(Number(after[1]) * 1000, RETRY_AFTER_CAP_MS);
  return Number(process.env.BELAY_GLAB_BACKOFF_MS ?? 500) * 2 ** (next - 2);
}

/** True only when the caller's read answered true. No probe, a probe that throws, or any other answer: not proven. */
function provenUnlanded(unlanded) {
  if (typeof unlanded !== 'function') return false;
  try {
    return unlanded() === true;
  } catch (e) {
    console.error(`belay: could not read whether the write landed (${String(e?.message ?? e).split('\n')[0]}): not trying it again`);
    return false;
  }
}

/** A write's failure with a 5xx or no HTTP answer: GitLab may have done it and lost the answer. A 4xx (429 too) did not land. */
function unknownIfAmbiguous(e) {
  const status = httpStatus(e);
  if (status === null ? !transient(e) : status < 500) return e;
  e.landed = 'unknown';
  e.message = `${e.message} [the write may or may not have landed: read GitLab before making it again]`;
  return e;
}

/** What a log line names a call by: `api GET <path>`, `api graphql`, `mr note`. Never a body or a token. */
const what = (args) => (args[0] === 'api' && args.includes('-X') ? `api ${args.slice(args.indexOf('-X') + 1, args.indexOf('-X') + 3).join(' ')}` : args.slice(0, 2).join(' '));

/**
 * Runs glab. Its stderr is captured so a caller can read the HTTP status, and still printed. A failure is thrown with
 * `.stderr` and `.stdout` (GitLab's answer: glab prints the body on stdout, "glab: <message> (HTTP <status>)" on stderr).
 * `read`: the call changes nothing (a GET, a GraphQL query), so a transient failure is tried again, ATTEMPTS in all. Anything
 * else is a write and is never tried again blindly: only when `unlanded()`, a read the caller supplies, returns true (it shows
 * the write did not land). A write that failed with a 5xx or no HTTP answer is thrown with `.landed = 'unknown'` and a message
 * that says so.
 */
export function glab(args, input, { read = false, unlanded } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return glabOnce(args, input);
    } catch (e) {
      const again = attempt < ATTEMPTS && transient(e) && (read || provenUnlanded(unlanded));
      if (!again) throw read ? e : unknownIfAmbiguous(e);
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
